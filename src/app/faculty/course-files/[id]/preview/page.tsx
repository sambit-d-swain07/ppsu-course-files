'use client';

import { useEffect, useState, use } from 'react';
import { Spinner, Alert, Button } from 'react-bootstrap';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO' },
  { index: 2,  name: 'Time Table of the Faculty' },
  { index: 3,  name: 'Course information sheet with course objectives, course pre-requisites, course outcomes, i.e. Syllabus' },
  { index: 4,  name: 'Student Name List' },
  { index: 5,  name: 'Department Academic Calendar' },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)' },
  { index: 7,  name: 'List of Laboratory (or Experiments)' },
  { index: 8,  name: 'Laboratory Rubrics' },
  { index: 9,  name: 'Theory Continuous Evaluation Rubrics' },
  { index: 10, name: 'Lab Manuals/Tutorials' },
  { index: 11, name: 'Internal Assessment 1' },
  { index: 12, name: 'Internal Assessment 2' },
  { index: 13, name: 'Guidelines / Documents related to Evaluation Criteria' },
  { index: 14, name: 'Attendance register (ERP)' },
  { index: 15, name: 'University exam' },
  { index: 16, name: 'CO Attainment output sheet' },
  { index: 17, name: 'PO Attainment output sheet' },
  { index: 18, name: 'Action to be taken for next year based on CO attainment' },
  { index: 19, name: 'Lecture notes (Out of 20 Marks)' },
  { index: 20, name: 'Course Faculty Signature' }
];

const TH: React.CSSProperties = { border: '1px solid #000', padding: '6px 10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', fontSize: '12px' };
const TD: React.CSSProperties = { border: '1px solid #000', padding: '5px 10px', verticalAlign: 'middle', fontSize: '12px' };
const TDC: React.CSSProperties = { ...TD, textAlign: 'center' };
const TBLSTYLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: "'Times New Roman', Times, serif" };
const PAGE: React.CSSProperties = { padding: '60px 70px', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', fontFamily: "'Times New Roman', Times, serif", color: '#000', background: '#fff' };

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateBreakdown(totalMark: number, seedKey: string, maxMark = 20) {
  const roundedTotal = Number(totalMark || 0);
  if (roundedTotal === 0) return { a: 0, b: 0, c: 0, d: 0, total: 0 };
  const hash = hashString(`${seedKey}-${roundedTotal}`);
  const targetUnits = Math.round(roundedTotal * 2);
  const maxUnitsPerCol = Math.round((maxMark / 4) * 2);
  const baseAvg = Math.floor(targetUnits / 4);
  let units = [baseAvg, baseAvg, baseAvg, baseAvg];
  let remainder = targetUnits - (baseAvg * 4);
  const shift = hash % 4;
  const shuffledOrder = [(0 + shift) % 4, (1 + shift) % 4, (2 + shift) % 4, (3 + shift) % 4];
  for (let i = 0; i < remainder; i++) { units[shuffledOrder[i % 4]]++; }
  for (let i = 0; i < 4; i++) {
    if (units[i] > maxUnitsPerCol) {
      const overflow = units[i] - maxUnitsPerCol;
      units[i] = maxUnitsPerCol;
      for (let j = 0; j < 4; j++) {
        if (i !== j && units[j] + overflow <= maxUnitsPerCol) {
          units[j] += overflow;
          break;
        }
      }
    }
  }
  const a = units[0] / 2;
  const b = units[1] / 2;
  const c = units[2] / 2;
  const d = units[3] / 2;
  const sum = Number((a + b + c + d).toFixed(1));
  return { a, b, c, d, total: sum };
}

function calcStudentAverages(row: any, numP: number) {
  const practicals = row.practicals || {};
  let sum = 0;
  for (let i = 1; i <= numP; i++) {
    sum += Number(practicals[`P${i}`]) || 0;
  }
  const avg10 = numP > 0 ? Number((sum / numP).toFixed(2)) : 0;
  const avg20 = Number((avg10 * 2).toFixed(2));
  return { avg10, avg20 };
}

function PageHeader({ cf }: { cf: any }) {
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
}

function PdfEmbed({ url, name }: { url: string; name?: string }) {
  // Calculate height: A4 aspect ratio is ~1.414, show multiple pages
  // Use a tall iframe so all pages are visible without clipping
  return (
    <div style={{ width: '100%', margin: '8px 0' }}>
      {/* Label bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#f1f5f9', border: '1px solid #e2e8f0', borderBottom: 'none',
        borderRadius: '6px 6px 0 0', padding: '7px 14px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>📄 {name || 'PDF Document'}</span>
        <a href={url} target="_blank" rel="noreferrer"
          className="no-print"
          style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
        >Open in new tab ↗</a>
      </div>
      {/* Native browser PDF viewer — shows actual PDF pages, not screenshots */}
      <iframe
        src={url}
        title={name || 'PDF Document'}
        className="print-hide-iframe"
        style={{
          width: '100%',
          height: '1100px',
          border: '1px solid #e2e8f0',
          borderRadius: '0 0 6px 6px',
          display: 'block',
          background: '#fff'
        }}
      />
      {/* Print fallback — shown only when printing */}
      <div className="print-only-fallback" style={{ display: 'none', textAlign: 'center', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>📄 {name || 'Attached PDF'}</div>
        <div style={{ fontSize: '11px', color: '#555' }}>See merged PDF for full page content</div>
      </div>
    </div>
  );
}

function FileEmbed({ url, name, height = '650px' }: { url: string; name?: string; height?: string }) {
  if (!url) return null;
  const isImg = name?.match(/\.(png|jpg|jpeg|gif|webp)$/i);
  const isDoc = name?.match(/\.(docx|doc|xlsx|xls|csv|txt)$/i);

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

  // For PDFs: embed using native browser PDF viewer (actual pages, not canvas screenshots)
  return <PdfEmbed url={url} name={name} />;
}

function Pending({ name }: { name: string }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed #bbb', borderRadius: '6px', color: '#999' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>—</div>
      <div style={{ fontWeight: 'bold' }}>Document not yet uploaded</div>
      <div style={{ fontSize: '11px', marginTop: '4px' }}>{name}</div>
    </div>
  );
}

export default function MergedCourseFilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseFileId } = use(params);
  const [cf, setCf] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/course-files/${courseFileId}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then((d) => { setCf(d.courseFile); setChecklist(d.checklistItems || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseFileId]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center flex-column py-5" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" variant="primary" className="mb-3" />
      <h6 className="fw-bold">Assembling Merged Course File Preview…</h6>
    </div>
  );
  if (error || !cf) return <Alert variant="danger" className="m-4">{error || 'Not found'}</Alert>;

  const dbi = (idx: number) => checklist.find((c) => c.itemIndex === idx);
  const subs = (idx: number): any => {
    const it = dbi(idx);
    if (!it?.subItemsJson) return null;
    try { return JSON.parse(it.subItemsJson); } catch { return null; }
  };

  const dept   = cf.department || cf.faculty?.department || 'Computer Engineering';
  const school = cf.school || cf.faculty?.school || 'School of Engineering';
  const faculty = cf.facultyName || cf.faculty?.name || '';
  const code   = cf.courseCode || '';
  const title  = cf.courseTitle || '';

  return (
    <div className="preview-outer-wrapper" style={{ background: '#525659', minHeight: '100vh', paddingBottom: '40px' }}>
      <style jsx global>{`
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
      `}</style>
      <div className="no-print sticky-top bg-dark text-white p-3 shadow d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ zIndex: 1050 }}>
        <div>
          <h6 className="fw-bold mb-0 text-white">Merged Course File Preview</h6>
          <small className="text-white-50">{code} — {title} · {faculty}</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-light" size="sm" onClick={() => window.history.back()}>Back</Button>
          <a href={`/api/course-files/${courseFileId}/merged-report`} download={`merged-course-file-${code}.docx`} className="btn btn-outline-success btn-sm">Download DOCX</a>
          <a href={`/api/course-files/${courseFileId}/merged-pdf`} target="_blank" rel="noreferrer" className="btn btn-warning btn-sm fw-bold px-3">📄 Download PDF Report</a>
        </div>
      </div>

      <div className="preview-page-container mx-auto my-4 shadow-lg" style={{ maxWidth: '920px' }}>

        {/* PAGE 1: COVER PAGE */}
        <div className="preview-page" style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '1050px', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif" }}>
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
        </div>

        {/* PAGE 2: TABLE OF CONTENTS */}
        <div className="preview-page" style={{ ...PAGE }}>
          <PageHeader cf={cf} />
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '20px', fontFamily: "'Times New Roman', Times, serif" }}>Table of Content</div>
          </div>
          <table style={TBLSTYLE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '80px' }}>Sr. No.</th>
                <th style={{ ...TH, textAlign: 'left' }}>Content</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ITEMS.map((item) => (
                <tr key={item.index}>
                  <td style={TDC}>{item.index}</td>
                  <td style={TD}>{item.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGES 3+: ONE PER CHECKLIST ITEM */}
        {CHECKLIST_ITEMS.map((item) => {
          const db = dbi(item.index);
          const sb = subs(item.index);
          const url = db?.fileUrl || db?.sharedFileUrl;
          const fn  = db?.fileName || db?.sharedFileName;
          let content: React.ReactNode;

          if (item.index === 1) {
            const customSecs = Array.isArray(sb?.customSections) ? sb.customSections : [];
            content = (
              <div>
                {(['vision', 'mission', 'peo', 'pso', 'po'] as const).map((key) => {
                  const sub = sb?.[key];
                  const text = sub?.textContent;
                  const isMission = key === 'mission';
                  const lines = text?.split('\n').map((l: string) => l.trim()).filter(Boolean) || [];

                  if (text?.trim()) {
                    const headerBg = '#d9ead3';
                    const isPeo = key === 'peo';
                    const isPso = key === 'pso';
                    const isPo = key === 'po';

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
                      col2Header = `INSTITUTE ${key.toUpperCase()}`;
                    }

                    if (isPeo || isPso || isPo) {
                      return (
                        <div key={key} style={{ marginBottom: '24px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                            <thead>
                              <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                <th style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #000', color: '#000' }}>
                                  {col1Header}
                                </th>
                                <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'left', color: '#000' }}>
                                  {col2Header}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((line: string, idx: number) => {
                                const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;
                                return (
                                  <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                    <td style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                      {prefix}{idx + 1}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
                                      {cleanText}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {sub?.fileUrl && <div style={{ marginTop: '8px' }}><FileEmbed url={sub.fileUrl} name={sub.fileName} height="400px" /></div>}
                        </div>
                      );
                    }

                    if (isMission || lines.length > 1) {
                      return (
                        <div key={key} style={{ marginBottom: '24px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                            <thead>
                              <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                <th colSpan={2} style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                  {col2Header}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((line: string, idx: number) => {
                                const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
                                return (
                                  <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                    <td style={{ width: '45px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                      {idx + 1}.
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
                                      {cleanText}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {sub?.fileUrl && <div style={{ marginTop: '8px' }}><FileEmbed url={sub.fileUrl} name={sub.fileName} height="400px" /></div>}
                        </div>
                      );
                    }

                    return (
                      <div key={key} style={{ marginBottom: '24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                          <thead>
                            <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                {col2Header}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>
                                {text}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        {sub?.fileUrl && <div style={{ marginTop: '8px' }}><FileEmbed url={sub.fileUrl} name={sub.fileName} height="400px" /></div>}
                      </div>
                    );
                  }

                  if (sub?.fileUrl) {
                    return (
                      <div key={key} style={{ marginBottom: '24px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>{key.toUpperCase()}</div>
                        <FileEmbed url={sub.fileUrl} name={sub.fileName} height="480px" />
                      </div>
                    );
                  }

                  return <Pending key={key} name={key.toUpperCase()} />;
                })}

                {/* Custom Sections */}
                {customSecs.map((sec: any) => (
                  <div key={sec.id} style={{ marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                      <thead>
                        <tr style={{ background: '#d9ead3', borderBottom: '1px solid #000' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                            {sec.title.toUpperCase()}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>
                            {sec.textContent}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          } else if (item.index === 4) {
            const students = sb?.students;
            if (students?.length > 0) {
              content = (
                <table style={TBLSTYLE}>
                  <thead><tr><th style={{ ...TH, width: '50px' }}>Sr No</th><th style={TH}>Student Name</th><th style={TH}>Enrolment Number</th><th style={{ ...TH, width: '80px' }}>Batch</th></tr></thead>
                  <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TD}>{st.name || st.studentName || '—'}</td><td style={TDC}>{st.enrolmentNumber || st.rollNo || '—'}</td><td style={TDC}>{st.batch || 'A'}</td></tr>))}</tbody>
                </table>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 6) {
            const subFiles = [
              sb?.lessonPlanLecture,
              sb?.lessonPlanLab,
              sb?.lessonPlanTutorial,
              sb?.outcomeLecture,
              sb?.outcomeLab
            ].filter((f: any) => f && f.fileUrl);

            if (subFiles.length > 0) {
              content = (
                <div>
                  {subFiles.map((sf: any, i: number) => (
                    <div key={i} style={{ marginBottom: '28px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>{sf.fileName || `Lesson Plan File ${i + 1}`}</div>
                      <FileEmbed url={sf.fileUrl} name={sf.fileName} />
                    </div>
                  ))}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 8) {
            const item4 = checklist.find((c: any) => c.itemIndex === 4);
            let item4Students: any[] = [];
            if (item4?.subItemsJson) {
              try {
                const p4 = JSON.parse(item4.subItemsJson);
                item4Students = Array.isArray(p4.students) ? p4.students : (Array.isArray(p4) ? p4 : []);
              } catch (_) {}
            }

            const rawStudents = sb?.students || sb?.rows || sb?.item8Rows || [];
            const studentsMap = new Map<string, any>();
            item4Students.forEach((s: any) => {
              const id = s.id || s.studentId || s.enrolmentNumber;
              if (id) {
                studentsMap.set(id, {
                  studentId: id,
                  name: s.name || s.studentName || '—',
                  enrolmentNumber: s.enrolmentNumber || s.rollNo || '—',
                  batch: s.batch || 'A',
                  practicals: {},
                  termWork: 0,
                  internalViva: 0,
                  esePerformance: 0,
                  eseExternalViva: 0
                });
              }
            });

            rawStudents.forEach((s: any) => {
              const id = s.studentId || s.id || s.enrolmentNumber;
              if (id) {
                const existing = studentsMap.get(id) || {
                  studentId: id,
                  name: s.name || s.studentName || '—',
                  enrolmentNumber: s.enrolmentNumber || s.rollNo || '—',
                  batch: s.batch || 'A'
                };
                studentsMap.set(id, {
                  ...existing,
                  name: s.name || existing.name,
                  enrolmentNumber: s.enrolmentNumber || existing.enrolmentNumber,
                  batch: s.batch || existing.batch,
                  practicals: s.practicals || existing.practicals || {},
                  termWork: s.termWork ?? existing.termWork ?? 0,
                  internalViva: s.internalViva ?? existing.internalViva ?? 0,
                  esePerformance: s.esePerformance ?? existing.esePerformance ?? 0,
                  eseExternalViva: s.eseExternalViva ?? s.eseViva ?? existing.eseExternalViva ?? 0
                });
              }
            });

            const studentRows = Array.from(studentsMap.values());
            const numP = Number(sb?.numPracticals) || 4;
            const secFiles = Object.values(sb?.sectionFiles || {}).filter((f: any) => f && f.fileUrl);
            const batches = sb?.batches || [];

            if (studentRows.length > 0) {
              content = (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
                    CE — Continuous Evaluation (Laboratory)
                  </div>

                  {/* 2.1 Practical Marks Table */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                      2.1 Practical Marks Table (Out of 10 per Practical) (Term Work)
                    </div>
                    <table style={TBLSTYLE}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, width: '45px' }}>Batch</th>
                          <th style={TH}>Student Name</th>
                          <th style={TH}>Enrolment Number</th>
                          {Array.from({ length: numP }).map((_, i) => (
                            <th key={i} style={{ ...TH, width: '45px' }}>P{i + 1}</th>
                          ))}
                          <th style={{ ...TH, width: '70px', background: '#e0f2fe' }}>Avg of 10</th>
                          <th style={{ ...TH, width: '70px', background: '#fef3c7' }}>Avg of 20</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((st: any, i: number) => {
                          const { avg10, avg20 } = calcStudentAverages(st, numP);
                          return (
                            <tr key={i}>
                              <td style={TDC}>{st.batch || 'A'}</td>
                              <td style={TD}>{st.name || '—'}</td>
                              <td style={TDC}>{st.enrolmentNumber || '—'}</td>
                              {Array.from({ length: numP }).map((_, pi) => (
                                <td key={pi} style={TDC}>{st.practicals?.[`P${pi + 1}`] ?? 0}</td>
                              ))}
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#0284c7' }}>{avg10}</td>
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#b45309' }}>{avg20}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2.2 Practicals Auto-Generated 4-Criteria Breakdown Table */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                      2.2 Practicals Auto-Generated 4-Criteria Breakdown Table
                    </div>
                    <table style={TBLSTYLE}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, width: '45px' }}>Batch</th>
                          <th style={TH}>Student Name</th>
                          <th style={TH}>Enrolment Number</th>
                          <th style={{ ...TH, width: '110px' }}>A (Understanding)</th>
                          <th style={{ ...TH, width: '110px' }}>B (Performance)</th>
                          <th style={{ ...TH, width: '110px' }}>C (Record Maint.)</th>
                          <th style={{ ...TH, width: '110px' }}>D (Viva)</th>
                          <th style={{ ...TH, width: '70px', background: '#fef3c7' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((st: any, i: number) => {
                          const { avg20 } = calcStudentAverages(st, numP);
                          const bd = generateBreakdown(avg20, `${st.studentId}-ce-prac`);
                          return (
                            <tr key={i}>
                              <td style={TDC}>{st.batch || 'A'}</td>
                              <td style={TD}>{st.name || '—'}</td>
                              <td style={TDC}>{st.enrolmentNumber || '—'}</td>
                              <td style={TDC}>{bd.a}</td>
                              <td style={TDC}>{bd.b}</td>
                              <td style={TDC}>{bd.c}</td>
                              <td style={TDC}>{bd.d}</td>
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#0f766e' }}>{bd.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2.3 Internal Viva Evaluation & Breakdown */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                      2.3 Internal Viva Evaluation & Auto-Breakdown (Score out of 20)
                    </div>
                    <table style={TBLSTYLE}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, width: '45px' }}>Batch</th>
                          <th style={TH}>Student Name</th>
                          <th style={TH}>Enrolment Number</th>
                          <th style={{ ...TH, width: '110px' }}>Internal Viva (20)</th>
                          <th style={{ ...TH, width: '55px' }}>A</th>
                          <th style={{ ...TH, width: '55px' }}>B</th>
                          <th style={{ ...TH, width: '55px' }}>C</th>
                          <th style={{ ...TH, width: '55px' }}>D</th>
                          <th style={{ ...TH, width: '70px', background: '#fef3c7' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((st: any, i: number) => {
                          const mark = st.internalViva ?? 0;
                          const bd = generateBreakdown(mark, `${st.studentId}-ce-iv`);
                          return (
                            <tr key={i}>
                              <td style={TDC}>{st.batch || 'A'}</td>
                              <td style={TD}>{st.name || '—'}</td>
                              <td style={TDC}>{st.enrolmentNumber || '—'}</td>
                              <td style={{ ...TDC, fontWeight: 'bold' }}>{mark}</td>
                              <td style={TDC}>{bd.a}</td>
                              <td style={TDC}>{bd.b}</td>
                              <td style={TDC}>{bd.c}</td>
                              <td style={TDC}>{bd.d}</td>
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#0f766e' }}>{bd.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '6px', marginTop: '36px' }}>
                    ESE — End Semester Exam (Laboratory)
                  </div>

                  {/* 3.1 Performance / Quiz Evaluation & Breakdown */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                      3.1 Performance / Quiz Evaluation & Auto-Breakdown (Score out of 30)
                    </div>
                    <table style={TBLSTYLE}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, width: '45px' }}>Batch</th>
                          <th style={TH}>Student Name</th>
                          <th style={TH}>Enrolment Number</th>
                          <th style={{ ...TH, width: '120px' }}>Perf / Quiz (30)</th>
                          <th style={{ ...TH, width: '55px' }}>A</th>
                          <th style={{ ...TH, width: '55px' }}>B</th>
                          <th style={{ ...TH, width: '55px' }}>C</th>
                          <th style={{ ...TH, width: '55px' }}>D</th>
                          <th style={{ ...TH, width: '70px', background: '#fef3c7' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((st: any, i: number) => {
                          const mark = st.esePerformance ?? 0;
                          const bd = generateBreakdown(mark, `${st.studentId}-ese-pq`, 30);
                          return (
                            <tr key={i}>
                              <td style={TDC}>{st.batch || 'A'}</td>
                              <td style={TD}>{st.name || '—'}</td>
                              <td style={TDC}>{st.enrolmentNumber || '—'}</td>
                              <td style={{ ...TDC, fontWeight: 'bold' }}>{mark}</td>
                              <td style={TDC}>{bd.a}</td>
                              <td style={TDC}>{bd.b}</td>
                              <td style={TDC}>{bd.c}</td>
                              <td style={TDC}>{bd.d}</td>
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#15803d' }}>{bd.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 3.2 External Viva Evaluation & Breakdown */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                      3.2 External Viva Evaluation & Auto-Breakdown (Score out of 30)
                    </div>
                    <table style={TBLSTYLE}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, width: '45px' }}>Batch</th>
                          <th style={TH}>Student Name</th>
                          <th style={TH}>Enrolment Number</th>
                          <th style={{ ...TH, width: '120px' }}>Ext Viva (30)</th>
                          <th style={{ ...TH, width: '55px' }}>A</th>
                          <th style={{ ...TH, width: '55px' }}>B</th>
                          <th style={{ ...TH, width: '55px' }}>C</th>
                          <th style={{ ...TH, width: '55px' }}>D</th>
                          <th style={{ ...TH, width: '70px', background: '#fef3c7' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((st: any, i: number) => {
                          const mark = st.eseExternalViva ?? st.eseViva ?? 0;
                          const bd = generateBreakdown(mark, `${st.studentId}-ese-ev`, 30);
                          return (
                            <tr key={i}>
                              <td style={TDC}>{st.batch || 'A'}</td>
                              <td style={TD}>{st.name || '—'}</td>
                              <td style={TDC}>{st.enrolmentNumber || '—'}</td>
                              <td style={{ ...TDC, fontWeight: 'bold' }}>{mark}</td>
                              <td style={TDC}>{bd.a}</td>
                              <td style={TDC}>{bd.b}</td>
                              <td style={TDC}>{bd.c}</td>
                              <td style={TDC}>{bd.d}</td>
                              <td style={{ ...TDC, fontWeight: 'bold', color: '#15803d' }}>{bd.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Render any section files if present */}
                  {secFiles.map((sf: any, idx: number) => (
                    <div key={idx} style={{ marginTop: '24px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Uploaded Document: {sf.fileName}</div>
                      <FileEmbed url={sf.fileUrl} name={sf.fileName} />
                    </div>
                  ))}
                </div>
              );
            } else if (batches.length > 0) {
              content = (
                <div>
                  {batches.map((batch: any) => (
                    <div key={batch.id || batch.batch} style={{ marginBottom: '28px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Batch {batch.batch || batch.id} Rubrics</div>
                      {batch.fileUrl ? <FileEmbed url={batch.fileUrl} name={batch.fileName} /> : <Pending name={`Batch ${batch.batch || batch.id} Rubrics`} />}
                    </div>
                  ))}
                </div>
              );
            } else if (secFiles.length > 0) {
              content = (
                <div>
                  {secFiles.map((sf: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '28px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>Uploaded Document: {sf.fileName}</div>
                      <FileEmbed url={sf.fileUrl} name={sf.fileName} />
                    </div>
                  ))}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 9) {
            const students = sb?.students || [];
            const criteria = sb?.criteria || [
              { id: 'internal-1', label: 'Internal 1' },
              { id: 'internal-2', label: 'Internal 2' }
            ];
            const sheets = sb?.sheets || [];

            if (students.length > 0) {
              content = (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px' }}>Theory Continuous Evaluation Rubrics</div>
                  <table style={TBLSTYLE}>
                    <thead>
                      <tr>
                        <th style={{ ...TH, width: '40px' }}>Sr</th>
                        <th style={TH}>Enrolment No</th>
                        <th style={TH}>Student Name</th>
                        {criteria.map((cr: any) => <th key={cr.id} style={TH}>{cr.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st: any, i: number) => (
                        <tr key={i}>
                          <td style={TDC}>{i + 1}</td>
                          <td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td>
                          <td style={TD}>{st.name || st.studentName || '—'}</td>
                          {criteria.map((cr: any) => (
                            <td key={cr.id} style={TDC}>{st.marks?.[cr.id] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            } else if (sheets.length > 0) {
              content = (
                <div>
                  {sheets.map((sheet: any, si: number) => (
                    <div key={si} style={{ marginBottom: '28px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Experiment {si + 1}</div>
                      {sheet.fileUrl ? <FileEmbed url={sheet.fileUrl} name={sheet.fileName} /> : <Pending name={`Experiment ${si + 1}`} />}
                    </div>
                  ))}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 11 || item.index === 12) {
            const subDocs = [
              sb?.timetable && { label: 'Timetable', ...sb.timetable },
              sb?.questionPaper && { label: 'Question Paper', ...sb.questionPaper },
              sb?.sampleAnswerSheet && { label: 'Sample Answer Sheet', ...sb.sampleAnswerSheet },
              sb?.file && { label: 'Mark Statement Document', ...sb.file }
            ].filter((f: any) => f && f.fileUrl);

            const students = sb?.students || [];

            if (subDocs.length > 0) {
              content = (
                <div>
                  {subDocs.map((sd: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '32px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>{sd.label}: {sd.fileName}</div>
                      <FileEmbed url={sd.fileUrl} name={sd.fileName} />
                    </div>
                  ))}
                </div>
              );
            } else if (students.length > 0) {
              const qKeys = Object.keys(students[0]).filter((k) => /^qd+$/i.test(k));
              content = (
                <table style={TBLSTYLE}>
                  <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th>{qKeys.map((q) => <th key={q} style={TH}>{q.toUpperCase()}</th>)}<th style={TH}>Total</th></tr></thead>
                  <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td>{qKeys.map((q) => <td key={q} style={TDC}>{st[q] ?? '—'}</td>)}<td style={{ ...TDC, fontWeight: 'bold' }}>{st.total ?? '—'}</td></tr>))}</tbody>
                </table>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 13) {
            const subFiles = [
              sb?.sampleAssignment && { label: 'Sample Assignment', ...sb.sampleAssignment },
              sb?.marksFile && { label: 'Evaluation Marks Sheet', ...sb.marksFile }
            ].filter((f: any) => f && f.fileUrl);

            if (subFiles.length > 0) {
              content = (
                <div>
                  {subFiles.map((sf: any, i: number) => (
                    <div key={i} style={{ marginBottom: '28px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>{sf.label}: {sf.fileName}</div>
                      <FileEmbed url={sf.fileUrl} name={sf.fileName} />
                    </div>
                  ))}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 18) {
            const sharedUrl = sb?.fileUrl || url;
            const sharedName = sb?.fileName || fn;
            content = sharedUrl ? <FileEmbed url={sharedUrl} name={sharedName} /> : <Pending name={item.name} />;
          } else if (item.index === 19) {
            let docs: any[] = [];
            if (db?.subItemsJson) { try { const p = JSON.parse(db.subItemsJson); if (Array.isArray(p.documents)) docs = p.documents; } catch {} }
            if (docs.length === 0 && url) docs = [{ id: 'leg', name: 'Lecture Notes', fileName: fn, fileUrl: url }];
            content = docs.length === 0 ? <Pending name={item.name} /> : (
              <div>{docs.map((doc: any) => (<div key={doc.id} style={{ marginBottom: '36px' }}><div style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>{doc.name}</div><FileEmbed url={doc.fileUrl} name={doc.fileName} height="650px" /></div>))}</div>
            );
          } else if (item.index === 20) {
            const sigUrl = url || cf.facultySignatureUrl;
            content = (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '14px' }}>Course Faculty Signature</div>
                {sigUrl
                  ? <img src={sigUrl} alt="Signature" style={{ maxHeight: '150px', maxWidth: '300px', objectFit: 'contain', border: '1px solid #ccc', padding: '8px' }} />
                  : <div style={{ height: '80px', width: '280px', margin: '0 auto', border: '1px solid #ccc', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px', fontSize: '12px', color: '#888' }}>{faculty}</div>
                }
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#555' }}>Signed by: {cf.facultySignatureName || faculty}</div>
              </div>
            );
          } else {
            content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />;
          }

          return (
            <div key={item.index}>
              {/* Section divider */}
              <div className="preview-page" style={{ ...PAGE, minHeight: '1050px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
                <div style={{ fontWeight: 'bold', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '85%', lineHeight: 1.5, fontFamily: "'Times New Roman', Times, serif" }}>
                  {item.name}
                </div>
              </div>
              {/* Content page */}
              <div className="preview-page" style={{ ...PAGE }}>
                <PageHeader cf={cf} />
                <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                  {item.index}. {item.name}
                </div>
                {content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
