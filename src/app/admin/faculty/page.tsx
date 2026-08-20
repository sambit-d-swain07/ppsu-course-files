'use client';

import { useEffect, useState } from 'react';
import { Alert, Spinner, Table } from 'react-bootstrap';

export default function AdminFacultyPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/assignments')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load faculty');
        setUsers([...(data.faculty || []), ...(data.coordinators || []), ...(data.admins || [])]);
      })
      .catch(error => setError(error.message))
      .finally(() => setLoading(false));
  }, []);

  return <div>
    <div className="mb-4">
      <h4 className="fw-bold text-navy-900 mb-1">Faculty &amp; Coordinator List</h4>
      <p className="text-secondary small mb-0">Existing users available for Subject Allocation.</p>
    </div>
    {error && <Alert variant="danger">{error}</Alert>}
    {loading ? <div className="text-center py-5"><Spinner /></div> : <>
      {[
        { role: 'FACULTY', title: 'Faculty' },
        { role: 'COORDINATOR', title: 'Coordinators / Evaluators' },
        { role: 'ADMIN', title: 'Admins' }
      ].map(section => {
        const sectionUsers = users.filter(user => user.role === section.role);
        return <section key={section.role} className="mb-4">
          <h5 className="fw-bold text-navy-900 mb-3">{section.title} <span className="text-secondary small fw-normal">({sectionUsers.length})</span></h5>
          <div className="card-custom p-0 overflow-hidden">
            <Table responsive hover className="mb-0 align-middle">
              <thead><tr><th className="px-4">Name</th><th>Role</th><th>Department</th><th>School</th><th>Email</th><th>Employee ID / Designation</th></tr></thead>
              <tbody>{sectionUsers.length === 0 ? <tr><td colSpan={6} className="text-center text-secondary py-4">No {section.title.toLowerCase()} found.</td></tr> : sectionUsers.map(user => <tr key={user.id}>
                <td className="px-4 fw-semibold">{user.name}</td>
                <td><span className="badge-custom badge-custom-draft">{user.role}</span></td>
                <td>{user.department || '—'}</td><td>{user.school || '—'}</td><td>{user.email}</td>
                <td><span className="font-mono-ppsu small">{user.employeeId || '—'}</span>{user.designation && <><br /><small className="text-secondary">{user.designation}</small></>}</td>
              </tr>)}</tbody>
            </Table>
          </div>
        </section>;
      })}
    </>}
  </div>;
}
