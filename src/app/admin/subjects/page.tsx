'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap';

const semesters = Array.from({ length: 8 }, (_, index) => `Semester ${String.fromCharCode(73 + index)}`);
const emptyForm = { subjectCode: '', subjectName: '', department: '', school: '', semester: semesters[0], academicYear: '', courseCoordinatorId: '', courseTeacherId: '', labTeacherId: '', evaluatorId: '' };

export default function SubjectAllocationPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/admin/subjects');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load subjects');
    setSubjects(data.subjects || []); setUsers(data.users || []);
  };
  useEffect(() => { load().catch(error => setError(error.message)).finally(() => setLoading(false)); }, []);

  const coordinators = useMemo(() => users.filter(user => user.role === 'COORDINATOR'), [users]);
  const faculty = useMemo(() => users.filter(user => user.role === 'FACULTY'), [users]);
  const duplicateCoordinatorEvaluator = Boolean(form.courseCoordinatorId && form.courseCoordinatorId === form.evaluatorId);
  const assignmentValidationError = duplicateCoordinatorEvaluator
    ? 'The Evaluator must be a different person from the Course Coordinator'
    : '';
  const setField = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const displayUser = (user: any) => user ? `${user.name}${user.department ? ` (${user.department})` : ''}` : 'Unassigned';

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (assignmentValidationError) { setError(assignmentValidationError); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/subjects', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save subject');
      await load(); setForm(emptyForm); setEditingId(null); setMessage(editingId ? 'Subject allocation updated.' : 'Subject allocated and CourseFile created.');
    } catch (error: any) { setError(error.message); } finally { setSaving(false); }
  };

  const edit = (subject: any) => setForm({ subjectCode: subject.subjectCode, subjectName: subject.subjectName, department: subject.department, school: subject.school, semester: subject.semester, academicYear: subject.academicYear, courseCoordinatorId: subject.courseCoordinatorId, courseTeacherId: subject.courseTeacherId, labTeacherId: subject.labTeacherId || '', evaluatorId: subject.evaluatorId });

  return <div>
    <div className="mb-4"><h4 className="fw-bold text-navy-900 mb-1">Subject Allocation</h4><p className="text-secondary small mb-0">Create a subject and assign the four subject-specific responsibilities.</p></div>
    {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <div className="card-custom mb-4">
      <h5 className="fw-bold text-navy-900 mb-3">{editingId ? 'Edit Subject Allocation' : 'Create Subject'}</h5>
      <Form onSubmit={submit}>{assignmentValidationError && <Alert variant="warning" className="py-2 small">{assignmentValidationError}</Alert>}<Row className="g-3">
        {[['subjectCode','Subject Code'],['subjectName','Subject Name'],['department','Department'],['school','School'],['academicYear','Academic Year']].map(([key,label]) => <Col md={key === 'subjectName' ? 6 : 3} key={key}><Form.Label className="small fw-semibold text-secondary">{label} *</Form.Label><Form.Control required value={form[key]} onChange={event => setField(key, event.target.value)} /></Col>)}
        <Col md={3}><Form.Label className="small fw-semibold text-secondary">Semester *</Form.Label><Form.Select required value={form.semester} onChange={event => setField('semester', event.target.value)}>{semesters.map(semester => <option key={semester}>{semester}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Course Coordinator *</Form.Label><Form.Select required value={form.courseCoordinatorId} onChange={event => setField('courseCoordinatorId', event.target.value)}><option value="">Select Coordinator</option>{coordinators.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Course Teacher *</Form.Label><Form.Select required value={form.courseTeacherId} onChange={event => setField('courseTeacherId', event.target.value)}><option value="">Select Faculty</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Lab Teacher</Form.Label><Form.Select value={form.labTeacherId} onChange={event => setField('labTeacherId', event.target.value)}><option value="">No Lab Teacher</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Evaluator *</Form.Label><Form.Select required value={form.evaluatorId} onChange={event => setField('evaluatorId', event.target.value)}><option value="">Select Evaluator</option>{coordinators.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
      </Row><div className="mt-4 d-flex gap-2"><Button type="submit" className="btn-ppsu-accent" disabled={saving || Boolean(assignmentValidationError)}>{saving ? <Spinner size="sm" /> : editingId ? 'Save Changes' : 'Create & Allocate Subject'}</Button>{editingId && <Button variant="light" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>}</div></Form>
    </div>
    <div className="card-custom p-0 overflow-hidden"><div className="p-4"><h5 className="fw-bold text-navy-900 mb-0">Allocated Subjects</h5></div>{loading ? <div className="text-center py-5"><Spinner /></div> : <Table responsive hover className="mb-0 align-middle"><thead><tr><th className="px-4">Subject</th><th>Course Coordinator</th><th>Course Teacher</th><th>Lab Teacher</th><th>Evaluator</th><th>File</th><th></th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.id}><td className="px-4"><span className="font-mono-ppsu fw-bold">{subject.subjectCode}</span><br /><small>{subject.subjectName}</small></td><td>{displayUser(subject.courseCoordinator)}</td><td>{displayUser(subject.courseTeacher)}</td><td>{displayUser(subject.labTeacher)}</td><td>{displayUser(subject.evaluator)}</td><td><span className="badge-custom badge-custom-draft">{subject.courseFile?.status || 'DRAFT'}</span></td><td><Button size="sm" variant="outline-primary" onClick={() => { setEditingId(subject.id); edit(subject); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</Button></td></tr>)}</tbody></Table>}</div>
  </div>;
}
