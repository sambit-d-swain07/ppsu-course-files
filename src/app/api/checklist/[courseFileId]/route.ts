import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checklistNames, maxMarks, serializeChecklistItem } from '@/lib/course-file-serialization';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: NextRequest, props: { params: Promise<{ courseFileId: string }> }) {
  try {
    const { courseFileId } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courseFile = await prisma.courseFile.findUnique({ where: { id: courseFileId }, include: { faculty: true } });
    if (!courseFile) return NextResponse.json({ error: 'Course file not found' }, { status: 404 });
    const body = await req.json();
    const { itemIndex, status, fileName, fileUrl, score, remarks } = body;
    if (itemIndex === undefined || itemIndex < 1 || itemIndex > 19) return NextResponse.json({ error: 'Invalid item index' }, { status: 400 });

    const isCoordinator = payload.role === Role.COORDINATOR || payload.role === Role.ADMIN;
    if (!isCoordinator && courseFile.facultyId !== payload.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isCoordinator && !['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status)) return NextResponse.json({ error: 'This course file is locked after submission.' }, { status: 409 });
    if (!isCoordinator && (score !== undefined || remarks !== undefined)) return NextResponse.json({ error: 'Only coordinators can score checklist items.' }, { status: 403 });

    const updatedCourseFile = fileName !== undefined || fileUrl !== undefined || status === 'UPLOADED'
      ? await prisma.courseFile.update({ where: { id: courseFileId }, data: { uploadedFileName: fileName ?? courseFile.uploadedFileName, uploadedFileUrl: fileUrl ?? courseFile.uploadedFileUrl } })
      : courseFile;
    const existingItem = await prisma.checklistScore.findFirst({ where: { courseFileId, itemNo: itemIndex } });
    const item = existingItem
      ? await prisma.checklistScore.update({ where: { id: existingItem.id }, data: { ...(score !== undefined ? { marksAwarded: score } : {}), ...(remarks !== undefined ? { remarks } : {}) } })
      : await prisma.checklistScore.create({ data: { courseFileId, itemNo: itemIndex, particulars: checklistNames[itemIndex - 1], maxMarks: maxMarks(itemIndex), marksAwarded: score ?? null, remarks: remarks ?? null } });
    return NextResponse.json({ success: true, checklistItem: serializeChecklistItem(item, updatedCourseFile.uploadedFileName, updatedCourseFile.uploadedFileUrl) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
