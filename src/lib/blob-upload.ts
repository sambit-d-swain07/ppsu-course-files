/**
 * blob-upload.ts
 *
 * Direct-to-storage client upload helper using Vercel Blob.
 * The file is transferred directly from the browser to Vercel Blob storage,
 * bypassing Next.js API route body limits (4.5MB).
 *
 * Uses uploadPresigned (Vercel Signed URLs with OIDC / BLOB_STORE_ID).
 * Maximum allowed size: 50MB (enforced client-side and server-side).
 */

import { uploadPresigned } from '@vercel/blob/client';

export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_UPLOAD_SIZE_LABEL = '50MB';

/**
 * Validates that a file does not exceed the 50MB limit.
 * Throws a clear user-facing error if too large.
 */
export function validateFileSize(file: File): void {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('File too large — maximum size is 50MB');
  }
}

/**
 * Uploads a file directly to Vercel Blob and returns the public URL.
 *
 * 1. Checks 50MB limit client-side before starting.
 * 2. Requests a presigned PUT URL / client token from /api/upload-token.
 * 3. Streams bytes directly to Vercel Blob storage.
 * 4. Returns the resulting blob URL.
 */
export async function uploadToBlob(file: File): Promise<string> {
  validateFileSize(file);

  try {
    // Primary: modern presigned upload (OIDC / BLOB_STORE_ID)
    const blob = await uploadPresigned(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload-token',
      contentType: file.type || undefined,
    });

    if (!blob || !blob.url) {
      throw new Error('Upload failed — no URL returned from storage');
    }

    return blob.url;
  } catch (err: any) {
    // If the error was masked by the Vercel Blob client SDK:
    if (err.message && (err.message.toLowerCase().includes('client token') || err.message.toLowerCase().includes('presigned') || err.message.toLowerCase().includes('failed to'))) {
      try {
        const probeRes = await fetch('/api/upload-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'blob.generate-presigned-url',
            payload: { pathname: file.name, clientPayload: null, multipart: false },
          }),
        });
        const probeData = await probeRes.json().catch(() => ({}));
        if (probeData?.error) {
          throw new Error(probeData.error);
        }
      } catch (probeErr: any) {
        if (probeErr.message && !probeErr.message.toLowerCase().includes('client token')) {
          throw probeErr;
        }
      }
    }
    throw err;
  }
}
