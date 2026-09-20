const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'test_print.html');
const pdfPath = path.join(__dirname, 'test_out.pdf');

fs.writeFileSync(htmlPath, '<!DOCTYPE html><html><head><style>@page{size:A4;margin:0;}</style></head><body><h1 style="text-align:center;margin-top:100px;">Testing Server PDF</h1></body></html>');

const msedgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

try {
  execSync(`"${msedgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`);
  console.log('SUCCESS! PDF generated cleanly. Size:', fs.statSync(pdfPath).size, 'bytes');
} catch (err) {
  console.error('Error:', err.message);
}
