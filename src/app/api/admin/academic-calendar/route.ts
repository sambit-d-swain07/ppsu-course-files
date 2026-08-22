import { NextRequest, NextResponse } from 'next/server';
import { prisma, normalizeSchoolCode, normalizeSemesterKey } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.role === 'ADMIN' ? payload : null;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });

  try {
    const docs = await prisma.schoolSharedDocument.findMany({
      where: { itemIndex: 5 }
    });
    return noStoreJson({ publishedCalendars: docs });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Failed to fetch academic calendars' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { school, termType, commonFile, applyToAll, semesterFiles } = body;

    if (!school || !termType) {
      return noStoreJson({ error: 'School and Term Type are required.' }, { status: 400 });
    }

    const normSchool = normalizeSchoolCode(school);

    // Fetch existing document for school & itemIndex 5
    const existingDoc = await prisma.schoolSharedDocument.findUnique({
      where: { school_itemIndex: { school: normSchool, itemIndex: 5 } }
    });

    let existingJson: any = { terms: {}, semesters: {} };
    if (existingDoc?.subItemsJson) {
      try { existingJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}
    }

    if (!existingJson.terms) existingJson.terms = {};
    if (!existingJson.semesters) existingJson.semesters = {};

    const updatedAt = new Date().toISOString();
    const semPayloadMap: Record<string, any> = {};

    // Determine applicable semesters based on termType
    let targetSems: string[] = [];
    if (termType === 'Odd Semester') targetSems = ['SEM 1', 'SEM 3', 'SEM 5', 'SEM 7'];
    else if (termType === 'Even Semester') targetSems = ['SEM 2', 'SEM 4', 'SEM 6', 'SEM 8'];
    else if (termType === 'Yearly') targetSems = ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4', 'SEM 5', 'SEM 6', 'SEM 7', 'SEM 8'];

    targetSems.forEach((sem) => {
      const normSem = normalizeSemesterKey(sem);
      const semOverride = semesterFiles?.[sem] || semesterFiles?.[normSem];
      if (semOverride && semOverride.fileName) {
        semPayloadMap[normSem] = {
          fileName: semOverride.fileName,
          fileUrl: semOverride.fileUrl,
          isOverride: true,
          termType,
          school: normSchool,
          updatedAt
        };
      } else if (commonFile && commonFile.fileName) {
        semPayloadMap[normSem] = {
          fileName: commonFile.fileName,
          fileUrl: commonFile.fileUrl,
          isOverride: false,
          termType,
          school: normSchool,
          updatedAt
        };
      }
    });

    // Save term config
    existingJson.terms[termType] = {
      termType,
      commonFile: commonFile || null,
      applyToAll: Boolean(applyToAll),
      updatedAt,
      semesters: semPayloadMap
    };

    // Update global semesters dictionary
    Object.assign(existingJson.semesters, semPayloadMap);

    const subItemsJson = JSON.stringify(existingJson);
    const primaryFile = commonFile || Object.values(semPayloadMap)[0];

    const result = await prisma.schoolSharedDocument.upsert({
      where: { school_itemIndex: { school: normSchool, itemIndex: 5 } },
      create: {
        school: normSchool,
        itemIndex: 5,
        status: 'UPLOADED',
        fileName: primaryFile?.fileName || 'Academic_Calendar.pdf',
        fileUrl: primaryFile?.fileUrl || null,
        subItemsJson
      },
      update: {
        status: 'UPLOADED',
        fileName: primaryFile?.fileName || 'Academic_Calendar.pdf',
        fileUrl: primaryFile?.fileUrl || null,
        subItemsJson
      }
    });

    return noStoreJson({
      success: true,
      message: `Academic Calendar published for ${normSchool} (${termType}).`,
      publishedCalendar: result
    });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Failed to publish academic calendar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin(req)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get('school');
    if (!school) return noStoreJson({ error: 'School parameter required' }, { status: 400 });

    const normSchool = normalizeSchoolCode(school);
    await prisma.schoolSharedDocument.deleteMany({
      where: { school: normSchool, itemIndex: 5 }
    });

    return noStoreJson({ success: true, message: `Academic Calendar cleared for ${normSchool}.` });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Failed to delete academic calendar' }, { status: 500 });
  }
}
