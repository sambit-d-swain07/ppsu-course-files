const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  });
}

async function run() {
  const { getCourseFiles, getMergedChecklistItems } = require('../src/lib/mock-data');
  const { renderCleanCourseFileHtml, generatePdfBufferFromHtml } = require('../src/lib/pdf-generator');

  console.log('Fetching course files...');
  const files = await getCourseFiles();
  console.log('Found course files:', files.length);
  if (!files.length) return;

  const cf = files[0];
  console.log('Course File:', cf.id, cf.courseCode, cf.courseTitle);

  const checklist = await getMergedChecklistItems(cf.id);
  const html = renderCleanCourseFileHtml(cf, checklist, cf.subject);

  fs.writeFileSync('scratch/generated_sample.html', html, 'utf8');
  console.log('Saved html to scratch/generated_sample.html');

  const pdfBuf = await generatePdfBufferFromHtml(html);
  fs.writeFileSync('scratch/generated_sample.pdf', pdfBuf);
  console.log('SUCCESS! Saved PDF to scratch/generated_sample.pdf, size:', pdfBuf.length, 'bytes');
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
