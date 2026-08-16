import { NextRequest, NextResponse } from 'next/server';
import { updateChecklistItem, getCourseFileById } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: NextRequest, props: { params: Promise<{ courseFileId: string }> }) {
  try {
    const resolvedParams = await props.params;
    const { courseFileId } = resolvedParams;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courseFile = await getCourseFileById(courseFileId);
    if (!courseFile) return NextResponse.json({ error: 'Course file not found' }, { status: 404 });

    const body = await req.json();
    const { itemIndex, status, fileName, fileUrl, subItemsJson, score, remarks } = body;

    if (itemIndex === undefined || itemIndex < 1 || itemIndex > 20) {
      return NextResponse.json({ error: 'Invalid item index' }, { status: 400 });
    }

    const isCoordinator = payload.role === 'COORDINATOR' || payload.role === 'ADMIN';
    if (!isCoordinator && courseFile.facultyId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isCoordinator && !['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status)) {
      return NextResponse.json({ error: 'This course file is locked after submission.' }, { status: 409 });
    }
    if (!isCoordinator && (score !== undefined || remarks !== undefined)) {
      return NextResponse.json({ error: 'Only coordinators can score checklist items.' }, { status: 403 });
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (fileName !== undefined) updates.fileName = fileName;
    if (fileUrl !== undefined) updates.fileUrl = fileUrl;
    if (subItemsJson !== undefined) updates.subItemsJson = subItemsJson;
    if (score !== undefined) updates.score = score;
    if (remarks !== undefined) updates.remarks = remarks;

    const item = await updateChecklistItem(courseFileId, itemIndex, updates);

    return NextResponse.json({ success: true, checklistItem: item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
