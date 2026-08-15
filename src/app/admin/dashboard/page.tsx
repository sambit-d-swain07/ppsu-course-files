'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';

export default function AdminDashboard({ focusAssignments = false }: { focusAssignments?: boolean }) {
  const [data, setData] = useState<any>({ faculty: [], coordinators: [] });
  const [courseFiles, setCourseFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [assignments, files] = await Promise.all([fetch('/api/admin/assignments'), fetch('/api/course-files')]);
      if (!assignments.ok || !files.ok) throw new Error('Unable to load Admin data');
      setData(await assignments.json());
      setCourseFiles((await files.json()).courseFiles || []);
    } catch (err: any) { setError(err.message || 'Unable to load Admin data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const assign = async (facultyId: string, coordinatorId: string) => {
    if (!coordinatorId) return;
    setSaving(facultyId); setMessage(''); setError('');
    try {
      const res = await fetch('/api/admin/assignments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facultyId, coordinatorId }) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Assignment failed');
      setMessage('Faculty-to-coordinator assignment updated.'); await load();
    } catch (err: any) { setError(err.message || 'Assignment failed'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="d-flex justify-content-center py-5"><Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} /></div>;
  const pending = courseFiles.filter((file) => file.status === 'SUBMITTED' || file.status === 'UNDER_REVIEW').length;
  const approved = courseFiles.filter((file) => file.status === 'APPROVED').length;
  const coordinators = data.coordinators || [];
  const faculty = data.faculty || [];

  return <div>
    <div className="d-flex justify-content-between align-items-center mb-4"><div><h4 className="fw-bold text-navy-900 mb-1">Admin Dashboard</h4><p className="text-secondary small mb-0">Manage assignments and monitor system-wide course files.</p></div><Link href="/admin/assignments" className="btn btn-ppsu-navy btn-sm">Manage Assignments</Link></div>
    {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <Row className="g-3 mb-4"><Col xs={6} md={3}><Card className="card-custom text-center py-3"><small className="text-secondary text-uppercase">Faculty</small><h3 className="mb-0 text-navy-900">{faculty.length}</h3></Card></Col><Col xs={6} md={3}><Card className="card-custom text-center py-3"><small className="text-secondary text-uppercase">Coordinators</small><h3 className="mb-0 text-navy-900">{coordinators.length}</h3></Card></Col><Col xs={6} md={3}><Card className="card-custom text-center py-3"><small className="text-secondary text-uppercase">Pending Reviews</small><h3 className="mb-0" style={{ color: 'var(--ppsu-accent)' }}>{pending}</h3></Card></Col><Col xs={6} md={3}><Card className="card-custom text-center py-3"><small className="text-secondary text-uppercase">Approved Files</small><h3 className="mb-0 text-success">{approved}</h3></Card></Col></Row>
    {(focusAssignments || true) && <Card className="card-custom p-0 overflow-hidden mb-4"><Card.Header className="bg-white"><h5 className="fw-bold text-navy-900 mb-0">Faculty Coordinator Assignments</h5></Card.Header><Table responsive hover className="align-middle mb-0"><thead className="bg-light"><tr><th className="px-3">Faculty</th><th>Employee ID</th><th>Department</th><th>Assigned Coordinator</th></tr></thead><tbody>{faculty.map((person: any) => <tr key={person.id}><td className="px-3"><strong>{person.name}</strong><div className="small text-muted">{person.email}</div></td><td>{person.employeeId || 'N/A'}</td><td>{person.department || 'N/A'}</td><td><Form.Select size="sm" value={person.assignedCoordinatorId || ''} onChange={(event) => assign(person.id, event.target.value)} disabled={saving === person.id} style={{ maxWidth: 260 }}><option value="">Select coordinator</option>{coordinators.map((coord: any) => <option key={coord.id} value={coord.id}>{coord.name}</option>)}</Form.Select></td></tr>)}</tbody></Table></Card>}
    <Card className="card-custom p-0 overflow-hidden"><Card.Header className="bg-white"><h5 className="fw-bold text-navy-900 mb-0">All System Submissions</h5></Card.Header><Table responsive hover className="align-middle mb-0"><thead className="bg-light"><tr><th className="px-3">Course File</th><th>Faculty</th><th>Status</th><th className="text-end px-3">Action</th></tr></thead><tbody>{courseFiles.map((file: any) => <tr key={file.id}><td className="px-3"><strong>{file.courseCode} — {file.courseTitle}</strong><div className="small text-muted">{file.semester}</div></td><td>{file.faculty?.name || file.facultyName || 'N/A'}</td><td><Badge bg={file.status === 'APPROVED' ? 'success' : file.status === 'NEEDS_REVISION' ? 'danger' : 'secondary'}>{file.status}</Badge></td><td className="text-end px-3"><Link href={`/report/${file.id}`} className="btn btn-sm btn-ppsu-outline-accent">View Report</Link></td></tr>)}</tbody></Table></Card>
  </div>;
}
