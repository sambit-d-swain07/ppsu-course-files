import { Buffer } from 'node:buffer';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/mock-data';

export interface StoredFile {
  id: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  createdAt: number;
}

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (e) {}
}

const globalForFileStore = globalThis as unknown as {
  fileStore?: Map<string, StoredFile>;
};

export const fileStore = globalForFileStore.fileStore ?? new Map<string, StoredFile>();
if (process.env.NODE_ENV !== 'production') {
  globalForFileStore.fileStore = fileStore;
}

export async function saveFileToStoreAsync(
  fileId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const stored: StoredFile = {
    id: fileId,
    buffer,
    mimeType: mimeType || 'application/pdf',
    fileName,
    createdAt: Date.now(),
  };

  // 1. Save in memory cache
  fileStore.set(fileId, stored);

  // 2. Try saving to local disk if directory is writable
  try {
    ensureUploadsDir();
    const fileBinPath = path.join(UPLOADS_DIR, `${fileId}.bin`);
    const metaJsonPath = path.join(UPLOADS_DIR, `${fileId}.json`);
    fs.writeFileSync(fileBinPath, buffer);
    fs.writeFileSync(metaJsonPath, JSON.stringify({ mimeType, fileName, createdAt: stored.createdAt }));
  } catch (err) {
    // Disk write error expected in read-only serverless environment
  }

  // 3. Save permanently to PostgreSQL database (UploadedFile table)
  try {
    const base64Buffer = buffer.toString('base64');
    await prisma.uploadedFile.upsert({
      where: { id: fileId },
      create: {
        id: fileId,
        buffer: base64Buffer,
        mimeType: stored.mimeType,
        fileName: stored.fileName,
      },
      update: {
        buffer: base64Buffer,
        mimeType: stored.mimeType,
        fileName: stored.fileName,
      },
    });
  } catch (err) {
    console.error('Database file storage error:', err);
  }

  return `/api/upload/${fileId}`;
}

export function saveFileToStore(fileId: string, buffer: Buffer, mimeType: string, fileName: string): string {
  // Fire and forget async DB save for synchronous callers
  saveFileToStoreAsync(fileId, buffer, mimeType, fileName).catch((err) => {
    console.error('Async file save error:', err);
  });
  return `/api/upload/${fileId}`;
}

export async function getFileFromStoreAsync(fileId: string): Promise<StoredFile | undefined> {
  // 1. Check in-memory store
  const memoryFile = fileStore.get(fileId);
  if (memoryFile) return memoryFile;

  // 2. Check local disk store
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
  } catch (err) {}

  // 3. Fetch from PostgreSQL database (UploadedFile table)
  try {
    const dbFile = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (dbFile) {
      const buffer = Buffer.from(dbFile.buffer, 'base64');
      const dbStored: StoredFile = {
        id: dbFile.id,
        buffer,
        mimeType: dbFile.mimeType,
        fileName: dbFile.fileName,
        createdAt: dbFile.createdAt.getTime(),
      };
      fileStore.set(fileId, dbStored);
      return dbStored;
    }
  } catch (err) {
    console.error('Database file retrieval error:', err);
  }

  return undefined;
}

export function getFileFromStore(fileId: string): StoredFile | undefined {
  return fileStore.get(fileId);
}
