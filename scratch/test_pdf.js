const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getLogoBase64() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'PPSUNAACA+Logo.png');
    if (fs.existsSync(logoPath)) {
      return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }
  } catch (e) {}
  return '';
}

function renderHtml(cf) {
  const logoUri = getLogoBase64();
  const schoolName = 'School of Engineering';
  const deptName = 'Department of Computer Engineering';
  const facultyName = cf.facultyName || 'Mr. Aakash Gupta';
  const code = cf.courseCode || 'SEIT1210';
  const title = cf.courseTitle || 'Python for Engineers';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; }
  .page { width: 210mm; height: 297mm; padding: 20mm 20mm; margin: 0 auto; page-break-after: always; break-after: page; box-sizing: border-box; position: relative; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
</style>
</head>
<body>
  <!-- PAGE 1: COVER PAGE -->
  <div class="page cover">
    <div style="font-weight: bold; font-size: 26px; letter-spacing: 1px; margin-bottom: 12px;">P P SAVANI UNIVERSITY</div>
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 30px;">(${schoolName})</div>
    
    <!-- PERFECT ROUND PPSU EMBLEM ALONE -->
    <div style="width: 130px; height: 130px; margin: 10px auto 35px auto; position: relative; overflow: hidden; border-radius: 50%;">
      <img src="${logoUri}" alt="PPSU Seal" style="height: 130px; max-width: none; position: absolute; left: 0; top: 0;" />
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
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 24px;">
      <img src="${logoUri}" alt="PPSU" style="height: 44px; max-width: 280px; object-fit: contain;" />
      <div style="background-color: #4d8e28; color: #fff; padding: 6px 14px; border-radius: 4px 12px 4px 4px; font-weight: bold; font-size: 13px;">
        ${schoolName}
      </div>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-weight: bold; font-size: 20px;">Table of Content</div>
    </div>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
      <thead>
        <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000;">
          <th style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; font-size: 13px; width: 70px; text-align: center;">Sr. No.</th>
          <th style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; font-size: 13px; text-align: left;">Content</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">1.</td><td style="border: 1px solid #000; padding: 6px 10px;">Institute Vision, Mission & PEO,PSO & PO</td></tr>
        <tr><td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">2.</td><td style="border: 1px solid #000; padding: 6px 10px;">Time Table of the Faculty</td></tr>
        <tr><td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">3.</td><td style="border: 1px solid #000; padding: 6px 10px;">Course information sheet with course objectives, course pre-requisites, course outcomes</td></tr>
        <tr><td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">4.</td><td style="border: 1px solid #000; padding: 6px 10px;">Student name list</td></tr>
        <tr><td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">5.</td><td style="border: 1px solid #000; padding: 6px 10px;">Department academic calendar</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

const html = renderHtml({ courseCode: 'SEIT1210', courseTitle: 'Python for Engineers', facultyName: 'Mr. Aakash Gupta' });
const tmpHtml = path.join(__dirname, 'server_test.html');
const tmpPdf = path.join(__dirname, 'server_test.pdf');

fs.writeFileSync(tmpHtml, html, 'utf8');

const msedgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
execSync(`"${msedgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${tmpPdf}" "${tmpHtml}"`);

// Render screenshot of cover page
const coverPng = path.join(__dirname, 'cover_page_clean_seal.png');
execSync(`"${msedgePath}" --headless --window-size=850,1150 --screenshot="${coverPng}" "${tmpHtml}"`);
console.log('Clean seal cover page screenshot saved:', coverPng);
