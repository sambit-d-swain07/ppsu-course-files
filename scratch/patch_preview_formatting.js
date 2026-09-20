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

// 1. Update font family in TH, TD, TBLSTYLE, PAGE constants
code = code.replace(
  `const TBLSTYLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif' };`,
  `const TBLSTYLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: "'Times New Roman', Times, serif" };`
);

code = code.replace(
  `const PAGE: React.CSSProperties = { padding: '60px 70px', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff' };`,
  `const PAGE: React.CSSProperties = { padding: '60px 70px', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', fontFamily: "'Times New Roman', Times, serif", color: '#000', background: '#fff' };`
);

// 2. Update PageHeader to match reference header (Logo on left, green badge on right)
const oldPageHeader = `function PageHeader({ cf }: { cf: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '22px' }}>
      <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '58px', objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>P P SAVANI UNIVERSITY</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{cf.school || cf.faculty?.school || 'School of Engineering'}</div>
        <div style={{ fontSize: '12px' }}>Dept. of {cf.department || cf.faculty?.department || 'Computer Engineering'}</div>
      </div>
    </div>
  );
}`;

const newPageHeader = `function PageHeader({ cf }: { cf: any }) {
  const schoolName = cf.school || cf.faculty?.school || 'School of Engineering';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '28px', fontFamily: "'Times New Roman', Times, serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '54px', objectFit: 'contain' }} />
      </div>
      <div style={{ background: '#4d8e28', color: '#fff', padding: '8px 16px', borderRadius: '4px 14px 4px 4px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>
        {schoolName}
      </div>
    </div>
  );
}`;

code = code.replace(oldPageHeader, newPageHeader);

// 3. Update Cover Page (Page 1) to match reference layout
const oldCoverPage = `{/* PAGE 1: COVER PAGE */}
        <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '1100px' }}>
          <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '100px', objectFit: 'contain', marginBottom: '20px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '22px', letterSpacing: '1px', marginBottom: '4px' }}>P P SAVANI UNIVERSITY</div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>({school})</div>
          <div style={{ fontSize: '11px', border: '1px solid #000', padding: '2px 12px', display: 'inline-block', marginBottom: '36px' }}>NAAC A+ GRADE ACCREDITED UNIVERSITY</div>
          <div style={{ borderTop: '2px solid #000', width: '70%', marginBottom: '36px' }} />
          <div style={{ fontSize: '13px', marginBottom: '6px', textTransform: 'uppercase', color: '#555' }}>Department of</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '52px' }}>{dept}</div>
          <div style={{ textAlign: 'left', width: '65%' }}>
            {([['Faculty Name', faculty], ['Subject', \`\${code} — \${title}\`], ['Semester', cf.semester || '—'], ['Division', cf.division || cf.subject?.division || '—'], ['Academic Year', cf.academicYear || '2025-26']] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{ marginBottom: '14px', fontSize: '14px' }}>
                <span style={{ fontWeight: 'bold' }}>{label}:</span>{' '}<span>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid #000', width: '70%', marginTop: '44px', marginBottom: '24px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '2px', textTransform: 'uppercase' }}>(COURSE FILE)</div>
        </div>`;

const newCoverPage = `{/* PAGE 1: COVER PAGE */}
        <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '1100px', fontFamily: "'Times New Roman', Times, serif" }}>
          <div style={{ fontWeight: 'bold', fontSize: '26px', letterSpacing: '1px', marginBottom: '16px' }}>P P SAVANI UNIVERSITY</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '40px' }}>({school})</div>
          
          <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '220px', objectFit: 'contain', marginBottom: '50px' }} />
          
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '36px' }}>
            Department of {dept}
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px' }}>Faculty Name</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '36px' }}>
            {faculty}
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px' }}>Subject</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{code}</div>
          <div style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '6px' }}>{title}</div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>(Course File)</div>
        </div>`;

code = code.replace(oldCoverPage, newCoverPage);

// 4. Update Table of Contents Title formatting
code = code.replace(
  `<div style={{ fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '1px' }}>Table of Contents</div>`,
  `<div style={{ fontWeight: 'bold', fontSize: '20px', fontFamily: "'Times New Roman', Times, serif" }}>Table of Content</div>`
);

// 5. Replace font in item 1 section tables (Arial -> 'Times New Roman', Times, serif)
code = code.split("fontFamily: 'Arial, sans-serif'").join("fontFamily: \"'Times New Roman', Times, serif\"");

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully patched preview/page.tsx formatting!');
