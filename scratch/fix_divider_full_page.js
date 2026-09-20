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

const oldDivider = `<div style={{ ...PAGE, minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '80%', lineHeight: 1.4 }}>
                  {item.name}
                </div>
              </div>`;

const newDivider = `<div style={{ ...PAGE, minHeight: '1050px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
                <div style={{ fontWeight: 'bold', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '85%', lineHeight: 1.5, fontFamily: "'Times New Roman', Times, serif" }}>
                  {item.name}
                </div>
              </div>`;

code = code.replace(oldDivider, newDivider);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully updated topic dividers to be full dedicated pages!');
