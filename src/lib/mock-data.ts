import { PrismaClient } from '@prisma/client';
import { User, CourseFile, ChecklistItem, Notification } from './db-types';

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
  const file = await prisma.courseFile.findUnique({ where: { id } });
  return file ? toCourseFile(file) : undefined;
}
export async function getCourseFilesByFacultyId(facultyId: string) {
  return (await prisma.courseFile.findMany({ where: { facultyId } })).map(toCourseFile);
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
  const faculty = await prisma.user.findMany({ where: { role: 'FACULTY', assignedCoordinatorId: coordinatorId }, select: { id: true } });
  if (faculty.length === 0) return getCourseFiles();
  return (await prisma.courseFile.findMany({ where: { facultyId: { in: faculty.map(u => u.id) } } })).map(toCourseFile);
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
