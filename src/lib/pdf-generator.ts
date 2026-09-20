import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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

export function renderCleanCourseFileHtml(cf: any, checklist: any[], subject?: any): string {
  const logoDataUri = getLogoBase64();
  
  // Format Department Name
  const rawDept = cf.department || cf.faculty?.department || subject?.department || 'Computer Engineering';
  const deptName = rawDept.toLowerCase().startsWith('department of')
    ? rawDept
    : `Department of ${rawDept}`;

  // Format School Name (Full, no (SOE) abbreviation)
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

  // Render Item 1 Tables HTML
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

  // Header Banner for Pages 2+
  const pageHeaderHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 24px; font-family: 'Times New Roman', Times, serif;">
      <div>
        ${logoDataUri ? `<img src="${logoDataUri}" alt="PPSU" style="height: 44px; max-width: 280px; object-fit: contain;" />` : `<div style="font-weight: bold; font-size: 16px;">P P SAVANI UNIVERSITY</div>`}
      </div>
      <div style="background-color: #4d8e28; color: #fff; padding: 6px 14px; border-radius: 4px 12px 4px 4px; font-weight: bold; font-size: 13px; letter-spacing: 0.5px; white-space: nowrap;">
        ${schoolName}
      </div>
    </div>`;

  // Render Table of Contents Rows
  const tocRowsHtml = CHECKLIST_ITEMS.map((item) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; font-size: 13px; width: 70px;">${item.index}</td>
      <td style="border: 1px solid #000; padding: 6px 10px; font-size: 13px;">${item.name}</td>
    </tr>
  `).join('');

  // Render Section Pages
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
      <!-- TOPIC DIVIDER PAGE -->
      <div class="page page-divider">
        <div style="font-weight: bold; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; max-width: 85%; line-height: 1.5; font-family: 'Times New Roman', Times, serif;">
          ${item.name}
        </div>
      </div>

      <!-- TOPIC CONTENT PAGE -->
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
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Times New Roman', Times, serif;
      color: #000;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 20mm;
      margin: 0 auto;
      background: #fff;
      page-break-after: always;
      break-after: page;
      position: relative;
    }
    .page-divider {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER PAGE -->
  <div class="page cover-page">
    <div style="font-weight: bold; font-size: 26px; letter-spacing: 1px; margin-bottom: 12px;">P P SAVANI UNIVERSITY</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 30px;">(${schoolName})</div>
    
    <!-- ROUND PPSU SEAL EMBLEM ALONE -->
    <div style="width: 130px; height: 130px; margin: 10px auto 35px auto; position: relative; overflow: hidden; border-radius: 50%;">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="PPSU Seal" style="height: 130px; max-width: none; position: absolute; left: 0; top: 0;" />` : ''}
    </div>
    
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 36px;">
      ${deptName}
    </div>
    
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">Faculty Name</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 36px;">
      ${facultyName}
    </div>
    
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">Subject</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 2px;">${code}</div>
    <div style="font-weight: bold; font-size: 20px; margin-bottom: 4px;">${title}</div>
    <div style="font-weight: bold; font-size: 16px;">(Course File)</div>
  </div>

  <!-- PAGE 2: TABLE OF CONTENTS -->
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

  <!-- PAGES 3+: CHECKLIST ITEMS -->
  ${sectionPagesHtml}

</body>
</html>`;
}

export async function generatePdfBufferFromHtml(htmlContent: string): Promise<Buffer> {
  const isWindows = process.platform === 'win32';
  // VERCEL env var is set to "1" automatically in Vercel serverless functions
  const isServerless = !isWindows && (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME);

  let executablePath: string;
  let launchArgs: string[];

  if (isWindows) {
    // ── Local Windows dev ──────────────────────────────────────────────────
    // Use the system-installed Edge or Chrome directly.
    const localPaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),
    ];
    const found = localPaths.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(
        'No Chrome/Edge binary found locally. Install Microsoft Edge or Google Chrome, ' +
        'or set the CHROME_PATH environment variable to the browser executable.'
      );
    }
    executablePath = found;
    launchArgs = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
    ];
  } else if (isServerless) {
    // ── Vercel / AWS Lambda ────────────────────────────────────────────────
    // @sparticuz/chromium bundles a stripped Chromium binary for Linux serverless.
    executablePath = await chromium.executablePath();
    launchArgs = [
      ...chromium.args,
      '--disable-web-security',
    ];
  } else {
    // ── Other Linux (e.g. local Docker / CI) ──────────────────────────────
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    const found = linuxPaths.find((p) => fs.existsSync(p));
    if (found) {
      executablePath = found;
      launchArgs = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-web-security'];
    } else {
      // Fallback: try @sparticuz/chromium even outside serverless
      executablePath = await chromium.executablePath();
      launchArgs = [...chromium.args, '--disable-web-security'];
    }
  }

  const browser = await puppeteer.launch({
    args: launchArgs,
    defaultViewport: { width: 1200, height: 1697 }, // A4 proportions at 144 dpi
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();

    // Load the HTML directly from string — avoids file:// cross-origin issues
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    // page.pdf() returns Uint8Array in newer puppeteer — normalise to Buffer
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
