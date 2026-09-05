'use client';

import { useEffect, useState, use } from 'react';
import { Spinner, Alert, Button, Table, Badge, Card } from 'react-bootstrap';
import Link from 'next/link';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO' },
  { index: 2,  name: 'Time Table of the Faculty' },
  { index: 3,  name: 'Course information sheet with course objectives, course pre-requisites, course outcomes, i.e. Syllabus' },
  { index: 4,  name: 'Student Name List' },
  { index: 5,  name: 'Department Academic Calendar' },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)' },
  { index: 7,  name: 'List of Laboratory (or Experiments)' },
  { index: 8,  name: 'Laboratory Rubrics' },
  { index: 9,  name: 'Theory Continuous Evaluation Rubrics' },
  { index: 10, name: 'Lab Manuals/Tutorials' },
  { index: 11, name: 'Internal Assessment 1' },
  { index: 12, name: 'Internal Assessment 2' },
  { index: 13, name: 'Guidelines / Documents related to Evaluation Criteria' },
  { index: 14, name: 'Attendance register (ERP)' },
  { index: 15, name: 'University exam' },
  { index: 16, name: 'CO Attainment output sheet' },
  { index: 17, name: 'PO Attainment output sheet' },
  { index: 18, name: 'Action to be taken for next year based on CO attainment' },
  { index: 19, name: 'Lecture notes (Out of 20 Marks)' },
  { index: 20, name: 'Course Faculty Signature' }
];

export default function MergedCourseFilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseFileId } = use(params);

  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/course-files/${courseFileId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load course file details');
        return res.json();
      })
      .then((data) => {
        setCourseFile(data.courseFile);
        setChecklist(data.checklistItems || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseFileId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center flex-column py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" className="mb-3" />
        <h6 className="fw-bold text-navy-900">Assembling Merged Course File Preview…</h6>
        <small className="text-muted">Parsing 20 checklist particulars and uploaded documents</small>
      </div>
    );
  }

  if (error || !courseFile) {
    return <Alert variant="danger" className="m-4">{error || 'Course file not found'}</Alert>;
  }

  const parseSubItems = (itemIndex: number) => {
    const item = checklist.find((c) => c.itemIndex === itemIndex);
    if (!item?.subItemsJson) return null;
    try {
      return JSON.parse(item.subItemsJson);
    } catch (e) {
      return null;
    }
  };

  const getItemByIdx = (index: number) => checklist.find((c) => c.itemIndex === index);

  return (
    <div style={{ background: '#525659', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Top Floating Control Bar (Hidden in Print) */}
      <div className="no-print sticky-top bg-dark text-white p-3 shadow border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ zIndex: 1050 }}>
        <div>
          <h6 className="fw-bold mb-0 text-white d-flex align-items-center gap-2">
            <span>📄 Merged Course File Preview</span>
            <span className="badge bg-gold text-dark font-mono-ppsu">PRE-SUBMISSION VERIFICATION</span>
          </h6>
          <small className="text-white-50">
            Course: <strong className="text-white">{courseFile.courseCode} — {courseFile.courseTitle}</strong> · Course Faculty: <strong className="text-white">{courseFile.facultyName || courseFile.faculty?.name}</strong>
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-light" size="sm" onClick={() => window.history.back()}>
            ← Back to Checklist
          </Button>
          <a
            href={`/api/course-files/${courseFileId}/merged-report`}
            download={`merged-course-file-${courseFile.courseCode}.docx`}
            className="btn btn-outline-success btn-sm font-mono-ppsu"
          >
            ⬇ Download DOCX
          </a>
          <Button variant="warning" size="sm" className="fw-bold px-3" onClick={() => window.print()}>
            🖨️ Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Main Print & View Document Container */}
      <div className="mx-auto my-4 bg-white shadow-lg rounded" style={{ maxWidth: '920px', minHeight: '1100px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
        
        {/* ==================== PAGE 1: COVER PAGE ==================== */}
        <div className="p-5 d-flex flex-column justify-content-between text-center page-break border-bottom" style={{ minHeight: '1050px', position: 'relative' }}>
          <div>
            <div className="d-flex justify-content-center mb-4">
              <img src="/PPSUNAACA+Logo.png" alt="P P Savani University Logo" style={{ height: '90px', objectFit: 'contain' }} />
            </div>

            <h1 className="fw-bold mb-1" style={{ fontSize: '32px', letterSpacing: '1px', color: '#1B2A6B' }}>
              P P SAVANI UNIVERSITY
            </h1>
            <h5 className="fw-semibold text-secondary mb-2" style={{ letterSpacing: '0.5px' }}>
              ({courseFile.school || courseFile.faculty?.school || 'School of Engineering'})
            </h5>
            <div className="d-inline-block border border-dark rounded px-3 py-1 mb-4 font-mono-ppsu small fw-bold">
              NAAC A+ GRADE ACCREDITED UNIVERSITY
            </div>

            <hr className="my-4 border-2 border-dark mx-auto" style={{ width: '80%' }} />

            <div className="my-5 py-3">
              <h5 className="fw-bold text-uppercase text-muted mb-2">Department of</h5>
              <h3 className="fw-bold text-navy-900 mb-4">{courseFile.department || courseFile.faculty?.department || 'COMPUTER ENGINEERING'}</h3>

              <div className="bg-light border border-dark rounded p-4 mx-auto text-start" style={{ maxWidth: '650px' }}>
                <div className="row g-3 fs-6">
                  <div className="col-12 border-bottom pb-2">
                    <strong className="text-secondary">Course Faculty:</strong>{' '}
                    <span className="fw-bold text-navy-900 fs-5 ms-2">{courseFile.facultyName || courseFile.faculty?.name}</span>
                  </div>
                  <div className="col-12 border-bottom pb-2">
                    <strong className="text-secondary">Subject:</strong>{' '}
                    <span className="fw-bold font-mono-ppsu text-primary ms-2">{courseFile.courseCode}</span> — <span className="fw-bold">{courseFile.courseTitle}</span>
                  </div>
                  <div className="col-6">
                    <strong className="text-secondary">Semester:</strong> <span className="fw-semibold ms-1">{courseFile.semester}</span>
                  </div>
                  <div className="col-6">
                    <strong className="text-secondary">Division:</strong> <span className="fw-semibold ms-1">{courseFile.division || courseFile.subject?.division || 'N/A'}</span>
                  </div>
                  <div className="col-12 pt-2 border-top">
                    <strong className="text-secondary">Academic Year:</strong> <span className="fw-semibold ms-1">{courseFile.academicYear || '2025-26'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="py-4">
            <h2 className="fw-bold text-uppercase" style={{ letterSpacing: '2px', color: '#1B2A6B' }}>
              (COURSE FILE)
            </h2>
            <div className="small text-muted font-mono-ppsu mt-2">
              Generated via PPSU Official Course Files Portal
            </div>
          </div>
        </div>

        {/* ==================== PAGE 2: TABLE OF CONTENTS ==================== */}
        <div className="p-5 page-break border-bottom" style={{ minHeight: '1050px' }}>
          <div className="text-center mb-4 pb-2 border-bottom border-2 border-dark">
            <h3 className="fw-bold text-navy-900 mb-1">TABLE OF CONTENTS</h3>
            <small className="text-muted font-mono-ppsu">Checklist Index of Particulars (Items 1 to 20)</small>
          </div>

          <Table bordered hover striped className="align-middle border-dark mb-0">
            <thead className="bg-light text-center border-dark">
              <tr>
                <th style={{ width: '12%', fontSize: '14px' }} className="fw-bold border-dark">Sr. No.</th>
                <th style={{ fontSize: '14px' }} className="text-start fw-bold border-dark">Particulars / Content Title</th>
                <th style={{ width: '22%', fontSize: '14px' }} className="text-center fw-bold border-dark">Status</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ITEMS.map((item) => {
                const dbItem = getItemByIdx(item.index);
                const isUploaded = dbItem?.status === 'UPLOADED' || dbItem?.status === 'APPROVED' || dbItem?.fileName || dbItem?.subItemsJson;
                return (
                  <tr key={item.index}>
                    <td className="text-center fw-bold font-mono-ppsu border-dark">{item.index}</td>
                    <td className="fw-semibold border-dark" style={{ fontSize: '13px' }}>{item.name}</td>
                    <td className="text-center border-dark">
                      {isUploaded ? (
                        <span className="badge bg-success px-2 py-1">✓ Uploaded</span>
                      ) : (
                        <span className="badge bg-warning text-dark px-2 py-1">⏳ Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {/* ==================== PAGES 3+: CHECKLIST ITEMS (1 to 20) ==================== */}
        {CHECKLIST_ITEMS.map((item) => {
          const dbItem = getItemByIdx(item.index);
          const subs = parseSubItems(item.index);
          const fileUrl = dbItem?.fileUrl;
          const fileName = dbItem?.fileName;

          return (
            <div key={item.index} className="page-break border-bottom">
              {/* Divider Page */}
              <div className="p-5 d-flex flex-column justify-content-center align-items-center text-center bg-light border-bottom" style={{ minHeight: '350px' }}>
                <Badge bg="primary" className="mb-3 px-3 py-2 fs-6 font-mono-ppsu">
                  ITEM #{item.index}
                </Badge>
                <h2 className="fw-bold text-navy-900 text-uppercase max-w-75 mb-2" style={{ letterSpacing: '0.5px' }}>
                  {item.name}
                </h2>
                {fileName && (
                  <div className="small text-muted font-mono-ppsu border bg-white rounded px-3 py-1.5 shadow-sm mt-2">
                    📁 Attached Document: <strong>{fileName}</strong>
                  </div>
                )}
              </div>

              {/* Item Content Section */}
              <div className="p-4" style={{ minHeight: '650px' }}>
                {/* 1. Item 1 Sub-uploads */}
                {item.index === 1 && (
                  <div>
                    {['vision', 'mission', 'peo', 'pso', 'po'].map((subKey) => {
                      const subData = subs?.[subKey];
                      return (
                        <Card key={subKey} className="mb-3 border">
                          <Card.Header className="bg-light fw-bold text-uppercase py-2 small">
                            {subKey.toUpperCase()} Upload
                          </Card.Header>
                          <Card.Body className="p-3">
                            {subData?.fileUrl ? (
                              subData.fileName?.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                                <img src={subData.fileUrl} alt={subKey} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
                              ) : (
                                <iframe src={subData.fileUrl} title={subKey} width="100%" height="450px" style={{ border: 'none' }} />
                              )
                            ) : (
                              <div className="text-muted small text-center py-3">No file uploaded for {subKey.toUpperCase()} yet.</div>
                            )}
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* 2. Item 4 Student List Table */}
                {item.index === 4 && (
                  <div>
                    {subs?.students?.length > 0 ? (
                      <Table bordered hover striped size="sm" className="align-middle text-center small">
                        <thead className="bg-light">
                          <tr>
                            <th>Sr No</th>
                            <th>Student Name</th>
                            <th>Enrolment Number</th>
                            <th>Batch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.students.map((st: any, idx: number) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="fw-semibold text-start">{st.name || st.studentName}</td>
                              <td className="font-mono-ppsu">{st.enrolmentNumber || st.rollNo}</td>
                              <td><span className="badge bg-secondary">{st.batch || 'A'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : fileUrl ? (
                      <iframe src={fileUrl} title="Student List" width="100%" height="600px" style={{ border: 'none' }} />
                    ) : (
                      <Alert variant="warning" className="text-center">Student Name List not uploaded yet.</Alert>
                    )}
                  </div>
                )}

                {/* 3. Items 8 & 9 Rubrics */}
                {(item.index === 8 || item.index === 9) && (
                  <div>
                    {subs?.students?.length > 0 ? (
                      <Table bordered hover striped size="sm" className="align-middle text-center small">
                        <thead className="bg-light">
                          <tr>
                            <th>Sr No</th>
                            <th>Enrolment No</th>
                            <th>Student Name</th>
                            <th>Marks / Evaluation Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.students.map((st: any, idx: number) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="font-mono-ppsu">{st.enrolmentNumber || st.rollNo || st.studentId}</td>
                              <td className="fw-semibold text-start">{st.name || st.studentName}</td>
                              <td className="font-mono-ppsu">{JSON.stringify(st.marks || st)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : fileUrl ? (
                      <iframe src={fileUrl} title={item.name} width="100%" height="600px" style={{ border: 'none' }} />
                    ) : (
                      <Alert variant="warning" className="text-center">Rubrics data not uploaded yet.</Alert>
                    )}
                  </div>
                )}

                {/* 4. Item 15 University Exam Grade Sheet */}
                {item.index === 15 && (
                  <div>
                    {subs?.students?.length > 0 ? (
                      <Table bordered hover striped size="sm" className="align-middle text-center small">
                        <thead className="bg-light">
                          <tr>
                            <th>Sr No</th>
                            <th>Enrolment No</th>
                            <th>Theory Grade</th>
                            <th>Practical Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.students.map((st: any, idx: number) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="font-mono-ppsu">{st.studentId || st.enrolmentNumber}</td>
                              <td className="fw-bold text-primary">{st.theoryGrade || '—'}</td>
                              <td className="fw-bold text-success">{st.practicalGrade || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : fileUrl ? (
                      <iframe src={fileUrl} title="University Exam" width="100%" height="600px" style={{ border: 'none' }} />
                    ) : (
                      <Alert variant="warning" className="text-center">University Exam data not uploaded yet.</Alert>
                    )}
                  </div>
                )}

                {/* 5. Item 20 Signature */}
                {item.index === 20 && (
                  <div className="text-center py-4 border rounded bg-light">
                    <h6 className="fw-bold text-navy-900 mb-3">Course Faculty Signature Scan</h6>
                    {fileUrl || courseFile.facultySignatureUrl ? (
                      <img
                        src={fileUrl || courseFile.facultySignatureUrl}
                        alt="Faculty Signature"
                        style={{ maxHeight: '180px', maxWidth: '350px', objectFit: 'contain' }}
                        className="border bg-white rounded p-2 shadow-sm"
                      />
                    ) : (
                      <div className="text-muted small">✍️ Verified Course Faculty Signature</div>
                    )}
                    <div className="small text-muted font-mono-ppsu mt-2">
                      Signed By: {courseFile.facultySignatureName || courseFile.facultyName || courseFile.faculty?.name}
                    </div>
                  </div>
                )}

                {/* Item 19: Lecture Notes Multi-document rendering */}
                {item.index === 19 && (() => {
                  let docs: any[] = [];
                  if (dbItem?.subItemsJson) {
                    try {
                      const parsed = JSON.parse(dbItem.subItemsJson);
                      if (Array.isArray(parsed.documents)) docs = parsed.documents;
                    } catch (e) {}
                  }
                  if (docs.length === 0 && fileUrl) {
                    docs = [{ id: 'doc-legacy', name: 'Lecture Notes', fileName, fileUrl }];
                  }

                  if (docs.length === 0) {
                    return (
                      <div className="p-5 text-center text-muted border rounded bg-light">
                        <div className="fs-1 mb-2">⏳</div>
                        <h6 className="fw-semibold mb-1">Document Not Uploaded Yet</h6>
                        <p className="small text-secondary mb-0">This checklist item has not been uploaded by the faculty yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="d-flex flex-column gap-4">
                      {docs.map((doc: any) => (
                        <div key={doc.id} className="border rounded p-3 bg-white">
                          <h6 className="fw-bold text-navy-900 mb-2">📄 {doc.name} ({doc.fileName})</h6>
                          {doc.fileUrl?.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                            <img src={doc.fileUrl} alt={doc.fileName} style={{ maxWidth: '100%', maxHeight: '650px', objectFit: 'contain' }} />
                          ) : (
                            <iframe src={doc.fileUrl} title={doc.name} width="100%" height="650px" style={{ border: 'none' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* General File Fallback for other items */}
                {![1, 4, 8, 9, 15, 19, 20].includes(item.index) && (
                  <div>
                    {fileUrl ? (
                      fileName?.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                        <div className="text-center p-3">
                          <img src={fileUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '650px', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <iframe src={fileUrl} title={item.name} width="100%" height="650px" style={{ border: 'none' }} />
                      )
                    ) : (
                      <div className="p-5 text-center text-muted border rounded bg-light">
                        <div className="fs-1 mb-2">⏳</div>
                        <h6 className="fw-semibold mb-1">Document Not Uploaded Yet</h6>
                        <p className="small text-secondary mb-0">This checklist item has not been uploaded by the faculty yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
