'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, ProgressBar } from 'react-bootstrap';

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

  return (
    <div>
      {/* Welcome Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-navy-900 mb-1">Welcome Back!</h3>
          <p className="text-secondary small mb-0">Track and manage your university course file evaluations and laboratory rubrics.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/faculty/my-courses" className="btn btn-outline-primary btn-sm px-3 py-2 fw-semibold">
            View All Courses
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <Row className="mb-4 g-3">
        {[
          {
            label: 'Assigned Courses',
            val: totalCourses,
            color: 'var(--ppsu-primary)',
            bg: 'rgba(27, 42, 107, 0.08)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )
          },
          {
            label: 'Approved Files',
            val: approvedCount,
            color: 'var(--ppsu-success-text)',
            bg: 'var(--ppsu-success-bg)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Under Review',
            val: submittedCount,
            color: 'var(--ppsu-warning-text)',
            bg: 'var(--ppsu-warning-bg)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Needs Revision',
            val: revisionCount,
            color: 'var(--ppsu-danger-text)',
            bg: 'var(--ppsu-danger-bg)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )
          }
        ].map(({ label, val, color, bg, icon }) => (
          <Col xs={12} sm={6} lg={3} key={label}>
            <div className="card-custom card-custom-hover h-100 d-flex align-items-center gap-3 p-3.5">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: bg,
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {icon}
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
                <div className="text-secondary small fw-semibold mt-0.5">{label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Courses Section Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold text-navy-900 mb-0">My Course Files</h5>
        <span className="badge-custom badge-custom-draft">{totalCourses} Allocated</span>
      </div>

      {loading ? (
        /* Modern Skeleton Loader */
        <Row className="g-3">
          {[1, 2, 3].map((i) => (
            <Col xs={12} md={6} lg={4} key={i}>
              <div className="card-custom p-4">
                <div className="d-flex justify-content-between mb-3">
                  <div className="skeleton-box" style={{ width: 80, height: 24 }} />
                  <div className="skeleton-box" style={{ width: 90, height: 24, borderRadius: 999 }} />
                </div>
                <div className="skeleton-box mb-2" style={{ width: '85%', height: 22 }} />
                <div className="skeleton-box mb-4" style={{ width: '50%', height: 16 }} />
                <div className="skeleton-box mb-2" style={{ width: '100%', height: 8 }} />
                <div className="skeleton-box mt-3" style={{ width: '100%', height: 38 }} />
              </div>
            </Col>
          ))}
        </Row>
      ) : courses.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h6 className="fw-bold text-navy-900 mb-1">No Course Files Allocated Yet</h6>
          <p className="text-secondary small mb-3">Your course files will appear here once the Academic Admin performs Subject Allocation.</p>
          <Link href="/faculty/my-courses" className="btn btn-ppsu-navy btn-sm px-3 py-2">
            Refresh Course List
          </Link>
        </div>
      ) : (
        <Row className="g-3">
          {courses.map((course) => {
            const completed = Math.min(20, course.progress || 0);
            const percent = Math.min(100, Math.round((completed / 20) * 100));
            const division = course.division || course.subject?.division;

            return (
              <Col xs={12} md={6} lg={4} key={course.id}>
                <div className="card-custom card-custom-hover h-100 d-flex flex-column justify-content-between p-4">
                  <div>
                    {/* Top Row */}
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="font-mono-ppsu small fw-bold px-2 py-1 rounded bg-light border text-navy-900">
                        {course.courseCode}
                      </span>
                      <span className={`badge-custom ${getStatusBadgeClass(course.status)}`}>
                        {getStatusLabel(course.status)}
                      </span>
                    </div>

                    <h6 className="fw-bold text-navy-900 mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>
                      {course.courseTitle}
                    </h6>
                    <div className="text-secondary small mb-2 font-mono-ppsu">
                      {division ? `${division} · ` : ''}{course.semester} · {course.academicYear}
                    </div>

                    {course.lastUpdated && (
                      <div className="text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                        Updated {timeAgo(course.lastUpdated)}
                      </div>
                    )}

                    {course.totalScore !== undefined && course.totalScore !== null && (
                      <div className="small fw-bold mb-2 text-primary">
                        Score: {course.totalScore}/200 {course.rating ? `(${course.rating})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex align-items-center justify-content-between mb-1.5 small text-secondary">
                      <span className="fw-semibold">Checklist Progress</span>
                      <span className="fw-bold font-mono-ppsu text-navy-900">{completed}/20 ({percent}%)</span>
                    </div>
                    <ProgressBar
                      now={percent}
                      className="progress-custom mb-3"
                      style={{ height: '7px' }}
                    />

                    <div className="d-flex gap-2">
                      <Link
                        href={`/faculty/course-files/${course.id}`}
                        className="btn btn-ppsu-navy btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2"
                      >
                        <span>Checklist Form</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                      <Link
                        href={`/report/${course.id}`}
                        className="btn btn-outline-secondary btn-sm py-2 px-2.5"
                        title="Print / View Report"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </Link>
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
