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
        setUsers([...(data.faculty || []), ...(data.coordinators || [])]);
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
    {loading ? <div className="text-center py-5"><Spinner /></div> : <div className="card-custom p-0 overflow-hidden">
      <Table responsive hover className="mb-0 align-middle">
        <thead><tr><th className="px-4">Name</th><th>Role</th><th>Department</th><th>School</th><th>Email</th></tr></thead>
        <tbody>{users.map(user => <tr key={user.id}>
          <td className="px-4 fw-semibold">{user.name}</td>
          <td><span className="badge-custom badge-custom-draft">{user.role}</span></td>
          <td>{user.department || '—'}</td><td>{user.school || '—'}</td><td>{user.email}</td>
        </tr>)}</tbody>
      </Table>
    </div>}
  </div>;
}
