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
            <th className="ps-4 py-3 align-middle" style={{ minWidth: 200 }}>Faculty Member</th>
            <th className="py-3 align-middle" style={{ minWidth: 120 }}>Employee ID</th>
            <th className="py-3 align-middle" style={{ minWidth: 160 }}>Department</th>
            <th className="text-center py-3 align-middle" style={{ minWidth: 90 }}>Total Files</th>
            <th className="py-3 align-middle" style={{ minWidth: 220 }}>Status Breakdown</th>
            <th className="pe-4 py-3 align-middle text-start" style={{ minWidth: 280 }}>Assigned Course Files & Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((member) => (
            <tr key={member.id}>
              <td className="ps-4 py-3 align-middle">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(30,58,138,0.1)',
                      color: 'var(--ppsu-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
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
              <td className="py-3 align-middle">
                <span className="font-mono-ppsu px-2 py-1 bg-light rounded border small fw-semibold">
                  {member.employeeId || '—'}
                </span>
              </td>
              <td className="py-3 align-middle">
                <span className="text-secondary fw-semibold">{member.department || '—'}</span>
              </td>
              <td className="text-center py-3 align-middle">
                <span className="badge rounded-pill bg-light text-navy-900 border px-2.5 py-1 fw-bold" style={{ fontSize: 12 }}>
                  {member.totalCourseFiles}
                </span>
              </td>
              <td className="py-3 align-middle">
                <div className="d-flex gap-1.5 flex-wrap align-items-center" style={{ gap: '4px' }}>
                  <span className={`badge-custom ${statusBadge('APPROVED')}`}>
                    Approved: {member.statusCounts.approved}
                  </span>
                  <span className={`badge-custom ${statusBadge('UNDER_REVIEW')}`}>
                    Under Review: {member.statusCounts.underReview}
                  </span>
                  <span className={`badge-custom ${statusBadge('NEEDS_REVISION')}`}>
                    Revision: {member.statusCounts.needsRevision}
                  </span>
                  <span className={`badge-custom ${statusBadge('DRAFT')}`}>
                    Not Submitted: {member.statusCounts.notSubmitted}
                  </span>
                </div>
              </td>
              <td className="pe-4 py-3 align-middle">
                {member.courseFiles && member.courseFiles.length > 0 ? (
                  <div className="d-flex flex-column gap-2" style={{ maxWidth: 360 }}>
                    {member.courseFiles.map((file: any) => (
                      <div
                        key={file.id}
                        className="d-flex align-items-center justify-content-between gap-2 p-2 rounded bg-light border shadow-none"
                        style={{ background: '#f8fafc' }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1" style={{ minWidth: 0 }}>
                          <span className="font-mono-ppsu fw-bold text-navy-900 bg-white border px-1.5 py-0.5 rounded small flex-shrink-0" style={{ fontSize: 11 }}>
                            {file.courseCode}
                          </span>
                          <span className="text-truncate fw-semibold text-secondary" style={{ fontSize: 11 }} title={file.courseTitle}>
                            {file.courseTitle}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                          <span className={`badge-custom ${statusBadge(file.status)}`} style={{ fontSize: 10 }}>
                            {file.status === 'SUBMITTED' || file.status === 'UNDER_REVIEW' ? 'Pending' : file.status}
                          </span>
                          <Link
                            href={`/coordinator/review/${file.id}`}
                            prefetch={false}
                            className="btn btn-sm py-0.5 px-2 fw-semibold"
                            style={{
                              background: 'var(--ppsu-accent)',
                              color: '#fff',
                              fontSize: 11,
                              borderRadius: 5,
                              border: 'none',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Review →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted small italic">No course files assigned</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
