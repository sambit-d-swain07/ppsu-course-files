'use client';

import Link from 'next/link';
import { Table } from 'react-bootstrap';

interface CourseTableProps {
  courseFiles: any[];
  emptyMessage?: string;
}

export default function CourseTable({ courseFiles, emptyMessage = "No course files found matching this view." }: CourseTableProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'badge-custom-approved';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'badge-custom-review';
      case 'NEEDS_REVISION':
        return 'badge-custom-revision';
      case 'DRAFT':
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

  if (courseFiles.length === 0) {
    return (
      <div className="card-custom text-center py-5 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
        <p className="text-secondary mb-0">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card-custom p-0 border-0 overflow-hidden">
      <div className="table-responsive">
        <Table hover className="table-custom align-middle">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Faculty</th>
              <th>Course</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {courseFiles.map((cf) => (
              <tr key={cf.id}>
                <td>
                  <span className="font-mono-ppsu fw-bold text-secondary">
                    {cf.faculty?.employeeId || 'N/A'}
                  </span>
                </td>
                <td className="fw-semibold text-navy-900">{cf.faculty?.name || 'N/A'}</td>
                <td>
                  <span className="font-mono-ppsu small fw-bold text-secondary bg-light px-2 py-1 rounded me-2">
                    {cf.courseCode}
                  </span>
                  <span className="fw-semibold text-navy-900">{cf.courseTitle}</span>
                </td>
                <td>
                  <span className={`badge-custom ${getStatusBadgeClass(cf.status)}`}>
                    {getStatusLabel(cf.status)}
                  </span>
                </td>
                <td className="text-secondary small">{formatDate(cf.lastUpdated)}</td>
                <td className="text-center">
                  <Link href={`/coordinator/review/${cf.id}`} className="btn btn-sm btn-ppsu-navy py-1.5 px-3">
                    Open Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
