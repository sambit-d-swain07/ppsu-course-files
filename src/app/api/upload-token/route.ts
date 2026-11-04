/**
 * /api/upload-token
 *
 * Generates a presigned direct upload URL / short-lived client upload token
 * for Vercel Blob storage.
 *
 * Supports both:
 * 1. Modern Vercel Signed URLs / OIDC Mode (BLOB_STORE_ID + BLOB_WEBHOOK_PUBLIC_KEY + VERCEL_OIDC_TOKEN)
 *    using handleUploadPresigned + issueSignedToken.
 * 2. Legacy Read-Write Token Mode (BLOB_READ_WRITE_TOKEN) using handleUpload.
 *
 * Server-side enforcements applied:
 *   • User session authentication (ppsu_auth_token cookie required)
 *   • 50MB per-file maximum size cap
 *   • Whitelist of allowed content types
 */

import {
  handleUploadPresigned,
  handleUpload,
  type HandleUploadPresignedBody,
} from '@vercel/blob/client';
import { issueSignedToken } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authToken = req.cookies.get('ppsu_auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyToken(authToken);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const storeId = process.env.BLOB_STORE_ID;
  const webhookKey = process.env.BLOB_WEBHOOK_PUBLIC_KEY;
  const oidcHeader = req.headers.get('x-vercel-oidc-token');
  const oidcEnv = process.env.VERCEL_OIDC_TOKEN;
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json({
    status: 'ready',
    authMode: storeId ? 'oidc' : (rwToken ? 'read-write-token' : 'none'),
    hasBlobStoreId: !!storeId,
    blobStoreId: storeId || null,
    hasWebhookPublicKey: !!webhookKey,
    hasOidcToken: !!(oidcHeader || oidcEnv),
    hasReadWriteToken: !!rwToken,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate user session
  const authToken = req.cookies.get('ppsu_auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyToken(authToken);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse request body
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error('[upload-token] Failed to parse request JSON:', err);
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const storeId = process.env.BLOB_STORE_ID;
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN;
  const webhookKey = process.env.BLOB_WEBHOOK_PUBLIC_KEY || 'default_public_key';
  const oidcToken =
    req.headers.get('x-vercel-oidc-token') ||
    process.env.VERCEL_OIDC_TOKEN;

  // 3. Handle Presigned URL flow (Modern Vercel Blob OIDC architecture)
  if (body?.type === 'blob.generate-presigned-url' || (!rwToken && storeId)) {
    try {
      const jsonResponse = await handleUploadPresigned({
        body: body as HandleUploadPresignedBody,
        request: req,
        webhookPublicKey: webhookKey,
        getSignedToken: async (pathname) => {
          const signedToken = await issueSignedToken({
            pathname,
            operations: ['put'],
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_SIZE_BYTES,
            ...(oidcToken ? { oidcToken } : {}),
            ...(storeId ? { storeId } : {}),
          });

          return {
            token: signedToken,
            urlOptions: {
              allowedContentTypes: ALLOWED_CONTENT_TYPES,
              maximumSizeInBytes: MAX_SIZE_BYTES,
              addRandomSuffix: true,
            },
          };
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error: any) {
      console.error('[upload-token presigned error]', error?.message || error);
      let errorMsg = error?.message ?? 'Presigned upload failed';
      if (errorMsg.includes('No blob credentials found') || errorMsg.includes('oidcToken')) {
        errorMsg =
          'Vercel OIDC authentication token is missing. Please ensure "Automatically expose System Environment Variables" (or "Enable access to System Environment Variables") is enabled in Vercel Project Settings -> Environment Variables, and redeploy.';
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
  }

  // 4. Handle Legacy client-token flow (if BLOB_READ_WRITE_TOKEN is present)
  if (rwToken) {
    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        token: rwToken,
        onBeforeGenerateToken: async () => {
          return {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_SIZE_BYTES,
            addRandomSuffix: true,
          };
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error: any) {
      console.error('[upload-token client-token error]', error?.message || error);
      return NextResponse.json(
        { error: error.message ?? 'Upload token generation failed' },
        { status: 400 }
      );
    }
  }

  // Neither BLOB_STORE_ID nor BLOB_READ_WRITE_TOKEN found
  const errorMsg =
    'No Blob configuration found on server. Please ensure BLOB_STORE_ID and BLOB_WEBHOOK_PUBLIC_KEY are added to your Vercel Project Environment Variables.';
  console.error('[upload-token]', errorMsg);
  return NextResponse.json({ error: errorMsg }, { status: 400 });
}
