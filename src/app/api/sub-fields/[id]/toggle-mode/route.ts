import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import {
  getSchoolSharedDocuments,
  normalizeSchoolCode,
  upsertSchoolSharedDocument
} from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subKey, newMode, school = 'SOE' } = body;

    if (!subKey || !['file', 'text'].includes(newMode)) {
      return noStoreJson({ error: 'subKey and valid newMode (file | text) are required' }, { status: 400 });
    }

    const itemIndex = Number(id) || 1;
    const schoolCode = normalizeSchoolCode(school);

    const docs = await getSchoolSharedDocuments(schoolCode);
    const existingDoc = docs.find((d: any) => d.itemIndex === itemIndex);
    let existingSubJson: any = {};
    if (existingDoc?.subItemsJson) {
      try { existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}
    }

    const currentSub = existingSubJson[subKey] || {};
    const hasData = Boolean(currentSub.fileName || currentSub.textContent?.trim());

    existingSubJson[subKey] = {
      ...currentSub,
      inputMode: newMode
    };

    const doc = await upsertSchoolSharedDocument(schoolCode, itemIndex, {
      status: 'UPLOADED',
      subItemsJson: JSON.stringify(existingSubJson)
    });

    return noStoreJson({
      success: true,
      currentMode: newMode,
      hasData,
      schoolSharedDocument: doc
    });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
