'use client';

import Link from 'next/link';
import { Table, Button, Badge } from 'react-bootstrap';

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
  if (!faculty || !faculty.length) {
    return (
      <div className="text-center py-5 text-muted small">
        <div className="mb-2" style={{ fontSize: 24 }}>👨‍🏫</div>
        <div className="fw-semibold">No assigned faculty members found.</div>
        <div>Faculty members assigned to you by the Admin will appear here.</div>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table hover responsive className="align-middle mb-0 small text-nowrap">
        <thead className="bg-light">
          <tr>
            <th className="ps-4">Faculty Member</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th className="text-center">Total Files</th>
            <th>Status Breakdown</th>
            <th className="pe-4 text-end">Assigned Course Files / Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((member) => (
            <tr key={member.id}>
              <td className="ps-4">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(30,58,138,0.1)',
                      color: 'var(--ppsu-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0
                    }}
                  >
                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="fw-bold text-navy-900">{member.name}</div>
                    {member.designation && <div className="text-muted" style={{ fontSize: 11 }}>{member.designation}</div>}
                  </div>
                </div>
              </td>
              <td>
                <span className="font-mono-ppsu px-2 py-1 bg-light rounded border small">
                  {member.employeeId || '—'}
                </span>
              </td>
              <td>
                <span className="text-secondary">{member.department || '—'}</span>
              </td>
              <td className="text-center">
                <span className="badge rounded-pill bg-light text-dark border px-2 py-1 fw-bold">
                  {member.totalCourseFiles}
                </span>
              </td>
              <td>
                <div className="d-flex gap-1 flex-wrap">
                  <span className={`badge-custom ${statusBadge('APPROVED')}`}>
                    Approved: {member.statusCounts.approved}
                  </span>
                  <span className={`badge-custom ${statusBadge('UNDER_REVIEW')}`}>
                    Under Review: {member.statusCounts.underReview}
                  </span>
                  <span className={`badge-custom ${statusBadge('NEEDS_REVISION')}`}>
                    Needs Revision: {member.statusCounts.needsRevision}
                  </span>
                  <span className={`badge-custom ${statusBadge('DRAFT')}`}>
                    Not Submitted: {member.statusCounts.notSubmitted}
                  </span>
                </div>
              </td>
              <td className="pe-4 text-end">
                {member.courseFiles && member.courseFiles.length > 0 ? (
                  <div className="d-flex flex-column gap-1 align-items-end">
                    {member.courseFiles.map((file: any) => (
                      <div key={file.id} className="d-flex align-items-center gap-1">
                        <span className={`badge-custom ${statusBadge(file.status)}`} style={{ fontSize: 10 }}>
                          {file.courseCode}
                        </span>
                        <Link
                          href={`/coordinator/review/${file.id}`}
                          className="btn btn-sm py-0 px-2"
                          style={{
                            background: 'var(--ppsu-accent)',
                            color: '#fff',
                            fontSize: 11,
                            borderRadius: 4,
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          Review →
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted small">No files created yet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
