import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) {
      return noStoreJson({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return noStoreJson({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return noStoreJson({ error: 'User not found' }, { status: 404 });
    }

    // Don't return password hash
    const { passwordHash, ...safeUser } = user;
    return noStoreJson({ user: safeUser });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
