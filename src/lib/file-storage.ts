import { Buffer } from 'node:buffer';

export interface StoredFile {
  id: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  createdAt: number;
}

const globalForFileStore = globalThis as unknown as {
  fileStore?: Map<string, StoredFile>;
};

export const fileStore = globalForFileStore.fileStore ?? new Map<string, StoredFile>();
if (process.env.NODE_ENV !== 'production') {
  globalForFileStore.fileStore = fileStore;
}

export function saveFileToStore(fileId: string, buffer: Buffer, mimeType: string, fileName: string): string {
  fileStore.set(fileId, {
    id: fileId,
    buffer,
    mimeType: mimeType || 'application/pdf',
    fileName,
    createdAt: Date.now(),
  });
  return `/api/upload/${fileId}`;
}

export function getFileFromStore(fileId: string): StoredFile | undefined {
  return fileStore.get(fileId);
}
