import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { getFileFromStore } from './file-storage';
import { SAMPLE_PDF_DATA_URL } from './sample-pdf';

// Require pdfmake directly to ensure compatibility across Node / Next.js serverless runtimes
const pdfmake = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts.js');

// Initialize in-memory virtual font files as true binary Buffers
pdfmake.setUrlAccessPolicy(() => true);
pdfmake.setLocalAccessPolicy(() => true);

if (vfsFonts) {
  for (const [filename, base64Content] of Object.entries(vfsFonts)) {
    if (typeof base64Content === 'string') {
      pdfmake.virtualfs.writeFileSync(filename, Buffer.from(base64Content, 'base64'));
    }
  }
}

pdfmake.setFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
});

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO' },
  { index: 2,  name: 'Time Table of the Faculty' },
  { index: 3,  name: 'Course information sheet with course objectives, course pre-requisites, course outcomes, i.e. Syllabus' },
  { index: 4,  name: 'Student Name List' },
  { index: 5,  name: 'Department Academic Calendar' },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)' },
  { index: 7,  name: 'List of Laboratory (or Experiments)' },
  { index: 8,  name: 'Laboratory Rubrics' },
  { index: 9,  name: 'Theory Continuous Evaluation Rubrics' },
  { index: 10, name: 'Lab Manuals/Tutorials' },
  { index: 11, name: 'Internal Assessment 1' },
  { index: 12, name: 'Internal Assessment 2' },
  { index: 13, name: 'Guidelines / Documents related to Evaluation Criteria' },
  { index: 14, name: 'Attendance register (ERP)' },
  { index: 15, name: 'University exam' },
  { index: 16, name: 'CO Attainment output sheet' },
  { index: 17, name: 'PO Attainment output sheet' },
  { index: 18, name: 'Action to be taken for next year based on CO attainment' },
  { index: 19, name: 'Lecture notes (Out of 20 Marks)' },
  { index: 20, name: 'Course Faculty Signature' }
];

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'PPSUNAACA+Logo.png');
    if (fs.existsSync(logoPath)) {
      const fileBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${fileBuffer.toString('base64')}`;
    }
  } catch (e) {
    console.error('Error reading logo file:', e);
  }
  return '';
}

function buildPageHeader(schoolName: string, hasLogo: boolean) {
  return {
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          hasLogo
            ? { image: 'logo', fit: [180, 34], margin: [0, 0, 0, 4] }
            : { text: 'P P SAVANI UNIVERSITY', bold: true, fontSize: 13 },
          {
            text: `  ${schoolName}  `,
            bold: true,
            fontSize: 10,
            color: '#ffffff',
            fillColor: '#4d8e28',
            alignment: 'center',
            margin: [2, 4, 2, 4]
          }
        ]
      ]
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === node.table.body.length ? 1.5 : 0),
      vLineWidth: () => 0,
      hLineColor: () => '#000000',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 2
    },
    margin: [0, 0, 0, 16]
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateBreakdown(totalMark: number, seedKey: string, maxMark = 20): { a: number; b: number; c: number; d: number; total: number } {
  const roundedTotal = Number(totalMark || 0);
  if (roundedTotal === 0) return { a: 0, b: 0, c: 0, d: 0, total: 0 };
  const hash = hashString(`${seedKey}-${roundedTotal}`);
  const targetUnits = Math.round(roundedTotal * 2);
  const maxUnitsPerCol = Math.round((maxMark / 4) * 2);
  const baseAvg = Math.floor(targetUnits / 4);
  const units = [baseAvg, baseAvg, baseAvg, baseAvg];
  const remainder = targetUnits - (baseAvg * 4);
  const shift = hash % 4;
  const shuffledOrder = [(0 + shift) % 4, (1 + shift) % 4, (2 + shift) % 4, (3 + shift) % 4];
  for (let i = 0; i < remainder; i++) { units[shuffledOrder[i % 4]]++; }
  for (let i = 0; i < 4; i++) {
    if (units[i] > maxUnitsPerCol) {
      const overflow = units[i] - maxUnitsPerCol;
      units[i] = maxUnitsPerCol;
      for (let j = 0; j < 4; j++) {
        if (i !== j && units[j] + overflow <= maxUnitsPerCol) {
          units[j] += overflow;
          break;
        }
      }
    }
  }
  const a = units[0] / 2;
  const b = units[1] / 2;
  const c = units[2] / 2;
  const d = units[3] / 2;
  const sum = Number((a + b + c + d).toFixed(1));
  return { a, b, c, d, total: sum };
}

function calcStudentAverages(row: any, numP: number): { avg10: number; avg20: number } {
  const practicals = row.practicals || {};
  let sum = 0;
  for (let i = 1; i <= numP; i++) {
    sum += Number(practicals[`P${i}`]) || 0;
  }
  const avg10 = numP > 0 ? Number((sum / numP).toFixed(2)) : 0;
  const avg20 = Number((avg10 * 2).toFixed(2));
  return { avg10, avg20 };
}

function extractFileId(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('file_')) return url;
  const match = url.match(/\/api\/upload\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function resolveBufferFromUrl(url?: string | null, fileName?: string | null): Buffer | null {
  if (!url) return null;

  // Case 1: Data URL
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    if (parts.length > 1) {
      try {
        const base64Content = parts[1].trim();
        return Buffer.from(base64Content, 'base64');
      } catch (e) {
        console.error('Base64 decode error:', e);
      }
    }
    return null;
  }

  // Case 2: /api/upload/[fileId]
  const fileId = extractFileId(url);
  if (fileId) {
    const stored = getFileFromStore(fileId);
    if (stored?.buffer) {
      return stored.buffer;
    }
  }

  // Case 3: Public or disk path
  try {
    const cleanUrl = url.replace(/^\/+/, '');
    const publicPath = path.join(process.cwd(), 'public', cleanUrl);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      return fs.readFileSync(publicPath);
    }
    const rootPath = path.join(process.cwd(), cleanUrl);
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
      return fs.readFileSync(rootPath);
    }
  } catch (e) {}

  return null;
}

function getUploadedBuffers(item: any, subsObj: any): Array<{ buffer: Buffer; fileName?: string }> {
  const results: Array<{ buffer: Buffer; fileName?: string }> = [];
  const entries: Array<{ url?: string; fileName?: string }> = [];

  const addEntry = (url?: string, fileName?: string) => {
    if (url || fileName) {
      entries.push({ url, fileName });
    }
  };

  if (item?.fileUrl || item?.fileName) addEntry(item.fileUrl, item.fileName);
  if (item?.sharedFileUrl || item?.sharedFileName) addEntry(item.sharedFileUrl, item.sharedFileName);

  if (subsObj) {
    if (subsObj.fileUrl || subsObj.fileName) addEntry(subsObj.fileUrl, subsObj.fileName);
    if (subsObj.sharedFileUrl || subsObj.sharedFileName) addEntry(subsObj.sharedFileUrl, subsObj.sharedFileName);

    const subFileObjects = [
      subsObj.lessonPlanLecture,
      subsObj.lessonPlanLab,
      subsObj.lessonPlanTutorial,
      subsObj.outcomeLecture,
      subsObj.outcomeLab,
      subsObj.sampleAssignment,
      subsObj.marksFile,
      subsObj.timetable,
      subsObj.questionPaper,
      subsObj.sampleAnswerSheet,
      subsObj.file
    ];

    subFileObjects.forEach((sf) => {
      if (sf) addEntry(sf.fileUrl || sf.url, sf.fileName || sf.name);
    });

    ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'].forEach((k) => {
      const obj = subsObj[k];
      if (obj) addEntry(obj.fileUrl || obj.url, obj.fileName || obj.name);
    });

    if (subsObj.sectionFiles && typeof subsObj.sectionFiles === 'object') {
      Object.values(subsObj.sectionFiles).forEach((sf: any) => {
        if (sf) addEntry(sf.fileUrl || sf.url, sf.fileName || sf.name);
      });
    }

    if (Array.isArray(subsObj.batches)) {
      subsObj.batches.forEach((b: any) => {
        if (b) addEntry(b.fileUrl || b.url, b.fileName || b.name);
      });
    }

    if (Array.isArray(subsObj.sheets)) {
      subsObj.sheets.forEach((s: any) => {
        if (s) addEntry(s.fileUrl || s.url, s.fileName || s.name);
      });
    }

    if (Array.isArray(subsObj.documents)) {
      subsObj.documents.forEach((d: any) => {
        if (d) addEntry(d.fileUrl || d.url, d.fileName || d.name);
      });
    }
  }

  const seenUrls = new Set<string>();
  entries.forEach((e) => {
    const key = `${e.url || ''}__${e.fileName || ''}`;
    if (seenUrls.has(key)) return;
    seenUrls.add(key);

    const buf = resolveBufferFromUrl(e.url, e.fileName);
    if (buf) {
      results.push({ buffer: buf, fileName: e.fileName });
    }
  });

  return results;
}

async function appendBufferToDoc(mergedDoc: PDFDocument, buf: Buffer, fileName?: string): Promise<boolean> {
  if (!buf || buf.length === 0) return false;

  // 1. PDF File Check (look for %PDF within first 1024 bytes)
  const pdfOffset = buf.indexOf('%PDF');
  const isPdf = (pdfOffset !== -1 && pdfOffset < 1024) || Boolean(fileName?.toLowerCase().endsWith('.pdf'));

  if (isPdf) {
    try {
      const cleanBuf = pdfOffset > 0 ? buf.subarray(pdfOffset) : buf;
      const uploadedDoc = await PDFDocument.load(cleanBuf, { ignoreEncryption: true });
      const count = uploadedDoc.getPageCount();
      if (count > 0) {
        const copied = await mergedDoc.copyPages(uploadedDoc, Array.from({ length: count }, (_, i) => i));
        copied.forEach((p) => mergedDoc.addPage(p));
        return true;
      }
    } catch (e) {
      console.error(`PDF load error for file "${fileName}":`, e);
    }
  }

  // 2. Image File Check (PNG or JPEG)
  try {
    const isPng = buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' || Boolean(fileName?.match(/\.png$/i));
    const isJpg = buf.subarray(0, 3).toString('hex') === 'ffd8ff' || Boolean(fileName?.match(/\.(jpg|jpeg)$/i));
    if (isPng || isJpg) {
      const image = isPng ? await mergedDoc.embedPng(buf) : await mergedDoc.embedJpg(buf);
      const page = mergedDoc.addPage([595.28, 841.89]); // A4 portrait
      const { width, height } = image.scaleToFit(595.28 - 40, 841.89 - 40);
      page.drawImage(image, {
        x: (595.28 - width) / 2,
        y: (841.89 - height) / 2,
        width,
        height
      });
      return true;
    }
  } catch (e) {
    console.error(`Image embedding error for file "${fileName}":`, e);
  }

  return false;
}

const standardTableLayout = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => '#000000',
  vLineColor: () => '#000000',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3
};

export async function generatePdfBuffer(cf: any, checklist: any[], subject?: any): Promise<Buffer> {
  const logoDataUri = getLogoBase64();
  const hasLogo = Boolean(logoDataUri);

  const dbi = (idx: number) => checklist.find((c) => c.itemIndex === idx);
  const subs = (idx: number): any => {
    const it = dbi(idx);
    if (!it?.subItemsJson) return null;
    try { return JSON.parse(it.subItemsJson); } catch { return null; }
  };

  // Format Department Name
  const rawDept = cf.department || cf.faculty?.department || subject?.department || 'Computer Engineering';
  const deptName = rawDept.toLowerCase().startsWith('department of')
    ? rawDept
    : `Department of ${rawDept}`;

  // Format School Name
  const rawSchool = cf.school || cf.faculty?.school || subject?.school || 'School of Engineering';
  const schoolName = (rawSchool.toUpperCase() === 'SOE' || rawSchool === 'School of Engineering')
    ? 'School of Engineering'
    : rawSchool;

  const faculty = cf.facultyName || cf.faculty?.name || 'Faculty Member';
  const facultyName = (faculty.toLowerCase().startsWith('mr.') || faculty.toLowerCase().startsWith('dr.') || faculty.toLowerCase().startsWith('ms.') || faculty.toLowerCase().startsWith('prof.'))
    ? faculty
    : `Mr. ${faculty}`;

  const code = cf.courseCode || subject?.code || 'COURSE CODE';
  const title = cf.courseTitle || subject?.title || 'COURSE TITLE';

  const mergedDoc = await PDFDocument.create();

  async function appendPdfMakeDoc(docContent: any[]) {
    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [35, 35, 35, 35],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.15
      },
      images: hasLogo ? { logo: logoDataUri } : {},
      content: docContent
    };
    const chunkPdf = pdfmake.createPdf(docDef);
    const chunkBuffer: Buffer = await chunkPdf.getBuffer();
    const chunkLoaded = await PDFDocument.load(chunkBuffer);
    const copiedPages = await mergedDoc.copyPages(chunkLoaded, Array.from({ length: chunkLoaded.getPageCount() }, (_, i) => i));
    copiedPages.forEach((p) => mergedDoc.addPage(p));
  }

  async function appendRawBuffers(buffers: Array<{ buffer: Buffer; fileName?: string }>): Promise<boolean> {
    let successAny = false;
    for (const b of buffers) {
      const ok = await appendBufferToDoc(mergedDoc, b.buffer, b.fileName);
      if (ok) successAny = true;
    }
    return successAny;
  }

  function buildMissingNotice(itemName: string, fileName?: string) {
    return [
      {
        margin: [0, 20, 0, 0],
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#fff5f5',
                margin: [15, 20, 15, 20],
                stack: [
                  { text: '⚠️ File Not Available', bold: true, fontSize: 12, color: '#c53030', alignment: 'center', margin: [0, 0, 0, 6] },
                  { text: fileName ? `File: ${fileName}` : itemName, bold: true, fontSize: 10, color: '#2d3748', alignment: 'center', margin: [0, 0, 0, 6] },
                  { text: 'The uploaded file could not be retrieved from the server (possibly lost during a server restart).', fontSize: 9, color: '#718096', alignment: 'center', margin: [0, 0, 0, 4] },
                  { text: 'Please re-upload this file from the Course File checklist.', fontSize: 9, bold: true, color: '#2b6cb0', alignment: 'center' }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#feb2b2',
          vLineColor: () => '#feb2b2'
        }
      }
    ];
  }

  // 1. COVER PAGE & TABLE OF CONTENTS
  const headerContent: any[] = [
    { text: 'P P SAVANI UNIVERSITY', fontSize: 24, bold: true, alignment: 'center', margin: [0, 35, 0, 8] },
    { text: `(${schoolName})`, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 24] },
    hasLogo
      ? { image: 'logo', fit: [200, 80], alignment: 'center', margin: [0, 0, 0, 30] }
      : { text: '', margin: [0, 20, 0, 20] },
    { text: deptName, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 36] },
    { text: 'Faculty Name', fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
    { text: facultyName, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 36] },
    { text: 'Subject', fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
    { text: code, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
    { text: title, fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
    { text: '(Course File)', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 0] },

    { text: '', pageBreak: 'before' },
    buildPageHeader(schoolName, hasLogo),
    { text: 'Table of Content', fontSize: 18, bold: true, alignment: 'center', margin: [0, 8, 0, 16] },
    {
      table: {
        headerRows: 1,
        widths: [60, '*'],
        body: [
          [
            { text: 'Sr. No.', bold: true, alignment: 'center', fillColor: '#f5f5f5' },
            { text: 'Content', bold: true, alignment: 'left', fillColor: '#f5f5f5' }
          ],
          ...CHECKLIST_ITEMS.map((item) => [
            { text: String(item.index), alignment: 'center', fontSize: 10 },
            { text: item.name, fontSize: 10 }
          ])
        ]
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 4,
        paddingBottom: () => 4
      }
    }
  ];

  await appendPdfMakeDoc(headerContent);

  // 2. PROCESS EACH CHECKLIST ITEM SEQUENTIALLY
  for (const item of CHECKLIST_ITEMS) {
    const db = dbi(item.index);
    const sb = subs(item.index);
    const uploadedBuffers = getUploadedBuffers(db, sb);
    const isUploaded = Boolean(db?.status === 'UPLOADED' || db?.fileName || db?.fileUrl || db?.sharedFileUrl || uploadedBuffers.length > 0);

    const itemDividerContent: any[] = [
      {
        text: item.name.toUpperCase(),
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 260, 0, 0]
      }
    ];

    const structuredContent: any[] = [];
    let hasStructuredContent = false;

    if (item.index === 1) {
      const item1Sub = subs(1);
      if (item1Sub) {
        const subKeys = ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'] as const;
        const hasText = subKeys.some((sk) => item1Sub[sk]?.textContent?.trim());
        if (hasText) {
          hasStructuredContent = true;
          subKeys.forEach((sk) => {
            const text = item1Sub[sk]?.textContent;
            if (!text?.trim()) return;
            const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
            const isMission = sk === 'mission';
            const isDeptVision = sk === 'deptVision';
            const isDeptMission = sk === 'deptMission';
            const isPeo = sk === 'peo';
            const isPso = sk === 'pso';
            const isPo = sk === 'po';

            let col1Header = '';
            let col2Header = '';
            let prefix = '';

            if (isPeo) {
              col1Header = 'PEO No';
              col2Header = 'PROGRAMME EDUCATIONAL OBJECTIVES';
              prefix = 'PEO ';
            } else if (isPso) {
              col1Header = 'PSO No';
              col2Header = 'PROGRAMME SPECIFIC OUTCOMES (PSO)';
              prefix = 'PSO ';
            } else if (isPo) {
              col1Header = 'PO No';
              col2Header = 'PROGRAMME OUTCOMES';
              prefix = 'PO ';
            } else if (isMission) {
              col2Header = 'INSTITUTE MISSION';
            } else if (isDeptVision) {
              col2Header = 'DEPARTMENT VISION';
            } else if (isDeptMission) {
              col2Header = 'DEPARTMENT MISSION';
            } else {
              col2Header = 'INSTITUTE VISION';
            }

            if (isPeo || isPso || isPo) {
              const rows = lines.map((line: string, idx: number) => {
                const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;
                return [
                  { text: `${prefix}${idx + 1}`, bold: true, alignment: 'center', fontSize: 10 },
                  { text: cleanText, fontSize: 10, alignment: 'justify' }
                ];
              });

              structuredContent.push({
                margin: [0, 0, 0, 14],
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  keepWithHeaderRows: 1,
                  widths: [70, '*'],
                  body: [
                    [
                      { text: col1Header, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 },
                      { text: col2Header, bold: true, alignment: 'left', fillColor: '#d9ead3', fontSize: 10 }
                    ],
                    ...rows
                  ]
                },
                layout: standardTableLayout
              });
            } else if (isMission || isDeptMission || lines.length > 1) {
              const rows = lines.map((line: string, idx: number) => {
                const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
                return [
                  { text: `${idx + 1}.`, bold: true, alignment: 'center', fontSize: 10 },
                  { text: cleanText, fontSize: 10, alignment: 'justify' }
                ];
              });

              structuredContent.push({
                margin: [0, 0, 0, 14],
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  keepWithHeaderRows: 1,
                  widths: [40, '*'],
                  body: [
                    [
                      { text: col2Header, colSpan: 2, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 },
                      {}
                    ],
                    ...rows
                  ]
                },
                layout: standardTableLayout
              });
            } else {
              structuredContent.push({
                margin: [0, 0, 0, 14],
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  keepWithHeaderRows: 1,
                  widths: ['*'],
                  body: [
                    [{ text: col2Header, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 }],
                    [{ text: text, fontSize: 10, alignment: 'justify', margin: [4, 4, 4, 4] }]
                  ]
                },
                layout: standardTableLayout
              });
            }
          });
        }
      }
    } else if (item.index === 4) {
      const item4Sub = subs(4);
      const students = item4Sub?.students;
      if (Array.isArray(students) && students.length > 0) {
        hasStructuredContent = true;
        structuredContent.push({
          margin: [0, 0, 0, 14],
          table: {
            headerRows: 1,
            dontBreakRows: true,
            keepWithHeaderRows: 1,
            widths: [30, '*', 120, 60],
            body: [
              [
                { text: 'Sr No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 10 },
                { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 10 },
                { text: 'Enrolment Number', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 10 },
                { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 10 }
              ],
              ...students.map((st: any, i: number) => [
                { text: String(i + 1), alignment: 'center', fontSize: 9.5 },
                { text: st.name || st.studentName || '—', fontSize: 9.5 },
                { text: st.enrolmentNumber || st.rollNo || '—', alignment: 'center', fontSize: 9.5 },
                { text: st.batch || 'A', alignment: 'center', fontSize: 9.5 }
              ])
            ]
          },
          layout: standardTableLayout
        });
      }
    } else if (item.index === 8) {
      const item4Sub = subs(4);
      let item4Students: any[] = [];
      if (item4Sub) {
        item4Students = Array.isArray(item4Sub.students) ? item4Sub.students : (Array.isArray(item4Sub) ? item4Sub : []);
      }
      const item8Sub = subs(8);
      const rawStudents = item8Sub?.students || item8Sub?.rows || item8Sub?.item8Rows || [];
      const studentsMap = new Map<string, any>();
      item4Students.forEach((s: any) => {
        const id = s.id || s.studentId || s.enrolmentNumber;
        if (id) {
          studentsMap.set(id, {
            studentId: id,
            name: s.name || s.studentName || '—',
            enrolmentNumber: s.enrolmentNumber || s.rollNo || '—',
            batch: s.batch || 'A',
            practicals: {},
            termWork: 0,
            internalViva: 0,
            esePerformance: 0,
            eseExternalViva: 0
          });
        }
      });
      rawStudents.forEach((s: any) => {
        const id = s.studentId || s.id || s.enrolmentNumber;
        if (id) {
          const existing = studentsMap.get(id) || {
            studentId: id,
            name: s.name || s.studentName || '—',
            enrolmentNumber: s.enrolmentNumber || s.rollNo || '—',
            batch: s.batch || 'A'
          };
          studentsMap.set(id, {
            ...existing,
            name: s.name || existing.name,
            enrolmentNumber: s.enrolmentNumber || existing.enrolmentNumber,
            batch: s.batch || existing.batch,
            practicals: s.practicals || existing.practicals || {},
            termWork: s.termWork ?? existing.termWork ?? 0,
            internalViva: s.internalViva ?? existing.internalViva ?? 0,
            esePerformance: s.esePerformance ?? existing.esePerformance ?? 0,
            eseExternalViva: s.eseExternalViva ?? s.eseViva ?? existing.eseExternalViva ?? 0
          });
        }
      });
      const studentRows = Array.from(studentsMap.values());
      const numP = Number(item8Sub?.numPracticals) || 4;

      if (studentRows.length > 0) {
        hasStructuredContent = true;
        structuredContent.push(
          { text: 'CE — Continuous Evaluation (Laboratory)', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 4, 0, 6] },
          { text: '2.1 Practical Marks Table (Out of 10 per Practical) (Term Work)', fontSize: 9.5, bold: true, margin: [0, 2, 0, 4] },
          {
            margin: [0, 0, 0, 12],
            table: {
              headerRows: 1,
              dontBreakRows: true,
              keepWithHeaderRows: 1,
              widths: [28, '*', 70, ...Array.from({ length: numP }, () => 20), 40, 40],
              body: [
                [
                  { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  ...Array.from({ length: numP }, (_, i) => ({ text: `P${i + 1}`, bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 })),
                  { text: 'Avg 10', bold: true, alignment: 'center', fillColor: '#e0f2fe', fontSize: 8 },
                  { text: 'Avg 20', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8 }
                ],
                ...studentRows.map((st: any) => {
                  const { avg10, avg20 } = calcStudentAverages(st, numP);
                  const pCols = Array.from({ length: numP }, (_, pi) => ({
                    text: String(st.practicals?.[`P${pi + 1}`] ?? 0),
                    alignment: 'center',
                    fontSize: 8
                  }));
                  return [
                    { text: st.batch || 'A', alignment: 'center', fontSize: 8 },
                    { text: st.name || '—', fontSize: 8 },
                    { text: st.enrolmentNumber || '—', alignment: 'center', fontSize: 8 },
                    ...pCols,
                    { text: String(avg10), bold: true, color: '#0284c7', alignment: 'center', fontSize: 8 },
                    { text: String(avg20), bold: true, color: '#b45309', alignment: 'center', fontSize: 8 }
                  ];
                })
              ]
            },
            layout: standardTableLayout
          }
        );

        structuredContent.push(
          { text: '2.2 Practicals Auto-Generated 4-Criteria Breakdown Table', fontSize: 9.5, bold: true, margin: [0, 4, 0, 4] },
          {
            margin: [0, 0, 0, 12],
            table: {
              headerRows: 1,
              dontBreakRows: true,
              keepWithHeaderRows: 1,
              widths: [28, '*', 70, 36, 36, 36, 36, 36],
              body: [
                [
                  { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'A (Und.)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'B (Perf.)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'C (Rec.)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'D (Viva)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Total', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8 }
                ],
                ...studentRows.map((st: any) => {
                  const { avg20 } = calcStudentAverages(st, numP);
                  const bd = generateBreakdown(avg20, `${st.studentId}-ce-prac`);
                  return [
                    { text: st.batch || 'A', alignment: 'center', fontSize: 8 },
                    { text: st.name || '—', fontSize: 8 },
                    { text: st.enrolmentNumber || '—', alignment: 'center', fontSize: 8 },
                    { text: String(bd.a), alignment: 'center', fontSize: 8 },
                    { text: String(bd.b), alignment: 'center', fontSize: 8 },
                    { text: String(bd.c), alignment: 'center', fontSize: 8 },
                    { text: String(bd.d), alignment: 'center', fontSize: 8 },
                    { text: String(bd.total), bold: true, color: '#0f766e', alignment: 'center', fontSize: 8 }
                  ];
                })
              ]
            },
            layout: standardTableLayout
          }
        );

        structuredContent.push(
          { text: '2.3 Internal Viva Evaluation & Auto-Breakdown (Score out of 20)', fontSize: 9.5, bold: true, margin: [0, 4, 0, 4] },
          {
            margin: [0, 0, 0, 12],
            table: {
              headerRows: 1,
              dontBreakRows: true,
              keepWithHeaderRows: 1,
              widths: [28, '*', 70, 45, 26, 26, 26, 26, 36],
              body: [
                [
                  { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Int Viva (20)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'A', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'B', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'C', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'D', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Total', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8 }
                ],
                ...studentRows.map((st: any) => {
                  const mark = st.internalViva ?? 0;
                  const bd = generateBreakdown(mark, `${st.studentId}-ce-iv`);
                  return [
                    { text: st.batch || 'A', alignment: 'center', fontSize: 8 },
                    { text: st.name || '—', fontSize: 8 },
                    { text: st.enrolmentNumber || '—', alignment: 'center', fontSize: 8 },
                    { text: String(mark), bold: true, alignment: 'center', fontSize: 8 },
                    { text: String(bd.a), alignment: 'center', fontSize: 8 },
                    { text: String(bd.b), alignment: 'center', fontSize: 8 },
                    { text: String(bd.c), alignment: 'center', fontSize: 8 },
                    { text: String(bd.d), alignment: 'center', fontSize: 8 },
                    { text: String(bd.total), bold: true, color: '#0f766e', alignment: 'center', fontSize: 8 }
                  ];
                })
              ]
            },
            layout: standardTableLayout
          }
        );

        structuredContent.push(
          { text: 'ESE — End Semester Exam (Laboratory)', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 8, 0, 6] },
          { text: '3.1 Performance / Quiz Evaluation & Auto-Breakdown (Score out of 30)', fontSize: 9.5, bold: true, margin: [0, 2, 0, 4] },
          {
            margin: [0, 0, 0, 12],
            table: {
              headerRows: 1,
              dontBreakRows: true,
              keepWithHeaderRows: 1,
              widths: [28, '*', 70, 50, 26, 26, 26, 26, 36],
              body: [
                [
                  { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Perf/Quiz (30)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'A', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'B', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'C', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'D', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Total', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8 }
                ],
                ...studentRows.map((st: any) => {
                  const mark = st.esePerformance ?? 0;
                  const bd = generateBreakdown(mark, `${st.studentId}-ese-pq`, 30);
                  return [
                    { text: st.batch || 'A', alignment: 'center', fontSize: 8 },
                    { text: st.name || '—', fontSize: 8 },
                    { text: st.enrolmentNumber || '—', alignment: 'center', fontSize: 8 },
                    { text: String(mark), bold: true, alignment: 'center', fontSize: 8 },
                    { text: String(bd.a), alignment: 'center', fontSize: 8 },
                    { text: String(bd.b), alignment: 'center', fontSize: 8 },
                    { text: String(bd.c), alignment: 'center', fontSize: 8 },
                    { text: String(bd.d), alignment: 'center', fontSize: 8 },
                    { text: String(bd.total), bold: true, color: '#15803d', alignment: 'center', fontSize: 8 }
                  ];
                })
              ]
            },
            layout: standardTableLayout
          }
        );

        structuredContent.push(
          { text: '3.2 External Viva Evaluation & Auto-Breakdown (Score out of 30)', fontSize: 9.5, bold: true, margin: [0, 4, 0, 4] },
          {
            margin: [0, 0, 0, 12],
            table: {
              headerRows: 1,
              dontBreakRows: true,
              keepWithHeaderRows: 1,
              widths: [28, '*', 70, 50, 26, 26, 26, 26, 36],
              body: [
                [
                  { text: 'Batch', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Ext Viva (30)', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'A', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'B', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'C', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'D', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8 },
                  { text: 'Total', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8 }
                ],
                ...studentRows.map((st: any) => {
                  const mark = st.eseExternalViva ?? st.eseViva ?? 0;
                  const bd = generateBreakdown(mark, `${st.studentId}-ese-ev`, 30);
                  return [
                    { text: st.batch || 'A', alignment: 'center', fontSize: 8 },
                    { text: st.name || '—', fontSize: 8 },
                    { text: st.enrolmentNumber || '—', alignment: 'center', fontSize: 8 },
                    { text: String(mark), bold: true, alignment: 'center', fontSize: 8 },
                    { text: String(bd.a), alignment: 'center', fontSize: 8 },
                    { text: String(bd.b), alignment: 'center', fontSize: 8 },
                    { text: String(bd.c), alignment: 'center', fontSize: 8 },
                    { text: String(bd.d), alignment: 'center', fontSize: 8 },
                    { text: String(bd.total), bold: true, color: '#15803d', alignment: 'center', fontSize: 8 }
                  ];
                })
              ]
            },
            layout: standardTableLayout
          }
        );
      }
    } else if (item.index === 9) {
      const item9Sub = subs(9);
      const students = item9Sub?.students || [];
      const criteria = item9Sub?.criteria || [
        { id: 'internal-1', label: 'Internal 1' },
        { id: 'internal-2', label: 'Internal 2' }
      ];

      if (students.length > 0) {
        hasStructuredContent = true;
        const crHeaders = criteria.map((cr: any) => ({
          text: cr.label,
          bold: true,
          alignment: 'center',
          fillColor: '#f5f5f5',
          fontSize: 8.5
        }));
        const crWidths = criteria.map(() => 45);

        structuredContent.push({
          margin: [0, 0, 0, 14],
          table: {
            headerRows: 1,
            dontBreakRows: true,
            keepWithHeaderRows: 1,
            widths: [25, 80, '*', ...crWidths],
            body: [
              [
                { text: 'Sr', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8.5 },
                { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8.5 },
                { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8.5 },
                ...crHeaders
              ],
              ...students.map((st: any, i: number) => {
                const crCols = criteria.map((cr: any) => ({
                  text: String(st.marks?.[cr.id] ?? '—'),
                  alignment: 'center',
                  fontSize: 8.5
                }));
                return [
                  { text: String(i + 1), alignment: 'center', fontSize: 8.5 },
                  { text: st.enrolmentNumber || st.studentId || '—', alignment: 'center', fontSize: 8.5 },
                  { text: st.name || st.studentName || '—', fontSize: 8.5 },
                  ...crCols
                ];
              })
            ]
          },
          layout: standardTableLayout
        });
      }
    } else if (item.index === 11 || item.index === 12) {
      const itemSub = subs(item.index);
      const students = itemSub?.students || [];
      if (students.length > 0) {
        hasStructuredContent = true;
        const qKeys = Object.keys(students[0] || {}).filter((k) => /^q\d+$/i.test(k));
        const qHeaders = qKeys.map((q) => ({
          text: q.toUpperCase(),
          bold: true,
          alignment: 'center',
          fillColor: '#f5f5f5',
          fontSize: 8.5
        }));
        const qWidths = qKeys.map(() => 30);

        structuredContent.push({
          margin: [0, 0, 0, 14],
          table: {
            headerRows: 1,
            dontBreakRows: true,
            keepWithHeaderRows: 1,
            widths: [25, 80, '*', ...qWidths, 35],
            body: [
              [
                { text: 'Sr', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8.5 },
                { text: 'Enrolment No', bold: true, alignment: 'center', fillColor: '#f5f5f5', fontSize: 8.5 },
                { text: 'Student Name', bold: true, alignment: 'left', fillColor: '#f5f5f5', fontSize: 8.5 },
                ...qHeaders,
                { text: 'Total', bold: true, alignment: 'center', fillColor: '#fef3c7', fontSize: 8.5 }
              ],
              ...students.map((st: any, i: number) => {
                const qCols = qKeys.map((q) => ({
                  text: String(st[q] ?? '—'),
                  alignment: 'center',
                  fontSize: 8.5
                }));
                return [
                  { text: String(i + 1), alignment: 'center', fontSize: 8.5 },
                  { text: st.enrolmentNumber || st.studentId || '—', alignment: 'center', fontSize: 8.5 },
                  { text: st.name || st.studentName || '—', fontSize: 8.5 },
                  ...qCols,
                  { text: String(st.total ?? '—'), bold: true, alignment: 'center', fontSize: 8.5 }
                ];
              })
            ]
          },
          layout: standardTableLayout
        });
      }
    } else if (item.index === 20) {
      hasStructuredContent = true;
      structuredContent.push({
        margin: [0, 40, 0, 0],
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#fafafa',
                margin: [20, 24, 20, 24],
                stack: [
                  { text: 'Course Faculty Signature', bold: true, fontSize: 13, alignment: 'center', margin: [0, 0, 0, 20] },
                  { text: facultyName, bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 6] },
                  { text: `Signed by: ${cf.facultySignatureName || facultyName}`, fontSize: 10, color: '#555555', alignment: 'center' }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc'
        }
      });
    }

    if (hasStructuredContent) {
      const chunk = [
        ...itemDividerContent,
        { text: '', pageBreak: 'before' },
        buildPageHeader(schoolName, hasLogo),
        {
          text: `${item.index}. ${item.name.toUpperCase()}`,
          fontSize: 12,
          bold: true,
          decoration: 'underline',
          margin: [0, 0, 0, 14]
        },
        ...structuredContent
      ];
      await appendPdfMakeDoc(chunk);
      if (uploadedBuffers.length > 0) {
        await appendRawBuffers(uploadedBuffers);
      }
    } else if (isUploaded) {
      // Document is uploaded: Divider page + direct pages
      await appendPdfMakeDoc(itemDividerContent);
      let appendedAny = false;
      if (uploadedBuffers.length > 0) {
        appendedAny = await appendRawBuffers(uploadedBuffers);
      }
      if (!appendedAny) {
        const noticeChunk = [
          { text: '', pageBreak: 'before' },
          buildPageHeader(schoolName, hasLogo),
          {
            text: `${item.index}. ${item.name.toUpperCase()}`,
            fontSize: 12,
            bold: true,
            decoration: 'underline',
            margin: [0, 0, 0, 14]
          },
          ...buildMissingNotice(item.name, db?.fileName || sb?.fileName)
        ];
        await appendPdfMakeDoc(noticeChunk);
      }
    } else {
      // Truly pending item
      const chunk = [
        ...itemDividerContent,
        { text: '', pageBreak: 'before' },
        buildPageHeader(schoolName, hasLogo),
        {
          text: `${item.index}. ${item.name.toUpperCase()}`,
          fontSize: 12,
          bold: true,
          decoration: 'underline',
          margin: [0, 0, 0, 14]
        },
        {
          margin: [0, 20, 0, 0],
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#fafafa',
                  margin: [10, 20, 10, 20],
                  stack: [
                    { text: 'Document not yet uploaded', bold: true, fontSize: 11, color: '#888888', alignment: 'center', margin: [0, 0, 0, 4] },
                    { text: item.name, fontSize: 9, color: '#aaaaaa', alignment: 'center' }
                  ]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#e0e0e0',
            vLineColor: () => '#e0e0e0'
          }
        }
      ];
      await appendPdfMakeDoc(chunk);
    }
  }

  const mergedBytes = await mergedDoc.save();
  return Buffer.from(mergedBytes);
}

/**
 * Kept for backwards compatibility if referenced elsewhere.
 */
export async function generatePdfBufferFromHtml(htmlContent: string): Promise<Buffer> {
  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 11 },
    content: [{ text: 'Course File Document' }]
  };
  const doc = pdfmake.createPdf(docDef);
  return await doc.getBuffer();
}

export function renderCleanCourseFileHtml(cf: any, checklist: any[], subject?: any): string {
  const logoDataUri = getLogoBase64();
  
  const rawDept = cf.department || cf.faculty?.department || subject?.department || 'Computer Engineering';
  const deptName = rawDept.toLowerCase().startsWith('department of')
    ? rawDept
    : `Department of ${rawDept}`;

  const rawSchool = cf.school || cf.faculty?.school || subject?.school || 'School of Engineering';
  const schoolName = (rawSchool.toUpperCase() === 'SOE' || rawSchool === 'School of Engineering')
    ? 'School of Engineering'
    : rawSchool;

  const faculty = cf.facultyName || cf.faculty?.name || 'Faculty Member';
  const facultyName = (faculty.toLowerCase().startsWith('mr.') || faculty.toLowerCase().startsWith('dr.') || faculty.toLowerCase().startsWith('ms.') || faculty.toLowerCase().startsWith('prof.'))
    ? faculty
    : `Mr. ${faculty}`;

  const code = cf.courseCode || subject?.code || 'COURSE CODE';
  const title = cf.courseTitle || subject?.title || 'COURSE TITLE';

  const dbi = (idx: number) => checklist.find((c) => c.itemIndex === idx);
  const subs = (idx: number): any => {
    const it = dbi(idx);
    if (!it?.subItemsJson) return null;
    try { return JSON.parse(it.subItemsJson); } catch { return null; }
  };

  const item1Sub = subs(1);
  let item1Html = '';
  if (item1Sub) {
    const subKeys = ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'] as const;
    subKeys.forEach((sk) => {
      const text = item1Sub[sk]?.textContent;
      if (!text?.trim()) return;
      const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const isMission = sk === 'mission';
            const isDeptVision = sk === 'deptVision';
            const isDeptMission = sk === 'deptMission';
            const isPeo = sk === 'peo';
            const isPso = sk === 'pso';
            const isPo = sk === 'po';

            let col1Header = '';
            let col2Header = '';
            let prefix = '';

            if (isPeo) {
              col1Header = 'PEO No';
              col2Header = 'PROGRAMME EDUCATIONAL OBJECTIVES';
              prefix = 'PEO ';
            } else if (isPso) {
              col1Header = 'PSO No';
              col2Header = 'PROGRAMME SPECIFIC OUTCOMES (PSO)';
              prefix = 'PSO ';
            } else if (isPo) {
              col1Header = 'PO No';
              col2Header = 'PROGRAMME OUTCOMES';
              prefix = 'PO ';
            } else if (isMission) {
              col2Header = 'INSTITUTE MISSION';
            } else if (isDeptVision) {
              col2Header = 'DEPARTMENT VISION';
            } else if (isDeptMission) {
              col2Header = 'DEPARTMENT MISSION';
            } else {
              col2Header = 'INSTITUTE VISION';
            }

      if (isPeo || isPso || isPo) {
        const rowsHtml = lines.map((line: string, idx: number) => {
          const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;
          return `
            <tr style="border-bottom: ${idx < lines.length - 1 ? '1px solid #000' : 'none'};">
              <td style="width: 90px; padding: 6px 10px; font-weight: bold; text-align: center; border-right: 1px solid #000; font-size: 13px; vertical-align: top;">
                ${prefix}${idx + 1}
              </td>
              <td style="padding: 6px 10px; font-size: 13px; line-height: 1.5; text-align: justify;">
                ${cleanText}
              </td>
            </tr>`;
        }).join('');

        item1Html += `
          <div style="margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: 'Times New Roman', Times, serif;">
              <thead>
                <tr style="background-color: #d9ead3; border-bottom: 1px solid #000;">
                  <th style="width: 90px; padding: 6px 10px; font-weight: bold; font-size: 13px; text-align: center; border-right: 1px solid #000;">${col1Header}</th>
                  <th style="padding: 6px 10px; font-weight: bold; font-size: 13px; text-align: left;">${col2Header}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
      } else if (isMission || lines.length > 1) {
        const rowsHtml = lines.map((line: string, idx: number) => {
          const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
          return `
            <tr style="border-bottom: ${idx < lines.length - 1 ? '1px solid #000' : 'none'};">
              <td style="width: 45px; padding: 6px 10px; font-weight: bold; text-align: center; border-right: 1px solid #000; font-size: 13px; vertical-align: top;">
                ${idx + 1}.
              </td>
              <td style="padding: 6px 10px; font-size: 13px; line-height: 1.5; text-align: justify;">
                ${cleanText}
              </td>
            </tr>`;
        }).join('');

        item1Html += `
          <div style="margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: 'Times New Roman', Times, serif;">
              <thead>
                <tr style="background-color: #d9ead3; border-bottom: 1px solid #000;">
                  <th colSpan={2} style="padding: 6px 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; text-align: center;">${col2Header}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
      } else {
        item1Html += `
          <div style="margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: 'Times New Roman', Times, serif;">
              <thead>
                <tr style="background-color: #d9ead3; border-bottom: 1px solid #000;">
                  <th style="padding: 6px 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; text-align: center;">${col2Header}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 10px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; text-align: justify;">${text}</td>
                </tr>
              </tbody>
            </table>
          </div>`;
      }
    });
  }

  const pageHeaderHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 24px; font-family: 'Times New Roman', Times, serif;">
      <div>
        ${logoDataUri ? `<img src="${logoDataUri}" alt="PPSU" style="height: 44px; max-width: 280px; object-fit: contain;" />` : `<div style="font-weight: bold; font-size: 16px;">P P SAVANI UNIVERSITY</div>`}
      </div>
      <div style="background-color: #4d8e28; color: #fff; padding: 6px 14px; border-radius: 4px 12px 4px 4px; font-weight: bold; font-size: 13px; letter-spacing: 0.5px; white-space: nowrap;">
        ${schoolName}
      </div>
    </div>`;

  const tocRowsHtml = CHECKLIST_ITEMS.map((item) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; font-size: 13px; width: 70px;">${item.index}</td>
      <td style="border: 1px solid #000; padding: 6px 10px; font-size: 13px;">${item.name}</td>
    </tr>
  `).join('');

  const sectionPagesHtml = CHECKLIST_ITEMS.map((item) => {
    let itemContentHtml = '';
    if (item.index === 1) {
      itemContentHtml = item1Html || `<div style="text-align: center; color: #777; padding: 40px 0;">— Content Pending —</div>`;
    } else {
      const db = dbi(item.index);
      itemContentHtml = db?.fileName
        ? `<div style="border: 1px solid #000; padding: 20px; text-align: center; border-radius: 4px; margin-top: 16px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">📄 ${db.fileName}</div>
            <div style="font-size: 12px; color: #555;">Uploaded Document Attachment</div>
           </div>`
        : `<div style="text-align: center; color: #888; padding: 40px 0; border: 1px dashed #ccc; border-radius: 4px;">
            <div style="font-weight: bold;">Document not yet uploaded</div>
            <div style="font-size: 12px; margin-top: 4px;">${item.name}</div>
           </div>`;
    }

    return `
      <div class="page page-divider">
        <div style="font-weight: bold; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; max-width: 85%; line-height: 1.5; font-family: 'Times New Roman', Times, serif;">
          ${item.name}
        </div>
      </div>

      <div class="page">
        ${pageHeaderHtml}
        <div style="font-weight: bold; font-size: 14px; text-decoration: underline; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.3px;">
          ${item.index}. ${item.name}
        </div>
        ${itemContentHtml}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Merged Course File</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: 'Times New Roman', Times, serif; color: #000; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm 20mm; margin: 0 auto; background: #fff; page-break-after: always; break-after: page; position: relative; }
    .page-divider { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  </style>
</head>
<body>
  <div class="page cover-page">
    <div style="font-weight: bold; font-size: 26px; letter-spacing: 1px; margin-bottom: 12px;">P P SAVANI UNIVERSITY</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 30px;">(${schoolName})</div>
    <div style="width: 130px; height: 130px; margin: 10px auto 35px auto; position: relative; overflow: hidden; border-radius: 50%;">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="PPSU Seal" style="height: 130px; max-width: none; position: absolute; left: 0; top: 0;" />` : ''}
    </div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 36px;">${deptName}</div>
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">Faculty Name</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 36px;">${facultyName}</div>
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">Subject</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 2px;">${code}</div>
    <div style="font-weight: bold; font-size: 20px; margin-bottom: 4px;">${title}</div>
    <div style="font-weight: bold; font-size: 16px;">(Course File)</div>
  </div>
  <div class="page">
    ${pageHeaderHtml}
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-weight: bold; font-size: 20px;">Table of Content</div>
    </div>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: 'Times New Roman', Times, serif;">
      <thead>
        <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000;">
          <th style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; font-size: 13px; width: 70px; text-align: center;">Sr. No.</th>
          <th style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; font-size: 13px; text-align: left;">Content</th>
        </tr>
      </thead>
      <tbody>
        ${tocRowsHtml}
      </tbody>
    </table>
  </div>
  ${sectionPagesHtml}
</body>
</html>`;
}
