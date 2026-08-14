import { Role, Status } from '@prisma/client';

export const checklistNames = [
  'Institute Vision, Mission & PEO, PSO & PO',
  'Time Table of the Faculty',
  'Course information sheet with course objectives, pre-requisites, course outcomes (Syllabus)',
  'Student Name List',
  'Department Academic Calendar',
  'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)',
  'List of Laboratory (or Experiments)',
  'Laboratory Rubrics',
  'Continuous Evaluation sheet based on rubrics',
  'Lab Manuals/Tutorials',
  'Internal Assessment 1',
  'Internal Assessment 2',
  'Assignment topics, sample assignment, marks statements',
  'Attendance register',
  'University exam',
  'CO Attainment output sheet',
  'PO Attainment output sheet',
  'Action to be taken for next year based on CO attainment',
  'Lecture notes'
];

export function currentAcademicYear() {
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export function maxMarks(itemNo: number) {
  return itemNo === 19 ? 20 : 10;
}

export function serializeChecklistItem(item: any, uploadedFileName?: string | null, uploadedFileUrl?: string | null) {
  return {
    id: item.id,
    courseFileId: item.courseFileId,
    itemIndex: item.itemNo,
    status: uploadedFileUrl ? 'UPLOADED' : 'EMPTY',
    fileName: uploadedFileName ?? undefined,
    fileUrl: uploadedFileUrl ?? undefined,
    score: item.marksAwarded ?? undefined,
    remarks: item.remarks ?? undefined,
    particulars: item.particulars,
    maxMarks: item.maxMarks
  };
}

export function serializeCourseFile(courseFile: any) {
  const progress = courseFile.uploadedFileUrl
    ? courseFile.status === Status.DRAFT ? 0 : 19
    : 0;
  return {
    id: courseFile.id,
    courseCode: courseFile.courseCode,
    courseTitle: courseFile.courseTitle,
    semester: courseFile.semester,
    academicYear: currentAcademicYear(),
    progress,
    status: courseFile.status,
    facultyId: courseFile.facultyId,
    facultyName: courseFile.faculty?.name,
    department: courseFile.department,
    school: courseFile.school,
    createdAt: courseFile.createdAt?.toISOString?.() ?? courseFile.createdAt,
    lastUpdated: courseFile.updatedAt?.toISOString?.() ?? courseFile.updatedAt,
    totalScore: courseFile.verification?.totalMarks ?? undefined,
    rating: courseFile.verification?.qualityRating ?? undefined,
    coordinatorRemarks: undefined,
    generatedReportPath: courseFile.generatedReportUrl ?? undefined,
    faculty: courseFile.faculty
      ? {
          id: courseFile.faculty.id,
          name: courseFile.faculty.name,
          employeeId: courseFile.faculty.employeeId,
          department: courseFile.faculty.department,
          school: courseFile.faculty.school,
          designation: courseFile.faculty.designation,
          email: courseFile.faculty.email
        }
      : undefined
  };
}

export function roleForNotification(role: string) {
  return role as Role;
}
