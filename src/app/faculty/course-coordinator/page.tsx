'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, Card, Button, Badge, Spinner, Alert, Form, Modal, Table, Nav, Tab } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const SHARED_ITEMS = [
  { index: 1,  name: 'Item 1 — Institute Vision, Mission & PEO, PSO & PO', category: 'Institutional', subKeys: ['vision', 'mission', 'peo', 'pso', 'po'] },
  { index: 3,  name: 'Item 3 — Course Information Sheet (Syllabus)', category: 'Curriculum' },
  { index: 6,  name: 'Item 6 — Course Delivery Details (Lesson Plan)', category: 'Teaching', subKeys: ['lessonPlanLecture', 'lessonPlanLab', 'lessonPlanTutorial'] },
  { index: 7,  name: 'Item 7 — List of Laboratory Experiments', category: 'Practical' },
  { index: 10, name: 'Item 10 — Lab Manuals / Tutorials', category: 'Practical' },
  { index: 11, name: 'Item 11 — Internal Assessment 1 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 12, name: 'Item 12 — Internal Assessment 2 (Timetable & Question Paper)', category: 'Assessment', subKeys: ['timetable', 'questionPaper'] },
  { index: 15, name: 'Item 15 — University Exam (Question Paper)', category: 'Assessment', subKeys: ['questionPaper'] },
  { index: 18, name: 'Item 18 — Action to be taken for next year based on CO Attainment', category: 'Institutional' }
];

const SUB_KEY_CONFIG: Record<string, { label: string; required?: boolean }> = {
  vision: { label: 'Vision', required: true },
  mission: { label: 'Mission', required: true },
  peo: { label: 'PEO', required: true },
  pso: { label: 'PSO', required: true },
  po: { label: 'PO', required: true },
  lessonPlanLecture: { label: '(a) Lesson Plan — Lecture', required: true },
  lessonPlanLab: { label: '(b) Lesson Plan — Lab', required: false },
  lessonPlanTutorial: { label: '(c) Lesson Plan — Tutorial', required: false },
  timetable: { label: 'Timetable', required: true },
  questionPaper: { label: 'Question Paper', required: true },
  sampleAnswerSheet: { label: 'Sample Answer Sheet', required: true },
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
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
    default:               return status;
  }
}

export default function FacultyCourseCoordinatorPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [schoolSharedDocs, setSchoolSharedDocs] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [facultyUnderMe, setFacultyUnderMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [uploadingItem, setUploadingItem] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'shared' | 'faculty'>('shared');
  const [searchQuery, setSearchQuery] = useState('');

  // Item 1 Text Entry & Custom Section State
  const [item1TextDrafts, setItem1TextDrafts] = useState<Record<string, string>>({});
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomText, setNewCustomText] = useState('');

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // Fire both calls in parallel for faster load
      const [subjRes, facRes] = await Promise.all([
        fetch('/api/coordinator/shared-documents'),
        fetch('/api/coordinator/faculty')
      ]);

      if (!subjRes.ok) throw new Error('Failed to load coordinator subjects');
      const subjData = await subjRes.json();
      const list = Array.isArray(subjData.subjects) ? subjData.subjects : [];
      setSubjects(list);
      const schoolDocs = Array.isArray(subjData.schoolSharedDocuments) ? subjData.schoolSharedDocuments : [];
      setSchoolSharedDocs(schoolDocs);

      const doc1 = schoolDocs.find((d: any) => d.itemIndex === 1);
      if (doc1?.subItemsJson) {
        try {
          const p = JSON.parse(doc1.subItemsJson);
          const drafts: Record<string, string> = {};
          ['vision', 'mission', 'peo', 'pso', 'po'].forEach((key) => {
            if (p[key]?.textContent) drafts[key] = p[key].textContent;
          });
          setItem1TextDrafts(drafts);
        } catch (e) {}
      }

      if (list.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(list[0].id);
      }

      if (facRes.ok) {
        const facData = await facRes.json();
        setFacultyUnderMe(Array.isArray(facData.faculty) ? facData.faculty : []);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch coordinator data.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const sharedDocsList: any[] = activeSubject?.sharedDocuments || [];
  const sharedMap = new Map(sharedDocsList.map((d: any) => [d.itemIndex, d]));
  const schoolSharedMap = new Map(
    schoolSharedDocs
      .filter((d: any) => d.school === (activeSubject?.school || 'SOE'))
      .map((d: any) => [d.itemIndex, d])
  );

  const handleUploadSingle = async (itemIndex: number, file: File) => {
    if (!selectedSubjectId || !file) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const isSchoolItem = [1, 18].includes(itemIndex);
      const schoolCode = activeSubject?.school || 'SOE';

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isSchoolItem ? { school: schoolCode } : { subjectId: selectedSubjectId }),
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
      setActionSuccess(isSchoolItem
        ? `Shared Action Plan document for School ${schoolCode} (Item #${itemIndex}) uploaded and locked for all faculty.`
        : `Shared document for Item #${itemIndex} uploaded and locked for all faculty.`);
      fetchData(false);
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
      const isSchoolItem = [1, 18].includes(itemIndex);
      const schoolCode = activeSubject?.school || 'SOE';
      const existingDoc = isSchoolItem ? schoolSharedMap.get(itemIndex) : sharedMap.get(itemIndex);

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
          ...(isSchoolItem ? { school: schoolCode } : { subjectId: selectedSubjectId }),
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
      const label = SUB_KEY_CONFIG[subKey]?.label || subKey;
      setActionSuccess(`Shared document sub-item (${label}) uploaded successfully.`);
      fetchData(false);
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
      const isSchoolItem = [1, 18].includes(itemIndex);
      const schoolCode = activeSubject?.school || 'SOE';
      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isSchoolItem ? { school: schoolCode } : { subjectId: selectedSubjectId }),
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
      setActionSuccess(isSchoolItem ? `Shared Item #${itemIndex} document removed.` : `Shared document for Item #${itemIndex} removed.`);
      fetchData(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemoveSubItem = async (itemIndex: number, subKey: string) => {
    if (!selectedSubjectId) return;
    const label = SUB_KEY_CONFIG[subKey]?.label || subKey;
    if (!confirm(`Are you sure you want to remove sub-item (${label})?`)) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const isSchoolItem = [1, 18].includes(itemIndex);
      const schoolCode = activeSubject?.school || 'SOE';
      const existingDoc = isSchoolItem ? schoolSharedMap.get(itemIndex) : sharedMap.get(itemIndex);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      delete existingSubJson[subKey];
      const hasRemaining = Object.keys(existingSubJson).length > 0;

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isSchoolItem ? { school: schoolCode } : { subjectId: selectedSubjectId }),
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
      setActionSuccess(`Sub-item (${label}) removed.`);
      fetchData(false);
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
      fetchData(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleSaveTextSubItem = async (itemIndex: number, subKey: string, textValue: string) => {
    if (!selectedSubjectId) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const isSchoolItem = [1, 18].includes(itemIndex);
      const schoolCode = activeSubject?.school || 'SOE';
      const existingDoc = isSchoolItem ? schoolSharedMap.get(itemIndex) : sharedMap.get(itemIndex);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      existingSubJson[subKey] = {
        ...(existingSubJson[subKey] || {}),
        textContent: textValue.trim(),
        updatedAt: new Date().toISOString()
      };

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isSchoolItem ? { school: schoolCode } : { subjectId: selectedSubjectId }),
          itemIndex,
          status: 'UPLOADED',
          fileName: existingDoc?.fileName || 'Text Statements Entry',
          fileUrl: existingDoc?.fileUrl || null,
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Saving text failed');
      }
      const label = SUB_KEY_CONFIG[subKey]?.label || subKey;
      setActionSuccess(`Saved text for ${label}.`);
      fetchData(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleAddCustomSection = async () => {
    if (!selectedSubjectId || !newCustomTitle.trim() || !newCustomText.trim()) return;
    setUploadingItem(1); setActionError(''); setActionSuccess('');
    try {
      const schoolCode = activeSubject?.school || 'SOE';
      const existingDoc = schoolSharedMap.get(1);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      const customSections = Array.isArray(existingSubJson.customSections) ? existingSubJson.customSections : [];
      customSections.push({
        id: 'sec_' + Date.now(),
        title: newCustomTitle.trim(),
        textContent: newCustomText.trim(),
        updatedAt: new Date().toISOString()
      });
      existingSubJson.customSections = customSections;

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: schoolCode,
          itemIndex: 1,
          status: 'UPLOADED',
          fileName: existingDoc?.fileName || 'Text Statements Entry',
          fileUrl: existingDoc?.fileUrl || null,
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add custom section');
      }
      setActionSuccess(`Added custom section "${newCustomTitle}".`);
      setShowAddCustomModal(false);
      setNewCustomTitle('');
      setNewCustomText('');
      fetchData(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleDeleteCustomSection = async (id: string) => {
    if (!confirm('Are you sure you want to remove this custom section?')) return;
    setUploadingItem(1); setActionError(''); setActionSuccess('');
    try {
      const schoolCode = activeSubject?.school || 'SOE';
      const existingDoc = schoolSharedMap.get(1);
      let existingSubJson: any = {};
      try { if (existingDoc?.subItemsJson) existingSubJson = JSON.parse(existingDoc.subItemsJson); } catch (e) {}

      if (Array.isArray(existingSubJson.customSections)) {
        existingSubJson.customSections = existingSubJson.customSections.filter((s: any) => s.id !== id);
      }

      const res = await fetch('/api/coordinator/shared-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: schoolCode,
          itemIndex: 1,
          status: 'UPLOADED',
          fileName: existingDoc?.fileName || null,
          fileUrl: existingDoc?.fileUrl || null,
          subItemsJson: JSON.stringify(existingSubJson)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete section');
      }
      setActionSuccess('Removed custom section.');
      fetchData(false);
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
              {SHARED_ITEMS.filter((item) => {
                  const doc = [1, 18].includes(item.index) ? schoolSharedMap.get(item.index) : sharedMap.get(item.index);
                  return doc && doc.status === 'UPLOADED';
                }).length} / {SHARED_ITEMS.length} Uploaded
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
                  const doc = [1, 18].includes(item.index) ? schoolSharedMap.get(item.index) : sharedMap.get(item.index);
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
                        {item.index === 1 ? (
                          <div className="mt-3 p-3 bg-white border rounded shadow-sm">
                            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold small text-navy-900">School / Institute:</span>
                                <Form.Select
                                  size="sm"
                                  style={{ maxWidth: 220, fontSize: 12, fontWeight: 600 }}
                                  value={parsedSubs.school || 'SOE'}
                                  onChange={(e) => handleSchoolChange(1, e.target.value)}
                                >
                                  <option value="SOE">SOE (School of Engineering)</option>
                                  <option value="IDS">IDS</option>
                                  <option value="ICA">ICA</option>
                                </Form.Select>
                              </div>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="fw-bold"
                                style={{ fontSize: 12 }}
                                onClick={() => setShowAddCustomModal(true)}
                              >
                                ➕ Add Box / Row (Custom Section)
                              </Button>
                            </div>

                            {/* Default 5 Sub-fields with Text Entry + File Upload */}
                            <div className="d-flex flex-column gap-3 mb-4">
                              {item.subKeys?.map((sk) => {
                                const skData = parsedSubs[sk] || {};
                                const config = SUB_KEY_CONFIG[sk] || { label: sk };
                                const currentDraft = item1TextDrafts[sk] ?? (skData.textContent || '');
                                const lines = currentDraft.split('\n').map((l: string) => l.trim()).filter(Boolean);

                                const handleAddRow = () => {
                                  const count = lines.length + 1;
                                  let newPrefix = '';
                                  if (sk === 'peo') newPrefix = `PEO ${count}: `;
                                  else if (sk === 'pso') newPrefix = `PSO ${count}: `;
                                  else if (sk === 'po') newPrefix = `PO ${count}: `;
                                  else newPrefix = `${count}. `;
                                  const updated = currentDraft.trim() ? `${currentDraft}\n${newPrefix}` : newPrefix;
                                  setItem1TextDrafts((prev) => ({ ...prev, [sk]: updated }));
                                };

                                const handleUpdateRow = (idx: number, text: string) => {
                                  const updatedLines = [...lines];
                                  updatedLines[idx] = text;
                                  setItem1TextDrafts((prev) => ({ ...prev, [sk]: updatedLines.join('\n') }));
                                };

                                const handleRemoveRow = (idx: number) => {
                                  const updatedLines = lines.filter((_, i) => i !== idx);
                                  setItem1TextDrafts((prev) => ({ ...prev, [sk]: updatedLines.join('\n') }));
                                };

                                return (
                                  <div key={sk} className="p-3 border rounded bg-light">
                                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                      <span className="fw-bold text-navy-900 small" style={{ fontSize: 13 }}>
                                        {config.label} {config.required && <span className="text-danger">*</span>}
                                        {lines.length > 0 && (
                                          <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: 10 }}>
                                            {lines.length} {lines.length === 1 ? 'row' : 'rows'}
                                          </span>
                                        )}
                                      </span>
                                      <div className="d-flex align-items-center gap-2">
                                        {skData.fileName && (
                                          <span className="badge bg-success-subtle text-success border border-success-subtle font-mono-ppsu" style={{ fontSize: 11 }}>
                                            ✓ File: {skData.fileName}
                                          </span>
                                        )}
                                        {skData.textContent && (
                                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 11 }}>
                                            ✓ Text Saved
                                          </span>
                                        )}
                                        <label className="btn btn-outline-primary btn-sm py-0.5 px-2 m-0" style={{ fontSize: 11, cursor: 'pointer' }}>
                                          {skData.fileName ? 'Replace File' : 'Upload File'}
                                          <input
                                            type="file"
                                            className="d-none"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) handleUploadSubItem(1, sk, f);
                                              e.currentTarget.value = '';
                                            }}
                                          />
                                        </label>
                                        {skData.fileUrl && (
                                          <Button
                                            size="sm"
                                            variant="outline-info"
                                            style={{ fontSize: 11, padding: '2px 8px' }}
                                            onClick={() => setViewingDoc({ title: `Item 1 — ${config.label}`, fileName: skData.fileName, fileUrl: skData.fileUrl })}
                                          >
                                            View File
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Line-by-Line Interactive Row Builder */}
                                    {lines.length > 0 && (
                                      <div className="mb-2 p-2 bg-white rounded border">
                                        <div className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>
                                          Row-by-Row Statements ({lines.length}):
                                        </div>
                                        <div className="d-flex flex-column gap-1.5">
                                          {lines.map((line: string, idx: number) => {
                                            const prefix = sk === 'peo' ? `PEO ${idx + 1}` : sk === 'pso' ? `PSO ${idx + 1}` : sk === 'po' ? `PO ${idx + 1}` : `${idx + 1}.`;
                                            const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;

                                            return (
                                              <div key={idx} className="d-flex align-items-center gap-2">
                                                <span className="badge bg-dark-subtle text-dark border font-mono-ppsu" style={{ width: '70px', flexShrink: 0, fontSize: 11, textAlign: 'center' }}>
                                                  {prefix}
                                                </span>
                                                <Form.Control
                                                  type="text"
                                                  size="sm"
                                                  value={cleanText}
                                                  placeholder={`Statement for ${prefix}`}
                                                  onChange={(e) => handleUpdateRow(idx, `${prefix}: ${e.target.value}`)}
                                                  style={{ fontSize: 12 }}
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="outline-danger"
                                                  className="py-0 px-2 border-0"
                                                  style={{ fontSize: 13 }}
                                                  onClick={() => handleRemoveRow(idx)}
                                                  title="Remove Row"
                                                >
                                                  🗑️
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Multi-line Full Textarea */}
                                    <Form.Control
                                      as="textarea"
                                      rows={sk === 'mission' ? 3 : 2}
                                      size="sm"
                                      placeholder={`Type or paste ${config.label} statements directly here...`}
                                      value={currentDraft}
                                      onChange={(e) => setItem1TextDrafts({ ...item1TextDrafts, [sk]: e.target.value })}
                                      style={{ fontSize: 12, resize: 'vertical' }}
                                    />

                                    <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline-success"
                                        style={{ fontSize: 11, fontWeight: 600 }}
                                        onClick={handleAddRow}
                                      >
                                        + Add Row
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        style={{ fontSize: 11, fontWeight: 600 }}
                                        onClick={() => handleSaveTextSubItem(1, sk, currentDraft)}
                                        disabled={uploadingItem === 1}
                                      >
                                        Save Text
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Custom Sections (if any) */}
                            {Array.isArray(parsedSubs.customSections) && parsedSubs.customSections.length > 0 && (
                              <div className="mb-4">
                                <h6 className="fw-bold text-navy-900 mb-2 small text-uppercase" style={{ letterSpacing: 0.5 }}>Custom Sections</h6>
                                <div className="d-flex flex-column gap-2">
                                  {parsedSubs.customSections.map((sec: any) => (
                                    <div key={sec.id} className="p-3 border rounded bg-white d-flex justify-content-between align-items-start gap-3">
                                      <div>
                                        <div className="fw-bold text-navy-900 small mb-1">{sec.title}</div>
                                        <div className="text-secondary small" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{sec.textContent}</div>
                                      </div>
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 11 }} onClick={() => handleDeleteCustomSection(sec.id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Live Auto-Generated Formatted Output Preview (Green Header Table Style matching NAAC/NBA format) */}
                            <div className="mt-4 p-3 border rounded bg-light">
                              <h6 className="fw-bold text-navy-900 mb-3 small text-uppercase" style={{ letterSpacing: 0.5 }}>
                                📋 Auto-Generated Formatted Output Preview
                              </h6>
                              <div className="p-3 bg-white border rounded">
                                {(['vision', 'mission', 'peo', 'pso', 'po'] as const).map((sk) => {
                                  const text = parsedSubs[sk]?.textContent || item1TextDrafts[sk];
                                  const label = SUB_KEY_CONFIG[sk]?.label || sk.toUpperCase();
                                  if (!text?.trim()) return null;
                                  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

                                  const headerBg = '#d9ead3';
                                  const isPeo = sk === 'peo';
                                  const isPso = sk === 'pso';
                                  const isPo = sk === 'po';
                                  const isMission = sk === 'mission';

                                  let col1Header = '';
                                  let col2Header = '';
                                  let prefix = '';

                                  if (isPeo) {
                                    col1Header = 'PEO No';
                                    col2Header = 'PROGRAMME EDUCATIONAL OBJECTIVES';
                                    prefix = 'PEO ';
                                  } else if (isPso) {
                                    col1Header = 'PSO No';
                                    col2Header = 'PROGRAMME SPECIFIC OUTCOMES (PSO)';
                                    prefix = 'PSO ';
                                  } else if (isPo) {
                                    col1Header = 'PO No';
                                    col2Header = 'PROGRAMME OUTCOMES';
                                    prefix = 'PO ';
                                  } else if (isMission) {
                                    col1Header = '';
                                    col2Header = 'INSTITUTE MISSION';
                                  } else {
                                    col1Header = '';
                                    col2Header = `INSTITUTE ${label.toUpperCase()}`;
                                  }

                                  if (isPeo || isPso || isPo) {
                                    return (
                                      <div key={sk} className="mb-3">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: 'Arial, sans-serif' }}>
                                          <thead>
                                            <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                              <th style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #000', color: '#000' }}>
                                                {col1Header}
                                              </th>
                                              <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'left', color: '#000' }}>
                                                {col2Header}
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {lines.map((line: string, idx: number) => {
                                              const cleanText = line.replace(/^(PEO|PSO|PO|\d+)[\s\d\.\:]*/i, '').trim() || line;
                                              return (
                                                <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                                  <td style={{ width: '90px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                                    {prefix}{idx + 1}
                                                  </td>
                                                  <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
                                                    {cleanText}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  }

                                  if (isMission || lines.length > 1) {
                                    return (
                                      <div key={sk} className="mb-3">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: 'Arial, sans-serif' }}>
                                          <thead>
                                            <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                              <th colSpan={2} style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                                {col2Header}
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {lines.map((line: string, idx: number) => {
                                              const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim() || line;
                                              return (
                                                <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? '1px solid #000' : 'none' }}>
                                                  <td style={{ width: '45px', padding: '8px 12px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #000', fontSize: '13px', verticalAlign: 'top', color: '#000' }}>
                                                    {idx + 1}.
                                                  </td>
                                                  <td style={{ padding: '8px 12px', fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
                                                    {cleanText}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={sk} className="mb-3">
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: 'Arial, sans-serif' }}>
                                        <thead>
                                          <tr style={{ background: headerBg, borderBottom: '1px solid #000' }}>
                                            <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                              {col2Header}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>
                                              {text}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })}

                                {/* Render Custom Sections in Formatted Preview */}
                                {Array.isArray(parsedSubs.customSections) && parsedSubs.customSections.map((sec: any) => (
                                  <div key={sec.id} className="mb-3">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontFamily: 'Arial, sans-serif' }}>
                                      <thead>
                                        <tr style={{ background: '#d9ead3', borderBottom: '1px solid #000' }}>
                                          <th style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#000' }}>
                                            {sec.title.toUpperCase()}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#000' }}>
                                            {sec.textContent}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : item.subKeys ? (
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {item.subKeys.map((sk) => {
                              const skData = parsedSubs[sk];
                              const config = SUB_KEY_CONFIG[sk] || { label: sk };
                              return (
                                <div key={sk} className="p-2 border rounded bg-white small d-flex align-items-center gap-2" style={{ minWidth: 240 }}>
                                  <div className="flex-grow-1 text-truncate">
                                    <span className="fw-semibold text-navy-900" style={{ fontSize: 11 }}>
                                      {config.label}
                                      {config.required ? <span className="text-danger ms-0.5">*</span> : <span className="text-muted ms-0.5" style={{ fontSize: 10 }}>(optional)</span>}
                                    </span>
                                    {skData?.fileName ? (
                                      <div className="text-success text-truncate font-mono-ppsu" style={{ fontSize: 11 }}>
                                        ✓ {skData.fileName}
                                      </div>
                                    ) : (
                                      <div className="text-muted font-mono-ppsu" style={{ fontSize: 10 }}>
                                        ✗ Pending upload
                                      </div>
                                    )}
                                  </div>
                                  <div className="d-flex align-items-center gap-1">
                                    {skData?.fileName && (
                                      <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: `${item.name} — ${config.label}`, fileName: skData.fileName, fileUrl: skData.fileUrl })}>
                                        View
                                      </Button>
                                    )}
                                    <label className="btn btn-outline-primary btn-sm py-0 px-2 m-0" style={{ fontSize: 10, cursor: 'pointer' }}>
                                      {skData?.fileName ? 'Replace' : 'Upload'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadSubItem(item.index, sk, f); e.currentTarget.value = ''; }} />
                                    </label>
                                    {skData?.fileName && (
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => handleRemoveSubItem(item.index, sk)}>
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

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

      {/* TAB 2: Assigned Faculty & Document Access */}
      {activeTab === 'faculty' && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className="fw-bold text-navy-900 mb-0">Assigned Course & Lab Faculty Members</h5>
              <small className="text-muted">Faculty and Lab Instructors assigned to subject(s) you coordinate.</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Form.Control
                type="text"
                size="sm"
                placeholder="🔍 Search faculty, employee ID, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '260px' }}
              />
              <Badge bg="primary" className="px-3 py-2">
                {facultyUnderMe.length} Faculty Members
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {facultyUnderMe.length === 0 ? (
              <div className="p-5 text-center text-muted">
                <div className="fs-2 mb-2">👨‍🏫</div>
                <h6 className="fw-bold">No Assigned Faculty Found</h6>
                <p className="small text-secondary mb-0">No teachers or lab instructors are currently assigned under your coordinated subject(s).</p>
              </div>
            ) : (
              <Table hover responsive className="mb-0 align-middle">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Course Faculty / Lab Faculty</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Role on Subject</th>
                    <th>Subject / Course</th>
                    <th>Course File Status</th>
                    <th className="pe-4 text-end">Document Access & Review</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyUnderMe.flatMap((fac) => {
                    const assignments = fac.assignments || (fac.courseFiles ? fac.courseFiles.map((cf: any) => ({
                      subjectId: cf.id,
                      subjectCode: cf.courseCode,
                      subjectName: cf.courseTitle,
                      semester: cf.semester,
                      roleOnSubject: 'Course Faculty',
                      courseFileStatus: cf.status,
                      courseFileId: cf.id
                    })) : []);

                    const filteredAssignments = assignments.filter((asgn: any) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return fac.name?.toLowerCase().includes(q) ||
                             fac.employeeId?.toLowerCase().includes(q) ||
                             asgn.subjectCode?.toLowerCase().includes(q) ||
                             asgn.subjectName?.toLowerCase().includes(q);
                    });

                    return filteredAssignments.map((asgn: any, aIdx: number) => {
                      const isCourseFac = asgn.roleOnSubject === 'Course Teacher' || asgn.roleOnSubject === 'Course Faculty';
                      const targetFileId = asgn.courseFileId;

                      return (
                        <tr key={`${fac.id}-${asgn.subjectId || aIdx}-${aIdx}`}>
                          {aIdx === 0 && (
                            <td rowSpan={filteredAssignments.length} className="ps-4 fw-bold text-dark">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fs-5">👨‍🏫</span>
                                <div>
                                  <div className="text-navy-900">{fac.name}</div>
                                  <small className="text-muted fw-normal">{fac.designation || 'Faculty Member'}</small>
                                </div>
                              </div>
                            </td>
                          )}
                          {aIdx === 0 && (
                            <td rowSpan={filteredAssignments.length} className="font-mono-ppsu text-secondary">
                              {fac.employeeId || '—'}
                            </td>
                          )}
                          {aIdx === 0 && (
                            <td rowSpan={filteredAssignments.length} className="text-secondary">
                              {fac.department || '—'}
                            </td>
                          )}
                          <td>
                            <Badge
                              bg={isCourseFac ? 'primary' : 'info'}
                              text={isCourseFac ? 'white' : 'dark'}
                              className="px-2.5 py-1.5 fw-semibold"
                            >
                              {isCourseFac ? 'Course Faculty' : asgn.roleOnSubject}
                            </Badge>
                          </td>
                          <td>
                            <span className="fw-bold font-mono-ppsu text-navy-900">{asgn.subjectCode}</span>
                            <div className="small text-muted">{asgn.subjectName}</div>
                          </td>
                          <td>
                            <span className={`badge px-3 py-1.5 rounded-pill ${statusBadgeClass(asgn.courseFileStatus)}`}>
                              {statusLabel(asgn.courseFileStatus)}
                            </span>
                          </td>
                          <td className="pe-4 text-end">
                            {targetFileId && !['DRAFT', 'NOT_SUBMITTED'].includes(asgn.courseFileStatus) ? (
                              <Link
                                href={`/coordinator/review/${targetFileId}`}
                                className="btn btn-sm btn-primary fw-bold px-3 py-1.5 d-inline-flex align-items-center gap-1 shadow-sm"
                              >
                                👁️ View Uploaded Documents
                              </Link>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5" style={{ fontSize: 11 }}>
                                🔒 Pending Faculty Submission
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
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

      {/* Modal for adding custom section / box */}
      <Modal show={showAddCustomModal} onHide={() => setShowAddCustomModal(false)} centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h6 fw-bold mb-0 text-navy-900">
            ➕ Add Custom Section / Box (e.g. Department Vision)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Section Title Label</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Department Vision, Department Mission..."
              value={newCustomTitle}
              onChange={(e) => setNewCustomTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Section Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Type statement text here..."
              value={newCustomText}
              onChange={(e) => setNewCustomText(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="bg-light border-top">
          <Button variant="secondary" size="sm" onClick={() => setShowAddCustomModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="fw-semibold"
            onClick={handleAddCustomSection}
            disabled={!newCustomTitle.trim() || !newCustomText.trim()}
          >
            Add Section
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

