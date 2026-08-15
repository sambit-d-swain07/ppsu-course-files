import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  const payload = token ? await verifyToken(token) : null;
  return payload?.role === Role.ADMIN ? payload : null;
}

export async function GET(req: NextRequest) {
  try {
    if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const [faculty, coordinators] = await Promise.all([
      prisma.user.findMany({
        where: { role: Role.FACULTY },
        include: { assignedCoordinator: { select: { id: true, name: true, email: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({ where: { role: Role.COORDINATOR }, orderBy: { name: 'asc' } })
    ]);
    return NextResponse.json({
      faculty: faculty.map((user) => ({
        id: user.id, name: user.name, email: user.email, employeeId: user.employeeId,
        department: user.department, school: user.school,
        assignedCoordinatorId: user.assignedCoordinatorId,
        assignedCoordinatorName: user.assignedCoordinator?.name ?? 'Unassigned'
      })),
      coordinators: coordinators.map((user) => ({
        id: user.id, name: user.name, email: user.email,
        department: user.department, designation: user.designation
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { facultyId, coordinatorId } = await req.json();
    if (!facultyId || !coordinatorId) return NextResponse.json({ error: 'facultyId and coordinatorId are required' }, { status: 400 });
    const coordinator = await prisma.user.findFirst({ where: { id: coordinatorId, role: Role.COORDINATOR } });
    if (!coordinator) return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    const faculty = await prisma.user.findFirst({ where: { id: facultyId, role: Role.FACULTY } });
    if (!faculty) return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
    await prisma.user.update({ where: { id: facultyId }, data: { assignedCoordinatorId: coordinatorId } });
    return NextResponse.json({ success: true, message: 'Coordinator assigned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
