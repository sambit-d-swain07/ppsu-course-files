'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Table, Spinner } from 'react-bootstrap';

export default function FacultySubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/course-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.courseFiles) {
          // Filter to Submitted/Under Review/Needs Revision
          const filtered = data.courseFiles.filter((cf: any) => 
            ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION'].includes(cf.status)
          );
          setSubmissions(filtered);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'badge-custom-review';
      case 'NEEDS_REVISION':
        return 'badge-custom-revision';
      default:
        return 'badge-custom-draft';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'UNDER_REVIEW') return 'Under Review';
    if (status === 'NEEDS_REVISION') return 'Needs Revision';
    return status;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">Active Submissions</h4>
        <p className="text-secondary small">Review status for course files currently pending review or requiring changes.</p>
      </div>

      <div className="card-custom p-0 border-0 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-secondary mb-0">No active submissions found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="table-custom align-middle">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((cf) => (
                  <tr key={cf.id}>
                    <td>
                      <span className="font-mono-ppsu fw-bold text-secondary">{cf.courseCode}</span>
                    </td>
                    <td className="fw-semibold text-navy-900">{cf.courseTitle}</td>
                    <td>
                      <span className={`badge-custom ${getStatusBadgeClass(cf.status)}`}>
                        {getStatusLabel(cf.status)}
                      </span>
                    </td>
                    <td className="text-secondary small">{formatDate(cf.lastUpdated)}</td>
                    <td className="text-center">
                      <Link href={`/faculty/course-files/${cf.id}`} className="btn btn-sm btn-ppsu-navy py-1.5 px-3">
                        Open File
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
