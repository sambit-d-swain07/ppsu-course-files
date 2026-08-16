'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
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
    
    // Optimistic update for immediate responsiveness
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" style={{ color: 'var(--ppsu-navy-900)' }} />
      </div>
    );
  }

  const facultyList = data?.faculty || [];
  const coordinatorList = data?.coordinators || [];

  const totalFaculty = facultyList.length;
  const totalCoordinators = coordinatorList.length;
  const totalSubmissions = courseFiles.length;
  const pendingReviews = courseFiles.filter((cf) => cf.status === 'SUBMITTED' || cf.status === 'UNDER_REVIEW').length;
  const approvedSubmissions = courseFiles.filter((cf) => cf.status === 'APPROVED').length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-navy-900 mb-1">Admin Dashboard & Evaluator Assignment</h2>
          <p className="text-secondary small mb-0">Manage faculty-to-evaluator mappings and monitor system-wide course file submissions.</p>
        </div>
        <Link href="/admin/assignments" className="btn btn-ppsu-navy btn-sm px-3">
          Manage Assignments
        </Link>
      </div>

      {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="card-custom border-0 shadow-sm text-center py-3">
            <h6 className="text-secondary small text-uppercase mb-1">Total Faculty</h6>
            <h3 className="fw-bold text-navy-900 mb-0 font-mono-ppsu">{totalFaculty}</h3>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="card-custom border-0 shadow-sm text-center py-3">
            <h6 className="text-secondary small text-uppercase mb-1">Total Evaluators</h6>
            <h3 className="fw-bold text-navy-900 mb-0 font-mono-ppsu">{totalCoordinators}</h3>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="card-custom border-0 shadow-sm text-center py-3">
            <h6 className="text-secondary small text-uppercase mb-1">Pending Reviews</h6>
            <h3 className="fw-bold text-warning mb-0 font-mono-ppsu">{pendingReviews}</h3>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="card-custom border-0 shadow-sm text-center py-3">
            <h6 className="text-secondary small text-uppercase mb-1">Approved Files</h6>
            <h3 className="fw-bold text-success mb-0 font-mono-ppsu">{approvedSubmissions}</h3>
          </Card>
        </Col>
      </Row>

      {/* Faculty to Evaluator Assignment Table */}
      <Card className="card-custom border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-navy-900 mb-0">Faculty Evaluator Assignments</h5>
          <span className="badge bg-secondary">Section 9 — Role Hierarchy</span>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
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
        </Card.Body>
      </Card>

      {/* Course File Submissions Overview */}
      <Card className="card-custom border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-0">
          <h5 className="fw-bold text-navy-900 mb-0">All System Submissions</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light small text-secondary">
              <tr>
                <th className="px-4">Course File</th>
                <th>Faculty</th>
                <th>Assigned Evaluator</th>
                <th>Status</th>
                <th className="text-end px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {courseFiles.map((cf: any) => {
                const assignedCoord = coordinatorList.find((c: any) => c.id === cf.faculty?.assignedCoordinatorId);
                return (
                  <tr key={cf.id}>
                    <td className="px-4">
                      <div className="fw-bold">{cf.courseCode} — {cf.courseTitle}</div>
                      <div className="small text-muted">{cf.semester} · {cf.academicYear}</div>
                    </td>
                    <td>{cf.faculty?.name || 'N/A'}</td>
                    <td>
                      {assignedCoord ? (
                        <Badge bg="info" className="text-dark">{assignedCoord.name}</Badge>
                      ) : (
                        <Badge bg="secondary">Unassigned</Badge>
                      )}
                    </td>
                    <td>
                      <span className={`badge-custom badge-custom-${cf.status.toLowerCase()}`}>
                        {cf.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <Link href={`/report/${cf.id}`} className="btn btn-outline-primary btn-sm me-2">
                        Print Report
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
