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

    let rawFiles: any[];
    if (payload.role === 'ADMIN') {
      rawFiles = await getCourseFiles();
    } else if (payload.role === 'COORDINATOR') {
      rawFiles = await getCourseFilesForCoordinator(payload.userId);
    } else {
      rawFiles = await getCourseFilesByFacultyId(payload.userId);
    }

    const files = rawFiles.map((cf: any) => {
      const faculty = cf.faculty;
      const subject = cf.subject;
      const labBatch = payload.role === 'FACULTY' ? getLabBatchForUser(subject, payload.userId) : null;
      const isSubjectCoordinator = payload.role === 'FACULTY' && subject?.courseCoordinatorId === payload.userId;
      return {
        id: cf.id,
        courseCode: cf.courseCode,
        courseTitle: cf.courseTitle,
        semester: cf.semester,
        academicYear: cf.academicYear,
        progress: cf.progress,
        status: cf.status,
        facultyId: cf.facultyId,
        facultyName: cf.facultyName,
        department: cf.department,
        school: cf.school,
        division: cf.division || subject?.division || null,
        subjectId: cf.subjectId,
        createdAt: cf.createdAt?.toISOString ? cf.createdAt.toISOString() : cf.createdAt,
        lastUpdated: cf.lastUpdated?.toISOString ? cf.lastUpdated.toISOString() : cf.lastUpdated,
        facultySignatureName: cf.facultySignatureName,
        facultySignatureUrl: cf.facultySignatureUrl,
        facultySignedAt: cf.facultySignedAt?.toISOString ? cf.facultySignedAt.toISOString() : cf.facultySignedAt,
        facultyConfirmed: cf.facultyConfirmed,
        reviewerSignatureName: cf.reviewerSignatureName,
        reviewerSignatureUrl: cf.reviewerSignatureUrl,
        reviewerSignedAt: cf.reviewerSignedAt?.toISOString ? cf.reviewerSignedAt.toISOString() : cf.reviewerSignedAt,
        reviewerConfirmed: cf.reviewerConfirmed,
        totalScore: cf.totalScore,
        rating: cf.rating,
        coordinatorRemarks: cf.coordinatorRemarks,
        generatedReportPath: cf.generatedReportPath,
        access: isSubjectCoordinator ? { mode: 'COURSE_COORDINATOR' } : labBatch ? { mode: 'LAB_BATCH', batch: labBatch, allowedItems: [2, 4, 8, 9, 14] } : { mode: 'OWNER' },
        faculty: faculty
          ? {
              id: faculty.id,
              name: faculty.name,
              employeeId: faculty.employeeId,
              department: faculty.department,
              school: faculty.school,
              assignedCoordinatorId: faculty.assignedCoordinatorId
            }
          : null,
        subject: subject
          ? {
              id: subject.id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              division: subject.division,
              semester: subject.semester,
              academicYear: subject.academicYear,
              courseCoordinatorId: subject.courseCoordinatorId,
              courseCoordinator: subject.courseCoordinator
                ? {
                    id: subject.courseCoordinator.id,
                    name: subject.courseCoordinator.name,
                    email: subject.courseCoordinator.email,
                    department: subject.courseCoordinator.department
                  }
                : null,
              evaluatorId: subject.evaluatorId,
              evaluator: subject.evaluator
                ? {
                    id: subject.evaluator.id,
                    name: subject.evaluator.name,
                    email: subject.evaluator.email,
                    department: subject.evaluator.department
                  }
                : null
            }
          : null
      };
    });

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
