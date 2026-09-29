import { NextRequest, NextResponse } from 'next/server';
import { updateChecklistItem, updateChecklistItemsBatch, getCourseFileById, getSubjectForCourseFile, getLabBatchForUser, getLabSubmission, upsertLabSubmission } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import { getSubjectRoles, canUserEditItem, canUserEditBatchData, getBatchOwnerInfo, LAB_ITEMS } from '@/lib/subject-access';

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

    if (payload.role === 'COORDINATOR' && courseFile.status === 'APPROVED') {
      return noStoreJson({ error: 'This course file has already been approved and is locked.' }, { status: 409 });
    }

    const body = await req.json();

    // Batch items processing for Coordinator Evaluation scoring
    if (Array.isArray(body.items)) {
      const isCoordinator = payload.role === 'COORDINATOR' || payload.role === 'ADMIN';
      if (!isCoordinator) {
        return noStoreJson({ error: 'Forbidden' }, { status: 403 });
      }
      const batchList = body.items.map((it: any) => ({
        itemIndex: Number(it.itemIndex),
        updates: {
          score: it.score,
          remarks: it.remarks
        }
      }));
      const items = await updateChecklistItemsBatch(courseFileId, batchList);
      return noStoreJson({ success: true, checklistItems: items });
    }

    const { itemIndex, status, fileName, fileUrl, subItemsJson, score, remarks } = body;

    if (itemIndex === undefined || itemIndex < 1 || itemIndex > 20) {
      return noStoreJson({ error: 'Invalid item index' }, { status: 400 });
    }

    const isCoordinator = payload.role === 'COORDINATOR' || payload.role === 'ADMIN';
    const numItem = Number(itemIndex);

    // Compute subject roles for current user
    const roles = getSubjectRoles(payload.userId, subject);

    if (!isCoordinator) {
      if (roles.accessLevel === 'NONE') {
        return noStoreJson({ error: 'Forbidden: You have no active teaching role on this subject.' }, { status: 403 });
      }
      if (!['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status)) {
        return noStoreJson({ error: 'This course file is locked after submission.' }, { status: 409 });
      }
      // Check if user is allowed to edit this item index
      if (!canUserEditItem(payload.userId, subject, numItem)) {
        if (roles.accessLevel === 'LAB') {
          return noStoreJson({ error: `Lab Teachers may only edit Items ${LAB_ITEMS.join(', ')}. Item ${numItem} is locked.` }, { status: 403 });
        }
        return noStoreJson({ error: `You do not have permission to edit Item ${numItem}.` }, { status: 403 });
      }
    }

    if (numItem === 5 && payload.role !== 'ADMIN') {
      return noStoreJson({ error: 'Item 5 (Department Academic Calendar) is managed centrally by Admin only.' }, { status: 403 });
    }

    const isSubjectCoordinator = roles.isCourseCoordinator || payload.role === 'ADMIN';
    const isSharedCoordinatorItem = [1, 3, 6, 7, 10, 11, 12, 15].includes(numItem);
    if (isSharedCoordinatorItem && !isSubjectCoordinator) {
      const isTeacherSubFieldOnly = [6, 11, 12, 15].includes(numItem) && Boolean(subItemsJson);
      if (!isTeacherSubFieldOnly) {
        return noStoreJson({ error: 'This item is centrally managed by the Course Coordinator.' }, { status: 403 });
      }
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

    // Student Batch Row Ownership Enforcement for Items 4, 8, 14
    if (roles.accessLevel === 'LAB' && [4, 8, 14].includes(numItem) && subItemsJson) {
      try {
        const parsed = JSON.parse(subItemsJson);
        if (Array.isArray(parsed.students)) {
          const userBatches = roles.ownedBatches;
          for (const studentRow of parsed.students) {
            const rowBatch = String(studentRow.batch || 'A').toUpperCase().trim().replace(/^BATCH[-\s]*/i, '');
            if (!userBatches.includes(rowBatch)) {
              return noStoreJson({ error: `Forbidden: You are assigned to Batch ${userBatches.join(', ')} and cannot modify data for Batch ${rowBatch}.` }, { status: 403 });
            }
          }
        }
      } catch (e) {}
    }

    if (roles.accessLevel === 'LAB') {
      const primaryBatch = roles.ownedBatches[0] || 'A';
      let taggedSubItems = subItemsJson;
      if (typeof taggedSubItems === 'string') {
        try { taggedSubItems = JSON.stringify({ ...JSON.parse(taggedSubItems), batch: primaryBatch }); } catch (e) { taggedSubItems = JSON.stringify({ batch: primaryBatch }); }
      } else if (taggedSubItems === undefined) {
        const existing = await getLabSubmission(courseFileId, primaryBatch, numItem);
        if (existing?.subItemsJson) {
          try { taggedSubItems = JSON.stringify({ ...JSON.parse(existing.subItemsJson), batch: primaryBatch }); } catch (e) {}
        }
      }
      if (taggedSubItems !== undefined) updates.subItemsJson = taggedSubItems;
      const submission = await upsertLabSubmission(courseFileId, payload.userId, primaryBatch, numItem, updates);
      return noStoreJson({ success: true, batch: primaryBatch, checklistItem: submission });
    }

    const item = await updateChecklistItem(courseFileId, itemIndex, updates);

    return noStoreJson({ success: true, checklistItem: item });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
