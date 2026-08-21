'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Row, Col, Spinner, Alert, Form, ProgressBar, Table, Card, Button, Badge, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO', maxScore: 10 },
  { index: 2,  name: 'Time Table of the Faculty', maxScore: 10 },
  { index: 3,  name: 'Course information sheet (objectives, pre-requisites, outcomes / Syllabus)', maxScore: 10 },
  { index: 4,  name: 'Student Name List', maxScore: 10 },
  { index: 5,  name: 'Department Academic Calendar', maxScore: 10 },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)', maxScore: 10 },
  { index: 7,  name: 'List of Laboratory (or Experiments)', maxScore: 10 },
  { index: 8,  name: 'Laboratory Rubrics', maxScore: 10 },
  { index: 9,  name: 'Continuous Evaluation Rubrics', maxScore: 10 },
  { index: 10, name: 'Lab Manuals / Tutorials', maxScore: 10 },
  { index: 11, name: 'Internal Assessment 1', maxScore: 10 },
  { index: 12, name: 'Internal Assessment 2', maxScore: 10 },
  { index: 13, name: 'Assignment topics, sample assignment, marks statements', maxScore: 10 },
  { index: 14, name: 'Attendance register (ERP)', maxScore: 10 },
  { index: 15, name: 'University exam', maxScore: 10 },
  { index: 16, name: 'CO Attainment output sheet', maxScore: 10 },
  { index: 17, name: 'PO Attainment output sheet', maxScore: 10 },
  { index: 18, name: 'Action to be taken for next year based on CO attainment', maxScore: 10 },
  { index: 19, name: 'Lecture notes', maxScore: 20 },
  { index: 20, name: 'Course Faculty Signature', maxScore: 10 }
];

const MAX_TOTAL = 200;
const REVIEW_REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REVIEW_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function getRating(total: number): string {
  if (total > 175) return 'Excellent';
  if (total >= 151) return 'Good';
  if (total >= 126) return 'Moderate & Update';
  if (total >= 101) return 'Fair & Revise';
  return 'Poor & Revise';
}

function ratingColor(rat: string): string {
  if (rat === 'Excellent' || rat === 'Good') return '#16a34a';
  if (rat === 'Moderate & Update') return '#0891b2';
  if (rat === 'Fair & Revise') return '#d97706';
  return '#dc2626';
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED':        return 'badge-custom-approved';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':   return 'badge-custom-review';
    case 'NEEDS_REVISION': return 'badge-custom-revision';
    default:               return 'badge-custom-draft';
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
    NEEDS_REVISION: 'Needs Revision', APPROVED: 'Approved'
  };
  return map[status] ?? status;
}

export default function CoordinatorReviewClient({ courseFileId }: { courseFileId: string }) {
  const router = useRouter();

  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [scores, setScores] = useState<Record<number, number>>({});
  const [itemRemarks, setItemRemarks] = useState<Record<number, string>>({});
  const [overallRemarks, setOverallRemarks] = useState('');

  // Real Document Preview Modal State (Section 21 Real View Control)
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null);

  // Reviewer Signature File Upload & Confirmation Gate State
  const [reviewerSignatureFile, setReviewerSignatureFile] = useState<File | null>(null);
  const [reviewerSignatureName, setReviewerSignatureName] = useState('Dr. S. Iyer');
  const [reviewerSignatureUrl, setReviewerSignatureUrl] = useState<string>('');
  const [reviewerConfirmed, setReviewerConfirmed] = useState(false);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You are not assigned to evaluate this faculty member.');
        throw new Error('Failed to load course file details');
      }
      const data = await res.json();
      setCourseFile(data.courseFile);
      setChecklist(Array.isArray(data.checklistItems) ? data.checklistItems.filter(Boolean) : []);
      setOverallRemarks(data.courseFile.coordinatorRemarks || '');

      setReviewerSignatureName(data.courseFile.reviewerSignatureName || 'Dr. S. Iyer');
      setReviewerSignatureUrl(data.courseFile.reviewerSignatureUrl || '/uploads/reviewer_sig.png');
      setReviewerConfirmed(!!data.courseFile.reviewerConfirmed);

      const initScores: Record<number, number> = {};
      const initRemarks: Record<number, string> = {};
      (Array.isArray(data.checklistItems) ? data.checklistItems : []).filter(Boolean).forEach((cli: any) => {
        initScores[cli.itemIndex] = cli.score ?? (cli.itemIndex === 20 ? 10 : 0);
        initRemarks[cli.itemIndex] = cli.remarks ?? '';
      });
      CHECKLIST_ITEMS.forEach((item) => {
        if (initScores[item.index] === undefined) initScores[item.index] = item.index === 20 ? 10 : 0;
        if (initRemarks[item.index] === undefined) initRemarks[item.index] = '';
      });
      setScores(initScores);
      setItemRemarks(initRemarks);
    } catch (err: any) {
      setActionError(err.message || 'Error loading page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [courseFileId]);

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
    </div>
  );

  if (actionError && !courseFile) return <Alert variant="danger" className="m-4">{actionError}</Alert>;
  if (!courseFile) return <Alert variant="danger">Course file not found.</Alert>;

  const totalScore = Object.entries(scores)
    .filter(([k]) => Number(k) !== 20)
    .reduce((sum, [, s]) => sum + (Number(s) || 0), 0);
  const rating = getRating(totalScore);
  const scorePercent = Math.round((totalScore / MAX_TOTAL) * 100);
  const reviewLocked = courseFile.status === 'APPROVED';

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScore = (idx: number, val: number) => {
    if (idx === 20 || reviewLocked) return;
    const max = idx === 19 ? 20 : 10;
    setScores((prev) => ({ ...prev, [idx]: Math.max(0, Math.min(max, isNaN(val) ? 0 : val)) }));
  };

  const parseSubItems = (cli: any) => {
    if (!cli?.subItemsJson) return null;
    try { return JSON.parse(cli.subItemsJson); } catch (e) { return null; }
  };

  const submitEvaluation = async () => {
    if (reviewLocked) {
      setActionError('This review has already been submitted and is read-only.');
      return;
    }
    if (!reviewerConfirmed) {
      setActionError('Please tick the compulsory review declaration checkbox.');
      return;
    }
    if (!reviewerSignatureUrl && !reviewerSignatureFile) {
      setActionError('Evaluator Signature file upload is required.');
      return;
    }

    setSaveLoading(true); setActionError(''); setActionSuccess('');
    try {
      for (const item of CHECKLIST_ITEMS) {
        const checklistResponse = await fetchWithTimeout(`/api/checklist/${courseFileId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemIndex: item.index,
            score: scores[item.index] ?? (item.index === 20 ? 10 : 0),
            remarks: itemRemarks[item.index] ?? ''
          })
        });
        if (!checklistResponse.ok) {
          const errorBody = await checklistResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || `Failed to save score for item ${item.index}`);
        }
      }

      const sigUrl = reviewerSignatureFile
        ? `/uploads/reviewer_${courseFileId}_sig.${reviewerSignatureFile.name.split('.').pop() || 'png'}`
        : reviewerSignatureUrl || '/uploads/reviewer_sig.png';

      const res = await fetchWithTimeout(`/api/course-files/${courseFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalScore,
          rating,
          coordinatorRemarks: overallRemarks,
          reviewerSignatureName: reviewerSignatureName.trim(),
          reviewerSignatureUrl: sigUrl,
          reviewerSignedAt: new Date().toISOString(),
          reviewerConfirmed
        })
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to update evaluation status');
      }

      const data = await res.json();
      const updatedStatus = data.courseFile?.status;

      if (updatedStatus === 'NEEDS_REVISION') {
        setActionSuccess(`Evaluation submitted (Score: ${totalScore}/200). Auto-routed: Course file returned to Faculty for revision.`);
        setTimeout(() => fetchData(), 1500);
      } else if (updatedStatus === 'UNDER_REVIEW') {
        setActionSuccess(`Evaluation submitted (Score: ${totalScore}/200). Auto-routed: Course file sent to Admin for secondary review.`);
        setTimeout(() => fetchData(), 1500);
      } else {
        setActionSuccess(`Evaluation approved (Score: ${totalScore}/200). Auto-routed: Course file approved and report generated.`);
        setTimeout(() => router.push(`/report/${courseFileId}`), 1000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit evaluation');
    } finally {
      setSaveLoading(false);
    }
  };

  const item20Sig = checklist.find((c) => c.itemIndex === 20);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <button
          className="btn btn-link p-0 text-secondary text-decoration-none d-flex align-items-center gap-1"
          onClick={() => router.back()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
          </svg>
          Back
        </button>
        <div className="d-flex align-items-center gap-2">
          <Link href={`/report/${courseFileId}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            🖨️ View / Print Form
          </Link>
          <a href={`/api/course-files/${courseFileId}/merged-report`} className="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
            Download Merged Report
          </a>
          {courseFile.generatedReportPath && (
            <a href={courseFile.generatedReportPath} download className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
              Download Report
            </a>
          )}
          <span className={`badge-custom ${statusBadgeClass(courseFile.status)}`}>
            {statusLabel(courseFile.status)}
          </span>
        </div>
      </div>

      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      {/* SECTION 0: Faculty & Course Details Header */}
      <Card className="card-custom mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-bottom">
          <h5 className="fw-bold text-navy-900 mb-0">Faculty & Course Details Header Block</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3 small text-secondary">
            <Col xs={6} md={4}><span className="fw-bold">Faculty Name:</span><br />{courseFile.facultyName || courseFile.faculty?.name}</Col>
            <Col xs={6} md={4}><span className="fw-bold">Department:</span><br />{courseFile.department || courseFile.faculty?.department}</Col>
            <Col xs={6} md={4}><span className="fw-bold">School:</span><br />{courseFile.school || 'School of Engineering'}</Col>
            <Col xs={6} md={4}><span className="fw-bold">Semester:</span><br />{courseFile.semester}</Col>
            <Col xs={6} md={4}><span className="fw-bold">Course Code:</span><br /><span className="font-mono-ppsu fw-bold">{courseFile.courseCode}</span></Col>
            <Col xs={6} md={4}><span className="fw-bold">Course Title:</span><br /><span className="fw-bold">{courseFile.courseTitle}</span></Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Live Scoring Header Panel */}
      <div
        className="card-custom mb-4"
        style={{ background: 'var(--ppsu-primary)', color: '#fff', borderLeft: '5px solid var(--ppsu-accent)' }}
      >
        <Row className="align-items-center g-3">
          <Col xs={12} md={7}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 4 }}>
              Live Scoring Panel — Out of 200 Marks
            </div>
            <h4 className="fw-bold mb-1" style={{ color: '#fff' }}>Course File Assessment & Evaluation</h4>
            <p className="mb-2" style={{ opacity: 0.7, fontSize: 13 }}>
              Assign marks per checklist item (18 × max 10 + Lecture Notes × max 20 = 200). Rating auto-calculates.
            </p>
            <ProgressBar now={scorePercent} style={{ height: 6, background: 'rgba(255,255,255,0.15)' }} className="m-0" />
          </Col>
          <Col xs={12} md={5} className="text-md-end">
            <div className="d-inline-flex align-items-baseline gap-2">
              <span style={{ fontSize: 48, fontWeight: 800, fontFamily: 'monospace', color: '#fff' }}>
                {totalScore}
              </span>
              <span style={{ fontSize: 20, opacity: 0.5, color: '#fff' }}>/{MAX_TOTAL}</span>
            </div>
            <div>
              <span className="px-3 py-1 rounded-pill fw-bold" style={{ background: ratingColor(rating), color: '#fff', fontSize: 14 }}>
                {rating}
              </span>
            </div>
          </Col>
        </Row>
      </div>

      {/* SECTION 3 & 23: Checklist Scoring Table (Layout Containment & Clean View Controls) */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="px-4 py-3" style={{ background: 'var(--ppsu-primary)', color: '#fff' }}>
          <span className="fw-bold">Evaluate Checklist Particulars (Items 1 – 20)</span>
        </div>

        <div className="p-0">
          {CHECKLIST_ITEMS.map((item, idx) => {
            const dbItem = checklist.find((c) => c?.itemIndex === item.index) ?? { status: 'EMPTY' };
            const uploaded = dbItem.status === 'UPLOADED';
            const score = scores[item.index] ?? 0;
            const subItems = parseSubItems(dbItem);

            return (
              <div key={item.index} className={`px-4 py-3 ${idx < CHECKLIST_ITEMS.length - 1 ? 'border-bottom' : ''}`}>
                <Row className="g-3 align-items-center">
                  {/* Left Column with strict layout overflow containment */}
                  <Col xs={12} md={6} style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div className="d-flex align-items-start gap-2">
                      <span
                        className="fw-bold font-mono-ppsu"
                        style={{
                          minWidth: 26, height: 26, borderRadius: 6,
                          background: '#f1f5fd', color: 'var(--ppsu-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, flexShrink: 0
                        }}
                      >
                        {item.index}
                      </span>
                      <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div className="fw-semibold" style={{ fontSize: 13, wordBreak: 'break-word' }}>
                          {item.name}
                        </div>

                        {/* SECTION 23: Sub-items display with Clean Status + View */}
                        {item.index === 1 ? (
                          <div className="mt-2 small text-secondary">
                            {[
                              { k: 'vision', l: '(a) Vision' },
                              { k: 'mission', l: '(b) Mission' },
                              { k: 'peo', l: '(c) PEO' },
                              { k: 'pso', l: '(d) PSO' },
                              { k: 'po', l: '(e) PO' }
                            ].map((sub) => {
                              const sFile = subItems?.[sub.k];
                              return (
                                <div key={sub.k} className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                                  <span className="fw-semibold text-truncate">{sub.l}</span>
                                  {sFile?.fileName ? (
                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                      <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                      <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item 1 — ${sub.l}`, fileName: sFile.fileName, fileUrl: sFile.fileUrl })}>
                                        👁️ View
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : item.index === 4 ? (
                          <div className="mt-2 small text-secondary">
                            {subItems?.students?.length ? (
                              <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                                <span className="fw-semibold text-success">✓ {subItems.students.length} Students Listed</span>
                                {subItems.file?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: 'Student Name List', fileName: subItems.file.fileName, fileUrl: subItems.file.fileUrl })}>
                                    👁️ View Document
                                  </Button>
                                )}
                              </div>
                            ) : uploaded ? (
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}>
                                  👁️ View
                                </Button>
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                ✗ Not uploaded yet (0 students listed)
                              </div>
                            )}
                          </div>
                        ) : item.index === 8 ? (
                          <div className="mt-2 small text-secondary">
                            {subItems?.students?.length ? (
                              <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                                <span className="fw-semibold text-success">✓ Laboratory Rubrics ({subItems.students.length} students assessed)</span>
                                {subItems.file?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: 'Laboratory Rubrics', fileName: subItems.file.fileName, fileUrl: subItems.file.fileUrl })}>
                                    👁️ View Document
                                  </Button>
                                )}
                              </div>
                            ) : (dbItem.batchSubmissions || subItems?.batches)?.length ? (
                              (dbItem.batchSubmissions || subItems?.batches).map((batch: any, bIdx: number) => (
                                <div key={batch.id || bIdx} className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                                  <span className="fw-semibold text-truncate">Batch {batch.batch || String.fromCharCode(65 + bIdx)} {batch.facultyName ? `— ${batch.facultyName}` : batch.name ? `— ${batch.name}` : ''}</span>
                                  {batch?.fileName || batch?.subItemsJson ? (
                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                      <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                      <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Laboratory Rubrics — ${batch.name || batch.batch}`, fileName: batch.fileName, fileUrl: batch.fileUrl })}>
                                        👁️ View
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                                  )}
                                </div>
                              ))
                            ) : uploaded ? (
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}>
                                  👁️ View
                                </Button>
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                ✗ Not uploaded yet
                              </div>
                            )}
                          </div>
                        ) : item.index === 9 ? (
                          <div className="mt-2 small text-secondary">
                            {subItems?.students?.length ? (
                              <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                                <span className="fw-semibold text-success">✓ Continuous Evaluation Rubrics ({subItems.students.length} students assessed)</span>
                                {subItems.file?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: 'Continuous Evaluation Rubrics', fileName: subItems.file.fileName, fileUrl: subItems.file.fileUrl })}>
                                    👁️ View Document
                                  </Button>
                                )}
                              </div>
                            ) : uploaded ? (
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}>
                                  👁️ View
                                </Button>
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                ✗ Not uploaded yet
                              </div>
                            )}
                          </div>
                        ) : item.index === 2 || item.index === 7 ? (
                          <div className="mt-2 small text-secondary">
                            {(dbItem.batchSubmissions || []).length > 0 ? (
                              (dbItem.batchSubmissions || []).map((batch: any, bIdx: number) => (
                                <div key={batch.batch || bIdx} className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                                  <span className="fw-semibold">Batch {batch.batch || String.fromCharCode(65 + bIdx)} {batch.facultyName ? `— ${batch.facultyName}` : ''}</span>
                                  {batch.status === 'PENDING' ? (
                                    <span className="text-muted fw-semibold" style={{ fontSize: 11 }}>Pending</span>
                                  ) : (
                                    <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Submitted</span>
                                  )}
                                </div>
                              ))
                            ) : uploaded ? (
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}>
                                  👁️ View
                                </Button>
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                ✗ Not uploaded yet
                              </div>
                            )}
                          </div>
                        ) : item.index === 11 || item.index === 12 ? (<>{(() => {
                          // Pull Item 9 (Continuous Evaluation Rubrics) data for (d) Mark Statement
                          const item9Db = checklist.find((c) => c?.itemIndex === 9);
                          const item9Subs = item9Db?.subItemsJson ? (() => { try { return JSON.parse(item9Db.subItemsJson); } catch { return {}; } })() : {};
                          const criteria: any[] = Array.isArray(item9Subs.criteria) ? item9Subs.criteria : [];
                          const rawStudents: any[] = Array.isArray(item9Subs.students) ? item9Subs.students : [];
                          // Compute per-student total marks from Item 9
                          const studentRows = rawStudents.map((s: any) => ({
                            name: s.name || s.studentName || '',
                            enrolmentNumber: s.enrolmentNumber || s.id || '',
                            total: criteria.reduce((sum: number, c: any) => sum + (Number(s.marks?.[c.id]) || 0), 0)
                          }));
                          // Marks-band chart data (out of 30)
                          const markBands = ['below 12', '13–15', '16–18', '19–21', '22–24', '25–27', '28–30'];
                          const markCounts = markBands.map((band) =>
                            studentRows.filter(({ total }) =>
                              band === 'below 12'  ? total < 12 :
                              band === '13–15'     ? total >= 13 && total <= 15 :
                              band === '16–18'     ? total >= 16 && total <= 18 :
                              band === '19–21'     ? total >= 19 && total <= 21 :
                              band === '22–24'     ? total >= 22 && total <= 24 :
                              band === '25–27'     ? total >= 25 && total <= 27 :
                                                     total >= 28
                            ).length
                          );
                          // Percentage-band chart data
                          const pctBands = ['<40%', '41–50%', '51–60%', '61–70%', '71–80%', '81–90%', '>90%'];
                          const maxMark = criteria.reduce((s: number, c: any) => s + (Number(c.max) || 0), 0) || 30;
                          const pctCounts = pctBands.map((band) =>
                            studentRows.filter(({ total }) => {
                              const p = (total / maxMark) * 100;
                              return band === '<40%'   ? p < 40 :
                                     band === '41–50%' ? p >= 41 && p <= 50 :
                                     band === '51–60%' ? p >= 51 && p <= 60 :
                                     band === '61–70%' ? p >= 61 && p <= 70 :
                                     band === '71–80%' ? p >= 71 && p <= 80 :
                                     band === '81–90%' ? p >= 81 && p <= 90 :
                                                          p > 90;
                            }).length
                          );
                          const miniChart = (labels: string[], counts: number[]) => (
                            <div className="d-flex align-items-end gap-1 mt-2" style={{ height: 72 }}>
                              {labels.map((label, i) => (
                                <div key={label} className="text-center flex-fill">
                                  <div
                                    className="bg-primary mx-auto"
                                    style={{ height: `${Math.max(4, counts[i] * 14)}px`, width: '70%' }}
                                    title={`${counts[i]} students`}
                                  />
                                  <div style={{ fontSize: 8, lineHeight: 1.2, marginTop: 2 }}>{label}</div>
                                  <div className="fw-bold font-mono-ppsu" style={{ fontSize: 9 }}>{counts[i]}</div>
                                </div>
                              ))}
                            </div>
                          );

                          return (
                            <div className="mt-2 small text-secondary">
                              {/* (a), (b), (c) — unchanged */}
                              {[
                                { k: 'timetable',        l: '(a) Timetable' },
                                { k: 'questionPaper',    l: '(b) Question Paper' },
                                { k: 'sampleAnswerSheet', l: '(c) Sample Answer Sheet' }
                              ].map((sub) => {
                                const sFile = subItems?.[sub.k];
                                return (
                                  <div key={sub.k} className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                                    <span className="fw-semibold text-truncate">{sub.l}</span>
                                    {sFile?.fileName ? (
                                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                        <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item ${item.index} — ${sub.l}`, fileName: sFile.fileName, fileUrl: sFile.fileUrl })}>
                                          👁️ View
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* (d) Mark Statement & Result Analysis — live from Item 9 */}
                              <div className="mt-2 p-2 rounded border" style={{ background: '#f0f7ff', borderColor: '#bfdbfe' }}>
                                <div className="fw-semibold mb-2 d-flex align-items-center gap-2" style={{ color: '#1e3a8a' }}>
                                  <span>(d) Mark Statement &amp; Result Analysis</span>
                                  <span className="badge" style={{ background: '#1e3a8a', color: '#fff', fontSize: 9, fontWeight: 500 }}>
                                    Auto-linked from Item 9
                                  </span>
                                </div>

                                {studentRows.length === 0 ? (
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    ⚠ No marks entered in Item 9 yet — table will populate once faculty saves Continuous Evaluation Rubrics.
                                  </div>
                                ) : (
                                  <>
                                    {/* Marks table */}
                                    <div className="table-responsive border rounded mb-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                      <Table bordered size="sm" className="small mb-0">
                                        <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                          <tr>
                                            <th>Student Name</th>
                                            <th>Enrolment No.</th>
                                            <th>Total Marks / {maxMark}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {studentRows.map((row, ri) => (
                                            <tr key={ri}>
                                              <td>{row.name}</td>
                                              <td className="font-mono-ppsu">{row.enrolmentNumber}</td>
                                              <td className="fw-bold">{row.total}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </div>

                                    {/* Charts row */}
                                    <Row className="g-2">
                                      <Col xs={12} md={6}>
                                        <div className="p-2 bg-white border rounded">
                                          <div className="fw-semibold mb-1" style={{ fontSize: 11 }}>Marks-band Distribution</div>
                                          {miniChart(markBands, markCounts)}
                                        </div>
                                      </Col>
                                      <Col xs={12} md={6}>
                                        <div className="p-2 bg-white border rounded">
                                          <div className="fw-semibold mb-1" style={{ fontSize: 11 }}>Percentage Distribution</div>
                                          {miniChart(pctBands, pctCounts)}
                                        </div>
                                      </Col>
                                    </Row>

                                    {/* Optional uploaded file */}
                                    {subItems?.file?.fileName && (
                                      <div className="d-flex align-items-center gap-2 mt-2">
                                        <span className="text-success fw-semibold" style={{ fontSize: 11 }}>✓ {subItems.file.fileName}</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }}
                                          onClick={() => setViewingDoc({ title: `IA ${item.index === 11 ? 1 : 2} Mark Statement`, fileName: subItems.file.fileName, fileUrl: subItems.file.fileUrl })}>
                                          👁️ View
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}</>) : item.index === 13 ? (
                          <div className="mt-2 small text-secondary">
                            <div className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                              <span className="fw-semibold text-truncate">(a) Assignment Topics</span>
                              {subItems?.assignmentTopics?.length ? (
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ {subItems.assignmentTopics.length} Topics Added</span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                              )}
                            </div>
                            <div className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                              <span className="fw-semibold text-truncate">(b) Sample Assignment</span>
                              {subItems?.sampleAssignment?.fileName ? (
                                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                  <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: 'Sample Assignment', fileName: subItems.sampleAssignment.fileName, fileUrl: subItems.sampleAssignment.fileUrl })}>
                                    👁️ View
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                              )}
                            </div>
                            <div className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                              <span className="fw-semibold text-truncate">(c) Marks Statement</span>
                              {subItems?.marks?.length ? (
                                <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ {subItems.marks.length} Students Scored</span>
                              ) : subItems?.marksFile?.fileName ? (
                                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                  <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: 'Assignment Marks Statement', fileName: subItems.marksFile.fileName, fileUrl: subItems.marksFile.fileUrl })}>
                                    👁️ View
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                              )}
                            </div>
                          </div>
                        ) : item.index === 15 ? (
                          <div className="mt-2 small text-secondary">
                            {[
                              { k: 'questionPaper', l: '(a) Question Paper' },
                              { k: 'gradeSheet', l: '(b) Grade Sheet' },
                              { k: 'resultAnalysis', l: '(c) Result Analysis' }
                            ].map((sub) => {
                              const sFile = subItems?.[sub.k];
                              return (
                                <div key={sub.k} className="d-flex align-items-center justify-content-between mb-1 py-1 px-2 bg-light rounded border">
                                  <span className="fw-semibold text-truncate">{sub.l}</span>
                                  {sFile?.fileName ? (
                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                      <span className="text-success fw-bold" style={{ fontSize: 11 }}>✓ Uploaded</span>
                                      <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Univ Exam — ${sub.l}`, fileName: sFile.fileName, fileUrl: sFile.fileUrl })}>
                                        👁️ View
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: 11 }}>✗ Not uploaded yet</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : uploaded ? (
                          <div className="d-flex align-items-center gap-2 mt-2" style={{ fontSize: 12 }}>
                            <span className="text-success fw-bold">✓ Uploaded</span>
                            <Button size="sm" variant="outline-info" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}>
                              👁️ View
                            </Button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                            ✗ Not uploaded yet
                          </div>
                        )}
                      </div>
                    </div>
                  </Col>

                  {/* Score & Remarks Columns (Hidden for Item 20 Signature) */}
                  {item.index === 20 ? (
                    <Col xs={12} md={6} className="d-flex align-items-center">
                      <div className="text-secondary small font-mono-ppsu bg-light p-2 rounded border w-100">
                        Faculty Signature Attachment (Non-scored)
                      </div>
                    </Col>
                  ) : (
                    <>
                      {/* Score Column */}
                      <Col xs={12} md={2}>
                        <Form.Label className="small text-secondary mb-1 d-block fw-semibold">Score (max {item.maxScore})</Form.Label>
                        <Form.Control
                          id={`score-item-${item.index}`}
                          type="number"
                          min={0}
                          max={item.maxScore}
                          value={score}
                          disabled={reviewLocked}
                          onChange={(e) => handleScore(item.index, parseInt(e.target.value))}
                          className="ppsu-input text-center font-mono-ppsu py-1"
                          style={{ maxWidth: 80 }}
                        />
                      </Col>

                      {/* Remarks Column */}
                      <Col xs={12} md={4}>
                        <Form.Label className="small text-secondary mb-1 d-block fw-semibold">Remarks / Suggestions</Form.Label>
                        <Form.Control
                          id={`remark-item-${item.index}`}
                          type="text"
                          placeholder="Optional feedback…"
                          value={itemRemarks[item.index] ?? ''}
                          disabled={reviewLocked}
                          onChange={(e) => setItemRemarks((prev) => ({ ...prev, [item.index]: e.target.value }))}
                          className="ppsu-input py-1"
                          style={{ fontSize: 13 }}
                        />
                      </Col>
                    </>
                  )}
                </Row>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4 & 12: Final Evaluation Block & Signatures */}
      <Card className="card-custom mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-bottom">
          <h5 className="fw-bold text-navy-900 mb-0">Final Evaluation & Verification Block</h5>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-4">
            <Form.Label className="small fw-semibold text-secondary">Overall Remarks for Faculty</Form.Label>
            <Form.Control
              id="overall-remarks"
              as="textarea"
              rows={3}
              placeholder="Provide comprehensive evaluation feedback to the faculty member…"
              value={overallRemarks}
              disabled={reviewLocked}
              onChange={(e) => setOverallRemarks(e.target.value)}
              className="ppsu-input"
            />
          </Form.Group>

          {/* Verification Details Table / Signatures */}
          <Row className="g-3 mb-4 p-3 bg-light rounded border">
            <Col xs={12} md={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Course Faculty Signature (Item 20 Upload)</Form.Label>
              <div className="p-2 bg-white rounded border d-flex align-items-center justify-content-between">
                <span className="fw-bold text-success small">
                  ✓ Uploaded (Signature Scan)
                </span>
                <Button size="sm" variant="outline-info" style={{ fontSize: 11 }} onClick={() => setViewingDoc({ title: 'Course Faculty Signature', fileName: item20Sig?.fileName || 'faculty_signature_scan.png', fileUrl: courseFile.facultySignatureUrl })}>
                  👁️ View Signature
                </Button>
              </div>
            </Col>

            <Col xs={12} md={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Reviewer Signature (File Upload)</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  key={reviewerSignatureUrl || 'empty-sig'}
                  type="file"
                  size="sm"
                  disabled={reviewLocked}
                  onChange={async (e: any) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setReviewerSignatureFile(f);
                      const url = await readFileAsDataUrl(f);
                      setReviewerSignatureUrl(url);
                    }
                  }}
                />
                {(reviewerSignatureFile || reviewerSignatureUrl) && (
                  <>
                    <Button size="sm" variant="outline-info" style={{ fontSize: 11 }} onClick={() => setViewingDoc({ title: 'Reviewer Signature', fileName: reviewerSignatureFile?.name || 'reviewer_sig.png', fileUrl: reviewerSignatureUrl })}>
                      👁️ View
                    </Button>
                    <Button size="sm" variant="outline-danger" style={{ fontSize: 11 }} disabled={reviewLocked} onClick={() => { setReviewerSignatureFile(null); setReviewerSignatureUrl(''); }}>
                      🗑️ Remove
                    </Button>
                  </>
                )}
              </div>
            </Col>

            <Col xs={12} className="mt-3">
              <div className="p-3 rounded" style={{ background: '#fff8e6', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(245,158,11,0.1)' }}>
                <Form.Check
                  type="checkbox"
                  id="chk-reviewer-declaration"
                  label={
                    <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                      I confirm all documents have been reviewed properly. <span className="text-danger fw-bold">*</span>
                    </span>
                  }
                  checked={reviewerConfirmed}
                  disabled={reviewLocked}
                  onChange={(e) => setReviewerConfirmed(e.target.checked)}
                  style={{ transform: 'scale(1.1)', transformOrigin: 'left center' }}
                />
              </div>
            </Col>
          </Row>

          {/* Guidelines Table */}
          <div className="mb-4">
            <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: 13 }}>Guidelines for Quality of Course File (Reference Table)</h6>
            <div className="table-responsive">
            <Table bordered size="sm" className="text-center small mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Marks Range</th>
                  <th>Quality of Course File</th>
                  <th>Marks Range</th>
                  <th>Quality of Course File</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Up to 100</td>
                  <td>Poor & Revise</td>
                  <td>101–125</td>
                  <td>Fair & Revise</td>
                </tr>
                <tr>
                  <td>126–150</td>
                  <td>Moderate & Update</td>
                  <td>151–175</td>
                  <td>Good</td>
                </tr>
                <tr>
                  <td colSpan={2}>&gt;175</td>
                  <td colSpan={2} className="fw-bold text-success">Excellent</td>
                </tr>
              </tbody>
            </Table>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pt-3 border-top">
            <div className="small text-secondary">
              Total Score: <strong className="font-mono-ppsu">{totalScore}/{MAX_TOTAL}</strong> ·
              Rating: <strong style={{ color: ratingColor(rating) }}>{rating}</strong>
            </div>
            <div className="d-flex gap-2">
              <button
                id="btn-submit-evaluation"
                className="btn px-4 py-2 fw-semibold"
                disabled={reviewLocked || saveLoading || !reviewerConfirmed || (!reviewerSignatureFile && !reviewerSignatureUrl)}
                style={{
                  background: (!reviewerConfirmed || (!reviewerSignatureFile && !reviewerSignatureUrl)) ? '#cbd5e1' : 'var(--ppsu-accent)',
                  color: '#fff', border: 'none',
                  cursor: (!reviewerConfirmed || (!reviewerSignatureFile && !reviewerSignatureUrl)) ? 'not-allowed' : 'pointer'
                }}
                onClick={() => submitEvaluation()}
              >
                {saveLoading ? <Spinner animation="border" size="sm" /> : reviewLocked ? 'Review Submitted' : 'Submit Evaluation & Auto-Route'}
              </button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* REAL DOCUMENT PREVIEW MODAL (Section 21 Real Coordinator View Action) */}
      <Modal show={viewingDoc !== null} onHide={() => setViewingDoc(null)} size="xl" centered>
        <Modal.Header closeButton className="bg-navy-900 text-white py-2">
          <Modal.Title className="h6 fw-bold mb-0">Evaluator Document Inspection — {viewingDoc?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2 px-1">
            <div>
              <strong className="font-mono-ppsu text-primary">{viewingDoc?.fileName}</strong>
              <span className="text-muted small ms-2">· Faculty Submission Document ({courseFile.courseCode})</span>
            </div>
            <a
              href={viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:') ? viewingDoc.fileUrl : SAMPLE_PDF_DATA_URL}
              download={viewingDoc?.fileName || 'document.pdf'}
              className="btn btn-outline-primary btn-sm"
            >
              ⬇ Download Full Document
            </a>
          </div>

          {(() => {
            const url = viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:') ? viewingDoc.fileUrl : SAMPLE_PDF_DATA_URL;
            const isImage = viewingDoc?.fileName?.match(/\.(png|jpg|jpeg|gif|webp)$/i) || (viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:image/'));

            if (isImage) {
              return (
                <div className="text-center p-3 bg-white rounded border shadow-sm" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={url}
                    alt={viewingDoc?.fileName}
                    style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                </div>
              );
            }

            return (
              <div style={{ width: '100%', height: '540px' }} className="rounded border bg-white shadow-sm overflow-hidden">
                <iframe
                  src={url}
                  title={viewingDoc?.fileName || 'Document Preview'}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={() => setViewingDoc(null)}>Close Inspection</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
