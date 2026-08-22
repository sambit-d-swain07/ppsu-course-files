import { NextRequest } from 'next/server';
import { getFacultyUnderCourseCoordinator, getAssignedFacultySummary } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }
    const faculty = await getFacultyUnderCourseCoordinator(payload.userId);
    // Fallback to evaluator summary if faculty list is empty and user is evaluator
    const summary = faculty.length ? faculty : await getAssignedFacultySummary(payload.userId);
    return noStoreJson({ faculty: summary });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
