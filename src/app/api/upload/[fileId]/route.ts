import { NextRequest, NextResponse } from 'next/server';
import { getFileFromStore } from '@/lib/file-storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

async function createPlaceholderPdfBuffer(fileName?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Uploaded Document (Session Expired)', {
    x: 50,
    y: 780,
    size: 16,
    font: boldFont,
    color: rgb(0.8, 0.2, 0.2),
  });
  page.drawText(`File name: ${fileName || 'Uploaded Document'}`, {
    x: 50,
    y: 750,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText('This file was uploaded in a previous session prior to server restart.', {
    x: 50,
    y: 720,
    size: 11,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText('Please re-upload this file from the Course File checklist to view full contents.', {
    x: 50,
    y: 700,
    size: 11,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await doc.save();
}

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

    const placeholderBytes = await createPlaceholderPdfBuffer(fileId);
    return new NextResponse(Buffer.from(placeholderBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileId}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

