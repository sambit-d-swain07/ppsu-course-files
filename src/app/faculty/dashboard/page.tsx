'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, ProgressBar, Spinner } from 'react-bootstrap';

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED': return 'badge-custom-approved';
    case 'SUBMITTED':
    case 'UNDER_REVIEW': return 'badge-custom-review';
    case 'NEEDS_REVISION': return 'badge-custom-revision';
    default: return 'badge-custom-draft';
  }
}

function getStatusLabel(status: string) {
  if (status === 'UNDER_REVIEW') return 'Under Review';
  if (status === 'NEEDS_REVISION') return 'Needs Revision';
  if (status === 'SUBMITTED') return 'Submitted';
  if (status === 'APPROVED') return 'Approved';
  return 'Draft';
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FacultyDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = () => {
    setLoading(true);
    fetch('/api/course-files')
      .then((r) => r.json())
      .then((data) => {
        if (data.courseFiles) setCourses(data.courseFiles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  // Stats
  const totalCourses = courses.length;
  const approvedCount = courses.filter((c) => c.status === 'APPROVED').length;
  const submittedCount = courses.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const revisionCount = courses.filter((c) => c.status === 'NEEDS_REVISION').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;

  return (
    <div>
      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-navy-900 mb-0">Welcome Back!</h4>
          <p className="text-secondary small mb-0">Overview of your course file evaluation progress.</p>
        </div>
      </div>

      {/* Stats */}
      <Row className="mb-4 g-3">
        {[
          { label: 'My Courses', val: totalCourses, color: 'var(--ppsu-primary)', bg: 'rgba(30,58,138,0.07)' },
          { label: 'Approved', val: approvedCount, color: 'var(--ppsu-success-text)', bg: 'var(--ppsu-success-bg)' },
          { label: 'Under Review', val: submittedCount, color: 'var(--ppsu-warning-text)', bg: 'var(--ppsu-warning-bg)' },
          { label: 'Needs Revision', val: revisionCount, color: 'var(--ppsu-danger-text)', bg: 'var(--ppsu-danger-bg)' }
        ].map(({ label, val, color, bg }) => (
          <Col xs={6} md={3} key={label}>
            <div className="card-custom m-0 h-100" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 10, background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{val}</span>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Courses list */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold text-navy-900 mb-0">My Course Files</h5>
        <span className="text-muted small">{totalCourses} total</span>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
        </div>
      ) : courses.length === 0 ? (
        <div className="card-custom text-center py-5 m-0">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <p className="text-secondary mb-3">No course evaluations yet.</p>
          <p className="text-secondary small mb-0">Course files are created by Admin through Subject Allocation.</p>
        </div>
      ) : (
        <Row className="g-3">
          {courses.map((course) => {
            const completed = Math.min(20, course.progress || 0);
            const percent = Math.min(100, Math.round((completed / 20) * 100));
            const isLocked = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(course.status);
            return (
              <Col xs={12} md={6} lg={4} key={course.id}>
                <div className="card-custom card-custom-hover h-100 d-flex flex-column m-0 justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="font-mono-ppsu small fw-bold text-secondary bg-light px-2 py-1 rounded">
                        {course.courseCode}
                      </span>
                      <span className={`badge-custom ${getStatusBadgeClass(course.status)}`}>
                        {getStatusLabel(course.status)}
                      </span>
                    </div>
                    <h6 className="fw-bold text-navy-900 mb-1">{course.courseTitle}</h6>
                    <p className="text-muted small mb-2">{course.semester} · {course.academicYear}</p>
                    {course.lastUpdated && (
                      <p className="text-muted" style={{ fontSize: 11 }}>Updated {timeAgo(course.lastUpdated)}</p>
                    )}
                    {course.totalScore !== undefined && course.totalScore !== null && (
                      <p className="small fw-semibold mb-0" style={{ color: 'var(--ppsu-primary)' }}>
                        Score: {course.totalScore}/200{course.rating ? ` · ${course.rating}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="d-flex align-items-center justify-content-between mb-1 small text-secondary">
                      <span>Checklist</span>
                      <span className="fw-bold font-mono-ppsu">{completed}/20 ({percent}%)</span>
                    </div>
                    <ProgressBar
                      now={percent}
                      className="progress-custom mb-3"
                      style={{ height: 6 }}
                    />

                    <div className="d-flex gap-2">
                      <Link
                        href={`/faculty/course-files/${course.id}`}
                        className="btn btn-ppsu-outline-gold flex-grow-1 py-2 text-center text-decoration-none"
                      >
                        {isLocked ? 'View Checklist' : 'Open Checklist'}
                      </Link>
                      {course.generatedReportPath && (
                        <a
                          href={course.generatedReportPath}
                          download
                          className="btn btn-outline-secondary py-2"
                          title="Download Evaluation Report"
                        >
                          ⬇
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

    </div>
  );
}
