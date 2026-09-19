import { Buffer } from 'node:buffer';
import fs from 'fs';
import path from 'path';

export interface StoredFile {
  id: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  createdAt: number;
}

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const globalForFileStore = globalThis as unknown as {
  fileStore?: Map<string, StoredFile>;
};

export const fileStore = globalForFileStore.fileStore ?? new Map<string, StoredFile>();
if (process.env.NODE_ENV !== 'production') {
  globalForFileStore.fileStore = fileStore;
}

export function saveFileToStore(fileId: string, buffer: Buffer, mimeType: string, fileName: string): string {
  const stored: StoredFile = {
    id: fileId,
    buffer,
    mimeType: mimeType || 'application/pdf',
    fileName,
    createdAt: Date.now(),
  };

  fileStore.set(fileId, stored);

  try {
    ensureUploadsDir();
    const fileBinPath = path.join(UPLOADS_DIR, `${fileId}.bin`);
    const metaJsonPath = path.join(UPLOADS_DIR, `${fileId}.json`);
    fs.writeFileSync(fileBinPath, buffer);
    fs.writeFileSync(metaJsonPath, JSON.stringify({ mimeType, fileName, createdAt: stored.createdAt }));
  } catch (err) {
    console.error('Disk file storage write error:', err);
  }

  return `/api/upload/${fileId}`;
}

export function getFileFromStore(fileId: string): StoredFile | undefined {
  const memoryFile = fileStore.get(fileId);
  if (memoryFile) return memoryFile;

  try {
    ensureUploadsDir();
    const fileBinPath = path.join(UPLOADS_DIR, `${fileId}.bin`);
    const metaJsonPath = path.join(UPLOADS_DIR, `${fileId}.json`);
    if (fs.existsSync(fileBinPath)) {
      const buffer = fs.readFileSync(fileBinPath);
      let mimeType = 'application/pdf';
      let fileName = 'document.pdf';
      let createdAt = Date.now();
      if (fs.existsSync(metaJsonPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));
          mimeType = meta.mimeType || mimeType;
          fileName = meta.fileName || fileName;
          createdAt = meta.createdAt || createdAt;
        } catch (e) {}
      }
      const diskStored: StoredFile = { id: fileId, buffer, mimeType, fileName, createdAt };
      fileStore.set(fileId, diskStored);
      return diskStored;
    }
  } catch (err) {
    console.error('Disk file storage read error:', err);
  }

  return undefined;
}
