import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await prisma.notification.findMany({
    where: { recipientRole: payload.role as Role },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ notifications: notifications.map((notification) => ({
    id: notification.id,
    userId: payload.userId,
    message: notification.message,
    timestamp: notification.createdAt.toISOString(),
    read: notification.read
  })) });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.notification.updateMany({ where: { recipientRole: payload.role as Role }, data: { read: true } });
  return NextResponse.json({ success: true });
}
