import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseFiles,
  getCourseFilesByFacultyId,
  getCourseFilesForCoordinator,
  getUserById,
  getSubjectForCourseFile,
  getLabBatchForUser,
} from '@/lib/mock-data';
import { CourseFile } from '@/lib/db-types';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

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
      const subject = await getSubjectForCourseFile(cf.id);
      const labBatch = payload.role === 'FACULTY' ? getLabBatchForUser(subject, payload.userId) : null;
      const isSubjectCoordinator = payload.role === 'FACULTY' && subject?.courseCoordinatorId === payload.userId;
      return {
        ...cf,
        access: isSubjectCoordinator ? { mode: 'COURSE_COORDINATOR' } : labBatch ? { mode: 'LAB_BATCH', batch: labBatch, allowedItems: [2, 4, 8, 14, 20] } : { mode: 'OWNER' },
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

    return noStoreJson({ courseFiles: files });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    return noStoreJson({ error: 'Course files are created only through Admin Subject Allocation' }, { status: 403 });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
