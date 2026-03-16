import { prisma } from '@/config/prisma';
import { generateToken, comparePassword, hashPassword } from '@/utils/auth';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

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
};
