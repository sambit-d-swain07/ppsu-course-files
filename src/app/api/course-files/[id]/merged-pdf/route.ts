import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseFileDetailWithChecklist,
  getSubjectById,
  getSubjectSharedDocuments,
  getSchoolSharedDocuments,
  normalizeSchoolCode,
  mergeChecklistItemsInMemory
} from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import { generatePdfBuffer } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || !['FACULTY', 'COORDINATOR', 'ADMIN'].includes(payload.role)) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await props.params;
    const courseFile = await getCourseFileDetailWithChecklist(id);
    if (!courseFile) {
      return noStoreJson({ error: 'Course file not found' }, { status: 404 });
    }

    const subject = courseFile.subject || (courseFile.subjectId ? await getSubjectById(courseFile.subjectId) : null);
    if (payload.role === 'COORDINATOR' && subject?.evaluatorId !== payload.userId) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }

    const targetSubjectId = subject?.id || courseFile.subjectId;
    const schoolCode = normalizeSchoolCode(subject?.school || courseFile.school);
    const subjectSharedDocs = targetSubjectId ? await getSubjectSharedDocuments(targetSubjectId) : [];
    const schoolSharedDocs = schoolCode ? await getSchoolSharedDocuments(schoolCode) : [];
    const checklist = mergeChecklistItemsInMemory(
      courseFile.checklistItems || [],
      courseFile.labSubmissions || [],
      subject,
      subjectSharedDocs,
      schoolSharedDocs
    );

    const pdfBuffer = await generatePdfBuffer(courseFile, checklist, subject);
    const safeCode = (courseFile.courseCode || 'course-file').replace(/[^a-z0-9_-]/gi, '_');

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="merged-course-file-${safeCode}.pdf"`,
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        Vary: 'Cookie'
      }
    });
  } catch (error: any) {
    console.error('Merged PDF API error:', error);
    return noStoreJson({ error: error.message || 'Unable to generate merged PDF' }, { status: 500 });
  }
}
