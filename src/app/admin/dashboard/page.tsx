'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Form, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [courseFiles, setCourseFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [resAssignments, resFiles] = await Promise.all([
        fetch('/api/admin/assignments'),
        fetch('/api/course-files')
      ]);

      if (!resAssignments.ok || !resFiles.ok) throw new Error('Failed to load admin data');

      const assignData = await resAssignments.json();
      const filesData = await resFiles.json();

      setData(assignData);
      setCourseFiles(filesData.courseFiles || []);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (facultyId: string, coordinatorId: string) => {
    setSavingId(facultyId);
    setMessage('');
    setError('');

    // Optimistic update for instant UI feedback
    setData((prev: any) => {
      if (!prev) return prev;
      const updatedFaculty = (prev.faculty || []).map((f: any) =>
        f.id === facultyId ? { ...f, assignedCoordinatorId: coordinatorId } : f
      );
      return { ...prev, faculty: updatedFaculty };
    });

    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId, coordinatorId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Assignment failed');
      setMessage('Faculty evaluator assignment updated successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update assignment');
    } finally {
      setSavingId(null);
    }
  };

  const facultyList = data?.faculty || [];
  const coordinatorList = data?.coordinators || [];

  const totalFaculty = facultyList.length;
  const totalCoordinators = coordinatorList.length;
  const totalSubmissions = courseFiles.length;
  const pendingReviews = courseFiles.filter((cf) => cf.status === 'SUBMITTED' || cf.status === 'UNDER_REVIEW').length;
  const approvedSubmissions = courseFiles.filter((cf) => cf.status === 'APPROVED').length;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-navy-900 mb-1">Admin Dashboard & Submissions Overview</h3>
          <p className="text-secondary small mb-0">Monitor institutional course file submissions and map faculty members to designated evaluators.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/subjects" className="btn btn-outline-primary btn-sm px-3 py-2 fw-semibold">
            Subject Allocations
          </Link>
          <Link href="/admin/assignments" className="btn btn-ppsu-navy btn-sm px-3 py-2 fw-semibold">
            Manage Assignments
          </Link>
        </div>
      </div>

      {message && <Alert variant="success" dismissible onClose={() => setMessage('')} className="py-2.5 px-3 small border-0" style={{ background: '#ECFDF5', color: '#047857' }}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2.5 px-3 small border-0" style={{ background: '#FFF1F2', color: '#BE123C' }}>{error}</Alert>}

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        {[
          {
            label: 'Total Faculty',
            val: totalFaculty,
            color: 'var(--ppsu-primary)',
            bg: 'rgba(27, 42, 107, 0.08)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )
          },
          {
            label: 'Total Evaluators',
            val: totalCoordinators,
            color: '#0284C7',
            bg: 'rgba(2, 132, 199, 0.08)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )
          },
          {
            label: 'Pending Reviews',
            val: pendingReviews,
            color: 'var(--ppsu-warning-text)',
            bg: 'var(--ppsu-warning-bg)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Approved Files',
            val: approvedSubmissions,
            color: 'var(--ppsu-success-text)',
            bg: 'var(--ppsu-success-bg)',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          }
        ].map(({ label, val, color, bg, icon }) => (
          <Col xs={12} sm={6} md={3} key={label}>
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

      {loading ? (
        <div className="card-custom p-4 mb-4">
          <div className="skeleton-box mb-3" style={{ width: '40%', height: 28 }} />
          <div className="skeleton-box mb-2" style={{ width: '100%', height: 44 }} />
          <div className="skeleton-box mb-2" style={{ width: '100%', height: 44 }} />
          <div className="skeleton-box" style={{ width: '100%', height: 44 }} />
        </div>
      ) : (
        <>
          {/* Section 1: All System Submissions (Appears FIRST) */}
          <Card className="card-custom border-0 shadow-sm mb-4 p-0 admin-section-card">
            <Card.Header className="bg-white p-4 border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-navy-900 mb-0">All System Submissions</h5>
                <p className="text-secondary small mb-0 mt-1">Live status, subject division, coordinator, and evaluation tracking across all departments.</p>
              </div>
              <span className="badge-custom badge-custom-draft">{totalSubmissions} Total Course Files</span>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive admin-table-scroll">
                <Table hover className="align-middle mb-0">
                  <thead className="bg-light small text-secondary">
                    <tr>
                      <th className="px-4" style={{ minWidth: 260 }}>Course File</th>
                      <th style={{ minWidth: 160 }}>Faculty</th>
                      <th style={{ minWidth: 170 }}>Course Coordinator</th>
                      <th style={{ minWidth: 170 }}>Assigned Evaluator</th>
                      <th style={{ minWidth: 130 }}>Status</th>
                      <th className="text-end px-4" style={{ minWidth: 130 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseFiles.map((cf: any) => {
                      const division = cf.division || cf.subject?.division;
                      const divisionText = division ? `${division} · ` : '';
                      const courseCoordinatorName =
                        cf.subject?.courseCoordinator?.name ||
                        coordinatorList.find((c: any) => c.id === cf.subject?.courseCoordinatorId)?.name ||
                        'Not Set';
                      const assignedEvaluatorName =
                        cf.subject?.evaluator?.name ||
                        coordinatorList.find((c: any) => c.id === cf.faculty?.assignedCoordinatorId)?.name ||
                        (cf.faculty?.assignedCoordinatorId ? 'Assigned' : 'Unassigned');

                      return (
                        <tr key={cf.id}>
                          <td className="px-4">
                            <div className="fw-bold text-navy-900">{cf.courseCode} — {cf.courseTitle}</div>
                            <div className="small text-muted font-mono-ppsu">
                              {divisionText}{cf.semester} · {cf.academicYear}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{cf.faculty?.name || 'N/A'}</div>
                            {cf.faculty?.department && (
                              <div className="text-muted small" style={{ fontSize: 11 }}>{cf.faculty.department}</div>
                            )}
                          </td>
                          <td>
                            {courseCoordinatorName !== 'Not Set' ? (
                              <span
                                className="assignment-evaluator-badge"
                                style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0369a1' }}
                              >
                                {courseCoordinatorName}
                              </span>
                            ) : (
                              <span className="badge-custom badge-custom-draft">Not Set</span>
                            )}
                          </td>
                          <td>
                            {assignedEvaluatorName !== 'Unassigned' ? (
                              <span className="assignment-evaluator-badge">
                                {assignedEvaluatorName}
                              </span>
                            ) : (
                              <span className="badge-custom badge-custom-draft">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge-custom badge-custom-${cf.status.toLowerCase()}`}>
                              {cf.status}
                            </span>
                          </td>
                          <td className="text-end px-4">
                            <Link href={`/report/${cf.id}`} className="btn btn-outline-primary btn-sm">
                              Print Report
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* Section 2: Faculty Evaluator Assignments (Appears SECOND) */}
          <Card className="card-custom border-0 shadow-sm mb-4 p-0 admin-section-card">
            <Card.Header className="bg-white p-4 border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-navy-900 mb-0">Faculty Evaluator Assignments</h5>
                <p className="text-secondary small mb-0 mt-1">Map faculty members to designated evaluators for academic review.</p>
              </div>
              <span className="badge-custom badge-custom-draft">Section 9 — Role Hierarchy</span>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive admin-table-scroll">
                <Table hover className="align-middle mb-0">
                  <thead className="bg-light small text-secondary">
                    <tr>
                      <th className="px-4">Faculty Member</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Assigned Evaluator</th>
                      <th className="text-end px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyList.map((fac: any) => (
                      <tr key={fac.id}>
                        <td className="px-4">
                          <div className="fw-bold text-navy-900">{fac.name}</div>
                          <div className="small text-muted">{fac.email}</div>
                          <div className="assignment-status-chips mt-2" aria-label="Course file status counts">
                            <span className="assignment-status-chip assignment-status-completed">{fac.statusCounts?.completed ?? 0} Completed</span>
                            <span className="assignment-status-chip assignment-status-pending">{fac.statusCounts?.pending ?? 0} Pending</span>
                            <span className="assignment-status-chip assignment-status-revision">{fac.statusCounts?.revision ?? 0} Revision</span>
                          </div>
                        </td>
                        <td className="font-mono-ppsu small">{fac.employeeId || 'N/A'}</td>
                        <td className="small">{fac.department || 'N/A'}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={fac.assignedCoordinatorId || ''}
                            onChange={(e) => handleAssign(fac.id, e.target.value)}
                            disabled={savingId === fac.id}
                            style={{ maxWidth: '240px' }}
                          >
                            <option value="">-- Select Evaluator --</option>
                            {coordinatorList.map((coord: any) => (
                              <option key={coord.id} value={coord.id}>
                                {coord.name} ({coord.department})
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td className="text-end px-4">
                          {savingId === fac.id ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <span className="small text-success fw-semibold">
                              ✓ Active Mapping
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
