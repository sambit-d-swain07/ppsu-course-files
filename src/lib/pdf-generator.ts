import fs from 'fs';
import path from 'path';

// Require pdfmake directly to ensure compatibility across Node / Next.js serverless runtimes
const pdfmake = require('pdfmake');

// Initialize standard PDF fonts (built into all PDF engines, 0 external font files required)
pdfmake.setUrlAccessPolicy(() => true);
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setFonts({
  Times: {
    normal: 'Times-Roman',
    bold: 'Times-Bold',
    italics: 'Times-Italic',
    bolditalics: 'Times-BoldItalic'
  },
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
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

export async function generatePdfBuffer(cf: any, checklist: any[], subject?: any): Promise<Buffer> {
  const logoDataUri = getLogoBase64();
  const hasLogo = Boolean(logoDataUri);

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

  const dbi = (idx: number) => checklist.find((c) => c.itemIndex === idx);
  const subs = (idx: number): any => {
    const it = dbi(idx);
    if (!it?.subItemsJson) return null;
    try { return JSON.parse(it.subItemsJson); } catch { return null; }
  };

  const content: any[] = [];

  // ─────────────────────────────────────────────────────────────
  // 1. COVER PAGE
  // ─────────────────────────────────────────────────────────────
  content.push(
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
    { text: '(Course File)', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 0] }
  );

  // ─────────────────────────────────────────────────────────────
  // 2. TABLE OF CONTENTS
  // ─────────────────────────────────────────────────────────────
  content.push(
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
          ...CHECKLIST_ITEMS.map(item => [
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
  );

  // ─────────────────────────────────────────────────────────────
  // 3. CHECKLIST SECTIONS (1 TO 20)
  // ─────────────────────────────────────────────────────────────
  CHECKLIST_ITEMS.forEach(item => {
    // A. Divider Page
    content.push(
      { text: '', pageBreak: 'before' },
      {
        text: item.name.toUpperCase(),
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 260, 0, 0]
      }
    );

    // B. Content Page
    const sectionContent: any[] = [];
    sectionContent.push(
      { text: '', pageBreak: 'before' },
      buildPageHeader(schoolName, hasLogo),
      {
        text: `${item.index}. ${item.name.toUpperCase()}`,
        fontSize: 12,
        bold: true,
        decoration: 'underline',
        margin: [0, 0, 0, 14]
      }
    );

    if (item.index === 1) {
      const item1Sub = subs(1);
      if (item1Sub) {
        const subKeys = ['vision', 'mission', 'peo', 'pso', 'po'] as const;
        subKeys.forEach(sk => {
          const text = item1Sub[sk]?.textContent;
          if (!text?.trim()) return;
          const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
          const isMission = sk === 'mission';
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

            sectionContent.push({
              margin: [0, 0, 0, 14],
              table: {
                headerRows: 1,
                widths: [70, '*'],
                body: [
                  [
                    { text: col1Header, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 },
                    { text: col2Header, bold: true, alignment: 'left', fillColor: '#d9ead3', fontSize: 10 }
                  ],
                  ...rows
                ]
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 5,
                paddingBottom: () => 5
              }
            });
          } else if (isMission || lines.length > 1) {
            const rows = lines.map((line: string, idx: number) => {
              const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
              return [
                { text: `${idx + 1}.`, bold: true, alignment: 'center', fontSize: 10 },
                { text: cleanText, fontSize: 10, alignment: 'justify' }
              ];
            });

            sectionContent.push({
              margin: [0, 0, 0, 14],
              table: {
                headerRows: 1,
                widths: [40, '*'],
                body: [
                  [
                    { text: col2Header, colSpan: 2, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 },
                    {}
                  ],
                  ...rows
                ]
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 5,
                paddingBottom: () => 5
              }
            });
          } else {
            sectionContent.push({
              margin: [0, 0, 0, 14],
              table: {
                headerRows: 1,
                widths: ['*'],
                body: [
                  [{ text: col2Header, bold: true, alignment: 'center', fillColor: '#d9ead3', fontSize: 10 }],
                  [{ text: text, fontSize: 10, alignment: 'justify', margin: [4, 4, 4, 4] }]
                ]
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 5,
                paddingBottom: () => 5
              }
            });
          }
        });
      } else {
        sectionContent.push({
          text: '— Content Pending —',
          alignment: 'center',
          color: '#777777',
          margin: [0, 40, 0, 0]
        });
      }
    } else {
      const db = dbi(item.index);
      if (db && db.fileName) {
        sectionContent.push({
          margin: [0, 20, 0, 0],
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#fafafa',
                  margin: [10, 20, 10, 20],
                  stack: [
                    { text: `Attachment: ${db.fileName}`, bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 6] },
                    { text: 'Uploaded Document Attachment', fontSize: 10, color: '#555555', alignment: 'center' }
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
      } else {
        sectionContent.push({
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
        });
      }
    }

    content.push(...sectionContent);
  });

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: 'Times',
      fontSize: 11,
      lineHeight: 1.2
    },
    images: hasLogo ? { logo: logoDataUri } : {},
    content
  };

  const doc = pdfmake.createPdf(docDef);
  return await doc.getBuffer();
}

/**
 * Kept for backwards compatibility if referenced elsewhere.
 */
export async function generatePdfBufferFromHtml(htmlContent: string): Promise<Buffer> {
  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Times', fontSize: 11 },
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
    const subKeys = ['vision', 'mission', 'peo', 'pso', 'po'] as const;
    subKeys.forEach((sk) => {
      const text = item1Sub[sk]?.textContent;
      if (!text?.trim()) return;
      const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const isMission = sk === 'mission';
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
        col1Header = '';
        col2Header = 'INSTITUTE MISSION';
      } else {
        col1Header = '';
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
                  <th colSpan="2" style="padding: 6px 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; text-align: center;">${col2Header}</th>
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
