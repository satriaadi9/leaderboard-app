import { prisma } from '@/config/prisma';
import { generateToken, comparePassword, hashPassword } from '@/utils/auth';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { redis } from '@/config/redis';
import { sendEmail } from '@/utils/mailer';

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

export const authService = {
  async googleLogin(token: string) {
    if (!googleClient) {
      throw new AppError('Google login is not configured', 500);
    }
    
    if (!token) {
      throw new AppError('No token provided', 400);
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        throw new AppError('Invalid token payload', 400);
      }

      const { email, name = 'Google User' } = payload;

      let user = await prisma.user.findUnique({
        where: { email },
      });

      // If user doesn't exist, create a new one with a random password
      if (!user) {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await hashPassword(randomPassword);
        
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: UserRole.ADMIN, // Giving new Google auth users ADMIN role to match legacy register
          },
        });
      }

      const jwtToken = generateToken({ userId: user.id, role: user.role });

      return {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
       if (error instanceof AppError) {
          throw error;
       }
       throw new AppError('Invalid Google token', 401);
    }
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }
    const token = generateToken({ userId: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async register(email: string, name: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', 400);

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
    const token = generateToken({ userId: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak if email exists or not
      return; 
    }

    const cacheKey = `pwd_reset_cooldown:${email}`;
    const inCooldown = await redis.get(cacheKey);
    if (inCooldown) {
      throw new AppError('Please wait before requesting a new OTP.', 429);
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCacheKey = `pwd_reset_otp:${email}`;

    // Store OTP, valid for 10 minutes
    await redis.set(otpCacheKey, otp, 'EX', 600);
    // Cooldown of 1 minute to prevent spam
    await redis.set(cacheKey, '1', 'EX', 60);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1c1c1e;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Leaderboard SIFT UC</h1>
        </div>
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Reset Your Password</h2>
          <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #3a3a3c;">
            We received a request to reset the password for your account. Enter the OTP below to proceed.
          </p>
          <div style="background-color: #f2f2f7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #007aff;">
              ${otp}
            </div>
          </div>
          <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #8e8e93;">
            This OTP will expire in 10 minutes. If you did not request a password reset, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #8e8e93;">
          &copy; ${new Date().getFullYear()} Leaderboard SIFT UC. All rights reserved.
        </div>
      </div>
    `;

    const emailSent = await sendEmail(email, 'Your Password Reset OTP', emailHtml);
    if (!emailSent) {
      // Clear the cache manually since it failed
      await redis.del(otpCacheKey);
      await redis.del(cacheKey);
      throw new AppError('Failed to send OTP email. Please report this issue.', 500);
    }
  },

  async verifyOtp(email: string, otp: string) {
    const cachedOtp = await redis.get(`pwd_reset_otp:${email}`);
    if (!cachedOtp) {
      throw new AppError('OTP expired or invalid. Please request a new one.', 400);
    }
    if (cachedOtp !== otp) {
      throw new AppError('Invalid OTP.', 400);
    }
    // Set a "verified" flag so they can step to Reset Password
    await redis.set(`pwd_reset_verified:${email}`, '1', 'EX', 600); // 10 mins window to reset
  },

  async resetPasswordWithOtp(email: string, otp: string, newPassword: string) {
    const verified = await redis.get(`pwd_reset_verified:${email}`);
    if (!verified) {
        throw new AppError('Session expired. Please verify OTP again.', 400);
    }
    const cachedOtp = await redis.get(`pwd_reset_otp:${email}`);
    if (cachedOtp !== otp) {
        throw new AppError('Invalid OTP.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('User not found', 404);

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Cleanup redis
    await redis.del(`pwd_reset_otp:${email}`);
    await redis.del(`pwd_reset_verified:${email}`);
    await redis.del(`pwd_reset_cooldown:${email}`);
  }
};
