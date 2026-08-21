import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import { getSubjectsByCoordinatorId, upsertSubjectSharedDocument, getSubjectById, SHARED_COORDINATOR_ITEM_INDICES } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'COORDINATOR' && payload.role !== 'ADMIN') {
      return noStoreJson({ error: 'Forbidden: Course Coordinator access required' }, { status: 403 });
    }

    const subjects = await getSubjectsByCoordinatorId(payload.userId);
    return noStoreJson({ subjects, sharedIndices: SHARED_COORDINATOR_ITEM_INDICES });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'COORDINATOR' && payload.role !== 'ADMIN') {
      return noStoreJson({ error: 'Forbidden: Course Coordinator access required' }, { status: 403 });
    }

    const body = await req.json();
    const { subjectId, itemIndex, status, fileName, fileUrl, subItemsJson } = body;

    if (!subjectId || !itemIndex) {
      return noStoreJson({ error: 'subjectId and itemIndex are required' }, { status: 400 });
    }

    if (!SHARED_COORDINATOR_ITEM_INDICES.includes(Number(itemIndex))) {
      return noStoreJson({ error: 'This item is not a Course Coordinator shared document.' }, { status: 400 });
    }

    const subject = await getSubjectById(subjectId);
    if (!subject) return noStoreJson({ error: 'Subject not found' }, { status: 404 });

    if (payload.role !== 'ADMIN' && subject.courseCoordinatorId !== payload.userId) {
      return noStoreJson({ error: 'Forbidden: You are not the assigned Course Coordinator for this subject' }, { status: 403 });
    }

    const doc = await upsertSubjectSharedDocument(subjectId, Number(itemIndex), {
      status: status || 'UPLOADED',
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      subItemsJson: subItemsJson !== undefined ? subItemsJson : null
    });

    return noStoreJson({ success: true, sharedDocument: doc });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
