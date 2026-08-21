'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Badge, Spinner, Alert, Form, Modal, ProgressBar, Table } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const SHARED_ITEMS = [
  { index: 1,  name: 'Item 1 — Institute Vision, Mission & PEO, PSO & PO', category: 'Institutional', subKeys: ['vision', 'mission', 'peo', 'pso', 'po'] },
  { index: 3,  name: 'Item 3 — Course Information Sheet (Syllabus)', category: 'Curriculum' },
  { index: 5,  name: 'Item 5 — Department Academic Calendar', category: 'Calendar' },
  { index: 6,  name: 'Item 6 — Course Delivery Details (Lesson Plan)', category: 'Teaching' },
  { index: 7,  name: 'Item 7 — List of Laboratory Experiments', category: 'Practical' },
  { index: 10, name: 'Item 10 — Lab Manuals / Tutorials', category: 'Practical' },
  { index: 11, name: 'Item 11 — Internal Assessment 1 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 12, name: 'Item 12 — Internal Assessment 2 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 13, name: 'Item 13 — Assignment Topics', category: 'Assessment', subKeys: ['assignmentTopics'] }
];

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function CoordinatorSharedDocumentsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [uploadingItem, setUploadingItem] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coordinator/shared-documents');
      if (!res.ok) throw new Error('Failed to load coordinator subjects');
      const data = await res.json();
      const list = Array.isArray(data.subjects) ? data.subjects : [];
      setSubjects(list);
      if (list.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(list[0].id);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch shared documents data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
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
      fetchSubjects();
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
        uploadDate: new Date().toISOString().split('T')[0]
      };

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          itemIndex,
          status: 'UPLOADED',
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }
      setActionSuccess(`Sub-document '${subKey.toUpperCase()}' for Item #${itemIndex} updated.`);
      fetchSubjects();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleClearDoc = async (itemIndex: number) => {
    if (!selectedSubjectId) return;
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
      if (!res.ok) throw new Error('Failed to remove shared document');
      setActionSuccess(`Shared document for Item #${itemIndex} removed.`);
      fetchSubjects();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const calculateSubjectProgress = (sub: any) => {
    const docs = sub?.sharedDocuments || [];
    const uploadedCount = docs.filter((d: any) => d.status === 'UPLOADED').length;
    return Math.round((uploadedCount / SHARED_ITEMS.length) * 100);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* Welcome & Instruction Banner */}
      <div
        className="p-4 mb-4 rounded-3 text-white shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)',
          borderLeft: '6px solid #E8541E'
        }}
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="badge mb-2" style={{ backgroundColor: 'rgba(232, 84, 30, 0.3)', color: '#FFA07A', fontWeight: 600 }}>
              Course Coordinator Hub
            </span>
            <h3 className="fw-bold mb-1">Shared Subject Documents Upload</h3>
            <p className="mb-0 text-white-50 small" style={{ maxWidth: '780px' }}>
              Upload common subject-level documents ONCE (Syllabus, Academic Calendar, Lesson Plans, Experiments, Assessment Timetables & Question Papers).
              They will automatically populate as <strong>read-only/locked</strong> across every Course Teacher and Lab Teacher’s checklist for this subject.
            </p>
          </div>
        </div>
      </div>

      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      {subjects.length === 0 ? (
        <Alert variant="info" className="p-4 text-center">
          <h5>No Coordinator Assigned Subjects Found</h5>
          <p className="mb-0 small">You are not currently set as the Course Coordinator for any active subject in Subject Allocation.</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {/* Left Column: Subject Selector */}
          <Col xs={12} lg={4}>
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Header className="bg-white fw-bold py-3 border-bottom text-navy-900 d-flex justify-content-between align-items-center">
                <span>Select Subject</span>
                <Badge bg="secondary" pill>{subjects.length} Assigned</Badge>
              </Card.Header>
              <Card.Body className="p-2">
                <div className="d-flex flex-column gap-2">
                  {subjects.map((sub) => {
                    const isSelected = sub.id === selectedSubjectId;
                    const percent = calculateSubjectProgress(sub);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`btn text-start p-3 rounded-3 transition-all border-0 ${
                          isSelected ? 'bg-primary text-white shadow-sm' : 'bg-light text-dark hover-bg-gray'
                        }`}
                        style={{
                          backgroundColor: isSelected ? '#1E3A8A' : undefined,
                          color: isSelected ? '#ffffff' : '#1e293b'
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className={`fw-bold font-mono-ppsu ${isSelected ? 'text-warning' : 'text-primary'}`}>
                            {sub.subjectCode}
                          </span>
                          <span className="small fw-semibold" style={{ opacity: 0.9 }}>
                            {percent}% Shared
                          </span>
                        </div>
                        <div className="fw-semibold small text-truncate mb-1">{sub.subjectName}</div>
                        <div className="small opacity-75" style={{ fontSize: '0.75rem' }}>
                          {sub.division ? `${sub.division} · ` : ''}{sub.semester} · {sub.academicYear}
                        </div>
                        <ProgressBar
                          now={percent}
                          variant={isSelected ? 'warning' : 'primary'}
                          style={{ height: '4px' }}
                          className="mt-2"
                        />
                      </button>
                    );
                  })}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Shared Documents Items List */}
          <Col xs={12} lg={8}>
            {activeSubject && (
              <Card className="shadow-sm border-0 rounded-3">
                <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h5 className="fw-bold mb-0 text-navy-900">{activeSubject.subjectName}</h5>
                    <span className="text-secondary small font-mono-ppsu">
                      Code: {activeSubject.subjectCode} | Dept: {activeSubject.department} | {activeSubject.semester}
                    </span>
                  </div>
                  <Badge bg="success" className="px-3 py-2">
                    {sharedDocsList.filter((d) => d.status === 'UPLOADED').length} / {SHARED_ITEMS.length} Uploaded
                  </Badge>
                </Card.Header>

                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex flex-column gap-4">
                    {SHARED_ITEMS.map((item) => {
                      const doc = sharedMap.get(item.index);
                      const isUploaded = doc?.status === 'UPLOADED';
                      let subParsed: any = {};
                      try { if (doc?.subItemsJson) subParsed = JSON.parse(doc.subItemsJson); } catch (e) {}

                      return (
                        <Card key={item.index} className="border rounded-3 shadow-none hover-shadow-sm">
                          <Card.Header className="bg-light d-flex align-items-center justify-content-between py-2.5 px-3">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-navy-900 text-white font-mono-ppsu" style={{ backgroundColor: '#1E3A8A' }}>
                                Item #{item.index}
                              </span>
                              <span className="fw-bold text-navy-900" style={{ fontSize: '0.95rem' }}>
                                {item.name}
                              </span>
                            </div>
                            <div>
                              {isUploaded ? (
                                <Badge bg="success" className="px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                                  <span>✓ Uploaded by Coordinator</span>
                                </Badge>
                              ) : (
                                <Badge bg="warning" text="dark" className="px-2.5 py-1.5 fw-semibold">
                                  Pending Upload
                                </Badge>
                              )}
                            </div>
                          </Card.Header>

                          <Card.Body className="p-3">
                            {/* Render Sub-keys for Item 1, 11, 12, 13 */}
                            {item.subKeys ? (
                              <div className="d-flex flex-column gap-2">
                                {item.subKeys.map((subKey) => {
                                  const subDoc = subParsed[subKey];
                                  const hasSubFile = !!subDoc?.fileName;
                                  return (
                                    <div key={subKey} className="d-flex align-items-center justify-content-between p-2.5 bg-light rounded-2 border">
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold text-uppercase small text-secondary" style={{ width: '110px' }}>
                                          {subKey}
                                        </span>
                                        {hasSubFile ? (
                                          <span className="text-dark fw-semibold small font-mono-ppsu">
                                            📄 {subDoc.fileName}
                                          </span>
                                        ) : (
                                          <span className="text-muted small italic">Not uploaded yet</span>
                                        )}
                                      </div>

                                      <div className="d-flex align-items-center gap-2">
                                        {hasSubFile && (
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => setViewingDoc({
                                              title: `${item.name} — (${subKey.toUpperCase()})`,
                                              fileName: subDoc.fileName,
                                              fileUrl: subDoc.fileUrl || SAMPLE_PDF_DATA_URL
                                            })}
                                          >
                                            View
                                          </Button>
                                        )}
                                        <Form.Control
                                          type="file"
                                          size="sm"
                                          style={{ width: '210px' }}
                                          disabled={uploadingItem === item.index}
                                          onChange={(e: any) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadSubItem(item.index, subKey, file);
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Standard Single Document Upload */
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div>
                                  {isUploaded && doc.fileName ? (
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="fs-5">📄</span>
                                      <div>
                                        <div className="fw-bold text-dark small font-mono-ppsu">{doc.fileName}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Centrally locked for all teachers</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-secondary small">Select PDF or Document file to upload centrally for this subject.</span>
                                  )}
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  {isUploaded && (
                                    <>
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => setViewingDoc({
                                          title: item.name,
                                          fileName: doc.fileName || 'document.pdf',
                                          fileUrl: doc.fileUrl || SAMPLE_PDF_DATA_URL
                                        })}
                                      >
                                        View Document
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        disabled={uploadingItem === item.index}
                                        onClick={() => handleClearDoc(item.index)}
                                      >
                                        Remove
                                      </Button>
                                    </>
                                  )}

                                  <Form.Group controlId={`file-upload-${item.index}`}>
                                    <Form.Control
                                      type="file"
                                      size="sm"
                                      style={{ width: '230px' }}
                                      disabled={uploadingItem === item.index}
                                      onChange={(e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadSingle(item.index, file);
                                      }}
                                    />
                                  </Form.Group>
                                </div>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* Document View Modal */}
      <Modal show={!!viewingDoc} onHide={() => setViewingDoc(null)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h6 fw-bold text-navy-900 mb-0">
            {viewingDoc?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ height: '70vh' }}>
          {viewingDoc?.fileUrl ? (
            <iframe
              src={viewingDoc.fileUrl}
              title={viewingDoc.title}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
              No preview available for this document.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={() => setViewingDoc(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
