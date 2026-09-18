import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import {
  getSchoolSharedDocuments,
  normalizeSchoolCode,
  upsertSchoolSharedDocument,
  getUserById
} from '@/lib/mock-data';
import { sanitizeHtml } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subKey, text_content, school = 'SOE' } = body;

    if (!subKey) {
      return noStoreJson({ error: 'subKey is required' }, { status: 400 });
    }

    const itemIndex = Number(id) || 1;
    const schoolCode = normalizeSchoolCode(school);

    const user = await getUserById(payload.userId);
    const lastSavedBy = user?.name || user?.email || 'Course Coordinator';
    const lastSavedAt = new Date().toISOString();

    const sanitizedText = sanitizeHtml(text_content);

    const docs = await getSchoolSharedDocuments(schoolCode);
    const existingDoc = docs.find((d: any) => d.itemIndex === itemIndex);
    let existingSubJson: any = {};
    if (existingDoc?.subItemsJson) {
      try { existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}
    }

    existingSubJson[subKey] = {
      ...(existingSubJson[subKey] || {}),
      inputMode: 'text',
      textContent: sanitizedText,
      lastSavedBy,
      lastSavedAt,
      textDate: new Date().toLocaleDateString('en-IN')
    };

    const doc = await upsertSchoolSharedDocument(schoolCode, itemIndex, {
      status: 'UPLOADED',
      subItemsJson: JSON.stringify(existingSubJson)
    });

    return noStoreJson({
      success: true,
      lastSavedAt,
      lastSavedBy,
      schoolSharedDocument: doc
    });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
