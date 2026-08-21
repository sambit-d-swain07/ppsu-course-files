'use client';

import Link from 'next/link';
import { Table } from 'react-bootstrap';

function statusBadge(status: string) {
  if (status === 'APPROVED') return 'badge-custom-approved';
  if (status === 'NEEDS_REVISION') return 'badge-custom-revision';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'badge-custom-review';
  return 'badge-custom-draft';
}

function statusLabel(status: string) {
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'Under Review';
  if (status === 'NEEDS_REVISION') return 'Needs Revision';
  if (status === 'APPROVED') return 'Approved';
  return 'Not Yet Submitted';
}

export default function AssignedFacultyList({ faculty }: { faculty: any[] }) {
  if (!faculty.length) {
    return <div className="text-muted small py-3">No faculty members are currently assigned to you.</div>;
  }

  return (
    <div className="table-responsive">
      <Table hover responsive className="align-middle mb-0 small">
        <thead className="bg-light">
          <tr>
            <th>Faculty</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Total Files</th>
            <th>Status Breakdown</th>
            <th>Course Files</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((member) => (
            <tr key={member.id}>
              <td className="fw-semibold">{member.name}</td>
              <td className="font-mono-ppsu">{member.employeeId || '—'}</td>
              <td>{member.department || '—'}</td>
              <td className="fw-bold">{member.totalCourseFiles}</td>
              <td>
                <div className="d-flex gap-1 flex-wrap">
                  <span className={`badge-custom ${statusBadge('APPROVED')}`}>Approved: {member.statusCounts.approved}</span>
                  <span className={`badge-custom ${statusBadge('UNDER_REVIEW')}`}>Under Review: {member.statusCounts.underReview}</span>
                  <span className={`badge-custom ${statusBadge('NEEDS_REVISION')}`}>Needs Revision: {member.statusCounts.needsRevision}</span>
                  <span className={`badge-custom ${statusBadge('DRAFT')}`}>Not Submitted: {member.statusCounts.notSubmitted}</span>
                </div>
              </td>
              <td>
                <div className="d-flex flex-column gap-1">
                  {member.courseFiles.length ? member.courseFiles.map((file: any) => (
                    <Link key={file.id} href={`/coordinator/review/${file.id}`} className="text-decoration-none">
                      <span className={`badge-custom ${statusBadge(file.status)} me-1`}>{file.courseCode}</span>
                      <span className="text-secondary">Review</span>
                    </Link>
                  )) : <span className="text-muted">No course files yet</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
