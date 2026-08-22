import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import {
  getSubjectsByCoordinatorId,
  upsertSubjectSharedDocument,
  getSubjectById,
  SHARED_COORDINATOR_ITEM_INDICES,
  SCHOOL_OPTIONS,
  getSchoolSharedDocumentsForSchools,
  normalizeSchoolCode,
  upsertSchoolSharedDocument
} from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const subjects = await getSubjectsByCoordinatorId(payload.userId);
    const subjectSchools = subjects.map((subject: any) => subject.school).filter(Boolean);
    const schoolSharedDocuments = await getSchoolSharedDocumentsForSchools(subjectSchools);
    return noStoreJson({ subjects, schools: SCHOOL_OPTIONS, schoolSharedDocuments, sharedIndices: SHARED_COORDINATOR_ITEM_INDICES });
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

    const body = await req.json();
    const { subjectId, school, itemIndex, status, fileName, fileUrl, subItemsJson } = body;

    if (!itemIndex) {
      return noStoreJson({ error: 'itemIndex is required' }, { status: 400 });
    }

    if (!SHARED_COORDINATOR_ITEM_INDICES.includes(Number(itemIndex))) {
      return noStoreJson({ error: 'This item is not a Course Coordinator shared document.' }, { status: 400 });
    }

    if (Number(itemIndex) === 1) {
      if (!school) {
        return noStoreJson({ error: 'school is required for Item 1 shared documents' }, { status: 400 });
      }
      const schoolCode = normalizeSchoolCode(school);
      const coordinatorSubjects = await getSubjectsByCoordinatorId(payload.userId);
      const canUploadForSchool = payload.role === 'ADMIN' || coordinatorSubjects.some((subject: any) => normalizeSchoolCode(subject.school) === schoolCode);
      if (!canUploadForSchool) {
        return noStoreJson({ error: 'Forbidden: You are not assigned as Course Coordinator for this school' }, { status: 403 });
      }

      const doc = await upsertSchoolSharedDocument(schoolCode, Number(itemIndex), {
        status: status || 'UPLOADED',
        fileName: fileName || null,
        fileUrl: fileUrl || null,
        subItemsJson: subItemsJson !== undefined ? subItemsJson : null
      });

      return noStoreJson({ success: true, schoolSharedDocument: doc });
    }

    if (!subjectId) {
      return noStoreJson({ error: 'subjectId is required for this shared document' }, { status: 400 });
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
