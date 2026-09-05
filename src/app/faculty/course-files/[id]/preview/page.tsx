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
const TBLSTYLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif' };
const PAGE: React.CSSProperties = { padding: '60px 70px', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff' };

function PageHeader({ cf }: { cf: any }) {
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
}

function FileEmbed({ url, name, height = '650px' }: { url: string; name?: string; height?: string }) {
  if (name?.match(/\.(png|jpg|jpeg|gif|webp)$/i))
    return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: height, objectFit: 'contain', display: 'block', margin: '0 auto' }} />;
  return <iframe src={url} title={name || 'doc'} width="100%" height={height} style={{ border: 'none' }} />;
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
    <div style={{ background: '#525659', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="no-print sticky-top bg-dark text-white p-3 shadow d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ zIndex: 1050 }}>
        <div>
          <h6 className="fw-bold mb-0 text-white">Merged Course File Preview</h6>
          <small className="text-white-50">{code} — {title} · {faculty}</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-light" size="sm" onClick={() => window.history.back()}>Back</Button>
          <a href={`/api/course-files/${courseFileId}/merged-report`} download={`merged-course-file-${code}.docx`} className="btn btn-outline-success btn-sm">Download DOCX</a>
          <Button variant="warning" size="sm" className="fw-bold px-3" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      <div className="mx-auto my-4 shadow-lg" style={{ maxWidth: '920px' }}>

        {/* PAGE 1: COVER PAGE */}
        <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '1100px' }}>
          <img src="/PPSUNAACA+Logo.png" alt="PPSU" style={{ height: '100px', objectFit: 'contain', marginBottom: '20px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '22px', letterSpacing: '1px', marginBottom: '4px' }}>P P SAVANI UNIVERSITY</div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>({school})</div>
          <div style={{ fontSize: '11px', border: '1px solid #000', padding: '2px 12px', display: 'inline-block', marginBottom: '36px' }}>NAAC A+ GRADE ACCREDITED UNIVERSITY</div>
          <div style={{ borderTop: '2px solid #000', width: '70%', marginBottom: '36px' }} />
          <div style={{ fontSize: '13px', marginBottom: '6px', textTransform: 'uppercase', color: '#555' }}>Department of</div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '52px' }}>{dept}</div>
          <div style={{ textAlign: 'left', width: '65%' }}>
            {([['Faculty Name', faculty], ['Subject', `${code} — ${title}`], ['Semester', cf.semester || '—'], ['Division', cf.division || cf.subject?.division || '—'], ['Academic Year', cf.academicYear || '2025-26']] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{ marginBottom: '14px', fontSize: '14px' }}>
                <span style={{ fontWeight: 'bold' }}>{label}:</span>{' '}<span>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid #000', width: '70%', marginTop: '44px', marginBottom: '24px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '2px', textTransform: 'uppercase' }}>(COURSE FILE)</div>
        </div>

        {/* PAGE 2: TABLE OF CONTENTS — plain 2-column, no Status */}
        <div style={{ ...PAGE }}>
          <PageHeader cf={cf} />
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '1px' }}>Table of Contents</div>
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
          const url = db?.fileUrl;
          const fn  = db?.fileName;
          let content: React.ReactNode;

          if (item.index === 1) {
            content = (
              <div>
                {(['vision', 'mission', 'peo', 'pso', 'po'] as const).map((key) => {
                  const sub = sb?.[key];
                  return (
                    <div key={key} style={{ marginBottom: '32px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>{key.toUpperCase()}</div>
                      {sub?.fileUrl ? <FileEmbed url={sub.fileUrl} name={sub.fileName} height="480px" /> : <Pending name={key.toUpperCase()} />}
                    </div>
                  );
                })}
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
          } else if (item.index === 8) {
            const batches = sb?.batches;
            if (batches?.length > 0) {
              content = (
                <div>
                  {batches.map((batch: any) => {
                    const students = batch.students || [];
                    return (
                      <div key={batch.id} style={{ marginBottom: '36px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '12px' }}>{batch.name || batch.id}</div>
                        {batch.fileUrl ? <FileEmbed url={batch.fileUrl} name={batch.fileName} /> : students.length > 0 ? (
                          <table style={TBLSTYLE}>
                            <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th><th style={TH}>P.Key</th><th style={TH}>Term Work</th><th style={TH}>Int Viva</th><th style={TH}>ESE Perf</th><th style={TH}>ESE Ext Viva</th><th style={TH}>Total</th></tr></thead>
                            <tbody>
                              {students.map((st: any, i: number) => {
                                const m = st.marks || st;
                                return (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td><td style={TDC}>{m.pKey ?? '—'}</td><td style={TDC}>{m.termWork ?? m.tw ?? '—'}</td><td style={TDC}>{m.internalViva ?? m.iv ?? '—'}</td><td style={TDC}>{m.esePerformance ?? '—'}</td><td style={TDC}>{m.eseExternalViva ?? '—'}</td><td style={{ ...TDC, fontWeight: 'bold' }}>{m.total ?? '—'}</td></tr>);
                              })}
                            </tbody>
                          </table>
                        ) : <Pending name={`${batch.name} Rubrics`} />}
                      </div>
                    );
                  })}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 9) {
            const sheets = sb?.sheets;
            if (sheets?.length > 0) {
              content = (
                <div>
                  {sheets.map((sheet: any, si: number) => {
                    const students = sheet.students || [];
                    const criteria = sheet.criteria || [];
                    return (
                      <div key={si} style={{ marginBottom: '36px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '12px' }}>Experiment {si + 1}{sheet.name ? `: ${sheet.name}` : ''}</div>
                        <table style={TBLSTYLE}>
                          <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th>{criteria.map((cr: any) => <th key={cr.id} style={TH}>{cr.label}</th>)}<th style={TH}>Total</th></tr></thead>
                          <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td>{criteria.map((cr: any) => <td key={cr.id} style={TDC}>{st.marks?.[cr.id] ?? '—'}</td>)}<td style={{ ...TDC, fontWeight: 'bold' }}>{st.total ?? '—'}</td></tr>))}</tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 11 || item.index === 12) {
            const students = sb?.students;
            if (students?.length > 0) {
              const qKeys = Object.keys(students[0]).filter((k) => /^q\d+$/i.test(k));
              content = (
                <table style={TBLSTYLE}>
                  <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th>{qKeys.map((q) => <th key={q} style={TH}>{q.toUpperCase()}</th>)}<th style={TH}>Total</th></tr></thead>
                  <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td>{qKeys.map((q) => <td key={q} style={TDC}>{st[q] ?? '—'}</td>)}<td style={{ ...TDC, fontWeight: 'bold' }}>{st.total ?? '—'}</td></tr>))}</tbody>
                </table>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
          } else if (item.index === 15) {
            const students = sb?.students;
            if (students?.length > 0) {
              content = (
                <table style={TBLSTYLE}>
                  <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th><th style={TH}>Theory Grade</th><th style={TH}>Practical Grade</th></tr></thead>
                  <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.studentId || st.enrolmentNumber || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td><td style={TDC}>{st.theoryGrade || '—'}</td><td style={TDC}>{st.practicalGrade || '—'}</td></tr>))}</tbody>
                </table>
              );
            } else { content = url ? <FileEmbed url={url} name={fn} /> : <Pending name={item.name} />; }
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
              {/* Section divider — plain centered title, no badge, no colored background */}
              <div style={{ ...PAGE, minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '80%', lineHeight: 1.4 }}>
                  {item.name}
                </div>
              </div>
              {/* Content page */}
              <div style={{ ...PAGE }}>
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
