/**
 * blob-upload.ts
 *
 * Direct-to-storage client upload helper using Vercel Blob.
 * The file is transferred directly from the browser to Vercel Blob storage,
 * bypassing Next.js API route body limits (4.5MB).
 *
 * Maximum allowed size: 50MB (enforced client-side and server-side).
 */

import { upload } from '@vercel/blob/client';

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
 * 2. Gets a short-lived upload token from /api/upload-token (which also enforces the 50MB limit server-side).
 * 3. Streams bytes directly to Vercel Blob storage.
 * 4. Returns the resulting blob URL.
 */
export async function uploadToBlob(file: File): Promise<string> {
  validateFileSize(file);

  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload-token',
  });

  if (!blob || !blob.url) {
    throw new Error('Upload failed — no URL returned from storage');
  }

  return blob.url;
}
