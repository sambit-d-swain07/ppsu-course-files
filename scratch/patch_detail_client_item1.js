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

// 1. Add item1RowDrafts state if missing
if (!code.includes('item1RowDrafts')) {
  code = code.replace(
    'const [item1Drafts, setItem1Drafts] = useState',
    'const [item1RowDrafts, setItem1RowDrafts] = useState<Record<string, string[]>>({});\n  const [item1Drafts, setItem1Drafts] = useState'
  );
}

// 2. Find and replace old Item 1 rendering block
const oldItem1BlockStart = `{/* SECTION 10 & 16: Item 1 Split into 5 Sub-uploads */}`;
const oldItem1BlockEnd = `{/* SECTION 6: Item 6 — Course Delivery Details`;

const startIndex = code.indexOf(oldItem1BlockStart);
const endIndex = code.indexOf(oldItem1BlockEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find Item 1 block indices in FacultyCourseFileDetailClient.tsx');
  process.exit(1);
}

const newItem1Block = `{/* SECTION 10 & 16: Item 1 Split into 5 Sub-fields with Row Builders */}
                {isItem1 && !isRestricted && (() => {
                  const subs: any = getSubItems(1) || {};
                  const subKeys = ['vision', 'mission', 'peo', 'pso', 'po'] as const;
                  const configMap: Record<string, { label: string; required?: boolean }> = {
                    vision:  { label: '(a) Institute & Department Vision', required: true },
                    mission: { label: '(b) Institute & Department Mission', required: true },
                    peo:     { label: '(c) Program Educational Objectives (PEO)', required: true },
                    pso:     { label: '(d) Program Specific Outcomes (PSO)', required: true },
                    po:      { label: '(e) Program Outcomes (PO)', required: true },
                  };

                  const handleSaveSubItemText = async (sk: string, text: string) => {
                    const currentSubs = getSubItems(1) || {};
                    currentSubs[sk] = {
                      ...(currentSubs[sk] || {}),
                      textContent: text,
                      savedAt: new Date().toISOString(),
                      savedBy: facultySignatureName || 'Course Coordinator'
                    };
                    await saveStructuredItem(1, currentSubs, 'UPLOADED');
                    fetchData();
                  };

                  return (
                    <div className="mt-3 ps-3 border-start border-2 border-info ms-1">
                      <div className="small text-secondary mb-3 fw-semibold">
                        5 Text Fields Required — Manage Vision, Mission, PEO, PSO, and PO statements row-by-row
                      </div>

                      <div className="d-flex flex-column gap-3 mb-4">
                        {subKeys.map((sk) => {
                          const skData = subs[sk] || {};
                          const config = configMap[sk] || { label: sk };
                          const isVision = sk === 'vision';
                          const savedText = skData.textContent || '';
                          const currentTextDraft = item1Drafts[sk] ?? savedText;

                          // For Vision: plain single textarea, NO row builder, NO + Add Row button
                          if (isVision) {
                            return (
                              <div key={sk} className="p-3 border rounded bg-light">
                                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                  <span className="fw-bold text-navy-900 small" style={{ fontSize: 13 }}>
                                    {config.label} {config.required && <span className="text-danger">*</span>}
                                  </span>
                                  <div className="d-flex align-items-center gap-2">
                                    {skData.fileName && (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle font-mono-ppsu" style={{ fontSize: 11 }}>
                                        ✓ File: {skData.fileName}
                                      </span>
                                    )}
                                    {skData.textContent && (
                                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 11 }}>
                                        ✓ Saved
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isLocked ? (
                                  <div className="p-2 bg-white rounded border" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                                    {savedText || <span className="text-muted fst-italic">Not saved yet.</span>}
                                  </div>
                                ) : (
                                  <>
                                    <Form.Control
                                      as="textarea"
                                      rows={3}
                                      size="sm"
                                      placeholder="Type Vision statement directly here..."
                                      value={currentTextDraft}
                                      onChange={(e) => setItem1Drafts((prev) => ({ ...prev, vision: e.target.value }))}
                                      style={{ fontSize: 12, resize: 'vertical' }}
                                    />
                                    <div className="d-flex justify-content-end align-items-center mt-2">
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        style={{ fontSize: 11, fontWeight: 600 }}
                                        onClick={() => handleSaveSubItemText('vision', item1Drafts['vision'] ?? savedText)}
                                      >
                                        💾 Save Text
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          }

                          // For Mission, PEO, PSO, PO: Row-by-Row array management
                          const textVal = currentTextDraft;
                          const initialRows = textVal ? textVal.split('\\n').map((l: string) => l.trim()).filter(Boolean) : [''];
                          const rows = item1RowDrafts[sk] || (initialRows.length > 0 ? initialRows : ['']);

                          const handleAddRow = () => {
                            const updatedRows = [...rows, ''];
                            setItem1RowDrafts((prev) => ({ ...prev, [sk]: updatedRows }));
                            setItem1Drafts((prev) => ({ ...prev, [sk]: updatedRows.join('\\n') }));
                          };

                          const handleUpdateRow = (idx: number, text: string) => {
                            const updatedRows = [...rows];
                            updatedRows[idx] = text;
                            setItem1RowDrafts((prev) => ({ ...prev, [sk]: updatedRows }));
                            setItem1Drafts((prev) => ({ ...prev, [sk]: updatedRows.join('\\n') }));
                          };

                          const handleRemoveRow = (idx: number) => {
                            const updatedRows = rows.filter((_, i) => i !== idx);
                            const finalRows = updatedRows.length > 0 ? updatedRows : [''];
                            setItem1RowDrafts((prev) => ({ ...prev, [sk]: finalRows }));
                            setItem1Drafts((prev) => ({ ...prev, [sk]: finalRows.join('\\n') }));
                          };

                          const handleSaveRows = () => {
                            const cleanText = rows.map((r) => r.trim()).filter(Boolean).join('\\n');
                            handleSaveSubItemText(sk, cleanText);
                          };

                          return (
                            <div key={sk} className="p-3 border rounded bg-light">
                              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                <span className="fw-bold text-navy-900 small" style={{ fontSize: 13 }}>
                                  {config.label} {config.required && <span className="text-danger">*</span>}
                                  <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: 10 }}>
                                    {rows.filter((r) => r.trim()).length} {rows.filter((r) => r.trim()).length === 1 ? 'row' : 'rows'}
                                  </span>
                                </span>
                                <div className="d-flex align-items-center gap-2">
                                  {skData.fileName && (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle font-mono-ppsu" style={{ fontSize: 11 }}>
                                      ✓ File: {skData.fileName}
                                    </span>
                                  )}
                                  {skData.textContent && (
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 11 }}>
                                      ✓ Saved
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isLocked ? (
                                <div className="p-2 bg-white rounded border" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                                  {savedText || <span className="text-muted fst-italic">Not saved yet.</span>}
                                </div>
                              ) : (
                                <>
                                  {/* Individual Row Inputs */}
                                  <div className="mb-2 p-2 bg-white rounded border">
                                    <div className="d-flex flex-column gap-2">
                                      {rows.map((rowText: string, idx: number) => {
                                        const prefix = sk === 'peo' ? \`PEO \${idx + 1}\` : sk === 'pso' ? \`PSO \${idx + 1}\` : sk === 'po' ? \`PO \${idx + 1}\` : \`\${idx + 1}.\`;
                                        const cleanText = rowText.replace(/^(PEO|PSO|PO|\\d+)[\\s\\d\\.\\:]*/i, '').trim() || rowText;

                                        return (
                                          <div key={idx} className="d-flex align-items-center gap-2">
                                            <span className="badge bg-dark-subtle text-dark border font-mono-ppsu" style={{ width: '70px', flexShrink: 0, fontSize: 11, textAlign: 'center' }}>
                                              {prefix}
                                            </span>
                                            <Form.Control
                                              type="text"
                                              size="sm"
                                              value={cleanText}
                                              placeholder={\`Statement for \${prefix} (paste or type text here)\`}
                                              onChange={(e) => handleUpdateRow(idx, \`\${prefix}: \${e.target.value}\`)}
                                              style={{ fontSize: 12 }}
                                            />
                                            {rows.length > 1 && (
                                              <Button
                                                size="sm"
                                                variant="outline-danger"
                                                className="py-0 px-2 border-0"
                                                style={{ fontSize: 13 }}
                                                onClick={() => handleRemoveRow(idx)}
                                                title="Remove Row"
                                              >
                                                🗑️
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      style={{ fontSize: 11, fontWeight: 600 }}
                                      onClick={handleAddRow}
                                    >
                                      + Add Row
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      style={{ fontSize: 11, fontWeight: 600 }}
                                      onClick={handleSaveRows}
                                    >
                                      💾 Save Text
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Auto-Generated Formatted Output Preview (Green Header Table Style) */}
                      <div className="mt-4 p-3 border rounded bg-light">
                        <h6 className="fw-bold text-navy-900 mb-3 small text-uppercase" style={{ letterSpacing: 0.5 }}>
                          📋 Live Formatted Output Preview
                        </h6>
                        <div className="p-3 bg-white border rounded">
                          {subKeys.map((sk) => {
                            const text = subs[sk]?.textContent || item1Drafts[sk];
                            if (!text?.trim()) return null;
                            const lines = text.split('\\n').map((l: string) => l.trim()).filter(Boolean);
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

                            if (isPeo || isPso || isPo) {
                              return (
                                <div key={sk} className="mb-3">
                                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                    <thead>
                                      <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                        <th style={{ width: '90px', padding: '6px 10px', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', borderRight: '1px solid #000', color: '#000' }}>
                                          {col1Header}
                                        </th>
                                        <th style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '12px', textAlign: 'left', color: '#000' }}>
                                          {col2Header}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line: string, idx: number) => {
                                        const cleanText = line.replace(/^(PEO|PSO|PO|\\d+)[\\s\\d\\.\\:]*/i, '').trim() || line;
                                        return (
                                          <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                            <td style={{ width: '90px', padding: '6px 10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '12px', verticalAlign: 'top', color: '#000' }}>
                                              {prefix}{idx + 1}
                                            </td>
                                            <td style={{ padding: '6px 10px', fontSize: '12px', lineHeight: '1.5', color: '#000' }}>
                                              {cleanText}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }

                            if (isMission || lines.length > 1) {
                              return (
                                <div key={sk} className="mb-3">
                                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                    <thead>
                                      <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                        <th colSpan={2} style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                          {col2Header}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line: string, idx: number) => {
                                        const cleanText = line.replace(/^\\d+[\\.\\)]\\s*/, '').trim() || line;
                                        return (
                                          <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                            <td style={{ width: '45px', padding: '6px 10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '12px', verticalAlign: 'top', color: '#000' }}>
                                              {idx + 1}.
                                            </td>
                                            <td style={{ padding: '6px 10px', fontSize: '12px', lineHeight: '1.5', color: '#000' }}>
                                              {cleanText}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }

                            return (
                              <div key={sk} className="mb-3">
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                  <thead>
                                    <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                      <th style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                        {col2Header}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: '10px', fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#000' }}>
                                        {text}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}\n\n                `;

code = code.substring(0, startIndex) + newItem1Block + code.substring(endIndex);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully updated Item 1 in FacultyCourseFileDetailClient.tsx!');
