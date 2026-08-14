'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';

export default function CoordinatorReports() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/course-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.courseFiles) {
          setCourses(data.courseFiles);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Calculate report metrics
  const totalFiles = courses.length;
  const approvedCount = courses.filter(c => c.status === 'APPROVED').length;
  const revisionCount = courses.filter(c => c.status === 'NEEDS_REVISION').length;
  
  const evaluatedFiles = courses.filter(c => c.totalScore !== undefined && c.totalScore !== null);
  const totalScoreSum = evaluatedFiles.reduce((sum, c) => sum + (c.totalScore || 0), 0);
  const avgScore = evaluatedFiles.length > 0 ? Math.round((totalScoreSum / evaluatedFiles.length) * 10) / 10 : 0;

  const getRating = (total: number) => {
    if (total > 175) return 'Excellent';
    if (total >= 151) return 'Good';
    if (total >= 126) return 'Moderate & Update';
    if (total >= 101) return 'Fair & Revise';
    return 'Poor & Revise';
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">Evaluation Reports</h4>
        <p className="text-secondary small">Statistical summaries and analytics of course files evaluation across the School of Engineering.</p>
      </div>

      <Row className="mb-4 g-3">
        <Col xs={12} sm={6} md={3}>
          <div className="card-custom stat-card m-0 h-100">
            <div>
              <div className="stat-val">{totalFiles}</div>
              <div className="stat-label">Total Course Files</div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(12, 24, 48, 0.05)', color: '#0c1830' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM4 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z"/>
              </svg>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <div className="card-custom stat-card m-0 h-100">
            <div>
              <div className="stat-val text-success">{approvedCount}</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--ppsu-success-bg)', color: 'var(--ppsu-success-text)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <div className="card-custom stat-card m-0 h-100">
            <div>
              <div className="stat-val text-danger">{revisionCount}</div>
              <div className="stat-label">Needs Revision</div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--ppsu-danger-bg)', color: 'var(--ppsu-danger-text)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
              </svg>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <div className="card-custom stat-card m-0 h-100">
            <div>
              <div className="stat-val text-warning font-mono-ppsu">{avgScore}<span className="fs-6 text-muted">/200</span></div>
              <div className="stat-label">Average Marks</div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--ppsu-warning-bg)', color: 'var(--ppsu-warning-text)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2z"/>
              </svg>
            </div>
          </div>
        </Col>
      </Row>

      <div className="card-custom bg-white">
        <h5 className="fw-bold mb-3 border-bottom pb-2 text-navy-900">Summary Report Note</h5>
        <p className="text-secondary small leading-relaxed">
          The Faculty Course File Portal tracks and grades 19 key academic checklist requirements. The overall rating is evaluated out of a maximum of 200 marks (item 19 Lecture Notes constitutes 20 marks; other items are 10 marks each). 
        </p>
        <p className="text-secondary small leading-relaxed">
          Currently, <strong>{evaluatedFiles.length} out of {totalFiles}</strong> course files have undergone full coordinator evaluation. The calculated average score is <strong>{avgScore}</strong>, indicating a <strong>{getRating(avgScore)}</strong> compliance status across evaluated files in this cycle.
        </p>
      </div>
    </div>
  );
}
