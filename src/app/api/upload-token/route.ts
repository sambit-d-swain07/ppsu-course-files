/**
 * /api/upload-token
 *
 * Generates a short-lived Vercel Blob client-upload token.
 * The client SDK calls this endpoint to obtain a token, then uploads the
 * file DIRECTLY to Vercel Blob — the file bytes never pass through this
 * Next.js route (or any other Next.js route), so Vercel's 4.5 MB
 * serverless body limit is completely avoided.
 *
 * Server-side enforcements applied here:
 *   • Authentication (ppsu_auth_token cookie required)
 *   • 50 MB per-file size cap (via Vercel Blob's maximumSizeInBytes)
 *   • Allowed content types whitelist
 */

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate the user before issuing an upload token
  const authToken = req.cookies.get('ppsu_auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyToken(authToken);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, _clientPayload) => {
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          // Embed userId in the token so onUploadCompleted can verify if needed
          tokenPayload: JSON.stringify({ userId: payload.userId, role: payload.role }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // The client is responsible for saving the blob.url to the database
        // via the existing /api/checklist or /api/coordinator/shared-documents
        // endpoints. Nothing to do server-side here.
        console.log('[upload-token] Blob upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Upload token generation failed' },
      { status: 400 }
    );
  }
}

