'use client';

import { useRouter } from 'next/navigation';
import SearchPanel from '../SearchPanel';

export default function CoordinatorFacultyReview() {
  const router = useRouter();

  const handleSearch = (courseFileId: string) => {
    router.push(`/coordinator/review/${courseFileId}`);
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">Faculty Review & Scoring</h4>
        <p className="text-secondary small">Filter by School, Faculty Member, or Employee ID to open a course file evaluation checklist.</p>
      </div>

      <SearchPanel onSearch={handleSearch} buttonText="Open Evaluation" />
    </div>
  );
}
