import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { redis } from '@/config/redis';
import { hashPassword } from '@/utils/auth';
import { sendEmail } from '@/utils/mailer';


export const classService = {
  async createClass(name: string, description: string | undefined, adminId: string) {
    const suffix = randomBytes(4).toString('hex').slice(0, 6);
    const publicSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${suffix}`;
    
    const defaultPresets = [
      { name: 'Attendance', points: 5 },
      { name: 'Answered question', points: 3 },
      { name: 'Presented solution', points: 7 },
      { name: 'Late to class', points: -2 },
      { name: 'Disturbing class', points: -3 },
      { name: 'Quiz winner', points: 10 },
    ];

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        publicSlug,
        createdByUserId: adminId,
        scoringPresets: {
          create: defaultPresets
        }
      } as any,
    });
    return newClass;
  },

  async enrollStudent(classId: string, studentName: string, studentEmail: string) {
    const email = studentEmail.toLowerCase().trim();

    const result = await prisma.$transaction(async (tx) => {
      // Check if student exists or create
      let student = await tx.student.findFirst({ where: { email } });
      if (!student) {
        const nim = randomBytes(4).toString('hex'); // Generate random NIM
        student = await tx.student.create({
          data: { name: studentName, email, nim },
        });
      }

      // Check enrollment
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          classId_studentId: {
            studentId: student.id,
            classId,
          },
        },
      });
      if (existingEnrollment) throw new AppError('Student already enrolled', 400);

      // Enroll
      const enrollment = await tx.enrollment.create({
        data: {
          classId,
          studentId: student.id,
        },
      });

      // Initialize points total
      await tx.classPointsTotal.create({
        data: {
          classId,
          studentId: student.id,
          total: 0,
        },
      });

      return { enrollment, student };
    });

    // Invalidate leaderboard cache so the new student shows up immediately
    await redis.del(`leaderboard:${classId}`);

    return result;
  },

  async importStudents(classId: string, students: Array<{ nim?: string, name: string, email: string }>) {
    const result = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const s of students) {
        const email = s.email.toLowerCase().trim();
        // Try to find student by email, or by NIM if provided
        let student = await tx.student.findFirst({ where: { email } });
        
        if (!student) {
             // If we have a NIM from CSV, try to use it, else generate
             const nim = s.nim || randomBytes(4).toString('hex');
             // There's a chance this NIM exists for another student if we blindly use CSV NIM.
             // Ideally we should upsert or handle unique constraint.
             // For now, let's assume CSV data is authoritative or falls back.
             // If creating fails due to NIM unique constraint, we might need logic.
             // But let's keep it simple: create.
             try {
                student = await tx.student.create({
                    data: { name: s.name, email, nim }
                });
             } catch (e) {
                 // Fallback if NIM taken? 
                 // If email is unique (checked above), then collision is on NIM.
                 // If collision on NIM, maybe specific to another student.
                 // Let's generate a random one to be safe if specific one fails?
                 // Or just let it fail.
                 throw e;
             }
        }
        
        // Enroll (ignore if already enrolled)
        await tx.enrollment.upsert({
            where: { classId_studentId: { classId, studentId: student.id } },
            create: { classId, studentId: student.id },
            update: {}
        });

        // Init points if needed
         await tx.classPointsTotal.upsert({
            where: { classId_studentId: { classId, studentId: student.id } },
            create: { classId, studentId: student.id, total: 0 },
            update: {}
        });
        
        results.push(student);
      }
      return results;
    });

    await redis.del(`leaderboard:${classId}`);
    return result;
  },

  async removeStudent(classId: string, studentId: string) {
      await prisma.$transaction([
          prisma.enrollment.deleteMany({ where: { classId, studentId } }),
          prisma.classPointsTotal.deleteMany({ where: { classId, studentId } }),
          prisma.pointsLedger.deleteMany({ where: { classId, studentId } })
      ]);
      await redis.del(`leaderboard:${classId}`);
  },

  async sendStudentLinks(classId: string, studentIds: string[], frontendUrl: string = 'http://localhost:5173', adminId: string) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { studentId: { in: studentIds } },
          include: { student: true }
        }
      }
    });

    if (!classData) throw new AppError('Class not found', 404);

    let sentCount = 0;
    let failedCount = 0;

    for (const enrollment of classData.enrollments) {
      const student = enrollment.student;
      if (!student.email) {
        failedCount++;
        continue;
      }

      const cleanUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
      const link = `${cleanUrl}/s/${student.id}`;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1c1c1e;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${classData.name} - Leaderboard Access</h1>
          </div>
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Hello ${student.name},</h2>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #3a3a3c;">
              You have been enrolled in the class <strong>${classData.name}</strong>.
            </p>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #3a3a3c;">
              You can access your personalized public link to monitor your progress, see your point history, and view the global leaderboard.
            </p>
            <div style="text-align: center; margin-bottom: 32px; margin-top: 32px;">
              <a href="${link}" style="background-color: #007aff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">View Progress Link</a>
            </div>
            <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #8e8e93;">
              Or copy and paste this link into your browser:
            </p>
            <div style="background-color: #f2f2f7; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #1c1c1e; word-break: break-all;">
              ${link}
            </div>
          </div>
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #8e8e93;">
            &copy; ${new Date().getFullYear()} Leaderboard SIFT UC. All rights reserved.
          </div>
        </div>
      `;

      try {
        const success = await sendEmail(student.email, `Welcome to ${classData.name} - Leaderboard Link`, emailHtml);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    return {
      message: `Sent ${sentCount} emails (${failedCount} failed/no-email)`,
      sentCount,
      failedCount
    };
  },

  async removeStudents(classId: string, studentIds: string[]) {
      await prisma.$transaction([
          prisma.enrollment.deleteMany({ where: { classId, studentId: { in: studentIds } } }),
          prisma.classPointsTotal.deleteMany({ where: { classId, studentId: { in: studentIds } } }),
          prisma.pointsLedger.deleteMany({ where: { classId, studentId: { in: studentIds } } })
      ]);
      await redis.del(`leaderboard:${classId}`);
  },

  async getClassDetails(classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assistants: { select: { id: true, name: true, email: true } },
        scoringPresets: { orderBy: { createdAt: 'asc' } }
      } as any,
    });
    if (!cls) throw new AppError('Class not found', 404);
    return cls;
  },

  async listClasses(userId: string, role: string) {
      const whereClause = role === 'SUPERADMIN' 
          ? {} 
          : { 
              OR: [
                  { createdByUserId: userId },
                  { assistants: { some: { id: userId } } }
              ]
          };
      
      const classes = await prisma.class.findMany({
          where: whereClause,
          include: {
              _count: { select: { enrollments: true } },
              // Using ignore for relation if not yet typed
              // @ts-ignore
              pointsTotals: {
                  select: { total: true }
              },
              createdBy: { select: { id: true, name: true, email: true } }, // Include owner info
              assistants: { select: { id: true, name: true, email: true } } // Include assistants
          } as any,
          orderBy: { createdAt: 'desc' }
      });

      // Calculate aggregated stats
      return classes.map(cls => {
          const totals = (cls as any).pointsTotals.map((p: any) => p.total);
          const totalPoints = totals.reduce((sum: number, val: number) => sum + val, 0);
          const avgPoints = totals.length > 0 ? totalPoints / totals.length : 0;
          
          // Calculate Distribution (5 buckets)
          const distribution = [0, 0, 0, 0, 0];
          if (totals.length > 0) {
              const min = Math.min(...totals);
              const max = Math.max(...totals);
              const range = max - min;
              
              if (range === 0) {
                  // If all scores are the same, put them in the middle bucket
                  distribution[2] = totals.length;
              } else {
                  totals.forEach((score: number) => {
                      // Normalize score to 0-4
                      const normalized = (score - min) / range;
                      const bucketIndex = Math.min(Math.floor(normalized * 5), 4);
                      distribution[bucketIndex]++;
                  });
              }
          }

          // Clean up response objects (remove raw arrays)
          const { pointsTotals, ...rest } = cls as any;
          
          return {
              ...rest,
              stats: {
                  studentCount: (cls as any)._count.enrollments,
                  averagePoints: Math.round(avgPoints * 100) / 100, // Round to 2 decimals
                  totalPointsDistributed: totalPoints,
                  distribution // New array of 5 integers
              }
          };
      });
  },

  async updateClass(id: string, updates: { name?: string, publicSlug?: string, isPublic?: boolean, isArchived?: boolean }) {
      const cls = await prisma.class.findUnique({ where: { id } });
      if (!cls) throw new AppError('Class not found', 404);

      if (updates.publicSlug) {
          const existing = await prisma.class.findUnique({ where: { publicSlug: updates.publicSlug } });
          if (existing && existing.id !== id) {
              throw new AppError('Public link slug is already taken', 400);
          }
      }
      
      return await prisma.class.update({
          where: { id },
          data: updates
      });
  },

  async deleteClass(id: string) {
      // Cascade delete is handled by Prisma schema for related relations like Enrollment, etc.
      // But verify relations first
      await prisma.class.delete({ where: { id } });
      await redis.del(`leaderboard:${id}`);
  },

  async addAssistant(classId: string, email: string, name: string, password?: string) {
      const normalizedEmail = email.toLowerCase().trim();
      let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      
      if (!user) {
          if (!password) throw new AppError('Password required for new assistant user', 400);
          user = await prisma.user.create({
              data: {
                  email: normalizedEmail,
                  name,
                  password: await hashPassword(password),
                  role: (UserRole as any).STUDENT_ASSISTANT
              }
          });
      }

      // Link to class
      await prisma.class.update({
          where: { id: classId },
          data: {
              assistants: {
                  connect: { id: user.id }
              }
          } as any
      });

      return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  async removeAssistant(classId: string, assistantId: string) {
      await prisma.class.update({
          where: { id: classId },
          data: {
              assistants: {
                  disconnect: { id: assistantId }
              }
          } as any
      });
  },

  async verifyClassAccess(classId: string, userId: string, role: string) {
      if (role === (UserRole as any).SUPERADMIN) return true;
      
      const cls = await prisma.class.findUnique({
          where: { id: classId },
          include: { assistants: { select: { id: true } } } as any
      });
      
      if (!cls) return false;
      if (cls.createdByUserId === userId) return true;
      if ((cls as any).assistants.some((a: any) => a.id === userId)) return true;
      
      return false;
  },

  async updateScoringPresets(classId: string, presets: { id?: string, name: string, points: number }[]) {
      return await prisma.$transaction(async (tx: any) => {
          await tx.scoringPreset.deleteMany({
              where: { classId }
          });
          
          if (presets.length > 0) {
              await tx.scoringPreset.createMany({
                  data: presets.map((p: any) => ({
                      classId,
                      name: p.name,
                      points: p.points
                  }))
              });
          }
          
          return await tx.scoringPreset.findMany({
              where: { classId },
              orderBy: { createdAt: 'asc' }
          });
      });
  }
};
