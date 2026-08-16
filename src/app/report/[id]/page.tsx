'use client';

import { useEffect, useState, use } from 'react';
import { Spinner, Alert, Button } from 'react-bootstrap';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO', maxScore: 10 },
  { index: 2,  name: 'Time Table of the Faculty', maxScore: 10 },
  { index: 3,  name: 'Course information sheet with course objectives, course pre-requisites, course outcomes, i.e. Syllabus', maxScore: 10 },
  { index: 4,  name: 'Student Name List', maxScore: 10 },
  { index: 5,  name: 'Department Academic Calendar', maxScore: 10 },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)', maxScore: 10 },
  { index: 7,  name: 'List of Laboratory (or Experiments)', maxScore: 10 },
  { index: 8,  name: 'Laboratory Rubrics', maxScore: 10 },
  { index: 9,  name: 'Continuous Evaluation sheet based on rubrics', maxScore: 10 },
  { index: 10, name: 'Lab Manuals/Tutorials', maxScore: 10 },
  { index: 11, name: 'Internal Assessment 1', maxScore: 10 },
  { index: 12, name: 'Internal Assessment 2', maxScore: 10 },
  { index: 13, name: 'Assignment topics, sample assignment, marks statements', maxScore: 10 },
  { index: 14, name: 'Attendance register (ERP)', maxScore: 10 },
  { index: 15, name: 'University exam', maxScore: 10 },
  { index: 16, name: 'CO Attainment output sheet', maxScore: 10 },
  { index: 17, name: 'PO Attainment output sheet', maxScore: 10 },
  { index: 18, name: 'Action to be taken for next year based on CO attainment', maxScore: 10 },
  { index: 19, name: 'Lecture notes (Out of 20 Marks)', maxScore: 20 },
  { index: 20, name: 'Course Faculty Signature', maxScore: 10 }
];

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseFileId } = use(params);

  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/course-files/${courseFileId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load course details');
        return res.json();
      })
      .then((data) => {
        setCourseFile(data.courseFile);
        setChecklist(data.checklistItems);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseFileId]);

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" variant="primary" />
    </div>
  );

  if (error || !courseFile) return <Alert variant="danger" className="m-4">{error || 'Course file not found'}</Alert>;

  const totalScore = courseFile.totalScore ?? checklist.reduce((sum, item) => sum + (item.score || 0), 0);
  const ratingLabel = courseFile.rating || (totalScore > 175 ? 'Excellent' : totalScore >= 151 ? 'Good' : totalScore >= 126 ? 'Moderate & Update' : totalScore >= 101 ? 'Fair & Revise' : 'Poor & Revise');

  const item20Sig = checklist.find((c) => c.itemIndex === 20);

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print d-flex justify-content-between align-items-center p-3 bg-dark text-white border-bottom">
        <div>
          <h6 className="mb-0 fw-bold">Official Paper Checklist Form Print Preview</h6>
          <small className="text-white-50">Course: {courseFile.courseCode} — {courseFile.courseTitle}</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => window.history.back()}>
            ← Back
          </Button>
          <Button variant="warning" size="sm" className="fw-bold" onClick={() => window.print()}>
            🖨️ Print Form / Save as PDF
          </Button>
        </div>
      </div>

      {/* Print Document Container */}
      <div className="print-container p-4 mx-auto" style={{ maxWidth: '900px' }}>
        {/* Form Header */}
        <div className="border border-dark mb-3 p-3">
          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-dark">
            <div className="d-flex align-items-center gap-3">
              <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: '55px', objectFit: 'contain' }} />
              <div>
                <h4 className="fw-bold m-0" style={{ letterSpacing: 0.5, fontSize: '20px' }}>P P SAVANI UNIVERSITY</h4>
                <div className="small fw-semibold">School of Engineering</div>
                <div style={{ fontSize: '10px' }} className="text-secondary">
                  NH No.: 8, Village: Dhamdod, Ta. Mangrol, Near Kosamba, Surat - 394 125. (GUJARAT).
                </div>
              </div>
            </div>
            <div className="text-end">
              <span className="badge border border-dark text-dark fw-bold px-2 py-1" style={{ fontSize: '11px' }}>
                NAAC A+ GRADE
              </span>
            </div>
          </div>

          {/* Section 0: Faculty & Course Details */}
          <h6 className="fw-bold text-uppercase mb-2" style={{ fontSize: '13px' }}>Faculty & Course Details</h6>
          <table className="table table-bordered border-dark text-center align-middle mb-0" style={{ fontSize: '12px' }}>
            <tbody>
              <tr>
                <td className="bg-light fw-bold text-start" style={{ width: '20%' }}>Faculty Name:</td>
                <td className="text-start" style={{ width: '30%' }}>{courseFile.facultyName || courseFile.faculty?.name || 'N/A'}</td>
                <td className="bg-light fw-bold text-start" style={{ width: '20%' }}>Department:</td>
                <td className="text-start" style={{ width: '30%' }}>{courseFile.department || courseFile.faculty?.department || 'N/A'}</td>
              </tr>
              <tr>
                <td className="bg-light fw-bold text-start">School:</td>
                <td className="text-start">{courseFile.school || courseFile.faculty?.school || 'School of Engineering'}</td>
                <td className="bg-light fw-bold text-start">Semester:</td>
                <td className="text-start">{courseFile.semester || 'N/A'}</td>
              </tr>
              <tr>
                <td className="bg-light fw-bold text-start">Course Code:</td>
                <td className="text-start font-mono-ppsu fw-bold">{courseFile.courseCode}</td>
                <td className="bg-light fw-bold text-start">Course Title:</td>
                <td className="text-start fw-bold">{courseFile.courseTitle}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 1-3: 20 Particulars Checklist Table */}
        <h6 className="fw-bold text-uppercase mb-2" style={{ fontSize: '13px' }}>Course File Details & Evaluation Checklist</h6>
        <table className="table table-bordered border-dark align-middle mb-2" style={{ fontSize: '12px' }}>
          <thead className="bg-light text-center">
            <tr>
              <th style={{ width: '6%' }}>Sr. No.</th>
              <th>Particulars</th>
              <th style={{ width: '15%' }}>Marks out of 10</th>
              <th style={{ width: '35%' }}>Remarks/Suggestions</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map((item) => {
              const dbItem = checklist.find((c) => c.itemIndex === item.index) || {};

              return (
                <tr key={item.index}>
                  <td className="text-center fw-bold">{item.index}.</td>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                  </td>
                  <td className="text-center fw-bold font-mono-ppsu">
                    {dbItem.score !== undefined ? dbItem.score : (item.index === 20 ? 10 : '-')}
                  </td>
                  <td>{dbItem.remarks || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Section 5: ERP Note */}
        <p className="fw-bold small text-center mb-3">
          **Note: All related relevant documents to be attached should be fetched from ERP.
        </p>

        {/* Section 4 & 11 & 12: Verification Details */}
        <h6 className="fw-bold text-uppercase mb-2" style={{ fontSize: '13px' }}>Verification Details</h6>
        <table className="table table-bordered border-dark align-middle mb-4" style={{ fontSize: '12px' }}>
          <tbody>
            <tr>
              <td className="bg-light fw-bold" style={{ width: '30%' }}>Course Faculty Signature:</td>
              <td style={{ width: '70%' }}>
                {item20Sig?.fileName || courseFile.facultySignatureUrl || courseFile.facultySignatureName ? (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-primary font-mono-ppsu">
                      ✍️ {item20Sig?.fileName || courseFile.facultySignatureName || 'faculty_signature_scan.png'}
                    </span>
                    <span className="small text-muted">
                      {courseFile.facultySignedAt ? new Date(courseFile.facultySignedAt).toLocaleString('en-IN') : 'Verified'}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted italic">Pending Signature</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="bg-light fw-bold">Reviewer Signature:</td>
              <td>
                {courseFile.reviewerSignatureUrl || courseFile.reviewerSignatureName ? (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-success font-mono-ppsu">
                      ✍️ {courseFile.reviewerSignatureName || 'reviewer_sig.png'}
                    </span>
                    <span className="small text-muted">
                      {courseFile.reviewerSignedAt ? new Date(courseFile.reviewerSignedAt).toLocaleString('en-IN') : 'Verified'}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted italic">Pending Reviewer Sign-off</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="bg-light fw-bold">Grade/Marks (out of 200):</td>
              <td className="fw-bold font-mono-ppsu fs-6">{totalScore} / 200</td>
            </tr>
            <tr>
              <td className="bg-light fw-bold">Quality of Course File:</td>
              <td>
                <span className="fw-bold badge border border-dark text-dark fs-6">
                  {ratingLabel}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 4: Guidelines Table */}
        <h6 className="fw-bold text-uppercase mb-2" style={{ fontSize: '13px' }}>Guidelines for Quality of Course File</h6>
        <table className="table table-bordered border-dark text-center align-middle mb-4" style={{ fontSize: '11px' }}>
          <thead className="bg-light fw-bold">
            <tr>
              <th>Marks Range</th>
              <th>Quality of Course File</th>
              <th>Marks Range</th>
              <th>Quality of Course File</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Up to 100</td>
              <td>Poor & Revise</td>
              <td>101–125</td>
              <td>Fair & Revise</td>
            </tr>
            <tr>
              <td>126–150</td>
              <td>Moderate & Update</td>
              <td>151–175</td>
              <td>Good</td>
            </tr>
            <tr>
              <td colSpan={2}>&gt;175</td>
              <td colSpan={2} className="fw-bold text-success">Excellent</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CSS Styles for Print */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
