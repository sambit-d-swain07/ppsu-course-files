'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, Card, ProgressBar, Spinner } from 'react-bootstrap';

export default function FacultyMyCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/course-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.courseFiles) {
          setCourses(data.courseFiles);
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

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">My Assigned Courses</h4>
        <p className="text-secondary small">Review checklists and tracking stats for all courses assigned to you.</p>
      </div>

      {courses.length === 0 ? (
        <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
          <Card.Body>
            <p className="text-secondary mb-0">No courses assigned to your profile yet.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {courses.map((course) => {
            const percent = Math.round((course.progress / 19) * 100);
            return (
              <Col xs={12} md={6} lg={4} key={course.id}>
                <div className="card-custom card-custom-hover h-100 d-flex flex-column m-0 justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="font-mono-ppsu small fw-bold text-secondary bg-light px-2 py-1 rounded">
                        {course.courseCode}
                      </span>
                      <span className={`badge-custom ${getStatusBadgeClass(course.status)}`}>
                        {getStatusLabel(course.status)}
                      </span>
                    </div>

                    <h6 className="fw-bold text-navy-900 mb-1">{course.courseTitle}</h6>
                    <p className="text-muted small mb-3">{course.semester} · {course.academicYear}</p>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex align-items-center justify-content-between mb-1 small text-secondary">
                      <span>Checklist Completion</span>
                      <span className="fw-bold font-mono-ppsu">{course.progress}/19 ({percent}%)</span>
                    </div>
                    <ProgressBar 
                      now={percent} 
                      className="progress-custom mb-3"
                      variant="warning"
                    />

                    <Link href={`/faculty/course-files/${course.id}`} className="btn btn-ppsu-outline-gold w-100 py-2 d-block text-center text-decoration-none">
                      Open Checklist
                    </Link>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
