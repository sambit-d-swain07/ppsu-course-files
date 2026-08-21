'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import AssignedFacultyList from '../AssignedFacultyList';

export default function MyFacultyPage() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/coordinator/faculty', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setFaculty(Array.isArray(data.faculty) ? data.faculty : []))
      .finally(() => setLoading(false));
  }, []);

  const filteredFaculty = useMemo(() => faculty.filter((member) => {
    const text = `${member.name} ${member.employeeId || ''} ${member.department || ''}`.toLowerCase();
    const matchesText = text.includes(query.toLowerCase().trim());
    const counts = member.statusCounts;
    const matchesStatus = status === 'ALL'
      || (status === 'APPROVED' && counts.approved > 0)
      || (status === 'UNDER_REVIEW' && counts.underReview > 0)
      || (status === 'NEEDS_REVISION' && counts.needsRevision > 0)
      || (status === 'DRAFT' && counts.notSubmitted > 0);
    return matchesText && matchesStatus;
  }), [faculty, query, status]);

  return (
    <div>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-navy-900 mb-1">My Assigned Faculty</h4>
          <p className="text-secondary small mb-0">Faculty members currently mapped to you by Admin.</p>
        </div>
        <div className="badge rounded-pill bg-light text-dark border px-3 py-2 fw-bold">
          Total Faculty: {faculty.length}
        </div>
      </div>
      <div className="card-custom mb-4">
        <div className="d-flex gap-3 flex-wrap align-items-center">
          <Form.Control className="flex-grow-1" placeholder="Search by faculty name, employee ID, or department..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Form.Select style={{ maxWidth: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Has Approved Files</option>
            <option value="UNDER_REVIEW">Has Files Under Review</option>
            <option value="NEEDS_REVISION">Has Needs Revision Files</option>
            <option value="DRAFT">Has Unsubmitted Files</option>
          </Form.Select>
          {(query || status !== 'ALL') && (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setQuery(''); setStatus('ALL'); }}>
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="card-custom p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
          </div>
        ) : (
          <AssignedFacultyList faculty={filteredFaculty} />
        )}
      </div>
    </div>
  );
}
