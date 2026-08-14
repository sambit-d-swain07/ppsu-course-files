import { PrismaClient, Role, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const checklistNames = [
  'Institute Vision, Mission & PEO, PSO & PO', 'Time Table of the Faculty',
  'Course information sheet with course objectives, pre-requisites, course outcomes (Syllabus)',
  'Student Name List', 'Department Academic Calendar',
  'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)',
  'List of Laboratory (or Experiments)', 'Laboratory Rubrics',
  'Continuous Evaluation sheet based on rubrics', 'Lab Manuals/Tutorials',
  'Internal Assessment 1', 'Internal Assessment 2',
  'Assignment topics, sample assignment, marks statements', 'Attendance register',
  'University exam', 'CO Attainment output sheet', 'PO Attainment output sheet',
  'Action to be taken for next year based on CO attainment', 'Lecture notes'
];

async function main() {
  const passwordHash = await bcrypt.hash('123', 10);
  const faculty = await prisma.user.upsert({
    where: { email: 'aakash@ppsu.ac.in' },
    update: { name: 'Mr. Aakash Gupta', passwordHash, role: Role.FACULTY, employeeId: 'CE00123', department: 'Computer Engineering', school: 'School of Engineering', designation: 'Assistant Professor' },
    create: { email: 'aakash@ppsu.ac.in', name: 'Mr. Aakash Gupta', passwordHash, role: Role.FACULTY, employeeId: 'CE00123', department: 'Computer Engineering', school: 'School of Engineering', designation: 'Assistant Professor' }
  });
  const coordinator = await prisma.user.upsert({
    where: { email: 'cc@ppsu.ac.in' },
    update: { name: 'Dr. S. Iyer', passwordHash, role: Role.COORDINATOR, designation: 'Faculty Coordinator' },
    create: { email: 'cc@ppsu.ac.in', name: 'Dr. S. Iyer', passwordHash, role: Role.COORDINATOR, designation: 'Faculty Coordinator' }
  });

  await prisma.notification.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.checklistScore.deleteMany();
  await prisma.courseFile.deleteMany();

  const samples = [
    { courseCode: 'SEIT2102', courseTitle: 'Web Technologies', semester: 'Semester III', status: Status.DRAFT, uploadedFileUrl: null, uploadedFileName: null },
    { courseCode: 'SEIT1210', courseTitle: 'Python for Engineers', semester: 'Semester I', status: Status.SUBMITTED, uploadedFileUrl: '/uploads/cf2_combined.pdf', uploadedFileName: 'python_for_engineers_course_file.pdf' },
    { courseCode: 'SEIT2010', courseTitle: 'Data Structures', semester: 'Semester III', status: Status.NEEDS_REVISION, uploadedFileUrl: '/uploads/cf3_combined.pdf', uploadedFileName: 'data_structures_course_file.pdf' }
  ];

  for (const sample of samples) {
    const courseFile = await prisma.courseFile.create({
      data: { ...sample, facultyId: faculty.id, department: 'Computer Engineering', school: 'School of Engineering', submittedAt: sample.status === Status.DRAFT ? null : new Date() }
    });
    await prisma.checklistScore.createMany({
      data: checklistNames.map((particulars, index) => ({
        courseFileId: courseFile.id, itemNo: index + 1, particulars, maxMarks: index === 18 ? 20 : 10,
        marksAwarded: sample.status === Status.NEEDS_REVISION ? (index === 10 || index === 11 ? 5 : index === 18 ? 18 : 9) : null,
        remarks: sample.status === Status.NEEDS_REVISION && (index === 10 || index === 11) ? 'Sample answer sheets are missing from the upload.' : null
      }))
    });
    if (sample.status === Status.NEEDS_REVISION) {
      await prisma.verification.create({ data: { courseFileId: courseFile.id, totalMarks: 162, qualityRating: 'Good', reviewerId: coordinator.id } });
    }
  }

  await prisma.notification.createMany({ data: [
    { recipientRole: Role.FACULTY, courseFileId: (await prisma.courseFile.findFirstOrThrow({ where: { courseCode: 'SEIT2010' } })).id, message: 'Revision requested on SEIT2010 — Data Structures' },
    { recipientRole: Role.COORDINATOR, courseFileId: (await prisma.courseFile.findFirstOrThrow({ where: { courseCode: 'SEIT1210' } })).id, message: 'Aakash Gupta submitted SEIT1210 — Python for Engineers for review' }
  ] });
}

main().finally(() => prisma.$disconnect());
