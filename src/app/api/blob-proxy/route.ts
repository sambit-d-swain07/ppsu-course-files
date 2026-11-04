/**
 * /api/blob-proxy
 *
 * Authenticated streaming proxy for viewing and downloading private Vercel Blob files.
 * Because the Vercel Blob store is configured as Private, direct browser access
 * (e.g. <iframe src="https://...blob.vercel-storage.com/...">) returns HTTP 403 Forbidden.
 *
 * This route:
 * 1. Authenticates the user's session via the ppsu_auth_token cookie.
 * 2. Fetches the private blob using @vercel/blob's get() method (authenticated via OIDC / VERCEL_OIDC_TOKEN or token).
 * 3. Streams the file back to the browser with:
 *    - Appropriate Content-Type (e.g. application/pdf, image/png, text/csv)
 *    - Content-Disposition: inline (for viewer) or attachment (when download=1 is set)
 *    - Cache-Control: private, max-age=3600
 */

import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate user session
  const authToken = req.cookies.get('ppsu_auth_token')?.value;
  if (!authToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const payload = await verifyToken(authToken);
  if (!payload) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Extract query parameters
  const { searchParams } = new URL(req.url);
  const blobUrl = searchParams.get('url');
  const isDownload = searchParams.get('download') === '1' || searchParams.has('download');
  const customFileName = searchParams.get('filename');

  if (!blobUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const oidcToken =
      req.headers.get('x-vercel-oidc-token') ||
      process.env.VERCEL_OIDC_TOKEN;

    const result = await get(blobUrl, {
      access: 'private',
      ...(oidcToken ? { oidcToken } : {}),
      ...(process.env.BLOB_STORE_ID ? { storeId: process.env.BLOB_STORE_ID } : {}),
    });

    if (!result || !result.stream) {
      return new NextResponse('File not found', { status: 404 });
    }

    const contentType = result.blob.contentType || 'application/pdf';
    const rawPath = result.blob.pathname || blobUrl;
    const defaultName = rawPath.split('/').pop() || 'document.pdf';
    const fileName = customFileName || defaultName;
    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : `inline; filename="${encodeURIComponent(fileName)}"`;

    return new NextResponse(result.stream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[blob-proxy error]', err?.message || err);
    return new NextResponse(err?.message || 'Failed to fetch file from storage', { status: 500 });
  }
}

