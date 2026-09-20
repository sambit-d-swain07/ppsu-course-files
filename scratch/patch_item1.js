const fs = require('fs');
const file = 'src/app/faculty/course-files/[id]/FacultyCourseFileDetailClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `{hasText && (
                                      <div
                                        className="p-2 bg-white rounded border small text-secondary mb-2"
                                        style={{ maxHeight: 140, overflowY: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}
                                      >
                                        {subData.textContent}
                                      </div>
                                    )}`;

const newBlock = `{hasText && key === 'mission' ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '8px', fontSize: 11, background: '#fff' }}>
                                        <thead>
                                          <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                            <th colSpan={2} style={{ padding: '4px 8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 11 }}>INSTITUTE MISSION</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {subData.textContent.split('\\n').map((l) => l.trim()).filter(Boolean).map((line, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                              <td style={{ width: 28, padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #ddd' }}>{idx + 1}</td>
                                              <td style={{ padding: '4px 8px' }}>{line.replace(/^\\d+[\\.\\)]\\s*/, '')}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : hasText ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '8px', fontSize: 11, background: '#fff' }}>
                                        <thead>
                                          <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                            <th style={{ padding: '4px 8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 11 }}>INSTITUTE {label.toUpperCase()}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{subData.textContent}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    ) : null}`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('PATCH_SUCCESS');
} else {
  console.log('OLD_BLOCK_NOT_FOUND');
}
