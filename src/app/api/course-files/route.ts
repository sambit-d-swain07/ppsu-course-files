import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseFiles,
  getCourseFilesByFacultyId,
  getCourseFilesForCoordinator,
  getUserById,
  createCourseFile
} from '@/lib/mock-data';
import { CourseFile } from '@/lib/db-types';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let rawFiles: CourseFile[];
    if (payload.role === 'ADMIN') {
      rawFiles = await getCourseFiles();
    } else if (payload.role === 'COORDINATOR') {
      rawFiles = await getCourseFilesForCoordinator(payload.userId);
    } else {
      rawFiles = await getCourseFilesByFacultyId(payload.userId);
    }

    const files = await Promise.all(rawFiles.map(async (cf: CourseFile) => {
      const faculty = await getUserById(cf.facultyId);
      return {
        ...cf,
        faculty: faculty
          ? {
              id: faculty.id,
              name: faculty.name,
              employeeId: faculty.employeeId,
              department: faculty.department,
              school: faculty.school,
              assignedCoordinatorId: faculty.assignedCoordinatorId
            }
          : null
      };
    }));

    return NextResponse.json({ courseFiles: files });
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

    // Only faculty can create
    if (payload.role !== 'FACULTY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { courseCode, courseTitle, semester, academicYear, facultyName, department, school } = body;

    if (!courseCode || !courseTitle || !semester || !academicYear) {
      return NextResponse.json(
        { error: 'courseCode, courseTitle, semester and academicYear are required' },
        { status: 400 }
      );
    }

    const newFile = await createCourseFile({
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      semester,
      academicYear,
      facultyId: payload.userId,
      facultyName: facultyName?.trim(),
      department: department?.trim(),
      school: school?.trim()
    });

    return NextResponse.json({ courseFile: newFile }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
