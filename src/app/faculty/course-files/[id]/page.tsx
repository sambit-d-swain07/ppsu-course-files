'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, ProgressBar, Spinner, Alert, Button } from 'react-bootstrap';

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
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    NEEDS_REVISION: 'Needs Revision',
    APPROVED: 'Approved'
  };
  return map[status] ?? status;
}

export default function FacultyCourseFileDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseFileId } = use(params);
  const router = useRouter();

  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`);
      if (!res.ok) throw new Error('Failed to load course details');
      const data = await res.json();
      setCourseFile(data.courseFile);
      setChecklist(data.checklistItems);
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

  /** DRAFT and NEEDS_REVISION allow edits. Everything else is read-only. */
  const isLocked = !['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status);
  const percent = Math.round((courseFile.progress / 19) * 100);

  // ── Upload simulation ──────────────────────────────────────────────────────
  const handleUpload = async (itemIndex: number, itemName: string, selectedFile?: File) => {
    if (isLocked) return;
    setActionError(''); setActionSuccess('');
    const sanitized = selectedFile?.name || itemName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf';
    try {
      const res = await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex,
          status: 'UPLOADED',
          fileName: sanitized,
          fileUrl: `/uploads/${courseFileId}_${itemIndex}.pdf`
        })
      });
      if (!res.ok) throw new Error('Upload failed');
      setActionSuccess(`Item #${itemIndex} uploaded successfully.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleRemove = async (itemIndex: number) => {
    if (isLocked) return;
    setActionError(''); setActionSuccess('');
    try {
      const res = await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, status: 'EMPTY', fileName: null, fileUrl: null })
      });
      if (!res.ok) throw new Error('Removal failed');
      setActionSuccess(`Item #${itemIndex} removed.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // ── Submit for review ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (courseFile.progress < 19) {
      setActionError('All 19 checklist items must be uploaded before submission.');
      return;
    }
    setSubmitLoading(true); setActionError(''); setActionSuccess('');
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' })
      });
      if (!res.ok) throw new Error('Failed to submit');
      setActionSuccess('Course file submitted to Coordinator for review!');
      fetchData();
    } catch (err: any) { setActionError(err.message); } finally { setSubmitLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
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
          <div className="col-6 col-md-3"><span className="fw-bold">Dept:</span><br />{courseFile.faculty?.department}</div>
          <div className="col-6 col-md-3"><span className="fw-bold">Semester:</span><br />{courseFile.semester}</div>
          <div className="col-6 col-md-3"><span className="fw-bold">Year:</span><br />{courseFile.academicYear}</div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="d-flex justify-content-between small text-secondary mb-1">
            <span>Checklist completion</span>
            <span className="fw-bold font-mono-ppsu">{courseFile.progress}/19 ({percent}%)</span>
          </div>
          <ProgressBar now={percent} className="progress-custom" style={{ height: 6 }} />
        </div>
      </div>

      {/* Coordinator evaluation result */}
      {(courseFile.status === 'APPROVED' || courseFile.status === 'NEEDS_REVISION') && courseFile.totalScore !== undefined && (
        <div
          className="card-custom mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{
            borderLeft: `4px solid ${courseFile.status === 'APPROVED' ? 'var(--ppsu-success-text)' : 'var(--ppsu-crimson)'}`,
            background: courseFile.status === 'APPROVED' ? 'var(--ppsu-success-bg)' : 'var(--ppsu-danger-bg)'
          }}
        >
          <div>
            <div className="fw-bold mb-1" style={{ color: courseFile.status === 'APPROVED' ? 'var(--ppsu-success-text)' : 'var(--ppsu-crimson)' }}>
              {courseFile.status === 'APPROVED' ? '✓ Evaluation Approved' : '⚠ Revision Requested'}
            </div>
            <p className="small text-secondary mb-0">
              <strong>Remarks:</strong> {courseFile.coordinatorRemarks || 'No remarks.'}
            </p>
          </div>
          <div className="text-end">
            <div className="fw-bold font-mono-ppsu" style={{ fontSize: 24 }}>
              {courseFile.totalScore}<span className="text-muted fs-6">/200</span>
            </div>
            <span className="badge-custom badge-custom-review">{courseFile.rating}</span>
          </div>
        </div>
      )}

      {/* Lock banner */}
      {isLocked && courseFile.status !== 'NEEDS_REVISION' && (
        <Alert variant="info" className="d-flex align-items-center gap-2 py-2 mb-4 small">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          </svg>
          This course file is <strong className="mx-1">{statusLabel(courseFile.status)}</strong> — uploads are disabled.
        </Alert>
      )}

      {/* Checklist */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div
          className="px-4 py-3 d-flex justify-content-between align-items-center"
          style={{ background: 'var(--ppsu-primary)', color: '#fff' }}
        >
          <span className="fw-bold">Course File Checklist — 19 Items</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Single file upload per item</span>
        </div>

        <div className="p-0">
          {CHECKLIST_ITEMS.map((item, idx) => {
            const dbItem = checklist.find((c) => c.itemIndex === item.index) ?? { status: 'EMPTY' };
            const uploaded = dbItem.status === 'UPLOADED';
            const hasScore = dbItem.score !== undefined && dbItem.score !== null;

            return (
              <div
                key={item.index}
                className={`px-4 py-3 ${idx < CHECKLIST_ITEMS.length - 1 ? 'border-bottom' : ''}`}
                style={{
                  background: uploaded ? 'rgba(22,163,74,0.03)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                  {/* Left: index + name */}
                  <div className="d-flex align-items-start gap-3 flex-grow-1">
                    <span
                      className="fw-bold font-mono-ppsu"
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        background: uploaded ? 'rgba(22,163,74,0.12)' : '#f1f5fd',
                        color: uploaded ? 'var(--ppsu-success-text)' : 'var(--ppsu-primary)',
                        flexShrink: 0
                      }}
                    >
                      {item.index}
                    </span>
                    <div className="flex-grow-1">
                      <div className="fw-semibold" style={{ fontSize: 14, color: 'var(--ppsu-navy-900)' }}>
                        {item.name}
                      </div>
                      {uploaded && (
                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 12, color: 'var(--ppsu-success-text)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                          </svg>
                          <span className="font-mono-ppsu">{dbItem.fileName}</span>
                        </div>
                      )}
                      {/* Per-item coordinator feedback */}
                      {hasScore && (
                        <div
                          className="mt-2 px-2 py-1 rounded small"
                          style={{
                            background: courseFile.status === 'APPROVED' ? 'var(--ppsu-success-bg)' : 'var(--ppsu-danger-bg)',
                            color: courseFile.status === 'APPROVED' ? 'var(--ppsu-success-text)' : 'var(--ppsu-crimson)',
                            border: `1px solid ${courseFile.status === 'APPROVED' ? 'rgba(22,163,74,0.2)' : 'rgba(196,30,42,0.15)'}`
                          }}
                        >
                          Score: <strong>{dbItem.score}/10</strong>
                          {dbItem.remarks && <> — {dbItem.remarks}</>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: action button */}
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    {uploaded ? (
                      <>
                        {!isLocked && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={() => handleRemove(item.index)}
                          >
                            Remove
                          </button>
                        )}
                      </>
                    ) : (
                      <label
                        id={`btn-upload-${item.index}`}
                        className="btn btn-sm"
                        style={{
                          background: isLocked ? '#e9ecef' : 'var(--ppsu-accent)',
                          color: isLocked ? '#6c757d' : '#fff',
                          fontSize: 12,
                          border: 'none',
                          cursor: isLocked ? 'not-allowed' : 'pointer'
                        }}
                        htmlFor={`file-upload-${item.index}`}
                      >
                        {uploaded ? 'Replace File' : 'Upload File'}
                        <input id={`file-upload-${item.index}`} type="file" className="d-none" disabled={isLocked} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(item.index, item.name, file); e.currentTarget.value = ''; }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit action bar — only in DRAFT or NEEDS_REVISION */}
      {!isLocked && (
        <div
          className="card-custom d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{
            borderLeft: '4px solid var(--ppsu-accent)',
            background: courseFile.progress === 19 ? 'rgba(232,84,30,0.04)' : undefined
          }}
        >
          <div>
            <div className="fw-bold text-navy-900 mb-1">
              {courseFile.status === 'NEEDS_REVISION' ? 'Resubmit for Review' : 'Submit Checklist for Evaluation'}
            </div>
            <p className="small text-secondary mb-0">
              {courseFile.progress === 19
                ? 'All 19 items uploaded. Ready to submit.'
                : `${19 - courseFile.progress} item(s) remaining before submission.`}
            </p>
          </div>
          <button
            id="btn-submit-checklist"
            className="btn btn-ppsu-accent px-4 py-2"
            disabled={courseFile.progress < 19 || submitLoading}
            onClick={handleSubmit}
          >
            {submitLoading
              ? <><Spinner animation="border" size="sm" className="me-2" />Submitting…</>
              : courseFile.status === 'NEEDS_REVISION' ? 'Resubmit for Review' : 'Submit for Review'}
          </button>
        </div>
      )}
    </div>
  );
}
