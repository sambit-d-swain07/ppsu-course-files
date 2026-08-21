import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationsAsRead } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const notifs = await getNotifications(payload.userId);
  return noStoreJson({ notifications: notifs });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  await markNotificationsAsRead(payload.userId);
  return noStoreJson({ success: true });
}
