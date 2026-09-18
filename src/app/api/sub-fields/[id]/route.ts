import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';
import { getSchoolSharedDocuments, normalizeSchoolCode } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const school = searchParams.get('school') || 'SOE';
    const subKey = searchParams.get('subKey') || 'vision';
    const itemIndex = Number(id) || 1;

    const schoolCode = normalizeSchoolCode(school);
    const docs = await getSchoolSharedDocuments(schoolCode);
    const item1Doc = docs.find((d: any) => d.itemIndex === itemIndex);

    let subItems: any = {};
    if (item1Doc?.subItemsJson) {
      try { subItems = JSON.parse(item1Doc.subItemsJson); } catch (e) {}
    }

    const targetSub = subItems[subKey] || {};

    return noStoreJson({
      id,
      subKey,
      school: schoolCode,
      input_mode: targetSub.inputMode || (targetSub.fileName ? 'file' : 'text'),
      text_content: targetSub.textContent || '',
      fileName: targetSub.fileName || null,
      fileUrl: targetSub.fileUrl || null,
      lastSavedBy: targetSub.lastSavedBy || null,
      lastSavedAt: targetSub.lastSavedAt || targetSub.textDate || null,
      hasData: Boolean(targetSub.fileName || targetSub.textContent?.trim())
    });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
