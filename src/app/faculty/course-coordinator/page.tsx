'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Badge, Spinner, Alert, Form, Modal, Table, Nav, Tab } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const SHARED_ITEMS = [
  { index: 1,  name: 'Item 1 — Institute Vision, Mission & PEO, PSO & PO', category: 'Institutional', subKeys: ['vision', 'mission', 'peo', 'pso', 'po'] },
  { index: 3,  name: 'Item 3 — Course Information Sheet (Syllabus)', category: 'Curriculum' },
  { index: 6,  name: 'Item 6 — Course Delivery Details (Lesson Plan)', category: 'Teaching' },
  { index: 7,  name: 'Item 7 — List of Laboratory Experiments', category: 'Practical' },
  { index: 10, name: 'Item 10 — Lab Manuals / Tutorials', category: 'Practical' },
  { index: 11, name: 'Item 11 — Internal Assessment 1 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 12, name: 'Item 12 — Internal Assessment 2 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 15, name: 'Item 15 — University Exam (Question Paper)', category: 'Assessment', subKeys: ['questionPaper'] }
];

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function statusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED':        return 'bg-success text-white';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':   return 'bg-info text-dark';
    case 'NEEDS_REVISION': return 'bg-warning text-dark';
    case 'DRAFT':          return 'bg-secondary text-white';
    default:               return 'bg-light text-dark border';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'APPROVED':        return 'Approved';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':   return 'Under Review';
    case 'NEEDS_REVISION': return 'Needs Revision';
    case 'DRAFT':          return 'Draft';
    default:               return 'Not Submitted';
  }
}

export default function FacultyCourseCoordinatorPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [facultyUnderMe, setFacultyUnderMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [uploadingItem, setUploadingItem] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'shared' | 'faculty'>('shared');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch subjects this user coordinates
      const subjRes = await fetch('/api/coordinator/shared-documents');
      if (!subjRes.ok) throw new Error('Failed to load coordinator subjects');
      const subjData = await subjRes.json();
      const list = Array.isArray(subjData.subjects) ? subjData.subjects : [];
      setSubjects(list);
      if (list.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(list[0].id);
      }

      // 2. Fetch assigned faculty under this coordinator
      const facRes = await fetch('/api/coordinator/faculty');
      if (facRes.ok) {
        const facData = await facRes.json();
        setFacultyUnderMe(Array.isArray(facData.faculty) ? facData.faculty : []);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch coordinator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const sharedDocsList: any[] = activeSubject?.sharedDocuments || [];
  const sharedMap = new Map(sharedDocsList.map((d: any) => [d.itemIndex, d]));

  const handleUploadSingle = async (itemIndex: number, file: File) => {
    if (!selectedSubjectId || !file) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: 'UPLOADED',
          fileName: file.name,
          fileUrl: dataUrl
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }
      setActionSuccess(`Shared document for Item #${itemIndex} uploaded and locked for all faculty.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleUploadSubItem = async (itemIndex: number, subKey: string, file: File) => {
    if (!selectedSubjectId || !file) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const existingDoc = sharedMap.get(itemIndex);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      existingSubJson[subKey] = {
        fileName: file.name,
        fileUrl: dataUrl,
        uploadedAt: new Date().toISOString()
      };

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: 'UPLOADED',
          fileName: existingDoc?.fileName || file.name,
          fileUrl: existingDoc?.fileUrl || dataUrl,
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }
      setActionSuccess(`Shared document sub-item (${subKey}) uploaded successfully.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemoveSingle = async (itemIndex: number) => {
    if (!selectedSubjectId) return;
    if (!confirm('Are you sure you want to remove this shared document? It will revert to pending for all faculty.')) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: 'EMPTY',
          fileName: null,
          fileUrl: null,
          subItemsJson: null
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Removal failed');
      }
      setActionSuccess(`Shared document for Item #${itemIndex} removed.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemoveSubItem = async (itemIndex: number, subKey: string) => {
    if (!selectedSubjectId) return;
    if (!confirm(`Are you sure you want to remove sub-item (${subKey})?`)) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const existingDoc = sharedMap.get(itemIndex);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      delete existingSubJson[subKey];
      const hasRemaining = Object.keys(existingSubJson).length > 0;

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: hasRemaining ? 'UPLOADED' : 'EMPTY',
          fileName: hasRemaining ? existingDoc?.fileName : null,
          fileUrl: hasRemaining ? existingDoc?.fileUrl : null,
          subItemsJson: hasRemaining ? JSON.stringify(existingSubJson) : null
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Removal failed');
      }
      setActionSuccess(`Sub-item (${subKey}) removed.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleSchoolChange = async (itemIndex: number, school: string) => {
    if (!selectedSubjectId) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const existingDoc = sharedMap.get(itemIndex);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}
      existingSubJson.school = school;

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: existingDoc?.status || 'EMPTY',
          fileName: existingDoc?.fileName || null,
          fileUrl: existingDoc?.fileUrl || null,
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'School update failed');
      }
      setActionSuccess(`School updated to ${school} for Item #1.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading Course Coordinator Dashboard...</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="container py-4">
        <Card className="shadow-sm border-0 text-center p-5">
          <div className="mb-3">
            <span style={{ fontSize: 48 }}>🔒</span>
          </div>
          <h4 className="fw-bold text-navy-900 mb-2">Access Restricted</h4>
          <p className="text-muted mx-auto" style={{ maxWidth: 500 }}>
            You are not currently assigned as a Course Coordinator for any subject. Contact your Admin if you believe this is incorrect.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header Banner */}
      <div className="card-custom mb-4 p-4" style={{ background: 'linear-gradient(135deg, var(--ppsu-navy-900, #1E293B) 0%, #0F172A 100%)', color: '#fff' }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div className="badge bg-warning text-dark px-3 py-1 mb-2 fw-semibold" style={{ fontSize: 11, letterSpacing: 0.5 }}>
              COURSE COORDINATOR DASHBOARD
            </div>
            <h3 className="fw-bold mb-1 text-white">Subject Coordinator Hub</h3>
            <p className="text-white-50 mb-0 small">
              Upload central subject documents ONCE to lock them across all Course &amp; Lab Teachers, and monitor faculty progress.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant={activeTab === 'shared' ? 'primary' : 'outline-light'}
              size="sm"
              onClick={() => setActiveTab('shared')}
              className="fw-bold px-3"
            >
              📄 Shared Documents
            </Button>
            <Button
              variant={activeTab === 'faculty' ? 'primary' : 'outline-light'}
              size="sm"
              onClick={() => setActiveTab('faculty')}
              className="fw-bold px-3"
            >
              👥 Faculty Under Me ({facultyUnderMe.length})
            </Button>
          </div>
        </div>
      </div>

      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      {/* Subject Selection Bar */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3 bg-light rounded">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-dark small text-uppercase" style={{ letterSpacing: 0.5 }}>Select Subject:</span>
            <Form.Select
              size="sm"
              style={{ width: 320, fontWeight: 600 }}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectCode} — {s.subjectName} ({s.semester} | Div {s.division || 'All'})
                </option>
              ))}
            </Form.Select>
          </div>
          {activeSubject && (
            <div className="d-flex gap-3 small text-secondary">
              <span>Department: <strong>{activeSubject.department}</strong></span>
              <span>Academic Year: <strong>{activeSubject.academicYear}</strong></span>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* TAB 1: Shared Documents */}
      {activeTab === 'shared' && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-navy-900 mb-0">Central Shared Documents</h5>
              <small className="text-muted">Uploaded files appear read-only / locked in every faculty member's checklist for this subject.</small>
            </div>
            <Badge bg="info" className="px-3 py-2 text-dark">
              {sharedDocsList.filter((d: any) => d.status === 'UPLOADED').length} / {SHARED_ITEMS.length} Uploaded
            </Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0 align-middle">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th style={{ width: 80 }} className="ps-4">Item #</th>
                  <th>Document Name &amp; Description</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th style={{ width: 180 }}>Status</th>
                  <th style={{ width: 220 }} className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {SHARED_ITEMS.map((item) => {
                  const doc = sharedMap.get(item.index);
                  const isUploaded = doc && doc.status === 'UPLOADED';
                  const isUploading = uploadingItem === item.index;

                  let parsedSubs: any = {};
                  if (doc?.subItemsJson) {
                    try { parsedSubs = JSON.parse(doc.subItemsJson); } catch (e) {}
                  }

                  return (
                    <tr key={item.index} className={isUploaded ? 'table-success-subtle' : ''}>
                      <td className="ps-4 fw-bold font-mono-ppsu">#{item.index}</td>
                      <td>
                        <div className="fw-semibold text-dark">{item.name}</div>
                        {doc?.fileName && (
                          <div className="small text-success font-mono-ppsu mt-0.5">
                            ✓ {doc.fileName}
                          </div>
                        )}
                        {item.index === 1 && (
                          <div className="mt-2 p-2 bg-white rounded border d-flex align-items-center gap-3">
                            <span className="fw-bold small text-navy-900">Select School / Institute:</span>
                            <Form.Select
                              size="sm"
                              style={{ maxWidth: 260, fontSize: 12, fontWeight: 600 }}
                              value={parsedSubs.school || 'SOE'}
                              onChange={(e) => handleSchoolChange(item.index, e.target.value)}
                            >
                              <option value="SOE">SOE (School of Engineering)</option>
                              <option value="IDS">IDS</option>
                              <option value="ICA">ICA</option>
                            </Form.Select>
                            <Badge bg="primary" style={{ fontSize: 10 }}>
                              {parsedSubs.school || 'SOE'}
                            </Badge>
                          </div>
                        )}

                        {/* Render Sub-keys list if multi-part item */}
                        {item.subKeys && (
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {item.subKeys.map((sk) => {
                              const skData = parsedSubs[sk];
                              return (
                                <div key={sk} className="p-2 border rounded bg-white small d-flex align-items-center gap-2">
                                  <span className="fw-bold text-uppercase" style={{ fontSize: 11 }}>({sk}):</span>
                                  {skData?.fileName ? (
                                    <>
                                      <span className="text-success text-truncate font-mono-ppsu" style={{ maxWidth: 140, fontSize: 11 }}>
                                        ✓ {skData.fileName}
                                      </span>
                                      <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: `${item.name} — (${sk})`, fileName: skData.fileName, fileUrl: skData.fileUrl })}>
                                        View
                                      </Button>
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => handleRemoveSubItem(item.index, sk)}>
                                        ×
                                      </Button>
                                    </>
                                  ) : (
                                    <label className="btn btn-outline-primary btn-sm py-0 px-2 m-0" style={{ fontSize: 10 }}>
                                      Upload
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadSubItem(item.index, sk, f); }} />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg="secondary" className="fw-normal">{item.category}</Badge>
                      </td>
                      <td>
                        {isUploaded ? (
                          <Badge bg="success" className="px-2.5 py-1">
                            ✓ Uploaded &amp; Locked
                          </Badge>
                        ) : (
                          <Badge bg="warning" text="dark" className="px-2.5 py-1">
                            ⏳ Pending Upload
                          </Badge>
                        )}
                      </td>
                      <td className="pe-4 text-end">
                        {isUploading ? (
                          <Spinner animation="border" size="sm" variant="primary" />
                        ) : (
                          <div className="d-flex justify-content-end gap-2">
                            {doc?.fileUrl && (
                              <Button
                                size="sm"
                                variant="outline-info"
                                style={{ fontSize: 12 }}
                                onClick={() => setViewingDoc({ title: item.name, fileName: doc.fileName || 'document.pdf', fileUrl: doc.fileUrl })}
                              >
                                👁️ View
                              </Button>
                            )}

                            {!item.subKeys && (
                              <>
                                <label className="btn btn-sm btn-outline-primary m-0" style={{ fontSize: 12, cursor: 'pointer' }}>
                                  {isUploaded ? 'Replace' : 'Upload'}
                                  <input
                                    type="file"
                                    className="d-none"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadSingle(item.index, file);
                                    }}
                                  />
                                </label>
                                {isUploaded && (
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    style={{ fontSize: 12 }}
                                    onClick={() => handleRemoveSingle(item.index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* TAB 2: Faculty Under Me */}
      {activeTab === 'faculty' && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-navy-900 mb-0">Assigned Faculty Members</h5>
              <small className="text-muted">Teachers and Lab Instructors assigned to subject(s) you coordinate.</small>
            </div>
            <Badge bg="primary" className="px-3 py-2">
              {facultyUnderMe.length} Faculty Members
            </Badge>
          </Card.Header>
          <Card.Body className="p-0">
            {facultyUnderMe.length === 0 ? (
              <div className="p-5 text-center text-muted">
                No faculty members found for this subject.
              </div>
            ) : (
              <Table hover responsive className="mb-0 align-middle">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Faculty Name</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Role on Subject</th>
                    <th>Subject</th>
                    <th className="pe-4 text-end">Course File Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyUnderMe.map((fac) => {
                    const assignments = fac.assignments || [];
                    return assignments.map((asgn: any, aIdx: number) => (
                      <tr key={`${fac.id}-${asgn.subjectId}-${aIdx}`}>
                        {aIdx === 0 && (
                          <td rowSpan={assignments.length} className="ps-4 fw-bold text-dark">
                            <div>{fac.name}</div>
                            <small className="text-muted fw-normal">{fac.designation || 'Faculty'}</small>
                          </td>
                        )}
                        {aIdx === 0 && (
                          <td rowSpan={assignments.length} className="font-mono-ppsu text-secondary">
                            {fac.employeeId || '—'}
                          </td>
                        )}
                        {aIdx === 0 && (
                          <td rowSpan={assignments.length} className="text-secondary">
                            {fac.department || '—'}
                          </td>
                        )}
                        <td>
                          <Badge bg="light" text="dark" className="border fw-semibold">
                            {asgn.roleOnSubject}
                          </Badge>
                        </td>
                        <td>
                          <span className="fw-bold font-mono-ppsu">{asgn.subjectCode}</span>
                          <div className="small text-muted">{asgn.subjectName}</div>
                        </td>
                        <td className="pe-4 text-end">
                          <span className={`badge px-3 py-1.5 rounded-pill ${statusBadgeClass(asgn.courseFileStatus)}`}>
                            {statusLabel(asgn.courseFileStatus)}
                          </span>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Document Viewing Modal */}
      {viewingDoc && (
        <Modal show onHide={() => setViewingDoc(null)} size="lg" centered>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="h6 fw-bold mb-0">{viewingDoc.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <iframe
              src={viewingDoc.fileUrl || SAMPLE_PDF_DATA_URL}
              title={viewingDoc.title}
              width="100%"
              height="500px"
              style={{ border: 'none' }}
            />
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" size="sm" onClick={() => setViewingDoc(null)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
