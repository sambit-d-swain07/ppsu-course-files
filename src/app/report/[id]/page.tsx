'use client';

import { use, useEffect, useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch(`/api/course-files/${id}`).then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error); setData(body); }).catch((err) => setError(err.message || 'Unable to load report')); }, [id]);
  if (error) return <div className="page-container"><Alert variant="danger">{error}</Alert></div>;
  if (!data) return <div className="d-flex justify-content-center py-5"><Spinner animation="border" /></div>;
  const { courseFile, checklistItems } = data;
  return <div className="report-sheet card-custom">
    <div className="d-flex justify-content-between align-items-start mb-4"><div><h2 className="text-navy-900 fw-bold mb-1">PPSU Course File Evaluation Report</h2><p className="text-secondary mb-0">P P Savani University · School of Engineering</p></div><Button className="btn-ppsu-accent" onClick={() => window.print()}>Print Report</Button></div>
    <div className="row g-3 border-bottom pb-3 mb-4 small"><div className="col-md-3"><strong>Faculty</strong><br />{courseFile.faculty?.name}</div><div className="col-md-3"><strong>Employee ID</strong><br />{courseFile.faculty?.employeeId || 'N/A'}</div><div className="col-md-3"><strong>Course</strong><br />{courseFile.courseCode} — {courseFile.courseTitle}</div><div className="col-md-3"><strong>Status</strong><br />{courseFile.status}</div></div>
    <div className="table-responsive"><table className="table table-bordered align-middle"><thead><tr><th>#</th><th>Checklist Item</th><th>Max</th><th>Score</th><th>Remarks</th></tr></thead><tbody>{checklistItems.map((item: any) => <tr key={item.id}><td>{item.itemIndex}</td><td>{item.particulars}</td><td>{item.maxMarks}</td><td>{item.score ?? '—'}</td><td>{item.remarks || ''}</td></tr>)}</tbody></table></div>
    <div className="row g-3 mt-3"><div className="col-md-4"><strong>Total Score:</strong> {courseFile.totalScore ?? '—'} / 200</div><div className="col-md-4"><strong>Rating:</strong> {courseFile.rating || '—'}</div><div className="col-md-4"><strong>Reviewer:</strong> {courseFile.reviewerId || '—'}</div></div>
  </div>;
}
