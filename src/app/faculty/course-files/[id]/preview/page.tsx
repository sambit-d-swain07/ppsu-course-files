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
const PAGE: React.CSSProperties = { padding: '60px 70px', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', fontFamily: "'Times New Roman', Times, serif", color: '#000', background: '#fff', boxSizing: 'border-box' };
const RAW_PAGE: React.CSSProperties = { width: '100%', minHeight: '1050px', pageBreakAfter: 'always', borderBottom: '1px solid #ddd', background: '#fff', lineHeight: 0, padding: 0, margin: 0, boxSizing: 'border-box' };

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

function getAllUploadedFiles(db: any, sb: any): { fileUrl: string; fileName?: string }[] {
  const files: { fileUrl: string; fileName?: string }[] = [];
  const add = (fUrl?: string, fName?: string) => {
    if (fUrl && typeof fUrl === 'string' && fUrl.trim()) {
      if (!files.some(f => f.fileUrl === fUrl)) {
        files.push({ fileUrl: fUrl, fileName: fName || 'Document' });
      }
    }
  };

  add(db?.fileUrl, db?.fileName);
  add(db?.sharedFileUrl, db?.sharedFileName);

  if (sb && typeof sb === 'object') {
    add(sb.fileUrl, sb.fileName);
    add(sb.file?.fileUrl, sb.file?.fileName);
    add(sb.sharedFileUrl, sb.sharedFileName);

    const subObjKeys = [
      'questionPaper', 'gradeSheet', 'sampleAnswerSheet', 'timetable',
      'manual', 'tutorial', 'lessonPlanLecture', 'lessonPlanLab',
      'lessonPlanTutorial', 'outcomeLecture', 'outcomeLab', 'marksFile',
      'sampleAssignment', 'register', 'file'
    ];
    subObjKeys.forEach((k) => {
      const obj = sb[k];
      if (obj && typeof obj === 'object') {
        add(obj.fileUrl, obj.fileName);
      }
    });

    const arrayKeys = ['additionalDocuments', 'documents', 'batches', 'batchSubmissions', 'sheets', 'customSections', 'sectionFiles'];
    arrayKeys.forEach((ak) => {
      const arr = sb[ak];
      if (Array.isArray(arr)) {
        arr.forEach((item: any) => {
          if (item && typeof item === 'object') {
            add(item.fileUrl, item.fileName || item.name);
            if (item.file && typeof item.file === 'object') {
              add(item.file.fileUrl, item.file.fileName || item.file.name);
            }
          }
        });
      } else if (arr && typeof arr === 'object') {
        Object.values(arr).forEach((item: any) => {
          if (item && typeof item === 'object') {
            add(item.fileUrl, item.fileName || item.name);
          }
        });
      }
    });

    ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'].forEach((k) => {
      const sub = sb[k];
      if (sub && typeof sub === 'object') {
        add(sub.fileUrl, sub.fileName);
      }
    });
  }

  return files;
}

let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.async = true;
    s.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      } else reject(new Error('pdfjsLib not found'));
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

/**
 * Extracts each page of an uploaded PDF and renders each page
 * as its own clean, full-bleed standalone A4 page.
 */
function PdfPagesViewer({ url, name }: { url: string; name?: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | false>(false);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(false);
        const pdfjs = await loadPdfJs();

        let pdfParam: any = url;
        if (typeof url === 'string') {
          if (url.startsWith('data:')) {
            const base64Data = url.split(',')[1] || '';
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfParam = { data: bytes };
          } else if (!url.startsWith('blob:')) {
            try {
              const res = await fetch(url);
              if (!res.ok) {
                // File not found on server (e.g. after server restart)
                if (active) { setError('file-not-found'); setLoading(false); }
                return;
              }
              const arrayBuf = await res.arrayBuffer();
              pdfParam = { data: new Uint8Array(arrayBuf) };
            } catch (e) {
              console.warn('Fetch failed for PDF URL:', e);
              if (active) { setError('fetch-failed'); setLoading(false); }
              return;
            }
          }
        }

        const loadingTask = pdfjs.getDocument(
          typeof pdfParam === 'object' && !(pdfParam as any).url
            ? {
                ...pdfParam,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
              }
            : {
                url: pdfParam,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
              }
        );

        const pdf = await loadingTask.promise;
        if (!active) return;
        const rendered: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fill opaque white background to prevent transparent rendering
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, vp.width, vp.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            rendered.push(canvas.toDataURL('image/png'));
          }
        }
        if (active) { setPages(rendered); setLoading(false); }
      } catch (e) {
        console.error('PDF page extraction error:', e);
        if (active) { setError('render-failed'); setLoading(false); }
      }
    }
    run();
    return () => { active = false; };
  }, [url]);

  if (loading) return (
    <div className="preview-page" style={{ ...PAGE, minHeight: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner animation="border" size="sm" variant="secondary" className="mb-2" />
      <span style={{ fontSize: '13px', color: '#64748b' }}>Loading {name || 'document'}…</span>
    </div>
  );

  if (error === 'file-not-found') return (
    <div className="preview-page" style={{ ...PAGE, minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#b91c1c' }}>File Not Available</div>
      <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', lineHeight: 1.6 }}>
        <strong>{name || 'This file'}</strong> was uploaded but could not be retrieved from the server.<br />
        This usually happens after a server restart. Please re-upload the file from the Course File checklist.
      </div>
    </div>
  );

  if (error || pages.length === 0) return (
    <div className="preview-page" style={{ ...PAGE, minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
      <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '8px', color: '#374151' }}>Unable to Render Preview</div>
      <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', lineHeight: 1.6 }}>
        <strong>{name || 'Document'}</strong> could not be rendered inline. Please download the PDF Report to view all documents.
      </div>
    </div>
  );

  return (
    <>
      {pages.map((src, i) => (
        <div key={i} className="preview-page raw-page" style={{ ...RAW_PAGE }}>
          <img
            src={src}
            alt={`${name || 'PDF'} - Page ${i + 1}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      ))}
    </>
  );
}

function FileEmbed({ url, name }: { url: string; name?: string }) {
  if (!url) return null;
  const fileNameOrUrl = (name || url).toLowerCase();
  const isImg = Boolean(
    fileNameOrUrl.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i) ||
    url.startsWith('data:image/')
  );
  const isDoc = Boolean(
    fileNameOrUrl.match(/\.(docx|doc|xlsx|xls|csv|txt)(\?.*)?$/i) ||
    url.startsWith('data:text/') ||
    url.startsWith('data:application/vnd') ||
    url.startsWith('data:application/msword')
  );

  if (isImg) {
    return (
      <div className="preview-page raw-page" style={{ ...RAW_PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '1050px' }}>
        <img src={url} alt={name || 'Uploaded Image'} style={{ maxWidth: '100%', maxHeight: '1000px', objectFit: 'contain', display: 'block' }} />
      </div>
    );
  }

  if (isDoc) {
    return (
      <div className="preview-page" style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '30px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', maxWidth: '450px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{name || 'Document File'}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Office / Text Document</div>
          <a href={url} download={name || 'document'} className="btn btn-sm btn-primary no-print" target="_blank" rel="noreferrer">
            Download / Open {name || 'Document'}
          </a>
        </div>
      </div>
    );
  }

  return <PdfPagesViewer url={url} name={name} />;
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
            margin: 0;
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
            width: 100% !important;
          }
          .preview-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: 100vh !important;
            border-bottom: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .raw-page {
            padding: 0 !important;
            margin: 0 !important;
          }
          .raw-page img {
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <div className="no-print sticky-top bg-dark text-white p-3 shadow d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ zIndex: 1050 }}>
        <div>
          <h6 className="fw-bold mb-0 text-white">Merged Course File Preview</h6>
          <small className="text-white-50">{code} — {title} · {faculty}</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-light" size="sm" onClick={() => window.history.back()}>Back</Button>
          <a href={`/api/course-files/${courseFileId}/merged-report`} download={`merged-course-file-${code}.docx`} className="btn btn-outline-success btn-sm">Download DOCX</a>
          <a href={`/api/course-files/${courseFileId}/merged-pdf`} target="_blank" rel="noreferrer" className="btn btn-warning btn-sm fw-bold px-3">📄 Download PDF Report</a>
          <Button variant="light" size="sm" className="fw-bold" onClick={() => window.print()}>🖨️ Print / Save as PDF</Button>
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

        {/* PAGES 3+: CHECKLIST ITEMS */}
        {CHECKLIST_ITEMS.map((item) => {
          const db = dbi(item.index);
          const sb = subs(item.index);
          const uploadedFiles = getAllUploadedFiles(db, sb);
          const url = uploadedFiles[0]?.fileUrl || db?.fileUrl || db?.sharedFileUrl;
          const fn  = uploadedFiles[0]?.fileName || db?.fileName || db?.sharedFileName;

          const dividerPage = (
            <div key={`div-${item.index}`} className="preview-page" style={{ ...PAGE, minHeight: '1050px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ fontWeight: 'bold', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '85%', lineHeight: 1.5, fontFamily: "'Times New Roman', Times, serif" }}>
                {item.name}
              </div>
            </div>
          );

          if (item.index === 1) {
            const customSecs = Array.isArray(sb?.customSections) ? sb.customSections : [];
            const subKeys = ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'] as const;
            const hasAnyText = subKeys.some((k) => sb?.[k]?.textContent?.trim()) || customSecs.length > 0;
            const attachedFiles = subKeys.map((k) => sb?.[k]).filter((s: any) => s && s.fileUrl);

            if (hasAnyText) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {/* Structured Vision/Mission content in template page */}
                  <div className="preview-page" style={{ ...PAGE }}>
                    <PageHeader cf={cf} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                      {item.index}. {item.name}
                    </div>
                    <div>
                      {subKeys.map((key) => {
                        const sub = sb?.[key];
                        const text = sub?.textContent;
                        const isMission = key === 'mission';
                        const isDeptVision = key === 'deptVision';
                        const isDeptMission = key === 'deptMission';
                        const lines = text?.split('\n').map((l: string) => l.trim()).filter(Boolean) || [];
                        if (!text?.trim()) return null;

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
                          col2Header = 'INSTITUTE MISSION';
                        } else if (isDeptVision) {
                          col2Header = 'DEPARTMENT VISION';
                        } else if (isDeptMission) {
                          col2Header = 'DEPARTMENT MISSION';
                        } else {
                          col2Header = 'INSTITUTE VISION';
                        }

                        if (isPeo || isPso || isPo) {
                          return (
                            <div key={key} style={{ marginBottom: '24px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                <thead>
                                  <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                    <th style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #000', color: '#000' }}>{col1Header}</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'left', color: '#000' }}>{col2Header}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((line: string, idx: number) => {
                                    const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;
                                    return (
                                      <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                        <td style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>{prefix}{idx + 1}</td>
                                        <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>{cleanText}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        if (isMission || isDeptMission || lines.length > 1) {
                          return (
                            <div key={key} style={{ marginBottom: '24px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                                <thead>
                                  <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                    <th colSpan={2} style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>{col2Header}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((line: string, idx: number) => {
                                    const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
                                    return (
                                      <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                        <td style={{ width: '45px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>{idx + 1}.</td>
                                        <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>{cleanText}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        return (
                          <div key={key} style={{ marginBottom: '24px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                              <thead>
                                <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                  <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>{col2Header}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>{text}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}

                      {customSecs.map((sec: any) => (
                        <div key={sec.id} style={{ marginBottom: '24px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: "'Times New Roman', Times, serif" }}>
                            <thead>
                              <tr style={{ background: '#d9ead3', borderBottom: '1px solid #000' }}>
                                <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>{sec.title.toUpperCase()}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>{sec.textContent}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Any sub-section attached PDF pages rendered as direct standalone pages */}
                  {attachedFiles.map((sf: any, i: number) => (
                    <FileEmbed key={i} url={sf.fileUrl} name={sf.fileName} />
                  ))}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 4) {
            const students = sb?.students;
            if (students?.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <div className="preview-page" style={{ ...PAGE }}>
                    <PageHeader cf={cf} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                      {item.index}. {item.name}
                    </div>
                    <table style={TBLSTYLE}>
                      <thead><tr><th style={{ ...TH, width: '50px' }}>Sr No</th><th style={TH}>Student Name</th><th style={TH}>Enrolment Number</th><th style={{ ...TH, width: '80px' }}>Batch</th></tr></thead>
                      <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TD}>{st.name || st.studentName || '—'}</td><td style={TDC}>{st.enrolmentNumber || st.rollNo || '—'}</td><td style={TDC}>{st.batch || 'A'}</td></tr>))}</tbody>
                    </table>
                  </div>
                  {url && <FileEmbed url={url} name={fn} />}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 6) {
            const subFiles = [
              sb?.lessonPlanLecture,
              sb?.lessonPlanLab,
              sb?.lessonPlanTutorial,
              sb?.outcomeLecture,
              sb?.outcomeLab
            ].filter((f: any) => f && f.fileUrl);

            if (subFiles.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {subFiles.map((sf: any, i: number) => (
                    <FileEmbed key={i} url={sf.fileUrl} name={sf.fileName} />
                  ))}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 8) {
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
              return (
                <div key={item.index}>
                  {dividerPage}
                  <div className="preview-page" style={{ ...PAGE }}>
                    <PageHeader cf={cf} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                      {item.index}. {item.name}
                    </div>
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
                    </div>
                  </div>
                  {secFiles.map((sf: any, idx: number) => (
                    <FileEmbed key={idx} url={sf.fileUrl} name={sf.fileName} />
                  ))}
                </div>
              );
            }

            if (batches.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {batches.map((batch: any) => batch.fileUrl ? (
                    <FileEmbed key={batch.id || batch.batch} url={batch.fileUrl} name={batch.fileName} />
                  ) : null)}
                </div>
              );
            }

            if (secFiles.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {secFiles.map((sf: any, idx: number) => (
                    <FileEmbed key={idx} url={sf.fileUrl} name={sf.fileName} />
                  ))}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 9) {
            const students = sb?.students || [];
            const criteria = sb?.criteria || [
              { id: 'internal-1', label: 'Internal 1' },
              { id: 'internal-2', label: 'Internal 2' }
            ];
            const sheets = sb?.sheets || [];

            if (students.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <div className="preview-page" style={{ ...PAGE }}>
                    <PageHeader cf={cf} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                      {item.index}. {item.name}
                    </div>
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
                  </div>
                  {url && <FileEmbed url={url} name={fn} />}
                </div>
              );
            }

            if (sheets.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {sheets.map((sheet: any, si: number) => sheet.fileUrl ? (
                    <FileEmbed key={si} url={sheet.fileUrl} name={sheet.fileName} />
                  ) : null)}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 11 || item.index === 12) {
            const subDocs = [
              sb?.timetable && { label: 'Timetable', ...sb.timetable },
              sb?.questionPaper && { label: 'Question Paper', ...sb.questionPaper },
              sb?.sampleAnswerSheet && { label: 'Sample Answer Sheet', ...sb.sampleAnswerSheet },
              sb?.file && { label: 'Mark Statement Document', ...sb.file }
            ].filter((f: any) => f && f.fileUrl);

            const students = sb?.students || [];

            if (students.length > 0) {
              const qKeys = Object.keys(students[0] || {}).filter((k) => /^q\d+$/i.test(k));
              return (
                <div key={item.index}>
                  {dividerPage}
                  <div className="preview-page" style={{ ...PAGE }}>
                    <PageHeader cf={cf} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                      {item.index}. {item.name}
                    </div>
                    <table style={TBLSTYLE}>
                      <thead><tr><th style={{ ...TH, width: '40px' }}>Sr</th><th style={TH}>Enrolment No</th><th style={TH}>Student Name</th>{qKeys.map((q) => <th key={q} style={TH}>{q.toUpperCase()}</th>)}<th style={TH}>Total</th></tr></thead>
                      <tbody>{students.map((st: any, i: number) => (<tr key={i}><td style={TDC}>{i + 1}</td><td style={TDC}>{st.enrolmentNumber || st.studentId || '—'}</td><td style={TD}>{st.name || st.studentName || '—'}</td>{qKeys.map((q) => <td key={q} style={TDC}>{st[q] ?? '—'}</td>)}<td style={{ ...TDC, fontWeight: 'bold' }}>{st.total ?? '—'}</td></tr>))}</tbody>
                    </table>
                  </div>
                  {subDocs.map((sd: any, idx: number) => (
                    <FileEmbed key={idx} url={sd.fileUrl} name={sd.fileName} />
                  ))}
                </div>
              );
            }

            if (subDocs.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {subDocs.map((sd: any, idx: number) => (
                    <FileEmbed key={idx} url={sd.fileUrl} name={sd.fileName} />
                  ))}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 13) {
            const subFiles = [
              sb?.sampleAssignment && { label: 'Sample Assignment', ...sb.sampleAssignment },
              sb?.marksFile && { label: 'Evaluation Marks Sheet', ...sb.marksFile }
            ].filter((f: any) => f && f.fileUrl);

            if (subFiles.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {subFiles.map((sf: any, i: number) => (
                    <FileEmbed key={i} url={sf.fileUrl} name={sf.fileName} />
                  ))}
                </div>
              );
            }

            if (url) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={url} name={fn} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 18) {
            const sharedUrl = sb?.fileUrl || url;
            const sharedName = sb?.fileName || fn;
            if (sharedUrl) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  <FileEmbed url={sharedUrl} name={sharedName} />
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 19) {
            let docs: any[] = [];
            if (db?.subItemsJson) {
              try { const p = JSON.parse(db.subItemsJson); if (Array.isArray(p.documents)) docs = p.documents; } catch {}
            }
            if (docs.length === 0 && url) docs = [{ id: 'leg', name: 'Lecture Notes', fileName: fn, fileUrl: url }];
            const validDocs = docs.filter((d) => d && d.fileUrl);

            if (validDocs.length > 0) {
              return (
                <div key={item.index}>
                  {dividerPage}
                  {validDocs.map((doc: any) => (
                    <FileEmbed key={doc.id || doc.fileUrl} url={doc.fileUrl} name={doc.fileName || doc.name} />
                  ))}
                </div>
              );
            }

            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <Pending name={item.name} />
                </div>
              </div>
            );
          }

          if (item.index === 20) {
            const sigUrl = url || cf.facultySignatureUrl;
            return (
              <div key={item.index}>
                {dividerPage}
                <div className="preview-page" style={{ ...PAGE }}>
                  <PageHeader cf={cf} />
                  <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                    {item.index}. {item.name}
                  </div>
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '15px' }}>Course Faculty Signature</div>
                    {sigUrl
                      ? <img src={sigUrl} alt="Signature" style={{ maxHeight: '160px', maxWidth: '320px', objectFit: 'contain', border: '1px solid #ccc', padding: '8px' }} />
                      : <div style={{ height: '90px', width: '280px', margin: '0 auto', border: '1px solid #ccc', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px', fontSize: '12px', color: '#888' }}>{faculty}</div>
                    }
                    <div style={{ marginTop: '14px', fontSize: '13px', color: '#333', fontWeight: '500' }}>Signed by: {cf.facultySignatureName || faculty}</div>
                  </div>
                </div>
              </div>
            );
          }

          // General items fallback
          if (uploadedFiles.length > 0) {
            return (
              <div key={item.index}>
                {dividerPage}
                {uploadedFiles.map((uf, i) => (
                  <FileEmbed key={uf.fileUrl || i} url={uf.fileUrl} name={uf.fileName} />
                ))}
              </div>
            );
          }

          return (
            <div key={item.index}>
              {dividerPage}
              <div className="preview-page" style={{ ...PAGE }}>
                <PageHeader cf={cf} />
                <div style={{ fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.3px' }}>
                  {item.index}. {item.name}
                </div>
                <Pending name={item.name} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
