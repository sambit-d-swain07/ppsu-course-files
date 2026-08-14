'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Spinner, Alert, Form, ProgressBar } from 'react-bootstrap';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO',                                 maxScore: 10 },
  { index: 2,  name: 'Time Table of the Faculty',                                                  maxScore: 10 },
  { index: 3,  name: 'Course information sheet (objectives, pre-requisites, outcomes / Syllabus)', maxScore: 10 },
  { index: 4,  name: 'Student Name List',                                                          maxScore: 10 },
  { index: 5,  name: 'Department Academic Calendar',                                               maxScore: 10 },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)',           maxScore: 10 },
  { index: 7,  name: 'List of Laboratory (or Experiments)',                                        maxScore: 10 },
  { index: 8,  name: 'Laboratory Rubrics',                                                         maxScore: 10 },
  { index: 9,  name: 'Continuous Evaluation sheet based on rubrics',                               maxScore: 10 },
  { index: 10, name: 'Lab Manuals / Tutorials',                                                    maxScore: 10 },
  { index: 11, name: 'Internal Assessment 1',                                                      maxScore: 10 },
  { index: 12, name: 'Internal Assessment 2',                                                      maxScore: 10 },
  { index: 13, name: 'Assignment topics, sample assignment, marks statements',                     maxScore: 10 },
  { index: 14, name: 'Attendance register',                                                        maxScore: 10 },
  { index: 15, name: 'University exam',                                                            maxScore: 10 },
  { index: 16, name: 'CO Attainment output sheet',                                                 maxScore: 10 },
  { index: 17, name: 'PO Attainment output sheet',                                                 maxScore: 10 },
  { index: 18, name: 'Action to be taken for next year based on CO attainment',                    maxScore: 10 },
  { index: 19, name: 'Lecture notes',                                                              maxScore: 20 }
];

// 19 items × 10 = 190
const MAX_TOTAL = 200;

function getRating(total: number): string {
  const pct = (total / MAX_TOTAL) * 100;
  if (pct > 92) return 'Excellent';
  if (pct >= 80) return 'Good';
  if (pct >= 66) return 'Moderate & Update';
  if (pct >= 53) return 'Fair & Revise';
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

export default function CoordinatorReview({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseFileId } = use(params);
  const router = useRouter();

  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [scores, setScores] = useState<Record<number, number>>({});
  const [itemRemarks, setItemRemarks] = useState<Record<number, string>>({});
  const [overallRemarks, setOverallRemarks] = useState('');

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCourseFile(data.courseFile);
      setChecklist(data.checklistItems);
      setOverallRemarks(data.courseFile.coordinatorRemarks || '');

      const initScores: Record<number, number> = {};
      const initRemarks: Record<number, string> = {};
      data.checklistItems.forEach((cli: any) => {
        initScores[cli.itemIndex] = cli.score ?? 0;
        initRemarks[cli.itemIndex] = cli.remarks ?? '';
      });
      CHECKLIST_ITEMS.forEach((item) => {
        if (initScores[item.index] === undefined) initScores[item.index] = 0;
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

  if (!courseFile) return <Alert variant="danger">Course file not found.</Alert>;

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const rating = getRating(totalScore);
  const scorePercent = Math.round((totalScore / MAX_TOTAL) * 100);

  const handleScore = (idx: number, val: number) => {
      const max = idx === 19 ? 20 : 10;
      setScores((prev) => ({ ...prev, [idx]: Math.max(0, Math.min(max, isNaN(val) ? 0 : val)) }));
  };

  const submitEvaluation = async (status: 'APPROVED' | 'NEEDS_REVISION') => {
    setSaveLoading(true); setActionError(''); setActionSuccess('');
    try {
      // Save individual item grades
      await Promise.all(
        CHECKLIST_ITEMS.map((item) =>
          fetch(`/api/checklist/${courseFileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemIndex: item.index,
              score: scores[item.index] ?? 0,
              remarks: itemRemarks[item.index] ?? ''
            })
          })
        )
      );

      // Submit overall
      const res = await fetch(`/api/course-files/${courseFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, totalScore, rating, coordinatorRemarks: overallRemarks })
      });
      if (!res.ok) throw new Error('Failed to update status');

      const updatedData = await res.json();
      setActionSuccess(`Evaluation ${status === 'APPROVED' ? 'approved' : 'returned for revision'} successfully.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed');
    } finally {
      setSaveLoading(false);
    }
  };

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
          {courseFile.generatedReportPath && (
            <a
              href={courseFile.generatedReportPath}
              download
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
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

      {/* Info card */}
      <div className="card-custom mb-4">
        <h5 className="fw-bold mb-3 pb-2 text-navy-900" style={{ borderBottom: '1px solid #e8edf6' }}>
          {courseFile.courseCode} — {courseFile.courseTitle}
        </h5>
        <div className="row g-2 small text-secondary">
          <div className="col-6 col-md-3"><span className="fw-bold">Faculty:</span><br />{courseFile.faculty?.name}</div>
          <div className="col-6 col-md-3"><span className="fw-bold">Employee ID:</span><br /><span className="font-mono-ppsu">{courseFile.faculty?.employeeId}</span></div>
          <div className="col-6 col-md-3"><span className="fw-bold">Semester:</span><br />{courseFile.semester}</div>
          <div className="col-6 col-md-3"><span className="fw-bold">Year:</span><br />{courseFile.academicYear}</div>
        </div>
        <div className="mt-3">
          <div className="d-flex justify-content-between small text-secondary mb-1">
            <span>Faculty upload progress</span>
            <span className="fw-bold font-mono-ppsu">{courseFile.progress}/19</span>
          </div>
          <ProgressBar now={Math.round((courseFile.progress / 19) * 100)} className="progress-custom" style={{ height: 6 }} />
        </div>
      </div>

      {/* Live scoring panel */}
      <div
        className="card-custom mb-4"
        style={{
          background: 'var(--ppsu-primary)',
          color: '#fff',
          borderLeft: '5px solid var(--ppsu-accent)'
        }}
      >
        <Row className="align-items-center g-3">
          <Col xs={12} md={7}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 4 }}>
              Live Scoring Panel
            </div>
            <h4 className="fw-bold mb-1" style={{ color: '#fff' }}>Course File Assessment</h4>
            <p className="mb-2" style={{ opacity: 0.7, fontSize: 13 }}>
              Assign marks per checklist item (0–10 each). Rating auto-calculates.
            </p>
            <ProgressBar
              now={scorePercent}
              style={{ height: 6, background: 'rgba(255,255,255,0.15)' }}
              className="m-0"
            />
          </Col>
          <Col xs={12} md={5} className="text-md-end">
            <div className="d-inline-flex align-items-baseline gap-2">
              <span style={{ fontSize: 48, fontWeight: 800, fontFamily: 'monospace', color: '#fff' }}>
                {totalScore}
              </span>
              <span style={{ fontSize: 20, opacity: 0.5, color: '#fff' }}>/{MAX_TOTAL}</span>
            </div>
            <div>
              <span
                className="px-3 py-1 rounded-pill fw-bold"
                style={{ background: ratingColor(rating), color: '#fff', fontSize: 14 }}
              >
                {rating}
              </span>
            </div>
          </Col>
        </Row>
      </div>

      {/* Checklist scoring table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div
          className="px-4 py-3"
          style={{ background: 'var(--ppsu-primary)', color: '#fff' }}
        >
          <span className="fw-bold">Evaluate Checklist Items</span>
        </div>

        <div className="p-0">
          {CHECKLIST_ITEMS.map((item, idx) => {
            const dbItem = checklist.find((c) => c.itemIndex === item.index) ?? { status: 'EMPTY' };
            const uploaded = dbItem.status === 'UPLOADED';
            const score = scores[item.index] ?? 0;

            return (
              <div
                key={item.index}
                className={`px-4 py-3 ${idx < CHECKLIST_ITEMS.length - 1 ? 'border-bottom' : ''}`}
              >
                <Row className="g-3 align-items-center">
                  {/* Item name */}
                  <Col xs={12} md={6}>
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
                      <div>
                        <div className="fw-semibold" style={{ fontSize: 13 }}>{item.name}</div>
                        {uploaded ? (
                          <div style={{ fontSize: 11, color: 'var(--ppsu-success-text)', marginTop: 2 }}>
                            ✓ <span className="font-mono-ppsu">{dbItem.fileName}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                            ✗ No file uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </Col>

                  {/* Score */}
                  <Col xs={5} md={2}>
                    <Form.Label className="small text-secondary mb-1 d-block">Score (max {item.maxScore})</Form.Label>
                    <Form.Control
                      id={`score-item-${item.index}`}
                      type="number"
                      min={0}
                      max={item.maxScore}
                      value={score}
                      onChange={(e) => handleScore(item.index, parseInt(e.target.value))}
                      className="ppsu-input text-center font-mono-ppsu py-1"
                      style={{ maxWidth: 80 }}
                    />
                  </Col>

                  {/* Item remarks */}
                  <Col xs={12} md={4}>
                    <Form.Label className="small text-secondary mb-1 d-block">Remarks</Form.Label>
                    <Form.Control
                      id={`remark-item-${item.index}`}
                      type="text"
                      placeholder="Optional feedback…"
                      value={itemRemarks[item.index] ?? ''}
                      onChange={(e) => setItemRemarks((prev) => ({ ...prev, [item.index]: e.target.value }))}
                      className="ppsu-input py-1"
                      style={{ fontSize: 13 }}
                    />
                  </Col>
                </Row>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final actions */}
      <div className="card-custom">
        <h5 className="fw-bold mb-3 pb-2 text-navy-900" style={{ borderBottom: '1px solid #e8edf6' }}>
          Final Evaluation
        </h5>
        <Form.Group className="mb-4">
          <Form.Label className="small fw-semibold text-secondary">Overall Remarks for Faculty</Form.Label>
          <Form.Control
            id="overall-remarks"
            as="textarea"
            rows={3}
            placeholder="Provide comprehensive feedback to the faculty member…"
            value={overallRemarks}
            onChange={(e) => setOverallRemarks(e.target.value)}
            className="ppsu-input"
          />
        </Form.Group>

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="small text-secondary">
            Total: <strong className="font-mono-ppsu">{totalScore}/{MAX_TOTAL}</strong> ·
            Rating: <strong style={{ color: ratingColor(rating) }}>{rating}</strong>
          </div>
          <div className="d-flex gap-2">
            <button
              id="btn-request-revision"
              className="btn btn-outline-danger px-4 py-2 fw-semibold"
              disabled={saveLoading}
              onClick={() => submitEvaluation('NEEDS_REVISION')}
            >
              {saveLoading ? <Spinner animation="border" size="sm" /> : 'Request Revision'}
            </button>
            <button
              id="btn-approve"
              className="btn px-4 py-2 fw-semibold"
              disabled={saveLoading}
              style={{ background: 'var(--ppsu-accent)', color: '#fff', border: 'none' }}
              onClick={() => submitEvaluation('APPROVED')}
            >
              {saveLoading ? <Spinner animation="border" size="sm" /> : 'Approve & Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
