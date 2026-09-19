import { NextRequest, NextResponse } from 'next/server';
import { getFileFromStore } from '@/lib/file-storage';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

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

    // Fallback: decode sample PDF so iframe renders a valid PDF document instead of a 404 black box
    const base64Data = SAMPLE_PDF_DATA_URL.replace(/^data:application\/pdf;base64,/, '');
    const fallbackBuffer = Buffer.from(base64Data, 'base64');
    const uint8Array = new Uint8Array(fallbackBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
