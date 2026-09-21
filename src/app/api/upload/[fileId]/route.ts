import { NextRequest, NextResponse } from 'next/server';
import { getFileFromStore } from '@/lib/file-storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await props.params;
    const file = getFileFromStore(fileId);

    if (file) {
      const uint8Array = new Uint8Array(file.buffer);
      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': file.mimeType || 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // File not found — return 404 so the preview page shows a proper error
    return new NextResponse(
      JSON.stringify({ error: 'File not found. It may have been lost after a server restart. Please re-upload the file.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
