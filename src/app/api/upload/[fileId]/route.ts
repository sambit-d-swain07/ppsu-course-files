import { NextRequest, NextResponse } from 'next/server';
import { getFileFromStore } from '@/lib/file-storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await props.params;
    const file = getFileFromStore(fileId);

    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    const uint8Array = new Uint8Array(file.buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
