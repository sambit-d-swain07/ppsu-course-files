import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import {
  getCourseFileById,
  getChecklistItemsByCourseFileId,
  getUserById,
  getSubjectById,
  getSubjectForCourseFile,
  getLabBatchForUser,
  getLabSubmission,
  getMergedChecklistItems,
  updateCourseFile,
  addNotification
} from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';

// ── DOCX generation helper ─────────────────────────────────────────────────
async function generateEvaluationReport(courseFileId: string): Promise<string | null> {
  try {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
      BorderStyle,
      HeadingLevel
    } = await import('docx');

    const cf = await getCourseFileById(courseFileId);
    if (!cf) return null;
    const faculty = await getUserById(cf.facultyId);
    const subject = cf.subjectId ? await getSubjectById(cf.subjectId) : null;
    const items = (await getChecklistItemsByCourseFileId(courseFileId)).sort(
      (a, b) => a.itemIndex - b.itemIndex
    );

    const checklistNames = [
      'Institute Vision, Mission & PEO, PSO & PO',
      'Time Table of the Faculty',
      'Course information sheet with course objectives, pre-requisites, course outcomes (Syllabus)',
      'Student Name List',
      'Department Academic Calendar',
      'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)',
      'List of Laboratory (or Experiments)',
      'Laboratory Rubrics',
      'Continuous Evaluation Rubrics',
      'Lab Manuals/Tutorials',
      'Internal Assessment 1',
      'Internal Assessment 2',
      'Assignment topics, sample assignment, marks statements',
      'Attendance register (ERP)',
      'University exam',
      'CO Attainment output sheet',
      'PO Attainment output sheet',
      'Action to be taken for next year based on CO attainment',
      'Lecture notes'
    ];

    const borderNone = {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 }
    };

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sr.', bold: true })] })], width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Checklist Item', bold: true })] })], width: { size: 52, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Max Marks', bold: true })] })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Marks Awarded', bold: true })] })], width: { size: 14, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Remarks', bold: true })] })], width: { size: 14, type: WidthType.PERCENTAGE } })
      ],
      tableHeader: true
    });

    const dataRows = items.map((item, idx) => {
      const name = checklistNames[idx] ?? `Item ${item.itemIndex}`;
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(item.itemIndex) })] }),
          new TableCell({ children: [new Paragraph({ text: name })] }),
          new TableCell({ children: [new Paragraph({ text: item.itemIndex === 19 ? '20' : '10', alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.score !== undefined ? String(item.score) : '-', alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.remarks ?? '' })] })
        ]
      });
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'PPSU — P P Savani University — School of Engineering',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: 'Course File Evaluation Report',
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Faculty & Course Details', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: `Faculty Name: `, bold: true }), new TextRun(cf.facultyName ?? faculty?.name ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Employee ID: `, bold: true }), new TextRun(faculty?.employeeId ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Department: `, bold: true }), new TextRun(cf.department ?? faculty?.department ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `School: `, bold: true }), new TextRun(cf.school ?? faculty?.school ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Division: `, bold: true }), new TextRun(cf.division ?? subject?.division ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Course Code: `, bold: true }), new TextRun(cf.courseCode)] }),
            new Paragraph({ children: [new TextRun({ text: `Course Title: `, bold: true }), new TextRun(cf.courseTitle)] }),
            new Paragraph({ children: [new TextRun({ text: `Semester: `, bold: true }), new TextRun(cf.semester)] }),
            new Paragraph({ children: [new TextRun({ text: `Academic Year: `, bold: true }), new TextRun(cf.academicYear)] }),
            new Paragraph({ children: [new TextRun({ text: `Lab Teachers: `, bold: true }), new TextRun([
              { batch: 'A', teacher: subject?.labTeacherA }, { batch: 'B', teacher: subject?.labTeacherB }, { batch: 'C', teacher: subject?.labTeacherC }
            ].filter(({ teacher }) => teacher).map(({ batch, teacher }) => `Batch ${batch}: ${teacher!.name}`).join(' | ') || 'None assigned')] }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Course File Details & Evaluation Checklist', heading: HeadingLevel.HEADING_2 }),
            new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Verification Details', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: `Course Faculty Signature: `, bold: true }), new TextRun(cf.facultyName ?? faculty?.name ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Reviewer Signature: `, bold: true }), new TextRun('Dr. S. Iyer')] }),
            new Paragraph({ children: [new TextRun({ text: `Grade/Marks out of 200: `, bold: true }), new TextRun(String(cf.totalScore ?? 0))] }),
            new Paragraph({ children: [new TextRun({ text: `Rating: `, bold: true }), new TextRun(cf.rating ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Quality of Course File: `, bold: true }), new TextRun(cf.rating ?? 'N/A')] }),
            new Paragraph({ children: [new TextRun({ text: `Overall Remarks: `, bold: true }), new TextRun(cf.coordinatorRemarks ?? '')] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: `Evaluation Date: `, bold: true }), new TextRun(new Date().toLocaleDateString('en-IN'))] })
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    const reportDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const fileName = `evaluation-${courseFileId}.docx`;
    fs.writeFileSync(path.join(reportDir, fileName), buffer);
    return `/generated/${fileName}`;
  } catch (e) {
    console.error('DOCX generation error:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courseFile = await getCourseFileById(id);
    if (!courseFile) {
      return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    }

    const faculty = await getUserById(courseFile.facultyId);
    const subject = courseFile.subjectId ? await getSubjectById(courseFile.subjectId) : null;
    const labBatch = payload.role === 'FACULTY' ? getLabBatchForUser(subject, payload.userId) : null;
    const isSubjectCoordinator = payload.role === 'FACULTY' && subject?.courseCoordinatorId === payload.userId;

    // Coordinator assignment guard
    if (payload.role === 'COORDINATOR') {
      if (subject ? subject.evaluatorId !== payload.userId : faculty?.assignedCoordinatorId && faculty.assignedCoordinatorId !== payload.userId) {
        return NextResponse.json({ error: 'Forbidden: Faculty member is not assigned to you' }, { status: 403 });
      }
    } else if (payload.role === 'FACULTY' && courseFile.facultyId !== payload.userId && !labBatch && !isSubjectCoordinator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let checklist: any[];
    if (labBatch) {
      const restrictedItems = await Promise.all([2, 4, 7, 8].map(async (itemIndex) => {
        const submission = await getLabSubmission(id, labBatch, itemIndex);
        return submission
          ? { ...submission, itemIndex, batch: labBatch }
          : { itemIndex, status: 'EMPTY', batch: labBatch, subItemsJson: JSON.stringify({ batch: labBatch }) };
      }));
      checklist = restrictedItems;
    } else {
      checklist = await getMergedChecklistItems(id);
    }

    return NextResponse.json({
      courseFile: {
        ...courseFile,
        faculty: faculty
          ? {
              id: faculty.id,
              name: faculty.name,
              employeeId: faculty.employeeId,
              department: faculty.department,
              school: faculty.school,
              designation: faculty.designation,
              email: faculty.email,
              assignedCoordinatorId: faculty.assignedCoordinatorId
            }
          : null,
        subject: subject ? {
          division: subject.division,
          labTeacherA: subject.labTeacherA ? { name: subject.labTeacherA.name, department: subject.labTeacherA.department } : null,
          labTeacherB: subject.labTeacherB ? { name: subject.labTeacherB.name, department: subject.labTeacherB.department } : null,
          labTeacherC: subject.labTeacherC ? { name: subject.labTeacherC.name, department: subject.labTeacherC.department } : null
        } : null,
        access: isSubjectCoordinator ? { mode: 'COURSE_COORDINATOR' } : labBatch ? { mode: 'LAB_BATCH', batch: labBatch, allowedItems: [2, 4, 7, 8] } : { mode: 'OWNER' }
      },
      checklistItems: checklist.sort((a, b) => a.itemIndex - b.itemIndex)
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

    const courseFile = await getCourseFileById(id);
    if (!courseFile) {
      return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    }

    const faculty = await getUserById(courseFile.facultyId);
    const subject = courseFile.subjectId ? await getSubjectById(courseFile.subjectId) : null;
    const isCoordinator = payload.role === 'COORDINATOR' || payload.role === 'ADMIN';

    if (!isCoordinator && courseFile.status === 'APPROVED') {
      return NextResponse.json({ error: 'This approved course file is permanently locked.' }, { status: 409 });
    }

    if (payload.role === 'COORDINATOR' && courseFile.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'This review is already closed. The course file must be resubmitted before it can be reviewed again.' }, { status: 409 });
    }

    // Coordinator assignment guard
    if (payload.role === 'COORDINATOR') {
      if (subject ? subject.evaluatorId !== payload.userId : faculty?.assignedCoordinatorId && faculty.assignedCoordinatorId !== payload.userId) {
        return NextResponse.json({ error: 'Forbidden: Faculty member is not assigned to you' }, { status: 403 });
      }
    } else if (payload.role === 'FACULTY' && courseFile.facultyId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      status,
      totalScore,
      rating,
      coordinatorRemarks,
      facultyName,
      department,
      school,
      semester,
      courseCode,
      courseTitle,
      facultySignatureName,
      facultySignatureUrl,
      facultySignedAt,
      facultyConfirmed,
      reviewerSignatureName,
      reviewerSignatureUrl,
      reviewerSignedAt,
      reviewerConfirmed
    } = body;

    if (!isCoordinator && status !== 'SUBMITTED' && status !== undefined) {
      return NextResponse.json({ error: 'Faculty may only submit a completed course file.' }, { status: 403 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (totalScore !== undefined) updates.totalScore = totalScore;
    if (rating !== undefined) updates.rating = rating;
    if (coordinatorRemarks !== undefined) updates.coordinatorRemarks = coordinatorRemarks;
    if (facultyName !== undefined) updates.facultyName = facultyName;
    if (department !== undefined) updates.department = department;
    if (school !== undefined) updates.school = school;
    if (semester !== undefined) updates.semester = semester;
    if (courseCode !== undefined) updates.courseCode = courseCode;
    if (courseTitle !== undefined) updates.courseTitle = courseTitle;

    if (facultySignatureName !== undefined) updates.facultySignatureName = facultySignatureName;
    if (facultySignatureUrl !== undefined) updates.facultySignatureUrl = facultySignatureUrl;
    if (facultySignedAt !== undefined) updates.facultySignedAt = facultySignedAt;
    if (facultyConfirmed !== undefined) updates.facultyConfirmed = facultyConfirmed;

    if (reviewerSignatureName !== undefined) updates.reviewerSignatureName = reviewerSignatureName;
    if (reviewerSignatureUrl !== undefined) updates.reviewerSignatureUrl = reviewerSignatureUrl;
    if (reviewerSignedAt !== undefined) updates.reviewerSignedAt = reviewerSignedAt;
    if (reviewerConfirmed !== undefined) updates.reviewerConfirmed = reviewerConfirmed;

    // SECTION 30: Score-Based Auto-Routing
    if (isCoordinator && totalScore !== undefined) {
      if (totalScore < 126) {
        updates.status = 'NEEDS_REVISION';
        await addNotification(
          courseFile.facultyId,
          `Your course file ${courseFile.courseCode} (${courseFile.courseTitle}) scored ${totalScore}/200 and has been returned for revision.`
        );
      } else if (totalScore >= 126 && totalScore <= 150) {
        updates.status = 'UNDER_REVIEW';
        await addNotification(
          'user-admin',
          `Course file ${courseFile.courseCode} (${courseFile.courseTitle}) scored ${totalScore}/200 and requires Admin secondary review.`
        );
      } else {
        updates.status = 'APPROVED';
        const reportPath = await generateEvaluationReport(id);
        if (reportPath) {
          updates.generatedReportPath = reportPath;
        }
        await addNotification(
          courseFile.facultyId,
          `Congratulations! Your course file ${courseFile.courseCode} (${courseFile.courseTitle}) has been approved (Score: ${totalScore}/200).`
        );
      }
      await updateCourseFile(id, updates);
    } else {
      await updateCourseFile(id, updates);
      if (status === 'SUBMITTED') {
        await addNotification(
          subject?.evaluatorId || faculty?.assignedCoordinatorId || 'user-2',
          `Course file ${courseFile.courseCode} submitted by ${faculty?.name || 'Faculty'}.`
        );
      }
    }

    const updated = await getCourseFileById(id);
    return NextResponse.json({ success: true, courseFile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
