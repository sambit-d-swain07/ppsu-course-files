'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Row, Col, Card, Button, Badge, Spinner, Alert, Form, Modal, Table, Nav, Tab } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const SHARED_ITEMS = [
  { index: 1,  name: 'Item 1 — Institute & Dept Vision, Mission & PEO, PSO & PO', category: 'Institutional' },
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

const uploadFileToServer = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.fileUrl) return data.fileUrl;
    }
  } catch (e) {}
  return await readFileAsDataUrl(file);
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Group coordinator subjects by distinct courseCode to display pending centrally-managed uploads
  const courseCodeGroups = (() => {
    const map = new Map<string, {
      subjectCode: string;
      subjectName: string;
      semester: string;
      school: string;
      divisions: string[];
      firstSubjectId: string;
      pendingItems: any[];
      uploadedCount: number;
    }>();

    subjects.forEach((s) => {
      if (!map.has(s.subjectCode)) {
        map.set(s.subjectCode, {
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          semester: s.semester,
          school: s.school || 'SOE',
          divisions: [s.division].filter(Boolean),
          firstSubjectId: s.id,
          pendingItems: [],
          uploadedCount: 0
        });
      } else {
        const entry = map.get(s.subjectCode)!;
        if (s.division && !entry.divisions.includes(s.division)) {
          entry.divisions.push(s.division);
        }
      }
    });

    map.forEach((entry) => {
      const codeSubjects = subjects.filter((s) => s.subjectCode === entry.subjectCode);
      const allDocs = codeSubjects.flatMap((s) => s.sharedDocuments || []);
      const docsMap = new Map<number, any>(allDocs.map((d: any) => [d.itemIndex, d]));
      const schoolDocsMap = new Map<number, any>(
        schoolSharedDocs
          .filter((d: any) => d.school === (entry.school || 'SOE'))
          .map((d: any) => [d.itemIndex, d])
      );

      SHARED_ITEMS.forEach((item) => {
        const doc = (item.index === 1 || item.index === 18)
          ? (schoolDocsMap.get(item.index) || docsMap.get(item.index))
          : docsMap.get(item.index);
        let parsed: any = {};
        if (doc?.subItemsJson) {
          try { parsed = JSON.parse(doc.subItemsJson); } catch (e) {}
        }
        const isUploaded = Boolean(
          doc && (
            doc.status === 'UPLOADED' ||
            doc.fileName ||
            (doc.subItemsJson && Object.values(parsed).some((v: any) => v && (v.fileName || v.textContent?.trim())))
          )
        );

        if (isUploaded) {
          entry.uploadedCount++;
        } else {
          entry.pendingItems.push(item);
        }
      });
    });

    return Array.from(map.values());
  })();

  // Distinct course options deduplicated by (subjectCode, semester, academicYear)
  const distinctSubjects = (() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const s of subjects) {
      const key = `${s.subjectCode}_${s.semester}_${s.academicYear}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }
    return list;
  })();

  const activeDistinctSubject = distinctSubjects.find((ds) => {
    const active = subjects.find((s) => s.id === selectedSubjectId);
    return active && ds.subjectCode === active.subjectCode && ds.semester === active.semester && ds.academicYear === active.academicYear;
  }) || distinctSubjects[0];

  const handleUploadSingle = async (itemIndex: number, file: File) => {
    if (!selectedSubjectId || !file) return;
    setUploadingItem(itemIndex); setActionError(''); setActionSuccess('');
    try {
      const dataUrl = await uploadFileToServer(file);

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
      setActionSuccess(`Shared document for Item #${itemIndex} uploaded and locked for all faculty in this subject.`);
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
      const dataUrl = await uploadFileToServer(file);
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
        <Card.Body className="py-3 px-3 px-md-4 d-flex align-items-center justify-content-between flex-wrap gap-3 bg-light rounded">
          <div className="d-flex align-items-center gap-2 flex-wrap w-100 w-md-auto" style={{ maxWidth: '100%' }}>
            <span className="fw-bold text-dark small text-uppercase" style={{ letterSpacing: 0.5 }}>Select Subject:</span>
            <Form.Select
              size="sm"
              className="w-100 w-md-auto"
              style={{ width: 380, maxWidth: '100%', fontWeight: 600 }}
              value={activeDistinctSubject?.id || selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {distinctSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectCode} — {s.subjectName} ({s.semester})
                </option>
              ))}
            </Form.Select>
          </div>
          {activeSubject && (
            <div className="d-flex gap-3 small text-secondary flex-wrap">
              <span>Department: <strong>{activeSubject.department}</strong></span>
              <span>Academic Year: <strong>{activeSubject.academicYear}</strong></span>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* TAB 1: Shared Documents */}
      {activeTab === 'shared' && (
        <>
          {/* Centrally-Managed Documents Status Grouped by Distinct Course Code */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-light py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold text-navy-900 mb-0">Central Documents Status by Course Code</h6>
                <small className="text-muted">Documents uploaded for a Course Code automatically apply to all its Divisions/Sections.</small>
              </div>
              <Badge bg="secondary" className="px-2.5 py-1">
                {courseCodeGroups.length} Distinct Course{courseCodeGroups.length === 1 ? '' : 's'}
              </Badge>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="d-flex flex-column gap-3">
                {courseCodeGroups.map((grp) => {
                  const isCurrent = activeSubject?.subjectCode === grp.subjectCode;
                  const allDone = grp.pendingItems.length === 0;

                  return (
                    <div
                      key={grp.subjectCode}
                      className={`p-3 rounded-3 border ${isCurrent ? 'border-primary bg-primary-subtle' : 'bg-white'}`}
                      style={{ borderLeftWidth: '5px' }}
                    >
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                        <div>
                          <span className="fw-bold font-mono-ppsu text-navy-900 me-2" style={{ fontSize: '1rem' }}>
                            {grp.subjectCode}
                          </span>
                          <span className="fw-semibold text-dark">{grp.subjectName}</span>
                          <div className="small text-muted mt-0.5 font-mono-ppsu">
                            {grp.semester} · Divisions: {grp.divisions.length > 0 ? grp.divisions.join(', ') : 'All'}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {allDone ? (
                            <Badge bg="success" className="px-2.5 py-1.5 fw-semibold">
                              ✓ All 9 Central Documents Uploaded (Common for All Divisions)
                            </Badge>
                          ) : (
                            <Badge bg="warning" text="dark" className="px-2.5 py-1.5 fw-semibold">
                              ⏳ {grp.pendingItems.length} Pending Central Upload{grp.pendingItems.length === 1 ? '' : 's'}
                            </Badge>
                          )}
                          {!isCurrent && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              style={{ fontSize: 11, padding: '2px 8px' }}
                              onClick={() => setSelectedSubjectId(grp.firstSubjectId)}
                            >
                              Manage Documents ↗
                            </Button>
                          )}
                        </div>
                      </div>

                      {!allDone && (
                        <div className="d-flex align-items-center gap-1.5 flex-wrap mt-2 pt-2 border-top">
                          <small className="text-secondary fw-semibold me-1">Missing for {grp.subjectCode}:</small>
                          {grp.pendingItems.map((p: any) => (
                            <Badge key={p.index} bg="light" text="dark" className="border fw-normal small px-2 py-1">
                              #{p.index} {p.name.replace(/^Item \d+ — /, '')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-navy-900 mb-0">Central Shared Documents — {activeSubject?.subjectCode} ({activeSubject?.subjectName})</h5>
              <small className="text-muted">Uploaded files appear read-only / locked in every faculty member's checklist for this subject across all divisions.</small>
            </div>
            <Badge bg="info" className="px-3 py-2 text-dark">
              {SHARED_ITEMS.filter((item) => {
                  const doc = (item.index === 1 || item.index === 18)
                    ? (schoolSharedMap.get(item.index) || sharedMap.get(item.index))
                    : sharedMap.get(item.index);
                  let parsed: any = {};
                  if (doc?.subItemsJson) {
                    try { parsed = JSON.parse(doc.subItemsJson); } catch (e) {}
                  }
                  return doc && (
                    doc.status === 'UPLOADED' ||
                    doc.fileName ||
                    (doc.subItemsJson && Object.values(parsed).some((v: any) => v && (v.fileName || v.textContent?.trim())))
                  );
                }).length} / {SHARED_ITEMS.length} Uploaded
            </Badge>
          </Card.Header>
          <Card.Body className="p-0">
            {/* Desktop Table View */}
            <div className="d-none d-md-block">
              <Table hover responsive className="mb-0 align-middle" style={{ tableLayout: 'auto' }}>
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th style={{ width: 70 }} className="ps-4">Item #</th>
                  <th style={{ minWidth: 280 }}>Document Name &amp; Description</th>
                  <th style={{ width: 120 }}>Category</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 200, minWidth: 180 }} className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {SHARED_ITEMS.map((item) => {
                  const doc = (item.index === 1 || item.index === 18)
                    ? (schoolSharedMap.get(item.index) || sharedMap.get(item.index))
                    : sharedMap.get(item.index);
                  const isUploading = uploadingItem === item.index;

                  let parsedSubs: any = {};
                  if (doc?.subItemsJson) {
                    try { parsedSubs = JSON.parse(doc.subItemsJson); } catch (e) {}
                  }

                  const hasLegacyText = Boolean(
                    item.index === 1 &&
                    !doc?.fileName &&
                    doc?.subItemsJson &&
                    Object.values(parsedSubs).some((v: any) => v && (v.fileName || v.textContent?.trim()))
                  );

                  const isUploaded = Boolean(
                    doc && (
                      doc.status === 'UPLOADED' ||
                      doc.fileName ||
                      hasLegacyText ||
                      (doc.subItemsJson && Object.values(parsedSubs).some((v: any) => v && (v.fileName || v.textContent?.trim())))
                    )
                  );

                  return (
                    <tr key={item.index} className={isUploaded ? 'table-success-subtle' : ''}>
                      <td className="ps-4 fw-bold font-mono-ppsu">#{item.index}</td>
                      <td style={{ maxWidth: 500, wordBreak: 'break-word' }}>
                        <div className="fw-semibold text-dark">{item.name}</div>
                        {doc?.fileName && (
                          <div className="small text-success font-mono-ppsu mt-0.5">
                            ✓ {doc.fileName}
                          </div>
                        )}



                        {hasLegacyText && (
                          <div className="small text-info font-mono-ppsu mt-1">
                            ℹ️ Legacy Text Entry preserved — Upload combined PDF to replace
                          </div>
                        )}

                        {item.subKeys ? (
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
                      <td className="pe-4 text-end" style={{ whiteSpace: 'nowrap', minWidth: 180 }}>
                        {isUploading ? (
                          <Spinner animation="border" size="sm" variant="primary" />
                        ) : (
                          <div className="d-flex justify-content-end align-items-center gap-2 flex-wrap">
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
            </div>

            {/* Mobile Stacked Card View */}
            <div className="d-block d-md-none p-3">
              <div className="d-flex flex-column gap-3">
                {SHARED_ITEMS.map((item) => {
                  const doc = (item.index === 1 || item.index === 18)
                    ? (schoolSharedMap.get(item.index) || sharedMap.get(item.index))
                    : sharedMap.get(item.index);
                  const isUploading = uploadingItem === item.index;

                  let parsedSubs: any = {};
                  if (doc?.subItemsJson) {
                    try { parsedSubs = JSON.parse(doc.subItemsJson); } catch (e) {}
                  }

                  const hasLegacyText = Boolean(
                    item.index === 1 &&
                    !doc?.fileName &&
                    doc?.subItemsJson &&
                    Object.values(parsedSubs).some((v: any) => v && (v.fileName || v.textContent?.trim()))
                  );

                  const isUploaded = Boolean(
                    doc && (
                      doc.status === 'UPLOADED' ||
                      doc.fileName ||
                      hasLegacyText ||
                      (doc.subItemsJson && Object.values(parsedSubs).some((v: any) => v && (v.fileName || v.textContent?.trim())))
                    )
                  );

                  return (
                    <div
                      key={item.index}
                      className={`p-3 rounded-3 border ${isUploaded ? 'border-success-subtle bg-light' : 'bg-white'}`}
                      style={{ borderLeft: isUploaded ? '4px solid #198754' : '4px solid #dee2e6' }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="badge bg-light text-dark border font-mono-ppsu">
                          #{item.index}
                        </span>
                        <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 11 }}>
                          {item.category}
                        </span>
                      </div>

                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.95rem' }}>
                        {item.name}
                      </div>

                      <div className="mb-2">
                        {isUploaded ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            ✓ Ready (Visible to Faculty)
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            ⏳ Pending Upload
                          </span>
                        )}
                      </div>

                      {doc?.fileName && (
                        <div className="small text-success font-mono-ppsu mb-2 p-2 bg-white rounded border">
                          📄 {doc.fileName}
                        </div>
                      )}

                      {hasLegacyText && (
                        <div className="small text-info font-mono-ppsu mb-2 p-2 bg-info-subtle rounded border border-info-subtle">
                          ℹ️ Legacy Text Entry preserved — Upload combined PDF to replace
                        </div>
                      )}

                      {item.subKeys ? (
                        <div className="mt-2 d-flex flex-column gap-2">
                          <small className="text-muted fw-semibold">Sub-items:</small>
                          {item.subKeys.map((sk) => {
                            const skData = parsedSubs[sk];
                            const config = SUB_KEY_CONFIG[sk] || { label: sk };
                            const isSubUploaded = Boolean(skData?.fileName);
                            const isSubUploading = uploadingItem === item.index;

                            return (
                              <div key={sk} className="p-2 border rounded bg-white small">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-semibold text-navy-900" style={{ fontSize: 12 }}>
                                    {config.label}
                                    {config.required ? <span className="text-danger ms-1">*</span> : <span className="text-muted ms-1" style={{ fontSize: 10 }}>(optional)</span>}
                                  </span>
                                  {isSubUploaded ? (
                                    <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>Uploaded</span>
                                  ) : (
                                    <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>Missing</span>
                                  )}
                                </div>
                                {skData?.fileName && (
                                  <div className="text-success font-mono-ppsu mb-2 text-truncate" style={{ fontSize: 11 }}>
                                    ✓ {skData.fileName}
                                  </div>
                                )}
                                <div className="d-flex gap-2 flex-wrap">
                                  {isSubUploading ? (
                                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                                  ) : (
                                    <>
                                      {skData?.fileUrl && (
                                        <a
                                          href={skData.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="btn btn-outline-primary btn-sm flex-grow-1"
                                          style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                          View File ↗
                                        </a>
                                      )}
                                      <label
                                        className={`btn ${skData?.fileName ? 'btn-outline-secondary' : 'btn-primary'} btn-sm flex-grow-1 mb-0 cursor-pointer`}
                                        style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                      >
                                        {skData?.fileName ? 'Replace File' : 'Upload File'}
                                        <input
                                          type="file"
                                          hidden
                                          accept=".pdf,.doc,.docx"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadSubItem(item.index, sk, file);
                                          }}
                                        />
                                      </label>
                                      {isSubUploaded && (
                                        <Button
                                          size="sm"
                                          variant="outline-danger"
                                          style={{ minHeight: 38 }}
                                          onClick={() => handleRemoveSubItem(item.index, sk)}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-top d-flex gap-2 flex-wrap">
                          {isUploading ? (
                            <div className="d-flex align-items-center gap-2 text-primary py-2">
                              <div className="spinner-border spinner-border-sm" role="status" />
                              <span className="small">Uploading...</span>
                            </div>
                          ) : (
                            <>
                              {doc?.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-primary btn-sm flex-grow-1"
                                  style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  View File ↗
                                </a>
                              )}
                              <label
                                className={`btn ${isUploaded ? 'btn-outline-secondary' : 'btn-primary'} btn-sm flex-grow-1 mb-0 cursor-pointer`}
                                style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {isUploaded ? 'Replace File' : 'Upload File'}
                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.doc,.docx"
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
                                  style={{ minHeight: 38 }}
                                  onClick={() => handleRemoveSingle(item.index)}
                                >
                                  Remove
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card.Body>
        </Card>
        </>
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
              <>
                <div className="d-none d-md-block">
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
                </div>

                {/* Mobile Faculty Stacked Cards */}
                <div className="d-block d-md-none p-3">
                  <div className="d-flex flex-column gap-3">
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
                          <div key={`m-${fac.id}-${asgn.subjectId || aIdx}-${aIdx}`} className="p-3 border rounded-3 bg-white shadow-sm">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="fs-4">👨‍🏫</span>
                              <div>
                                <div className="fw-bold text-navy-900">{fac.name}</div>
                                <div className="small text-muted">{fac.designation || 'Faculty Member'} · {fac.employeeId || 'No ID'}</div>
                              </div>
                            </div>
                            <div className="small text-muted mb-2">
                              Department: <strong>{fac.department || '—'}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                              <div>
                                <span className="fw-bold font-mono-ppsu text-navy-900">{asgn.subjectCode}</span>
                                <div className="small text-muted">{asgn.subjectName}</div>
                              </div>
                              <Badge
                                bg={isCourseFac ? 'primary' : 'info'}
                                text={isCourseFac ? 'white' : 'dark'}
                                className="px-2 py-1"
                              >
                                {isCourseFac ? 'Course Faculty' : asgn.roleOnSubject}
                              </Badge>
                            </div>
                            <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                              <span className={`badge px-2.5 py-1.5 rounded-pill ${statusBadgeClass(asgn.courseFileStatus)}`}>
                                {statusLabel(asgn.courseFileStatus)}
                              </span>
                              {targetFileId && !['DRAFT', 'NOT_SUBMITTED'].includes(asgn.courseFileStatus) ? (
                                <Link
                                  href={`/coordinator/review/${targetFileId}`}
                                  className="btn btn-sm btn-primary fw-bold px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm"
                                  style={{ minHeight: 38 }}
                                >
                                  👁️ View Uploaded Documents
                                </Link>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5" style={{ fontSize: 11 }}>
                                  🔒 Pending Faculty Submission
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </>
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

