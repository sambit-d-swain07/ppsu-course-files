'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, Alert, Spinner, Modal } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/mock-data';

interface CommonFile {
  fileName: string;
  fileUrl: string;
}

interface SemesterFileOverride {
  fileName: string;
  fileUrl: string;
  isOverride: boolean;
}

const SCHOOL_OPTIONS = [
  { value: 'SOE', label: 'SOE (School of Engineering)' },
  { value: 'IDS', label: 'IDS' },
  { value: 'ICA', label: 'ICA' }
];

const TERM_TYPES = [
  { id: 'Odd Semester', label: 'Odd Semester', sems: ['SEM 1', 'SEM 3', 'SEM 5', 'SEM 7'], desc: 'Semesters 1, 3, 5, 7' },
  { id: 'Even Semester', label: 'Even Semester', sems: ['SEM 2', 'SEM 4', 'SEM 6', 'SEM 8'], desc: 'Semesters 2, 4, 6, 8' },
  { id: 'Yearly', label: 'Yearly', sems: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4', 'SEM 5', 'SEM 6', 'SEM 7', 'SEM 8'], desc: 'All Semesters (1 to 8)' }
];

export default function AdminAcademicCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Wizard Form State
  const [selectedSchool, setSelectedSchool] = useState<string>('SOE');
  const [selectedTermType, setSelectedTermType] = useState<string>('Odd Semester');
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [commonFile, setCommonFile] = useState<CommonFile | null>(null);

  // Per semester state: { 'SEM 1': { checked: boolean, overrideFile: CommonFile | null } }
  const [semesterChecks, setSemesterChecks] = useState<Record<string, boolean>>({});
  const [semesterOverrides, setSemesterOverrides] = useState<Record<string, CommonFile | null>>({});

  // Published Calendars from Backend
  const [publishedDocs, setPublishedDocs] = useState<any[]>([]);

  // Modal Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl: string } | null>(null);

  // Load published data on mount
  const fetchPublishedCalendars = async () => {
    try {
      const res = await fetch('/api/admin/academic-calendar');
      const data = await res.json();
      if (res.ok) {
        setPublishedDocs(data.publishedCalendars || []);
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedCalendars();
  }, []);

  // Update semester checks when Term Type or Apply to All changes
  useEffect(() => {
    const termObj = TERM_TYPES.find((t) => t.id === selectedTermType);
    if (termObj) {
      const initialChecks: Record<string, boolean> = {};
      termObj.sems.forEach((sem) => {
        initialChecks[sem] = applyToAll ? true : (semesterChecks[sem] ?? true);
      });
      setSemesterChecks(initialChecks);
    }
  }, [selectedTermType, applyToAll]);

  const activeTermObj = TERM_TYPES.find((t) => t.id === selectedTermType) || TERM_TYPES[0];

  const handleCommonFileUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = (reader.result as string) || SAMPLE_PDF_DATA_URL;
        setCommonFile({ fileName: file.name, fileUrl });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setActionError('File read failed: ' + err.message);
    }
  };

  const handleSemesterOverrideUpload = async (sem: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = (reader.result as string) || SAMPLE_PDF_DATA_URL;
        setSemesterOverrides((prev) => ({
          ...prev,
          [sem]: { fileName: file.name, fileUrl }
        }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setActionError('File read failed: ' + err.message);
    }
  };

  const handleSemesterCheckboxChange = (sem: string, checked: boolean) => {
    setSemesterChecks((prev) => ({ ...prev, [sem]: checked }));
    if (checked) {
      // If checked back on, clear override
      setSemesterOverrides((prev) => ({ ...prev, [sem]: null }));
    }
  };

  const validateForm = () => {
    if (!selectedSchool) return 'Please select a School.';
    if (!selectedTermType) return 'Please select a Term Type.';

    // Check if at least one file is available for checked/unchecked semesters
    let missing = false;
    activeTermObj.sems.forEach((sem) => {
      const isChecked = semesterChecks[sem];
      if (isChecked && !commonFile) missing = true;
      if (!isChecked && !semesterOverrides[sem]) missing = true;
    });

    if (missing) {
      return 'Please upload a Common File for checked semesters or individual override files for unticked semesters.';
    }
    return null;
  };

  const handlePublishClick = () => {
    setActionError('');
    const err = validateForm();
    if (err) {
      setActionError(err);
      return;
    }
    setShowConfirmModal(true);
  };

  const executePublish = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setActionError('');
    setActionSuccess('');

    try {
      const semesterFilesMap: Record<string, any> = {};
      activeTermObj.sems.forEach((sem) => {
        const isChecked = semesterChecks[sem];
        if (!isChecked && semesterOverrides[sem]) {
          semesterFilesMap[sem] = {
            fileName: semesterOverrides[sem]!.fileName,
            fileUrl: semesterOverrides[sem]!.fileUrl,
            isOverride: true
          };
        } else if (commonFile) {
          semesterFilesMap[sem] = {
            fileName: commonFile.fileName,
            fileUrl: commonFile.fileUrl,
            isOverride: false
          };
        }
      });

      const res = await fetch('/api/admin/academic-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: selectedSchool,
          termType: selectedTermType,
          commonFile: commonFile || null,
          applyToAll,
          semesterFiles: semesterFilesMap
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish academic calendar');

      setActionSuccess(`Academic Calendar published successfully for ${selectedSchool} (${selectedTermType})!`);
      fetchPublishedCalendars();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCalendar = async (school: string) => {
    if (!confirm(`Are you sure you want to clear the published Academic Calendar for ${school}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/academic-calendar?school=${school}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear calendar');
      setActionSuccess(`Academic Calendar cleared for ${school}.`);
      fetchPublishedCalendars();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPublished = (pubDoc: any) => {
    try {
      setSelectedSchool(pubDoc.school);
      let parsed: any = {};
      if (pubDoc.subItemsJson) parsed = JSON.parse(pubDoc.subItemsJson);

      const terms = parsed.terms || {};
      const termKeys = Object.keys(terms);
      if (termKeys.length > 0) {
        const firstTerm = terms[termKeys[0]];
        setSelectedTermType(firstTerm.termType || 'Odd Semester');
        setApplyToAll(firstTerm.applyToAll ?? true);
        if (firstTerm.commonFile) setCommonFile(firstTerm.commonFile);
      } else if (pubDoc.fileName) {
        setCommonFile({ fileName: pubDoc.fileName, fileUrl: pubDoc.fileUrl });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {}
  };

  return (
    <div className="container-fluid py-3">
      {/* Header Banner */}
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
              Centralized Admin Control
            </span>
            <h3 className="fw-bold mb-1">Department Academic Calendar Upload</h3>
            <p className="mb-0 text-white-50 small" style={{ maxWidth: '820px' }}>
              Publish institutional academic calendars ONCE by Admin per School & Semester scope. Published calendars automatically reflect as <strong>read-only/locked</strong> (Item 5) across all relevant Course Coordinators and Course Teachers.
            </p>
          </div>
        </div>
      </div>

      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      {/* Published Summary Cards */}
      <Row className="g-3 mb-4">
        {SCHOOL_OPTIONS.map((sch) => {
          const pub = publishedDocs.find((p) => p.school === sch.value);
          let parsed: any = {};
          if (pub?.subItemsJson) {
            try { parsed = JSON.parse(pub.subItemsJson); } catch (e) {}
          }
          const activeSemsCount = Object.keys(parsed.semesters || {}).length;
          return (
            <Col key={sch.value} md={4}>
              <Card className={`border-0 shadow-sm rounded-3 h-100 ${pub ? 'border-start border-4 border-success' : 'border-start border-4 border-secondary'}`}>
                <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-secondary small fw-bold text-uppercase">{sch.label}</span>
                    <h6 className="fw-bold text-navy-900 mb-0 mt-1">
                      {pub ? (
                        <span className="text-success">✓ {activeSemsCount} Semesters Published</span>
                      ) : (
                        <span className="text-muted">⏳ Not Published Yet</span>
                      )}
                    </h6>
                    {pub?.fileName && (
                      <div className="small font-mono-ppsu text-muted mt-1 text-truncate" style={{ maxWidth: 180 }}>
                        📄 {pub.fileName}
                      </div>
                    )}
                  </div>
                  {pub && (
                    <Button size="sm" variant="outline-primary" style={{ fontSize: 11 }} onClick={() => handleEditPublished(pub)}>
                      Edit / Replace
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* STEP-BY-STEP UPLOAD WIZARD */}
      <Card className="shadow-sm border-0 rounded-3 mb-4">
        <Card.Header className="bg-white fw-bold py-3 border-bottom text-navy-900 d-flex justify-content-between align-items-center">
          <span>Publish Academic Calendar (Step-by-Step Flow)</span>
          <Badge bg="primary">Admin Scope</Badge>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-4">
            {/* STEP 1: Select School */}
            <Col md={6}>
              <div className="p-3 bg-light rounded-3 border h-100">
                <label className="fw-bold text-navy-900 mb-1 d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  Select School *
                </label>
                <p className="text-muted small mb-2">Choose the institutional school scope for this calendar.</p>
                <Form.Select
                  required
                  size="sm"
                  className="fw-semibold"
                  style={{ fontSize: 13 }}
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                >
                  {SCHOOL_OPTIONS.map((sch) => (
                    <option key={sch.value} value={sch.value}>
                      {sch.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </Col>

            {/* STEP 2: Select Term Type */}
            <Col md={6}>
              <div className="p-3 bg-light rounded-3 border h-100">
                <label className="fw-bold text-navy-900 mb-1 d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  Select Term Type *
                </label>
                <p className="text-muted small mb-2">Determines which semesters are included in this upload batch.</p>
                <div className="d-flex flex-column gap-1">
                  {TERM_TYPES.map((term) => (
                    <Form.Check
                      key={term.id}
                      type="radio"
                      id={`term-${term.id}`}
                      name="termTypeGroup"
                      label={<span className="fw-semibold small">{term.label} <span className="text-muted font-normal">({term.desc})</span></span>}
                      checked={selectedTermType === term.id}
                      onChange={() => setSelectedTermType(term.id)}
                    />
                  ))}
                </div>
              </div>
            </Col>

            {/* STEP 3: Common File Upload + Apply to All Option */}
            <Col md={12}>
              <div className="p-3 bg-white border rounded-3 shadow-sm">
                <label className="fw-bold text-navy-900 mb-1 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                    <span>Common Academic Calendar File Upload</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id="apply-to-all-switch"
                    label={<span className="fw-semibold text-primary small">Apply to All ({activeTermObj.sems.length} Semesters)</span>}
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                  />
                </label>
                <p className="text-muted small mb-3">
                  Upload the primary academic calendar document. When <strong>"Apply to All"</strong> is enabled, all semesters for {selectedTermType} will automatically inherit this file unless manually overridden.
                </p>
                <div className="d-flex align-items-center gap-3">
                  <label className="btn btn-outline-primary btn-sm px-3 py-1.5" style={{ cursor: 'pointer', fontSize: 12 }}>
                    📁 Select Common Calendar PDF
                    <input
                      type="file"
                      className="d-none"
                      accept=".pdf,.csv,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCommonFileUpload(file);
                      }}
                    />
                  </label>
                  {commonFile ? (
                    <div className="d-flex align-items-center gap-2 small bg-success-subtle px-3 py-1 rounded border border-success">
                      <span className="text-success fw-bold font-mono-ppsu">✓ {commonFile.fileName}</span>
                      <Button
                        size="sm"
                        variant="outline-success"
                        style={{ fontSize: 10, padding: '1px 6px' }}
                        onClick={() => setViewingDoc({ title: 'Common Academic Calendar', fileName: commonFile.fileName, fileUrl: commonFile.fileUrl })}
                      >
                        👁️ View
                      </Button>
                      <Button size="sm" variant="link" className="text-danger p-0 ms-1 border-0" onClick={() => setCommonFile(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted italic small">No common file selected yet</span>
                  )}
                </div>
              </div>
            </Col>

            {/* STEP 4: Per-Semester Checkbox List & Override Upload Inputs */}
            <Col md={12}>
              <div className="p-3 bg-light rounded-3 border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="fw-bold text-navy-900 mb-0 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                    Per-Semester Allocation & Override Options ({selectedTermType} under {selectedSchool})
                  </label>
                  <span className="badge bg-info-subtle text-info-emphasis border small">
                    Check = Use Common File | Uncheck = Upload Custom File
                  </span>
                </div>
                <p className="text-muted small mb-3">
                  Ticked semesters receive the common file uploaded in Step 3. Untick any semester that requires a separate, custom academic calendar document.
                </p>

                <Row className="g-3">
                  {activeTermObj.sems.map((sem) => {
                    const isChecked = semesterChecks[sem] ?? true;
                    const override = semesterOverrides[sem];
                    return (
                      <Col md={6} key={sem}>
                        <div className={`p-3 rounded-3 border transition-all ${isChecked ? 'bg-white border-primary-subtle' : 'bg-warning-subtle border-warning'}`}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <Form.Check
                              type="checkbox"
                              id={`checkbox-${sem}`}
                              label={<span className="fw-bold font-mono-ppsu text-navy-900">{sem}</span>}
                              checked={isChecked}
                              onChange={(e) => handleSemesterCheckboxChange(sem, e.target.checked)}
                            />
                            {isChecked ? (
                              <Badge bg="success" pill style={{ fontSize: 10 }}>
                                Uses Common File
                              </Badge>
                            ) : (
                              <Badge bg="warning" text="dark" pill style={{ fontSize: 10 }}>
                                Custom Override Required
                              </Badge>
                            )}
                          </div>

                          {isChecked ? (
                            <div className="small text-secondary font-mono-ppsu ms-4">
                              {commonFile ? `📄 ${commonFile.fileName}` : '⏳ Inherits common file from Step 3'}
                            </div>
                          ) : (
                            <div className="ms-4 mt-2">
                              <label className="btn btn-outline-warning btn-sm py-1 px-2 mb-1 text-dark fw-semibold" style={{ fontSize: 11, cursor: 'pointer' }}>
                                📤 Upload Custom File for {sem}
                                <input
                                  type="file"
                                  className="d-none"
                                  accept=".pdf,.csv,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleSemesterOverrideUpload(sem, file);
                                  }}
                                />
                              </label>
                              {override ? (
                                <div className="d-flex align-items-center gap-2 small text-success font-mono-ppsu">
                                  <span>✓ {override.fileName}</span>
                                  <Button
                                    size="sm"
                                    variant="outline-info"
                                    style={{ fontSize: 10, padding: '1px 5px' }}
                                    onClick={() => setViewingDoc({ title: `${sem} Custom Calendar`, fileName: override.fileName, fileUrl: override.fileUrl })}
                                  >
                                    View
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-danger small italic">Please upload custom file for {sem}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </Col>
          </Row>

          {/* STEP 5: Submit / Publish Button */}
          <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Target: <strong>{selectedSchool}</strong> &bull; <strong>{selectedTermType}</strong> &bull; <strong>{activeTermObj.sems.length} Semesters</strong>
            </span>
            <Button
              variant="primary"
              size="lg"
              className="btn-ppsu-accent fw-bold px-4"
              style={{ fontSize: 14 }}
              disabled={saving}
              onClick={handlePublishClick}
            >
              {saving ? <Spinner size="sm" /> : `🚀 Step 5 — Publish Academic Calendar for ${selectedSchool}`}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* TABLE OF CURRENTLY PUBLISHED CALENDARS */}
      <Card className="shadow-sm border-0 rounded-3">
        <Card.Header className="bg-white fw-bold py-3 border-bottom text-navy-900 d-flex justify-content-between align-items-center">
          <span>Currently Published Institutional Academic Calendars</span>
          <Badge bg="secondary" pill>{publishedDocs.length} Schools Configured</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : publishedDocs.length === 0 ? (
            <div className="text-center py-5 text-muted small">
              No published academic calendars found. Use the wizard above to publish the first calendar.
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0 small">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">School</th>
                  <th>Published File</th>
                  <th>Semesters Covered</th>
                  <th>Last Updated</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {publishedDocs.map((pubDoc) => {
                  let parsed: any = {};
                  if (pubDoc.subItemsJson) {
                    try { parsed = JSON.parse(pubDoc.subItemsJson); } catch (e) {}
                  }
                  const sems = Object.keys(parsed.semesters || {});
                  return (
                    <tr key={pubDoc.id}>
                      <td className="ps-4 fw-bold text-navy-900 font-mono-ppsu">{pubDoc.school}</td>
                      <td>
                        {pubDoc.fileName ? (
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-success font-mono-ppsu">📄 {pubDoc.fileName}</span>
                            <Button
                              size="sm"
                              variant="outline-info"
                              style={{ fontSize: 10, padding: '1px 6px' }}
                              onClick={() => setViewingDoc({ title: `${pubDoc.school} Academic Calendar`, fileName: pubDoc.fileName, fileUrl: pubDoc.fileUrl || SAMPLE_PDF_DATA_URL })}
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {sems.map((sem) => (
                            <Badge key={sem} bg="primary" style={{ fontSize: 10 }}>
                              {sem}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-muted font-mono-ppsu">{new Date(pubDoc.updatedAt).toLocaleDateString()}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          <Button size="sm" variant="outline-primary" style={{ fontSize: 11 }} onClick={() => handleEditPublished(pubDoc)}>
                            Edit / Replace
                          </Button>
                          <Button size="sm" variant="outline-danger" style={{ fontSize: 11 }} onClick={() => handleClearCalendar(pubDoc.school)}>
                            Clear
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* CONFIRMATION SUMMARY MODAL */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">Publish Academic Calendar Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          <Alert variant="info" className="py-2 mb-3">
            Please review the academic calendar distribution before finalizing.
          </Alert>
          <div className="mb-2"><strong>School:</strong> {selectedSchool}</div>
          <div className="mb-2"><strong>Term Type:</strong> {selectedTermType}</div>
          <div className="mb-3">
            <strong>Semester File Mapping:</strong>
            <ul className="mt-1 ps-3 mb-0">
              {activeTermObj.sems.map((sem) => {
                const isChecked = semesterChecks[sem] ?? true;
                const override = semesterOverrides[sem];
                return (
                  <li key={sem} className="mb-1">
                    <strong className="font-mono-ppsu">{sem}:</strong>{' '}
                    {isChecked
                      ? commonFile ? `Common File (${commonFile.fileName})` : 'Common File'
                      : override ? `Custom Override (${override.fileName})` : 'Custom File'}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-muted mb-0 font-italic" style={{ fontSize: 11 }}>
            Once published, Item 5 (Department Academic Calendar) will automatically lock and display these files for all matching Course Coordinators and Course Teachers.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="btn-ppsu-accent" onClick={executePublish}>
            Confirm & Publish
          </Button>
        </Modal.Footer>
      </Modal>

      {/* PDF DOCUMENT VIEWER MODAL */}
      {viewingDoc && (
        <Modal show={true} onHide={() => setViewingDoc(null)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title className="h6 fw-bold">{viewingDoc.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0" style={{ height: '75vh' }}>
            <iframe
              src={viewingDoc.fileUrl || SAMPLE_PDF_DATA_URL}
              title={viewingDoc.fileName}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
