'use client';

import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import CourseTable from '../CourseTable';

export default function CoordinatorCompletedReviews() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/course-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.courseFiles) {
          const filtered = data.courseFiles.filter((cf: any) =>
            ['APPROVED', 'NEEDS_REVISION'].includes(cf.status)
          );
          setCourses(filtered);
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
        <h4 className="fw-bold text-navy-900">Completed Reviews</h4>
        <p className="text-secondary small">History of all successfully evaluated and approved course files.</p>
      </div>

      <CourseTable 
        courseFiles={courses} 
        emptyMessage="Nothing here yet — Course files matching this view will appear here"
      />
    </div>
  );
}
