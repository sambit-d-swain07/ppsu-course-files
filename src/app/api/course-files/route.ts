import { NextRequest, NextResponse } from 'next/server';
import { Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serializeCourseFile } from '@/lib/course-file-serialization';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courseFiles = await prisma.courseFile.findMany({
      where: payload.role === Role.ADMIN
        ? undefined
        : payload.role === Role.COORDINATOR
          ? { faculty: { assignedCoordinatorId: payload.userId } }
          : { facultyId: payload.userId },
      include: { faculty: true, verification: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ courseFiles: courseFiles.map(serializeCourseFile) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== Role.FACULTY) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { courseCode, courseTitle, semester, department, school } = body;
    if (!courseCode || !courseTitle || !semester) {
      return NextResponse.json({ error: 'courseCode, courseTitle and semester are required' }, { status: 400 });
    }
    const faculty = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!faculty) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const courseFile = await prisma.courseFile.create({
      data: {
        courseCode: String(courseCode).trim().toUpperCase(),
        courseTitle: String(courseTitle).trim(),
        semester,
        facultyId: payload.userId,
        department: department?.trim() || faculty.department || '',
        school: school?.trim() || faculty.school || ''
      },
      include: { faculty: true, verification: true }
    });
    return NextResponse.json({ courseFile: serializeCourseFile(courseFile) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
