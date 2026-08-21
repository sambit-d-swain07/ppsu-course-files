import { PrismaClient } from '@prisma/client';
import { User, CourseFile, ChecklistItem, Notification, Subject } from './db-types';

export const SAMPLE_PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQKJSDigqwKMSAwIG9iagoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iago yIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNjEyIDc5Ml0vUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vQ29udGVudHMgNSAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKNSAwIG9iago8PC9MZW5ndGggNzU+PnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzEyIFRkCihQUDMgU2F2YW5pIFVuaXZlcnNpdHkgLSBDb3Vyc2UgRmlsZSBPZmZpY2lhbCBDb3Vyc2UgRmlsZSkgVGoKRW5kCnN0cmVhbQplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4KJSVFT0YK';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const toUser = (u: any): User => ({ ...u, assignedCoordinatorId: u.assignedCoordinatorId ?? undefined });
const toCourseFile = (cf: any): CourseFile => ({
  ...cf,
  createdAt: cf.createdAt?.toISOString(),
  lastUpdated: cf.lastUpdated?.toISOString(),
  facultySignedAt: cf.facultySignedAt?.toISOString(),
  reviewerSignedAt: cf.reviewerSignedAt?.toISOString(),
});
const toNotification = (n: any): Notification => ({
  id: n.id, userId: n.userId, message: n.message, read: n.read, timestamp: n.createdAt.toISOString()
});

export async function getUsers() { return (await prisma.user.findMany()).map(toUser); }
export async function getUserByEmail(email: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  return user ? toUser(user) : undefined;
}
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toUser(user) : undefined;
}
export async function getCourseFiles() { return (await prisma.courseFile.findMany()).map(toCourseFile); }
export async function getCourseFileById(id: string) {
  let file = await prisma.courseFile.findUnique({ where: { id } });
  if (!file) {
    file = await prisma.courseFile.findFirst({ where: { subjectId: id } });
  }
  if (!file) {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (subject && subject.courseTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: subject.courseTeacherId } });
      if (teacher) {
        file = await prisma.$transaction(async (tx) => {
          return createSubjectCourseFile(tx, subject, teacher);
        });
      }
    }
  }
  return file ? toCourseFile(file) : undefined;
}
export async function getCourseFilesByFacultyId(facultyId: string) {
  const subjects = await prisma.subject.findMany({
    where: {
      OR: [
        { courseTeacherId: facultyId },
        { courseCoordinatorId: facultyId },
        { labTeacherAId: facultyId },
        { labTeacherBId: facultyId },
        { labTeacherCId: facultyId }
      ]
    }
  });

  for (const subject of subjects) {
    const existing = await prisma.courseFile.findFirst({ where: { subjectId: subject.id } });
    if (!existing && subject.courseTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: subject.courseTeacherId } });
      if (teacher) {
        await prisma.$transaction(async (tx) => {
          await createSubjectCourseFile(tx, subject, teacher);
        });
      }
    }
  }

  return (await prisma.courseFile.findMany({ where: {
    OR: [
      { facultyId },
      { subject: { OR: [{ courseCoordinatorId: facultyId }, { labTeacherAId: facultyId }, { labTeacherBId: facultyId }, { labTeacherCId: facultyId }] } }
    ]
  } })).map(toCourseFile);
}
export async function getCourseFileStatusCountsByFaculty() {
  const grouped = await prisma.courseFile.groupBy({
    by: ['facultyId', 'status'],
    _count: { _all: true }
  });
  return grouped.reduce<Record<string, { completed: number; pending: number; revision: number }>>((counts, row) => {
    const current = counts[row.facultyId] ?? { completed: 0, pending: 0, revision: 0 };
    if (row.status === 'APPROVED') current.completed = row._count._all;
    if (row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW') current.pending = row._count._all;
    if (row.status === 'NEEDS_REVISION') current.revision = row._count._all;
    counts[row.facultyId] = current;
    return counts;
  }, {});
}
export async function getCourseFilesForCoordinator(coordinatorId: string) {
  return (await prisma.courseFile.findMany({
    where: {
      OR: [
        { subject: { evaluatorId: coordinatorId } },
        { subjectId: null, faculty: { assignedCoordinatorId: coordinatorId } }
      ]
    }
  })).map(toCourseFile);
}

export async function getAssignedFacultySummary(coordinatorId: string) {
  const subjects = await prisma.subject.findMany({
    where: { evaluatorId: coordinatorId }
  });
  const subjectFacultyIds = subjects
    .map((s) => s.courseCoordinatorId)
    .filter((id): id is string => Boolean(id));

  const faculty = await prisma.user.findMany({
    where: {
      role: 'FACULTY',
      OR: [
        { assignedCoordinatorId: coordinatorId },
        ...(subjectFacultyIds.length ? [{ id: { in: subjectFacultyIds } }] : [])
      ]
    },
    orderBy: { name: 'asc' }
  });

  const courseFiles = faculty.length
    ? await prisma.courseFile.findMany({
        where: { facultyId: { in: faculty.map((member) => member.id) } },
        orderBy: { lastUpdated: 'desc' }
      })
    : [];

  return faculty.map((member) => {
    const files = courseFiles.filter((file) => file.facultyId === member.id);
    const statusCounts = {
      approved: files.filter((file) => file.status === 'APPROVED').length,
      underReview: files.filter((file) => file.status === 'SUBMITTED' || file.status === 'UNDER_REVIEW').length,
      needsRevision: files.filter((file) => file.status === 'NEEDS_REVISION').length,
      notSubmitted: files.filter((file) => file.status === 'DRAFT').length
    };
    return {
      id: member.id,
      name: member.name,
      employeeId: member.employeeId,
      department: member.department,
      school: member.school,
      designation: member.designation,
      totalCourseFiles: files.length,
      statusCounts,
      courseFiles: files.map((file) => ({
        id: file.id,
        courseCode: file.courseCode,
        courseTitle: file.courseTitle,
        semester: file.semester,
        academicYear: file.academicYear,
        status: file.status,
        lastUpdated: file.lastUpdated
      }))
    };
  });
}
export async function assignFacultyCoordinator(facultyId: string, coordinatorId: string) {
  const faculty = await prisma.user.findFirst({ where: { id: facultyId, role: 'FACULTY' } });
  if (!faculty) return false;
  await prisma.user.update({ where: { id: facultyId }, data: { assignedCoordinatorId: coordinatorId || null } });
  return true;
}

export async function createCourseFile(data: {
  courseCode: string; courseTitle: string; semester: string; academicYear: string; facultyId: string;
  facultyName?: string; department?: string; school?: string;
  division?: string;
}) {
  const faculty = await getUserById(data.facultyId);
  const subItems = (i: number) => i === 1
    ? JSON.stringify({ vision: null, mission: null, peo: null, pso: null, po: null })
    : i === 11 || i === 12
      ? JSON.stringify({ timetable: null, questionPaper: null, sampleAnswerSheet: null, additionalDocuments: [{ id: `doc-new-${i}-1`, name: 'Mark Statement & Result Analysis', fileName: null, fileUrl: null, fileType: null, uploadDate: null }] })
      : i === 15 ? JSON.stringify({ questionPaper: null, gradeSheet: null, resultAnalysis: null }) : null;
  const file = await prisma.$transaction(async tx => {
    const created = await tx.courseFile.create({ data: {
      ...data, facultyName: data.facultyName || faculty?.name, department: data.department || faculty?.department,
    school: data.school || faculty?.school, progress: 0, status: 'DRAFT'
    } });
    await tx.checklistItem.createMany({ data: Array.from({ length: 20 }, (_, index) => ({
      courseFileId: created.id, itemIndex: index + 1, status: 'EMPTY', subItemsJson: subItems(index + 1)
    })) });
    return created;
  });
  return toCourseFile(file);
}

const checklistSubItems = (i: number) => i === 1
  ? JSON.stringify({ vision: null, mission: null, peo: null, pso: null, po: null })
  : i === 11 || i === 12
    ? JSON.stringify({ timetable: null, questionPaper: null, sampleAnswerSheet: null, additionalDocuments: [{ id: `doc-new-${i}-1`, name: 'Mark Statement & Result Analysis', fileName: null, fileUrl: null, fileType: null, uploadDate: null }] })
    : i === 15 ? JSON.stringify({ questionPaper: null, gradeSheet: null, resultAnalysis: null }) : null;

async function createSubjectCourseFile(tx: any, subject: any, teacher: any) {
  const created = await tx.courseFile.create({ data: {
    courseCode: subject.subjectCode, courseTitle: subject.subjectName,
    semester: subject.semester, academicYear: subject.academicYear,
    facultyId: subject.courseTeacherId, facultyName: teacher.name,
    department: subject.department, school: subject.school, division: subject.division,
    subjectId: subject.id, progress: 0, status: 'DRAFT'
  } });
  await tx.checklistItem.createMany({ data: Array.from({ length: 20 }, (_, index) => ({
    courseFileId: created.id, itemIndex: index + 1, status: 'EMPTY', subItemsJson: checklistSubItems(index + 1)
  })) });
  return created;
}

const subjectInclude = {
  courseCoordinator: true, courseTeacher: true, labTeacherA: true, labTeacherB: true, labTeacherC: true, evaluator: true,
  courseFile: { select: { id: true, status: true } }
};

export async function getSubjects() {
  return (await prisma.subject.findMany({ include: subjectInclude, orderBy: { createdAt: 'desc' } })) as unknown as Subject[];
}

export async function getSubjectById(id: string) {
  return prisma.subject.findUnique({ where: { id }, include: subjectInclude });
}

export async function getSubjectForCourseFile(courseFileId: string) {
  const file = await prisma.courseFile.findUnique({ where: { id: courseFileId }, select: { subjectId: true } });
  return file?.subjectId ? getSubjectById(file.subjectId) : null;
}

export function getLabBatchForUser(subject: any, userId: string) {
  if (!subject || subject.courseTeacherId === userId || subject.courseCoordinatorId === userId) return null;
  if (subject.labTeacherAId === userId) return 'A';
  if (subject.labTeacherBId === userId) return 'B';
  if (subject.labTeacherCId === userId) return 'C';
  return undefined;
}

export async function getLabSubmission(courseFileId: string, batch: string, itemIndex: number) {
  return prisma.labChecklistSubmission.findUnique({ where: { courseFileId_batch_itemIndex: { courseFileId, batch, itemIndex } } });
}

export async function upsertLabSubmission(courseFileId: string, facultyId: string, batch: string, itemIndex: number, updates: Record<string, unknown>) {
  return prisma.labChecklistSubmission.upsert({
    where: { courseFileId_batch_itemIndex: { courseFileId, batch, itemIndex } },
    create: { courseFileId, facultyId, batch, itemIndex, ...updates },
    update: { facultyId, ...updates }
  });
}

export async function getLabSubmissions(courseFileId: string) {
  return prisma.labChecklistSubmission.findMany({ where: { courseFileId }, orderBy: [{ itemIndex: 'asc' }, { batch: 'asc' }] });
}

function withBatchJson(item: any, batch: string, facultyName?: string) {
  let parsed: any = {};
  try { parsed = item?.subItemsJson ? JSON.parse(item.subItemsJson) : {}; } catch (e) {}
  return { ...item, batch, facultyName, subItemsJson: JSON.stringify({ ...parsed, batch }) };
}

export async function getMergedChecklistItems(courseFileId: string) {
  const [items, submissions] = await Promise.all([getChecklistItemsByCourseFileId(courseFileId), getLabSubmissions(courseFileId)]);
  const subject = await getSubjectForCourseFile(courseFileId);
  const facultyNames = new Map<string, string>();
  if (subject?.labTeacherA) facultyNames.set('A', subject.labTeacherA.name);
  if (subject?.labTeacherB) facultyNames.set('B', subject.labTeacherB.name);
  if (subject?.labTeacherC) facultyNames.set('C', subject.labTeacherC.name);
  return items.map((item: any) => {
    if (![4, 8, 9].includes(item.itemIndex)) return item;
    const related = submissions.filter((submission: any) => submission.itemIndex === item.itemIndex);
    const assignedBatches = ['B', 'C'].filter((batch) => batch === 'B' ? Boolean(subject?.labTeacherBId) : Boolean(subject?.labTeacherCId));
    const existingBatches = new Set(related.map((submission: any) => submission.batch));
    const pending = assignedBatches.filter((batch) => !existingBatches.has(batch)).map((batch) => ({ batch, status: 'PENDING', subItemsJson: JSON.stringify({ batch, pending: true }), facultyName: facultyNames.get(batch) }));
    
    const batchSubmissions = [
      withBatchJson(item, 'A', facultyNames.get('A')),
      ...related.map((submission: any) => withBatchJson(submission, submission.batch, facultyNames.get(submission.batch))),
      ...pending
    ];

    // For Item 4, auto-merge all batch student lists into one combined list in subItemsJson
    let subItemsJson = item.subItemsJson;
    if (item.itemIndex === 4) {
      let combinedStudents: any[] = [];
      const seenIds = new Set();

      const parseStudents = (jsonStr?: string) => {
        if (!jsonStr) return [];
        try {
          const parsed = JSON.parse(jsonStr);
          return Array.isArray(parsed.students) ? parsed.students : [];
        } catch (e) {
          return [];
        }
      };

      // Add main/Course Teacher item students first
      parseStudents(item.subItemsJson).forEach((st: any) => {
        const id = st.id || st.enrolmentNumber;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          combinedStudents.push(st);
        }
      });

      // Add lab batch submissions students
      related.forEach((sub: any) => {
        parseStudents(sub.subItemsJson).forEach((st: any) => {
          const id = st.id || st.enrolmentNumber;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            combinedStudents.push(st);
          }
        });
      });

      let existingSubItems: any = {};
      try { existingSubItems = item.subItemsJson ? JSON.parse(item.subItemsJson) : {}; } catch (e) {}
      subItemsJson = JSON.stringify({ ...existingSubItems, students: combinedStudents });
    }

    return {
      ...item,
      subItemsJson,
      batchSubmissions,
      merged: true
    };
  });
}

export async function createSubject(data: {
  subjectCode: string; subjectName: string; department: string; school: string;
  division: string;
  semester: string; academicYear: string; courseCoordinatorId: string;
  courseTeacherId: string; labTeacherAId?: string | null; labTeacherBId?: string | null; labTeacherCId?: string | null; evaluatorId: string;
}) {
  return prisma.$transaction(async tx => {
    const subject = await tx.subject.create({ data: { ...data, labTeacherAId: data.labTeacherAId || null, labTeacherBId: data.labTeacherBId || null, labTeacherCId: data.labTeacherCId || null } });
    const teacher = await tx.user.findUnique({ where: { id: data.courseTeacherId } });
    if (!teacher) throw new Error('Course Teacher not found');
    await createSubjectCourseFile(tx, subject, teacher);
    return tx.subject.findUnique({ where: { id: subject.id }, include: subjectInclude });
  });
}

export async function updateSubject(id: string, data: {
  subjectCode: string; subjectName: string; department: string; school: string;
  division: string;
  semester: string; academicYear: string; courseCoordinatorId: string;
  courseTeacherId: string; labTeacherAId?: string | null; labTeacherBId?: string | null; labTeacherCId?: string | null; evaluatorId: string;
}) {
  return prisma.$transaction(async tx => {
    const subject = await tx.subject.update({ where: { id }, data: { ...data, labTeacherAId: data.labTeacherAId || null, labTeacherBId: data.labTeacherBId || null, labTeacherCId: data.labTeacherCId || null } });
    const teacher = await tx.user.findUnique({ where: { id: data.courseTeacherId } });
    if (!teacher) throw new Error('Course Teacher not found');
    const existing = await tx.courseFile.findUnique({ where: { subjectId: id } });
    if (!existing) await createSubjectCourseFile(tx, subject, teacher);
    else if (existing.status === 'DRAFT') await tx.courseFile.update({ where: { id: existing.id }, data: {
      courseCode: subject.subjectCode, courseTitle: subject.subjectName,
      department: subject.department, school: subject.school, division: subject.division, semester: subject.semester,
      academicYear: subject.academicYear, facultyId: subject.courseTeacherId, facultyName: teacher.name
    } });
    return tx.subject.findUnique({ where: { id }, include: subjectInclude });
  });
}

export async function getChecklistItemsByCourseFileId(courseFileId: string) {
  return prisma.checklistItem.findMany({ where: { courseFileId }, orderBy: { itemIndex: 'asc' } });
}

export async function updateChecklistItem(courseFileId: string, itemIndex: number, updates: Partial<Omit<ChecklistItem, 'id' | 'courseFileId' | 'itemIndex'>>) {
  return prisma.$transaction(async tx => {
    const item = await tx.checklistItem.upsert({
      where: { courseFileId_itemIndex: { courseFileId, itemIndex } },
      create: { courseFileId, itemIndex, status: updates.status ?? 'EMPTY', ...updates },
      update: updates
    });
    const items = await tx.checklistItem.findMany({ where: { courseFileId } });
    const progress = Math.min(20, items.filter(i => i.status === 'UPLOADED').length);
    await tx.courseFile.update({ where: { id: courseFileId }, data: { progress } });
    return item;
  });
}

export async function updateCourseFile(courseFileId: string, updates: Partial<Omit<CourseFile, 'id'>>) {
  const current = await prisma.courseFile.findUnique({ where: { id: courseFileId } });
  if (!current) return undefined;
  const data: Record<string, unknown> = { ...updates };
  delete data.createdAt; delete data.lastUpdated;
  for (const key of ['facultySignedAt', 'reviewerSignedAt']) {
    if (typeof data[key] === 'string') data[key] = new Date(data[key] as string);
  }
  const updated = await prisma.courseFile.update({ where: { id: courseFileId }, data });
  if (updates.status === 'SUBMITTED' && updates.status !== current.status) {
    const faculty = await getUserById(current.facultyId);
    if (current.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: current.subjectId }, select: { evaluatorId: true } });
      if (subject?.evaluatorId) {
        await addNotification(subject.evaluatorId, `${faculty?.name || 'Faculty'} submitted ${current.courseCode} for review`);
        return toCourseFile(updated);
      }
    }
    await addNotification(faculty?.assignedCoordinatorId || 'user-2', `${faculty?.name || 'Faculty'} submitted ${current.courseCode} — ${current.courseTitle} for review`);
  }
  return toCourseFile(updated);
}
export async function getNotifications(userId: string) {
  return (await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })).map(toNotification);
}
export async function addNotification(userId: string, message: string) {
  return toNotification(await prisma.notification.create({ data: { userId, message } }));
}
export async function markNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
}
