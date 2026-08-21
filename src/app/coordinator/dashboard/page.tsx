'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col } from 'react-bootstrap';
import SearchPanel from '../SearchPanel';
import AssignedFacultyList from '../AssignedFacultyList';

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

function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CoordinatorDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [assignedFaculty, setAssignedFaculty] = useState<any[]>([]);

  const fetchCourses = () => {
    fetch('/api/course-files')
      .then((r) => r.json())
      .then((data) => {
        if (data.courseFiles) setCourses(data.courseFiles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => {
    fetch('/api/coordinator/faculty', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setAssignedFaculty(Array.isArray(data.faculty) ? data.faculty : []))
      .catch(() => setAssignedFaculty([]));
  }, []);

  const handleSearch = (courseFileId: string) => {
    const match = courses.find((c) => c.id === courseFileId);
    setSelectedCourse(match || null);
  };

  const uniqueFaculty   = assignedFaculty.length;
  const pendingCount    = courses.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const approvedCount   = courses.filter((c) => c.status === 'APPROVED').length;
  const revisionCount   = courses.filter((c) => c.status === 'NEEDS_REVISION').length;

  // Recent submissions = SUBMITTED or UNDER_REVIEW, sorted newest first
  const recentSubmissions = courses
    .filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW')
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-navy-900 mb-1">Evaluator Dashboard</h3>
          <p className="text-secondary small mb-0">Evaluate, review checklist items, and grade assigned faculty course files.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/coordinator/pending-reviews" className="btn btn-ppsu-navy btn-sm px-3 py-2 fw-semibold">
            Review Queue ({pendingCount})
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <Row className="mb-4 g-3">
        {[
          {
            label: 'Assigned Faculty',
            val: uniqueFaculty,
            color: 'var(--ppsu-primary)',
            bg: 'rgba(27, 42, 107, 0.08)',
            href: '#my-assigned-faculty',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )
          },
          {
            label: 'Pending Reviews',
            val: pendingCount,
            color: 'var(--ppsu-warning-text)',
            bg: 'var(--ppsu-warning-bg)',
            href: '/coordinator/pending-reviews',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Approved Course Files',
            val: approvedCount,
            color: 'var(--ppsu-success-text)',
            bg: 'var(--ppsu-success-bg)',
            href: '/coordinator/completed-reviews',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Needs Revision',
            val: revisionCount,
            color: 'var(--ppsu-danger-text)',
            bg: 'var(--ppsu-danger-bg)',
            href: undefined,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )
          }
        ].map(({ label, val, color, bg, href, icon }) => (
          <Col xs={12} sm={6} lg={3} key={label}>
            {href ? (
              <Link href={href} className="card-custom card-custom-hover h-100 d-flex align-items-center gap-3 p-3.5 text-decoration-none">
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
              </Link>
            ) : (
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
            )}
          </Col>
        ))}
      </Row>

      {/* Search panel */}
      <div className="mb-4">
        <h5 className="fw-bold text-navy-900 mb-3">Search Course Files</h5>
        <SearchPanel onSearch={handleSearch} />
      </div>

      {/* Search result */}
      {selectedCourse && (
        <div
          className="card-custom mb-4"
          style={{ borderLeft: '4px solid var(--ppsu-accent)' }}
        >
          <Row className="align-items-center g-3">
            <Col xs={12} md={8}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="font-mono-ppsu small fw-bold text-navy-900 bg-light border px-2 py-1 rounded">
                  {selectedCourse.courseCode}
                </span>
                <span className={`badge-custom ${statusBadgeClass(selectedCourse.status)}`}>
                  {statusLabel(selectedCourse.status)}
                </span>
              </div>
              <h5 className="fw-bold text-navy-900 mb-1">{selectedCourse.courseTitle}</h5>
              <p className="text-muted small mb-2">{selectedCourse.semester} · {selectedCourse.academicYear}</p>
              <div className="d-flex gap-4 mt-2 flex-wrap">
                <div>
                  <span className="small text-secondary d-block">Faculty</span>
                  <span className="fw-semibold small">{selectedCourse.faculty?.name}</span>
                </div>
                <div>
                  <span className="small text-secondary d-block">Employee ID</span>
                  <span className="fw-semibold small font-mono-ppsu">{selectedCourse.faculty?.employeeId}</span>
                </div>
                <div>
                  <span className="small text-secondary d-block">Progress</span>
                  <span className="fw-semibold small">{Math.min(20, selectedCourse.progress || 0)}/20</span>
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end d-flex flex-column align-items-md-end gap-2">
              <Link
                href={`/coordinator/review/${selectedCourse.id}`}
                className="btn btn-ppsu-navy py-2 px-4 text-decoration-none"
              >
                Open Evaluation →
              </Link>
              {selectedCourse.generatedReportPath && (
                <a
                  href={selectedCourse.generatedReportPath}
                  download
                  className="btn btn-outline-secondary btn-sm"
                >
                  ⬇ Download Report
                </a>
              )}
            </Col>
          </Row>
        </div>
      )}

      {/* My Assigned Faculty Section */}
      <div id="my-assigned-faculty" className="card-custom p-0 overflow-hidden mb-4">
        <div className="px-4 py-3 d-flex align-items-center justify-content-between border-bottom" style={{ background: '#ffffff' }}>
          <div>
            <h5 className="fw-bold text-navy-900 mb-0">My Assigned Faculty</h5>
            <p className="text-secondary small mb-0 mt-0.5">Faculty members allocated to you for academic review.</p>
          </div>
          <Link href="/coordinator/my-faculty" className="btn btn-sm btn-outline-primary fw-semibold">View Directory</Link>
        </div>
        <div className="p-0"><AssignedFacultyList faculty={assignedFaculty} /></div>
      </div>

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <div className="card-custom p-0 overflow-hidden mb-4">
          <div className="px-4 py-3 d-flex align-items-center justify-content-between border-bottom bg-white">
            <div>
              <h5 className="fw-bold text-navy-900 mb-0">Recent Submissions</h5>
              <p className="text-secondary small mb-0 mt-0.5">Awaiting your evaluation & verification.</p>
            </div>
            <span className="badge-custom badge-custom-review">{recentSubmissions.length} Pending</span>
          </div>
          <div className="p-0">
            {recentSubmissions.map((cf, idx) => (
              <div
                key={cf.id}
                className={`px-4 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2 ${idx < recentSubmissions.length - 1 ? 'border-bottom' : ''}`}
                style={{ transition: 'background 0.15s' }}
              >
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: 'rgba(232,84,30,0.1)', color: 'var(--ppsu-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 14, fontWeight: 700
                    }}
                  >
                    {cf.courseCode.slice(0, 2)}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="font-mono-ppsu small fw-bold text-secondary">{cf.courseCode}</span>
                      <span className="fw-semibold text-navy-900" style={{ fontSize: 14 }}>{cf.courseTitle}</span>
                      <span className={`badge-custom ${statusBadgeClass(cf.status)}`}>{statusLabel(cf.status)}</span>
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                      {cf.faculty?.name} · {cf.semester} · {cf.academicYear} · Submitted {timeAgo(cf.lastUpdated)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/coordinator/review/${cf.id}`}
                  className="btn btn-ppsu-accent btn-sm px-3 py-1.5 fw-semibold"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
