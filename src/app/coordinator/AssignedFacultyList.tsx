'use client';

import Link from 'next/link';
import { Table } from 'react-bootstrap';

function statusBadge(status: string) {
  if (status === 'APPROVED') return 'badge-custom-approved';
  if (status === 'NEEDS_REVISION') return 'badge-custom-revision';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'badge-custom-review';
  return 'badge-custom-draft';
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
      <Table hover responsive className="align-middle mb-0 small">
        <thead className="bg-light">
          <tr>
            <th className="ps-4 py-3" style={{ minWidth: 200 }}>Faculty Member</th>
            <th className="py-3" style={{ minWidth: 120 }}>Employee ID</th>
            <th className="py-3" style={{ minWidth: 160 }}>Department</th>
            <th className="text-center py-3" style={{ minWidth: 100 }}>Total Files</th>
            <th className="py-3" style={{ minWidth: 220 }}>Status Breakdown</th>
            <th className="pe-4 py-3 text-end" style={{ minWidth: 240 }}>Assigned Course Files / Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((member) => (
            <tr key={member.id}>
              <td className="ps-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
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
                    <div className="fw-bold text-navy-900" style={{ fontSize: 13 }}>{member.name}</div>
                    {member.designation && <div className="text-muted" style={{ fontSize: 11 }}>{member.designation}</div>}
                  </div>
                </div>
              </td>
              <td className="py-3">
                <span className="font-mono-ppsu px-2 py-1 bg-light rounded border small fw-semibold">
                  {member.employeeId || '—'}
                </span>
              </td>
              <td className="py-3">
                <span className="text-secondary fw-semibold">{member.department || '—'}</span>
              </td>
              <td className="text-center py-3">
                <span className="badge rounded-pill bg-light text-navy-900 border px-2 py-1 fw-bold" style={{ fontSize: 12 }}>
                  {member.totalCourseFiles}
                </span>
              </td>
              <td className="py-3">
                <div className="d-flex gap-1 flex-wrap align-items-center">
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
              <td className="pe-4 py-3 text-end">
                {member.courseFiles && member.courseFiles.length > 0 ? (
                  <div className="d-flex flex-column gap-2 align-items-end">
                    {member.courseFiles.map((file: any) => (
                      <div key={file.id} className="d-flex align-items-center justify-content-end gap-2 p-1 px-2 rounded bg-light border" style={{ minWidth: 200 }}>
                        <div className="text-end text-truncate" style={{ maxWidth: 140 }}>
                          <span className="font-mono-ppsu fw-bold me-1" style={{ fontSize: 11 }}>{file.courseCode}</span>
                          <div className="text-muted text-truncate" style={{ fontSize: 10 }}>{file.courseTitle}</div>
                        </div>
                        <span className={`badge-custom ${statusBadge(file.status)}`} style={{ fontSize: 10 }}>
                          {file.status === 'SUBMITTED' || file.status === 'UNDER_REVIEW' ? 'Review' : file.status}
                        </span>
                        <Link
                          href={`/coordinator/review/${file.id}`}
                          className="btn btn-sm py-1 px-2 font-semibold"
                          style={{
                            background: 'var(--ppsu-accent)',
                            color: '#fff',
                            fontSize: 11,
                            borderRadius: 6,
                            border: 'none',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Review →
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted small">No course files created yet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
