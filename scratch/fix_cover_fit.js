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

// Replace PageHeader to ensure logo fits nicely on header
const oldHeader = `function PageHeader({ cf }: { cf: any }) {
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

const newHeader = `function PageHeader({ cf }: { cf: any }) {
  const schoolName = cf.school || cf.faculty?.school || 'School of Engineering';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '24px', fontFamily: "'Times New Roman', Times, serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '46px', maxWidth: '300px', objectFit: 'contain' }} />
      </div>
      <div style={{ background: '#4d8e28', color: '#fff', padding: '6px 14px', borderRadius: '4px 12px 4px 4px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
        {schoolName}
      </div>
    </div>
  );
}`;

code = code.replace(oldHeader, newHeader);

// Replace Cover Page block to fix logo sizing & vertical fitting
const oldCover = `{/* PAGE 1: COVER PAGE */}
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

const newCover = `{/* PAGE 1: COVER PAGE */}
        <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '1050px', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif" }}>
          <div style={{ fontWeight: 'bold', fontSize: '26px', letterSpacing: '1px', marginBottom: '12px' }}>P P SAVANI UNIVERSITY</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '28px' }}>({school})</div>
          
          <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ maxWidth: '80%', maxHeight: '130px', width: 'auto', height: 'auto', objectFit: 'contain', margin: '20px 0 32px 0' }} />
          
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '32px' }}>
            Department of {dept}
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>Faculty Name</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '32px' }}>
            {faculty}
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>Subject</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '2px' }}>{code}</div>
          <div style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>{title}</div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>(Course File)</div>
        </div>`;

code = code.replace(oldCover, newCover);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Fixed cover page logo fitting!');
