'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap';

const semesters = Array.from({ length: 8 }, (_, index) => `SEM ${index + 1}`);
const divisionOptions = ['CB3A', 'CB3B', 'IT3A', 'IT3B', 'ME3A', 'ME3B', 'CE3A', 'EC3A'];
const emptyForm = { subjectCode: '', subjectName: '', department: '', school: '', division: '', customDivision: '', semester: semesters[0], academicYear: '', courseCoordinatorId: '', courseTeacherId: '', labTeacherAId: '', labTeacherBId: '', labTeacherCId: '', evaluatorId: '' };

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
  const divisionValue = form.division === 'Custom' ? form.customDivision.trim() : form.division.trim();
  const schoolValidationError = !form.school.trim() ? 'School is required' : '';
  const divisionValidationError = !divisionValue ? 'Division is required' : '';
  const assignmentValidationError = duplicateCoordinatorEvaluator
    ? 'The Evaluator must be a different person from the Course Coordinator'
    : '';
  const formValidationError = assignmentValidationError || schoolValidationError || divisionValidationError;
  const setField = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const displayUser = (user: any) => user ? `${user.name}${user.department ? ` (${user.department})` : ''}` : 'Unassigned';

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (formValidationError) { setError(formValidationError); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/subjects', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, division: divisionValue, id: editingId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save subject');
      await load(); setForm(emptyForm); setEditingId(null); setMessage(editingId ? 'Subject allocation updated.' : 'Subject allocated and CourseFile created.');
    } catch (error: any) { setError(error.message); } finally { setSaving(false); }
  };

  const edit = (subject: any) => setForm({ subjectCode: subject.subjectCode, subjectName: subject.subjectName, department: subject.department, school: subject.school || '', division: divisionOptions.includes(subject.division) ? subject.division : subject.division ? 'Custom' : '', customDivision: divisionOptions.includes(subject.division) ? '' : subject.division || '', semester: subject.semester, academicYear: subject.academicYear, courseCoordinatorId: subject.courseCoordinatorId, courseTeacherId: subject.courseTeacherId, labTeacherAId: subject.labTeacherAId || '', labTeacherBId: subject.labTeacherBId || '', labTeacherCId: subject.labTeacherCId || '', evaluatorId: subject.evaluatorId });

  return <div>
    <div className="mb-4"><h4 className="fw-bold text-navy-900 mb-1">Subject Allocation</h4><p className="text-secondary small mb-0">Create a subject and assign the four subject-specific responsibilities.</p></div>
    {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <div className="card-custom mb-4">
      <h5 className="fw-bold text-navy-900 mb-3">{editingId ? 'Edit Subject Allocation' : 'Create Subject'}</h5>
      <Form onSubmit={submit}>{formValidationError && <Alert variant="warning" className="py-2 small">{formValidationError}</Alert>}<Row className="g-3">
        {[['subjectCode','Subject Code'],['subjectName','Subject Name'],['department','Department']].map(([key,label]) => <Col md={key === 'subjectName' ? 6 : 3} key={key}><Form.Label className="small fw-semibold text-secondary">{label} *</Form.Label><Form.Control required value={form[key]} onChange={event => setField(key, event.target.value)} /></Col>)}
        <Col md={3}><Form.Label className="small fw-semibold text-secondary">School *</Form.Label><Form.Select required value={form.school} onChange={event => setField('school', event.target.value)}><option value="">Select School</option><option value="SOE">SOE (School of Engineering)</option><option value="IDS">IDS</option><option value="ICA">ICA</option></Form.Select></Col>
        <Col md={3}><Form.Label className="small fw-semibold text-secondary">Division *</Form.Label><Form.Select required value={form.division} onChange={event => setField('division', event.target.value)}><option value="">Select Division</option>{divisionOptions.map(division => <option key={division}>{division}</option>)}<option value="Custom">Custom / Other</option></Form.Select>{form.division === 'Custom' && <Form.Control className="mt-2" required placeholder="Enter custom division" value={form.customDivision} onChange={event => setField('customDivision', event.target.value)} />}</Col>
        <Col md={3}><Form.Label className="small fw-semibold text-secondary">Academic Year *</Form.Label><Form.Control required value={form.academicYear} onChange={event => setField('academicYear', event.target.value)} /></Col>
        <Col md={3}><Form.Label className="small fw-semibold text-secondary">Semester *</Form.Label><Form.Select required value={form.semester} onChange={event => setField('semester', event.target.value)}>{semesters.map(semester => <option key={semester}>{semester}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Course Coordinator *</Form.Label><Form.Select required value={form.courseCoordinatorId} onChange={event => setField('courseCoordinatorId', event.target.value)}><option value="">Select Faculty Coordinator</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Course Teacher *</Form.Label><Form.Select required value={form.courseTeacherId} onChange={event => setField('courseTeacherId', event.target.value)}><option value="">Select Faculty</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={4}><Form.Label className="small fw-semibold text-secondary">Lab Teacher (Batch A) *</Form.Label><Form.Select required value={form.labTeacherAId} onChange={event => setField('labTeacherAId', event.target.value)}><option value="">No Lab Teacher</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={4}><Form.Label className="small fw-semibold text-secondary">Lab Teacher (Batch B) <span className="fw-normal">(optional)</span></Form.Label><Form.Select value={form.labTeacherBId} onChange={event => setField('labTeacherBId', event.target.value)}><option value="">No Lab Teacher</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={4}><Form.Label className="small fw-semibold text-secondary">Lab Teacher (Batch C) <span className="fw-normal">(optional)</span></Form.Label><Form.Select value={form.labTeacherCId} onChange={event => setField('labTeacherCId', event.target.value)}><option value="">No Lab Teacher</option>{faculty.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
        <Col md={6}><Form.Label className="small fw-semibold text-secondary">Evaluator *</Form.Label><Form.Select required value={form.evaluatorId} onChange={event => setField('evaluatorId', event.target.value)}><option value="">Select Evaluator</option>{coordinators.map(user => <option key={user.id} value={user.id}>{displayUser(user)}</option>)}</Form.Select></Col>
      </Row><div className="mt-4 d-flex gap-2"><Button type="submit" className="btn-ppsu-accent" disabled={saving || Boolean(assignmentValidationError)}>{saving ? <Spinner size="sm" /> : editingId ? 'Save Changes' : 'Create & Allocate Subject'}</Button>{editingId && <Button variant="light" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>}</div></Form>
    </div>
    <div className="card-custom p-0 overflow-hidden"><div className="p-4"><h5 className="fw-bold text-navy-900 mb-0">Allocated Subjects</h5></div>{loading ? <div className="text-center py-5"><Spinner /></div> : <Table responsive hover className="mb-0 align-middle"><thead><tr><th className="px-4">Subject</th><th>Division</th><th>Course Coordinator</th><th>Course Teacher</th><th>Lab Teachers</th><th>Evaluator</th><th>File</th><th></th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.id}><td className="px-4"><span className="font-mono-ppsu fw-bold">{subject.subjectCode}</span><br /><small>{subject.subjectName}</small></td><td>{subject.division || '—'}</td><td>{displayUser(subject.courseCoordinator)}</td><td>{displayUser(subject.courseTeacher)}</td><td><small>A: {displayUser(subject.labTeacherA)}<br />B: {displayUser(subject.labTeacherB)}<br />C: {displayUser(subject.labTeacherC)}</small></td><td>{displayUser(subject.evaluator)}</td><td><span className="badge-custom badge-custom-draft">{subject.courseFile?.status || 'DRAFT'}</span></td><td><Button size="sm" variant="outline-primary" onClick={() => { setEditingId(subject.id); edit(subject); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</Button></td></tr>)}</tbody></Table>}</div>
  </div>;
}
