const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'src',
  'app',
  'faculty',
  'course-files',
  '[id]',
  'preview',
  'page.tsx'
);

let code = fs.readFileSync(targetPath, 'utf8');

// 1. Update FileEmbed component to hide iframe during print and render fallback
const oldFileEmbed = `function FileEmbed({ url, name, height = '650px' }: { url: string; name?: string; height?: string }) {
  if (!url) return null;
  const isImg = name?.match(/\\.(png|jpg|jpeg|gif|webp)$/i);
  const isDoc = name?.match(/\\.(docx|doc|xlsx|xls|csv|txt)$/i);

  if (isImg) {
    return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: height, objectFit: 'contain', display: 'block', margin: '0 auto' }} />;
  }

  if (isDoc) {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', margin: '16px 0' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{name || 'Document File'}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Office / Text Document</div>
        <a href={url} download={name || 'document'} className="btn btn-sm btn-primary no-print" target="_blank" rel="noreferrer">
          Download / Open {name}
        </a>
      </div>
    );
  }

  return (
    <div>
      <iframe src={url} title={name || 'doc'} width="100%" height={height} style={{ border: 'none', borderRadius: '4px' }} />
      <div className="no-print text-center mt-1" style={{ fontSize: '11px', color: '#666' }}>
        Having trouble viewing? <a href={url} target="_blank" rel="noreferrer" className="text-decoration-underline">Open PDF in new tab</a>
      </div>
    </div>
  );
}`;

const newFileEmbed = `function FileEmbed({ url, name, height = '650px' }: { url: string; name?: string; height?: string }) {
  if (!url) return null;
  const isImg = name?.match(/\\.(png|jpg|jpeg|gif|webp)$/i);
  const isDoc = name?.match(/\\.(docx|doc|xlsx|xls|csv|txt)$/i);

  if (isImg) {
    return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: height, objectFit: 'contain', display: 'block', margin: '0 auto' }} />;
  }

  if (isDoc) {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', margin: '16px 0' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{name || 'Document File'}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Office / Text Document</div>
        <a href={url} download={name || 'document'} className="btn btn-sm btn-primary no-print" target="_blank" rel="noreferrer">
          Download / Open {name}
        </a>
      </div>
    );
  }

  return (
    <div>
      <iframe src={url} title={name || 'doc'} width="100%" height={height} style={{ border: 'none', borderRadius: '4px' }} className="print-hide-iframe" />
      <div className="no-print text-center mt-1" style={{ fontSize: '11px', color: '#666' }}>
        Having trouble viewing? <a href={url} target="_blank" rel="noreferrer" className="text-decoration-underline">Open PDF in new tab</a>
      </div>
      <div className="print-only-fallback d-none p-3 border border-dark rounded text-center my-3">
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>📄 {name || 'Attached PDF Document'}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>Uploaded Document Attachment</div>
      </div>
    </div>
  );
}`;

code = code.replace(oldFileEmbed, newFileEmbed);

// 2. Add print CSS styles inside MergedCourseFilePreviewPage
const oldReturnStart = `return (
    <div style={{ background: '#525659', minHeight: '100vh', paddingBottom: '40px' }}>`;

const newReturnStart = `return (
    <div className="preview-outer-wrapper" style={{ background: '#525659', minHeight: '100vh', paddingBottom: '40px' }}>
      <style jsx global>{\`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-hide-iframe {
            display: none !important;
          }
          .print-only-fallback {
            display: block !important;
          }
          .preview-outer-wrapper {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .preview-page-container {
            max-width: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .preview-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: auto !important;
            padding: 20px 0 !important;
            border-bottom: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      \`}</style>`;

code = code.replace(oldReturnStart, newReturnStart);

// Update class names on inner page container and page elements
code = code.replace(
  `<div className="mx-auto my-4 shadow-lg" style={{ maxWidth: '920px' }}>`,
  `<div className="preview-page-container mx-auto my-4 shadow-lg" style={{ maxWidth: '920px' }}>`
);

code = code.split('style={{ ...PAGE').join('className="preview-page" style={{ ...PAGE');

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully added print CSS and iframe crash fix to preview/page.tsx!');
