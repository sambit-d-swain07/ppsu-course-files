'use client';

import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import CourseTable from '../CourseTable';

export default function CoordinatorCourseFiles() {
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

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">All Faculty Course Files</h4>
        <p className="text-secondary small">Comprehensive directory of all course file checklists uploaded by faculty members across the university.</p>
      </div>

      <CourseTable courseFiles={courses} />
    </div>
  );
}
