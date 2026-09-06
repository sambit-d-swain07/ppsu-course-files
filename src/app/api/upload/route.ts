import { NextRequest, NextResponse } from 'next/server';
import { saveFileToStore } from '@/lib/file-storage';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return noStoreJson({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const mimeType = file.type || 'application/pdf';
    const fileUrl = saveFileToStore(fileId, buffer, mimeType, file.name);

    return noStoreJson({
      success: true,
      fileId,
      fileUrl,
      fileName: file.name,
      mimeType,
      size: buffer.length
    });
  } catch (err: any) {
    return noStoreJson({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
