'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, Spinner } from 'react-bootstrap';
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
      </div>
    );
  }

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
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900 mb-0">Evaluator Dashboard</h4>
        <p className="text-secondary small mb-0">Manage faculty course file submissions and evaluations.</p>
      </div>

      {/* Stat cards */}
      <Row className="mb-4 g-3">
        {[
          { label: 'Total Faculty',   val: uniqueFaculty,  color: 'var(--ppsu-primary)',        bg: 'rgba(30,58,138,0.07)' },
          { label: 'Pending Review',  val: pendingCount,   color: 'var(--ppsu-warning-text)',   bg: 'var(--ppsu-warning-bg)' },
          { label: 'Approved',        val: approvedCount,  color: 'var(--ppsu-success-text)',   bg: 'var(--ppsu-success-bg)' },
          { label: 'Needs Revision',  val: revisionCount,  color: 'var(--ppsu-danger-text)',    bg: 'var(--ppsu-danger-bg)' }
        ].map(({ label, val, color, bg }) => (
          <Col xs={6} md={3} key={label}>
            <a href={label === 'Total Faculty' ? '#my-assigned-faculty' : undefined} className={`card-custom m-0 h-100 d-flex align-items-center gap-3 text-decoration-none ${label === 'Total Faculty' ? 'card-custom-hover' : ''}`} style={{ cursor: label === 'Total Faculty' ? 'pointer' : 'default' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color }}>{val}</span>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            </a>
          </Col>
        ))}
      </Row>

      <div id="my-assigned-faculty" className="card-custom p-0 overflow-hidden mb-4">
        <div className="px-4 py-3 d-flex align-items-center justify-content-between" style={{ background: 'var(--ppsu-primary)', color: '#fff' }}>
          <span className="fw-bold">My Assigned Faculty</span>
          <Link href="/coordinator/my-faculty" className="btn btn-sm btn-light">View Full List</Link>
        </div>
        <div className="p-0"><AssignedFacultyList faculty={assignedFaculty} /></div>
      </div>

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <div className="card-custom p-0 overflow-hidden mb-4">
          <div
            className="px-4 py-3 d-flex align-items-center justify-content-between"
            style={{ background: 'var(--ppsu-primary)', color: '#fff' }}
          >
            <span className="fw-bold">Recent Submissions</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Awaiting your review</span>
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
                      width: 36, height: 36, borderRadius: 8,
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
                      <span className="fw-semibold" style={{ fontSize: 14 }}>{cf.courseTitle}</span>
                      <span className={`badge-custom ${statusBadgeClass(cf.status)}`}>{statusLabel(cf.status)}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {cf.faculty?.name} · {cf.semester} · {cf.academicYear} · Submitted {timeAgo(cf.lastUpdated)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/coordinator/review/${cf.id}`}
                  className="btn btn-sm px-3"
                  style={{
                    background: 'var(--ppsu-accent)', color: '#fff',
                    border: 'none', fontWeight: 600, fontSize: 13,
                    borderRadius: 8, flexShrink: 0
                  }}
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search panel */}
      <div className="mb-3">
        <h5 className="fw-bold text-navy-900 mb-3">Search Course Files</h5>
        <SearchPanel onSearch={handleSearch} />
      </div>

      {/* Search result */}
      {selectedCourse && (
        <div
          className="card-custom"
          style={{ borderLeft: '4px solid var(--ppsu-accent)' }}
        >
          <Row className="align-items-center g-3">
            <Col xs={12} md={8}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="font-mono-ppsu small fw-bold text-secondary bg-light px-2 py-1 rounded">
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
                Open Evaluation
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

      {!selectedCourse && (
        <div className="card-custom text-center py-5 m-0 text-muted small">
          Use the search filters above to find a specific course file.
        </div>
      )}
    </div>
  );
}
