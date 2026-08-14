import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checklistNames, serializeChecklistItem, serializeCourseFile } from '@/lib/course-file-serialization';
import { verifyToken } from '@/lib/jwt';

async function getCourseFile(id: string) {
  return prisma.courseFile.findUnique({
    where: { id },
    include: { faculty: true, verification: true, checklist: { orderBy: { itemNo: 'asc' } } }
  });
}

async function generateEvaluationReport(courseFileId: string): Promise<string | null> {
  try {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } = await import('docx');
    const cf = await getCourseFile(courseFileId);
    if (!cf) return null;
    const items = cf.checklist;
    const borderNone = { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } };
    const header = new TableRow({ tableHeader: true, children: ['Sr.', 'Checklist Item', 'Max Marks', 'Marks Awarded', 'Remarks'].map((text) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })) });
    const rows = items.map((item) => new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ text: String(item.itemNo) })] }),
      new TableCell({ children: [new Paragraph({ text: item.particulars })] }),
      new TableCell({ children: [new Paragraph({ text: String(item.maxMarks), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: item.marksAwarded == null ? '-' : String(item.marksAwarded), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: item.remarks ?? '' })] })
    ] }));
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: 'PPSU — P P Savani University — School of Engineering', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'Course File Evaluation Report', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '' }), new Paragraph({ text: 'Faculty & Course Details', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: 'Faculty Name: ', bold: true }), new TextRun(cf.faculty.name)] }),
      new Paragraph({ children: [new TextRun({ text: 'Employee ID: ', bold: true }), new TextRun(cf.faculty.employeeId ?? 'N/A')] }),
      new Paragraph({ children: [new TextRun({ text: 'Department: ', bold: true }), new TextRun(cf.department)] }),
      new Paragraph({ children: [new TextRun({ text: 'School: ', bold: true }), new TextRun(cf.school)] }),
      new Paragraph({ children: [new TextRun({ text: 'Course Code: ', bold: true }), new TextRun(cf.courseCode)] }),
      new Paragraph({ children: [new TextRun({ text: 'Course Title: ', bold: true }), new TextRun(cf.courseTitle)] }),
      new Paragraph({ children: [new TextRun({ text: 'Semester: ', bold: true }), new TextRun(cf.semester)] }),
      new Paragraph({ text: '' }), new Paragraph({ text: 'Course File Details & Evaluation Checklist', heading: HeadingLevel.HEADING_2 }),
      new Table({ rows: [header, ...rows], width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...borderNone } }),
      new Paragraph({ text: '' }), new Paragraph({ text: 'Verification Details', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: 'Course Faculty Signature: ', bold: true }), new TextRun(cf.faculty.name)] }),
      new Paragraph({ children: [new TextRun({ text: 'Reviewer Signature: ', bold: true }), new TextRun('Dr. S. Iyer')] }),
      new Paragraph({ children: [new TextRun({ text: 'Grade/Marks out of 200: ', bold: true }), new TextRun(String(cf.verification?.totalMarks ?? 0))] }),
      new Paragraph({ children: [new TextRun({ text: 'Rating: ', bold: true }), new TextRun(cf.verification?.qualityRating ?? 'N/A')] }),
      new Paragraph({ children: [new TextRun({ text: 'Evaluation Date: ', bold: true }), new TextRun(new Date().toLocaleDateString('en-IN'))] })
    ] }] });
    const reportDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const fileName = `evaluation-${courseFileId}.docx`;
    fs.writeFileSync(path.join(reportDir, fileName), await Packer.toBuffer(doc));
    return `/generated/${fileName}`;
  } catch (error) {
    console.error('DOCX generation error:', error);
    return null;
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!await verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const courseFile = await getCourseFile(id);
    if (!courseFile) return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    return NextResponse.json({
      courseFile: serializeCourseFile(courseFile),
      checklistItems: courseFile.checklist.map((item) => serializeChecklistItem(item, courseFile.uploadedFileName, courseFile.uploadedFileUrl))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const courseFile = await getCourseFile(id);
    if (!courseFile) return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    const body = await req.json();
    const { status, totalScore, rating, department, school, uploadedFileUrl, uploadedFileName } = body;
    const isCoordinator = payload.role === Role.COORDINATOR || payload.role === Role.ADMIN;
    if (!isCoordinator && courseFile.facultyId !== payload.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isCoordinator && status !== 'SUBMITTED' && status !== undefined) return NextResponse.json({ error: 'Faculty may only submit a completed course file.' }, { status: 403 });
    if (isCoordinator && status === 'SUBMITTED') return NextResponse.json({ error: 'Coordinators cannot submit faculty files.' }, { status: 403 });

    const nextStatus = status as Status | undefined;
    const updated = await prisma.courseFile.update({
      where: { id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus === Status.SUBMITTED ? { submittedAt: new Date() } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(school !== undefined ? { school } : {}),
        ...(uploadedFileUrl !== undefined ? { uploadedFileUrl } : {}),
        ...(uploadedFileName !== undefined ? { uploadedFileName } : {})
      }
    });

    if (isCoordinator && (totalScore !== undefined || rating !== undefined || nextStatus === Status.APPROVED)) {
      await prisma.verification.upsert({
        where: { courseFileId: id },
        create: { courseFileId: id, totalMarks: totalScore ?? null, qualityRating: rating ?? null, reviewerId: payload.userId, reviewerSignedAt: nextStatus === Status.APPROVED ? new Date() : null },
        update: { ...(totalScore !== undefined ? { totalMarks: totalScore } : {}), ...(rating !== undefined ? { qualityRating: rating } : {}), reviewerId: payload.userId, ...(nextStatus === Status.APPROVED ? { reviewerSignedAt: new Date() } : {}) }
      });
    }

    if (nextStatus === Status.SUBMITTED) {
      await prisma.notification.create({ data: { recipientRole: Role.COORDINATOR, courseFileId: id, message: `${courseFile.faculty.name} submitted ${courseFile.courseCode} — ${courseFile.courseTitle} for review` } });
    }
    if (nextStatus === Status.NEEDS_REVISION || nextStatus === Status.APPROVED) {
      const message = nextStatus === Status.APPROVED ? `${courseFile.courseCode} — ${courseFile.courseTitle} has been approved by the coordinator` : `Revision requested on ${courseFile.courseCode} — ${courseFile.courseTitle}`;
      await prisma.notification.create({ data: { recipientRole: Role.FACULTY, courseFileId: id, message } });
    }
    if (nextStatus === Status.APPROVED) {
      const reportUrl = await generateEvaluationReport(id);
      if (reportUrl) await prisma.courseFile.update({ where: { id }, data: { generatedReportUrl: reportUrl } });
    }

    const finalCourseFile = await getCourseFile(id);
    return NextResponse.json({ success: true, courseFile: serializeCourseFile(finalCourseFile) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
