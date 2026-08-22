import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/mock-data';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Invalid session' }, { status: 401 });

    const userId = payload.userId;

    // Return subjects where this user is the courseTeacher
    const subjects = await prisma.subject.findMany({
      where: { courseTeacherId: userId },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true,
        semester: true,
        academicYear: true,
        division: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return noStoreJson({ subjects });
  } catch (err: any) {
    return noStoreJson({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
