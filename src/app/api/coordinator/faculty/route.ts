import { NextRequest } from 'next/server';
import { getAssignedFacultySummary } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['COORDINATOR', 'ADMIN'].includes(payload.role)) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }
    return noStoreJson({ faculty: await getAssignedFacultySummary(payload.userId) });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
