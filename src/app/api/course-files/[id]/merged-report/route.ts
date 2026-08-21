import { NextRequest, NextResponse } from 'next/server';
import { getCourseFileById, getMergedChecklistItems, getSubjectById } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || !['COORDINATOR', 'ADMIN'].includes(payload.role)) return noStoreJson({ error: 'Only the evaluator or Admin can download the merged report.' }, { status: 403 });
    const { id } = await props.params;
    const courseFile = await getCourseFileById(id);
    if (!courseFile) return noStoreJson({ error: 'Course file not found' }, { status: 404 });
    const subject = courseFile.subjectId ? await getSubjectById(courseFile.subjectId) : null;
    if (payload.role === 'COORDINATOR' && subject?.evaluatorId !== payload.userId) return noStoreJson({ error: 'Forbidden' }, { status: 403 });

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const checklist = await getMergedChecklistItems(id);
    const lines: any[] = [
      new Paragraph({ text: 'Merged Course File Report', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `${courseFile.courseCode} — ${courseFile.courseTitle}` }),
      new Paragraph({ text: `Division: ${courseFile.division || subject?.division || 'N/A'} | Semester: ${courseFile.semester}` }),
      new Paragraph({ text: '' })
    ];
    for (const item of checklist) {
      lines.push(new Paragraph({ text: `Item ${item.itemIndex}: ${item.itemIndex === 9 ? 'Continuous Evaluation Rubrics' : item.itemIndex === 8 ? 'Laboratory Rubrics' : item.itemIndex === 2 ? 'Timetable' : item.itemIndex === 4 ? 'Student Name List' : 'Checklist Item'}`, heading: HeadingLevel.HEADING_2 }));
      if (item.batchSubmissions) {
        for (const batch of item.batchSubmissions) {
          let parsed: any = {};
          try { parsed = batch.subItemsJson ? JSON.parse(batch.subItemsJson) : {}; } catch (e) {}
          lines.push(new Paragraph({ children: [new TextRun({ text: `Batch ${batch.batch} — ${batch.status === 'PENDING' ? 'Pending' : batch.facultyName || 'Submitted'}`, bold: true })] }));
          if (parsed.students?.length) parsed.students.forEach((student: any) => lines.push(new Paragraph({ text: `${student.name || student.studentName || 'Student'} | ${student.enrolmentNumber || student.rollNo || ''} | ${JSON.stringify(student.marks || student)}` })));
          else if (batch.fileName || parsed.file?.fileName) lines.push(new Paragraph({ text: `Uploaded file: ${batch.fileName || parsed.file.fileName}` }));
        }
      } else {
        lines.push(new Paragraph({ text: item.fileName ? `Uploaded file: ${item.fileName}` : 'No batch merge required.' }));
      }
    }
    const buffer = await Packer.toBuffer(new Document({ sections: [{ children: lines }] }));
    return new NextResponse(buffer as BodyInit, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="merged-course-file-${id}.docx"`, 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Vary: 'Cookie' } });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Unable to generate merged report' }, { status: 500 });
  }
}
