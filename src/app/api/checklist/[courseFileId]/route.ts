import { NextRequest, NextResponse } from 'next/server';
import { updateChecklistItem, getCourseFileById, getSubjectForCourseFile, getLabBatchForUser, getLabSubmission, upsertLabSubmission } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ courseFileId: string }> }) {
  try {
    const resolvedParams = await props.params;
    const { courseFileId } = resolvedParams;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const courseFile = await getCourseFileById(courseFileId);
    if (!courseFile) return noStoreJson({ error: 'Course file not found' }, { status: 404 });

    const subject = await getSubjectForCourseFile(courseFileId);
    const labBatch = payload.role === 'FACULTY' ? getLabBatchForUser(subject, payload.userId) : null;

    if (payload.role === 'COORDINATOR' && courseFile.status !== 'SUBMITTED') {
      return noStoreJson({ error: 'This review is already closed.' }, { status: 409 });
    }

    const body = await req.json();
    const { itemIndex, status, fileName, fileUrl, subItemsJson, score, remarks } = body;

    if (itemIndex === undefined || itemIndex < 1 || itemIndex > 20) {
      return noStoreJson({ error: 'Invalid item index' }, { status: 400 });
    }

    const isCoordinator = payload.role === 'COORDINATOR' || payload.role === 'ADMIN';
    if (!isCoordinator && courseFile.facultyId !== payload.userId && !labBatch) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isCoordinator && !['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status)) {
      return noStoreJson({ error: 'This course file is locked after submission.' }, { status: 409 });
    }
    if (labBatch && ![2, 4, 8, 14, 20].includes(Number(itemIndex))) {
      return noStoreJson({ error: `Batch ${labBatch} lab teachers may only edit Items 2, 4, 7, 8, and 20.` }, { status: 403 });
    }
    if (!isCoordinator && (score !== undefined || remarks !== undefined)) {
      return noStoreJson({ error: 'Only coordinators can score checklist items.' }, { status: 403 });
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (fileName !== undefined) updates.fileName = fileName;
    if (fileUrl !== undefined) updates.fileUrl = fileUrl;
    if (subItemsJson !== undefined) updates.subItemsJson = subItemsJson;
    if (score !== undefined) updates.score = score;
    if (remarks !== undefined) updates.remarks = remarks;

    if (labBatch) {
      let taggedSubItems = subItemsJson;
      if (typeof taggedSubItems === 'string') {
        try { taggedSubItems = JSON.stringify({ ...JSON.parse(taggedSubItems), batch: labBatch }); } catch (e) { taggedSubItems = JSON.stringify({ batch: labBatch }); }
      } else if (taggedSubItems === undefined) {
        const existing = await getLabSubmission(courseFileId, labBatch, Number(itemIndex));
        if (existing?.subItemsJson) {
          try { taggedSubItems = JSON.stringify({ ...JSON.parse(existing.subItemsJson), batch: labBatch }); } catch (e) {}
        }
      }
      if (taggedSubItems !== undefined) updates.subItemsJson = taggedSubItems;
      const submission = await upsertLabSubmission(courseFileId, payload.userId, labBatch, Number(itemIndex), updates);
      return noStoreJson({ success: true, batch: labBatch, checklistItem: submission });
    }

    const item = await updateChecklistItem(courseFileId, itemIndex, updates);

    return noStoreJson({ success: true, checklistItem: item });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
