import { NextRequest, NextResponse } from 'next/server';
import { getCourseFileById, getMergedChecklistItems, getSubjectById } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import { renderCleanCourseFileHtml, generatePdfBufferFromHtml } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — headless Chromium rendering needs more than the default

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || !['FACULTY', 'COORDINATOR', 'ADMIN'].includes(payload.role)) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await props.params;
    const courseFile = await getCourseFileById(id);
    if (!courseFile) {
      return noStoreJson({ error: 'Course file not found' }, { status: 404 });
    }

    const subject = courseFile.subjectId ? await getSubjectById(courseFile.subjectId) : null;
    if (payload.role === 'COORDINATOR' && subject?.evaluatorId !== payload.userId) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }

    const checklist = await getMergedChecklistItems(id);
    const htmlContent = renderCleanCourseFileHtml(courseFile, checklist, subject);
    const pdfBuffer = await generatePdfBufferFromHtml(htmlContent);

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
