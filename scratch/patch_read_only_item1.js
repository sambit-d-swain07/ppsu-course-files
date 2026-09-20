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
  'FacultyCourseFileDetailClient.tsx'
);

let code = fs.readFileSync(targetPath, 'utf8');

const oldBlockStart = `{/* SECTION 10 & 16: Item 1 Split into 5 Sub-fields with Row Builders */}`;
const oldBlockEnd = `{/* SECTION 6: Item 6 — Course Delivery Details`;

const startIndex = code.indexOf(oldBlockStart);
const endIndex = code.indexOf(oldBlockEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find Item 1 block indices in FacultyCourseFileDetailClient.tsx');
  process.exit(1);
}

const newReadOnlyItem1Block = `{/* SECTION 1: Item 1 Read-Only Formatted Display for Faculty Course File */}
                {isItem1 && !isRestricted && (() => {
                  const subs: any = getSubItems(1) || {};
                  const subKeys = ['vision', 'mission', 'peo', 'pso', 'po'] as const;
                  const hasAnyContent = subKeys.some((sk) => subs[sk]?.textContent?.trim() || subs[sk]?.fileUrl);

                  return (
                    <div className="mt-3 ps-3 border-start border-2 border-info ms-1">
                      <div className="alert alert-info py-2 px-3 small mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span>ℹ️ <strong>Item 1 (Vision, Mission, PEO, PSO & PO)</strong> is managed by the Course Coordinator.</span>
                        <a href="/faculty/course-coordinator" className="btn btn-sm btn-outline-info py-0 px-2 style-11" style={{ fontSize: 11 }}>
                          Open Course Coordinator Hub ↗
                        </a>
                      </div>

                      {!hasAnyContent ? (
                        <div className="p-4 bg-light rounded border text-center text-muted small">
                          — No Vision, Mission, PEO, PSO, or PO content entered by Course Coordinator yet —
                        </div>
                      ) : (
                        <div className="p-3 bg-white border rounded shadow-sm">
                          {subKeys.map((sk) => {
                            const text = subs[sk]?.textContent;
                            const fileUrl = subs[sk]?.fileUrl;
                            const fileName = subs[sk]?.fileName;
                            if (!text?.trim() && !fileUrl) return null;

                            const lines = text ? text.split('\\n').map((l: string) => l.trim()).filter(Boolean) : [];
                            const headerBg = '#d9ead3';
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

                            return (
                              <div key={sk} className="mb-4">
                                {lines.length > 0 && (
                                  <>
                                    {(isPeo || isPso || isPo) ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                        <thead>
                                          <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                            <th style={{ width: '90px', padding: '6px 10px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #000', color: '#000' }}>
                                              {col1Header}
                                            </th>
                                            <th style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '13px', textAlign: 'left', color: '#000' }}>
                                              {col2Header}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {lines.map((line: string, idx: number) => {
                                            const cleanText = line.replace(/^(PEO|PSO|PO|\\d+)[\\s\\d\\.\\:]*/i, '').trim() || line;
                                            return (
                                              <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                                <td style={{ width: '90px', padding: '6px 10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                                  {prefix}{idx + 1}
                                                </td>
                                                <td style={{ padding: '6px 10px', fontSize: '13px', lineHeight: '1.5', color: '#000' }}>
                                                  {cleanText}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    ) : (isMission || lines.length > 1) ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                        <thead>
                                          <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                            <th colSpan={2} style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                              {col2Header}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {lines.map((line: string, idx: number) => {
                                            const cleanText = line.replace(/^\\d+[\\.\\)]\\s*/, '').trim() || line;
                                            return (
                                              <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                                <td style={{ width: '45px', padding: '6px 10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                                  {idx + 1}.
                                                </td>
                                                <td style={{ padding: '6px 10px', fontSize: '13px', lineHeight: '1.5', color: '#000' }}>
                                                  {cleanText}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                        <thead>
                                          <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                            <th style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                              {col2Header}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '10px', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#000' }}>
                                              {text}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    )}
                                  </>
                                )}

                                {fileUrl && (
                                  <div className="mt-2 d-flex align-items-center gap-2">
                                    <span className="badge bg-success-subtle text-success border border-success-subtle font-mono-ppsu">
                                      ✓ Document: {fileName}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline-info"
                                      style={{ fontSize: 11, padding: '2px 8px' }}
                                      onClick={() => setViewingDoc({ title: 'Item 1 File', fileName: fileName || 'Document', fileUrl })}
                                    >
                                      👁️ View Uploaded File
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}\n\n                `;

code = code.substring(0, startIndex) + newReadOnlyItem1Block + code.substring(endIndex);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully made Item 1 read-only in FacultyCourseFileDetailClient.tsx!');
