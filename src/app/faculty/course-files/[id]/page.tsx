'use client';

import { useEffect, useState, useRef, useCallback, use, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Row, Col, ProgressBar, Spinner, Alert, Button, Form, Modal, Table, Card, Tabs, Tab } from 'react-bootstrap';
import { SAMPLE_PDF_DATA_URL } from '@/lib/sample-pdf';

const CHECKLIST_ITEMS = [
  { index: 1,  name: 'Institute Vision, Mission & PEO, PSO & PO', maxScore: 10 },
  { index: 2,  name: 'Time Table of the Faculty', maxScore: 10 },
  { index: 3,  name: 'Course information sheet (objectives, pre-requisites, outcomes / Syllabus)', maxScore: 10 },
  { index: 4,  name: 'Student Name List', maxScore: 10 },
  { index: 5,  name: 'Department Academic Calendar', maxScore: 10 },
  { index: 6,  name: 'Course delivery details (Lesson Plan of Lecture & Lab/Tutorials)', maxScore: 10 },
  { index: 7,  name: 'List of Laboratory (or Experiments)', maxScore: 10 },
  { index: 8,  name: 'Laboratory Rubrics', maxScore: 10 },
  { index: 9,  name: 'Continuous Evaluation Rubrics', maxScore: 10 },
  { index: 10, name: 'Lab Manuals / Tutorials', maxScore: 10 },
  { index: 11, name: 'Internal Assessment 1', maxScore: 10 },
  { index: 12, name: 'Internal Assessment 2', maxScore: 10 },
  { index: 13, name: 'Assignment topics, sample assignment, marks statements', maxScore: 10 },
  { index: 14, name: 'Attendance register (ERP)', maxScore: 10 },
  { index: 15, name: 'University exam', maxScore: 10 },
  { index: 16, name: 'CO Attainment output sheet', maxScore: 10 },
  { index: 17, name: 'PO Attainment output sheet', maxScore: 10 },
  { index: 18, name: 'Action to be taken for next year based on CO attainment', maxScore: 10 },
  { index: 19, name: 'Lecture notes', maxScore: 20 },
  { index: 20, name: 'Course Faculty Signature', maxScore: 10 }
];
const LAB_TEACHER_ITEM_INDICES = [2, 4, 8, 9, 14];

function statusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED':        return 'badge-custom-approved';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':   return 'badge-custom-review';
    case 'NEEDS_REVISION': return 'badge-custom-revision';
    default:               return 'badge-custom-draft';
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
    NEEDS_REVISION: 'Needs Revision', APPROVED: 'Approved'
  };
  return map[status] ?? status;
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const normalizeCriteria = (value: unknown) => (Array.isArray(value) ? value : [])
  .filter((criterion: any) => criterion && typeof criterion === 'object' && String(criterion.id || '').trim())
  .map((criterion: any) => ({
    ...criterion,
    id: String(criterion.id),
    label: String(criterion.label || 'Criterion'),
    max: Number(criterion.max) || 0
  }));

export default function FacultyCourseFileDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: courseFileId } = use(params);
  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerEdit, setHeaderEdit] = useState({
    facultyName: '', department: '', school: '', semester: '', courseCode: '', courseTitle: ''
  });
  const [facultyConfirmed, setFacultyConfirmed] = useState(false);
  const [facultySignatureName, setFacultySignatureName] = useState('');
  const [access, setAccess] = useState<{ mode: string; batch?: string; allowedItems?: number[] }>({ mode: 'OWNER' });
  const saveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const [activeIaItem, setActiveIaItem] = useState<number | null>(null);
  const [addDocName, setAddDocName] = useState('Mark Statement & Result Analysis');
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null);
  // Item 8 and Item 9 student marks state. Student identity fields are synced from Item 4.
  const [rubricsModalOpen, setRubricsModalOpen] = useState(false);
  const [activeRubricBatchId, setActiveRubricBatchId] = useState<string>('batch-a');
  const [practicalCols, setPracticalCols] = useState<string[]>([]);
  const [rubricStudents, setRubricStudents] = useState<any[]>([]);

  // Item 9 state is kept as one shared per-student table, with custom criteria.
  const [item9ModalOpen, setItem9ModalOpen] = useState(false);
  const [activeExpTab, setActiveExpTab] = useState('exp-1');
  const [experimentSheets, setExperimentSheets] = useState<any[]>([]);
  const [continuousCriteria, setContinuousCriteria] = useState<any[]>([]);
  const [hasSeparatePracticalGrade, setHasSeparatePracticalGrade] = useState(false);

  // Lifted state for Items 8 & 9 — populated once in fetchData, updated surgically on mark changes
  const [item8Rows, setItem8Rows] = useState<any[]>([]);
  const [item8Criteria, setItem8Criteria] = useState<any[]>([]);
  const [item9Rows, setItem9Rows] = useState<any[]>([]);
  const [item9Criteria, setItem9Criteria] = useState<any[]>([]);

  const fetchData = async () => {
    if (!courseFileId) return;
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`);
      if (!res.ok) {
        let errMsg = 'Failed to load course details';
        try { const errData = await res.json(); errMsg = errData.error || errMsg; } catch (_) {}
        setActionError(errMsg);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCourseFile(data.courseFile);
      const checklistItems = Array.isArray(data.checklistItems) ? data.checklistItems.filter(Boolean) : [];
      setChecklist(checklistItems);
      setAccess(data.courseFile.access || { mode: 'OWNER' });

      setHeaderEdit({
        facultyName: data.courseFile.facultyName || data.courseFile.faculty?.name || '',
        department: data.courseFile.department || data.courseFile.faculty?.department || '',
        school: data.courseFile.school || data.courseFile.faculty?.school || 'School of Engineering',
        semester: data.courseFile.semester || '',
        courseCode: data.courseFile.courseCode || '',
        courseTitle: data.courseFile.courseTitle || ''
      });

      setFacultySignatureName(data.courseFile.facultySignatureName || data.courseFile.faculty?.name || '');
      setFacultyConfirmed(!!data.courseFile.facultyConfirmed);

      // Build merged student list from Item 4 (main + all batch submissions)
      const buildStudentList = (items: any[]) => {
        const db4 = items.find((c: any) => c.itemIndex === 4);
        let raw4: any = {};
        try { if (db4?.subItemsJson) raw4 = JSON.parse(db4.subItemsJson); } catch {}
        const seenIds = new Set<string>();
        const all: any[] = [];
        const add = (student: any, idx: number) => {
          const id = student.id || student.studentId || student.enrolmentNumber || student.rollNo || `s-${idx}`;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            all.push({ id, name: student.name || student.studentName || '', enrolmentNumber: student.enrolmentNumber || student.enrollmentNumber || student.rollNo || '', batch: student.batch });
          }
        };
        (Array.isArray(raw4?.students) ? raw4.students : []).filter(Boolean).forEach(add);
        if (Array.isArray(db4?.batchSubmissions)) {
          db4.batchSubmissions.forEach((bSub: any) => {
            let bs: any[] = Array.isArray(bSub.students) ? bSub.students : [];
            if (!bs.length && bSub.subItemsJson) { try { const p = JSON.parse(bSub.subItemsJson); if (Array.isArray(p.students)) bs = p.students; } catch {} }
            bs.filter(Boolean).forEach(add);
          });
        }
        return all;
      };

      const buildRows = (items: any[], itemIndex: number, studentList: any[]) => {
        const dbItem = items.find((c: any) => c.itemIndex === itemIndex);
        let rawSubs: any = {};
        try { if (dbItem?.subItemsJson) rawSubs = JSON.parse(dbItem.subItemsJson); } catch {}
        const defaultCriteria = itemIndex === 8
          ? [{ id: 'term-work', label: 'Term Work', max: 20, fixed: true }, { id: 'internal-viva', label: 'Internal Viva', max: 10, fixed: true }]
          : [{ id: 'internal-exam-1', label: 'Internal Exam 1', max: 30, fixed: true }, { id: 'internal-exam-2', label: 'Internal Exam 2', max: 30, fixed: true }];
        const criteria = (Array.isArray(rawSubs.criteria) && rawSubs.criteria.length ? rawSubs.criteria : defaultCriteria)
          .filter((c: any) => c && String(c.id || '').trim())
          .map((c: any) => ({ ...c, id: String(c.id), label: String(c.label || 'Criterion'), max: Number(c.max) || 0 }));

        const storedById = new Map<string, any>(
          (Array.isArray(rawSubs.students) ? rawSubs.students : []).filter(Boolean).map((r: any) => [r.studentId || r.enrolmentNumber, r])
        );
        // Merge Lab Teacher marks by student ID
        const labMarks = new Map<string, Record<string, number>>();
        if (Array.isArray(dbItem?.batchSubmissions)) {
          dbItem.batchSubmissions.forEach((bSub: any) => {
            let bs: any[] = Array.isArray(bSub.students) ? bSub.students : [];
            if (!bs.length && bSub.subItemsJson) { try { const p = JSON.parse(bSub.subItemsJson); if (Array.isArray(p.students)) bs = p.students; } catch {} }
            bs.forEach((st: any) => {
              const id = st.studentId || st.id || st.enrolmentNumber;
              if (id && st.marks) labMarks.set(id, { ...(labMarks.get(id) || {}), ...st.marks });
            });
          });
        }

        const autoRows = studentList.map((s: any) => {
          const prev = storedById.get(s.id) || storedById.get(s.enrolmentNumber) || {};
          const lm = labMarks.get(s.id) || labMarks.get(s.enrolmentNumber) || {};
          const marks: Record<string, number> = {};
          criteria.forEach((c: any) => { const v = prev.marks?.[c.id] ?? lm[c.id]; marks[c.id] = v !== undefined ? Number(v) : 0; });
          return { studentId: s.id, name: s.name, enrolmentNumber: s.enrolmentNumber, marks, batch: s.batch };
        });
        const manualRows = (Array.isArray(rawSubs.students) ? rawSubs.students : [])
          .filter((r: any) => r?.isManual)
          .map((r: any) => {
            const marks = { ...(r.marks || {}) };
            criteria.forEach((c: any) => { if (marks[c.id] === undefined) marks[c.id] = 0; });
            return { studentId: r.studentId, name: r.name, enrolmentNumber: r.enrolmentNumber, marks, isManual: true, batch: r.batch };
          });
        return { rows: [...autoRows, ...manualRows], criteria };
      };

      const mergedStudentList = buildStudentList(checklistItems);
      const { rows: r8, criteria: c8 } = buildRows(checklistItems, 8, mergedStudentList);
      const { rows: r9, criteria: c9 } = buildRows(checklistItems, 9, mergedStudentList);
      setItem8Rows(r8); setItem8Criteria(c8);
      setItem9Rows(r9); setItem9Criteria(c9);

      const item8 = checklistItems.find((cli: any) => cli.itemIndex === 8);
      if (item8?.subItemsJson) {
        try {
          const parsed = JSON.parse(item8.subItemsJson);
          if (parsed.criteria) setPracticalCols(parsed.criteria);
          if (parsed.students) setRubricStudents(parsed.students);
        } catch (e) {}
      }

      const item9 = checklistItems.find((cli: any) => cli.itemIndex === 9);
      if (item9?.subItemsJson) {
        try {
          const parsed = JSON.parse(item9.subItemsJson);
          if (parsed.criteria) setContinuousCriteria(parsed.criteria);
          if (parsed.students) setExperimentSheets(parsed.students);
        } catch (e) {}
      }

      const item15 = checklistItems.find((cli: any) => cli.itemIndex === 15);
      if (item15?.subItemsJson) {
        try {
          const parsed = JSON.parse(item15.subItemsJson);
          setHasSeparatePracticalGrade(Boolean(parsed.hasSeparatePracticalGrade));
        } catch (e) {}
      }
    } catch (err: any) {
      setActionError(err.message || 'Error loading page');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (courseFileId) fetchData(); }, [courseFileId]);

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
    </div>
  );

  if (!courseFile) return <Alert variant="danger">Course file not found.</Alert>;

  const isLocked = !['DRAFT', 'NEEDS_REVISION'].includes(courseFile.status);

  const getSubItems = (itemIndex: number) => {
    const dbItem = checklist.find((c) => c.itemIndex === itemIndex);
    if (!dbItem?.subItemsJson) {
      if (itemIndex === 1) {
        return { vision: null, mission: null, peo: null, pso: null, po: null };
      }
      if (itemIndex === 8) {
        return {
          file: null,
          criteria: [
            { id: 'term-work', label: 'Term Work', max: 20, fixed: true },
            { id: 'internal-viva', label: 'Internal Viva', max: 10, fixed: true }
          ],
          students: []
        };
      }
      if (itemIndex === 9) {
        return {
          file: null,
          criteria: [
            { id: 'internal-exam-1', label: 'Internal Exam 1', max: 30, fixed: true },
            { id: 'internal-exam-2', label: 'Internal Exam 2', max: 30, fixed: true }
          ],
          students: []
        };
      }
      if (itemIndex === 11 || itemIndex === 12) {
        return {
          file: null
        };
      }
      if (itemIndex === 13) {
        return {
          assignmentTopics: [],
          sampleAssignment: null,
          marks: [],
          marksFile: null
        };
      }
      if (itemIndex === 15) {
        return { questionPaper: null, gradeSheet: null, hasSeparatePracticalGrade: false, students: [] };
      }
      return null;
    }
    try {
      return JSON.parse(dbItem.subItemsJson);
    } catch (e) {
      return null;
    }
  };

  const normalizeCriteria = (value: unknown) => (Array.isArray(value) ? value : [])
    .filter((criterion: any) => criterion && typeof criterion === 'object' && String(criterion.id || '').trim())
    .map((criterion: any) => ({
      ...criterion,
      id: String(criterion.id),
      label: String(criterion.label || 'Criterion'),
      max: Number(criterion.max) || 0
    }));

  const getMergedSubItems = (itemIndex: number) => {
    const item = checklist.find((entry) => entry.itemIndex === itemIndex);
    if (!item?.batchSubmissions) return getSubItems(itemIndex);
    const submissions = (Array.isArray(item.batchSubmissions) ? item.batchSubmissions : []).filter(Boolean).map((entry: any) => {
      try { return { batch: entry.batch, fileName: entry.fileName, fileUrl: entry.fileUrl, ...(entry.subItemsJson ? JSON.parse(entry.subItemsJson) : {}) }; } catch (e) { return { batch: entry.batch, fileName: entry.fileName, fileUrl: entry.fileUrl }; }
    });
    const base = submissions[0] || {};
    if (itemIndex === 4) return { ...base, students: submissions.flatMap((entry: any) => (Array.isArray(entry.students) ? entry.students : []).filter(Boolean).map((student: any) => ({ ...student, batch: entry.batch }))), batches: submissions };
    if (itemIndex === 8) {
      const criterionPairs = submissions.flatMap((entry: any) => (Array.isArray(entry.criteria) ? entry.criteria : []).filter(Boolean).filter((criterion: any) => String(criterion.id || '').trim()).map((criterion: any) => [String(criterion.id), criterion] as [string, any]));
      const criteria = normalizeCriteria(Array.from(new Map(criterionPairs).values()));
      return { ...base, criteria, students: submissions.flatMap((entry: any) => (Array.isArray(entry.students) ? entry.students : []).filter(Boolean).map((student: any) => ({ ...student, batch: entry.batch }))), batches: submissions };
    }
    return base;
  };

  const isItemComplete = (itemIndex: number) => {
    const dbItem = checklist.find((c) => c.itemIndex === itemIndex);
    if (!dbItem) return false;

    if (itemIndex === 1) {
      const subs = getSubItems(1);
      return !!(subs?.vision?.fileName && subs?.mission?.fileName && subs?.peo?.fileName && subs?.pso?.fileName && subs?.po?.fileName);
    }
    if (itemIndex === 4) {
      const subs = getSubItems(4);
      return Boolean(subs?.students?.length || dbItem.fileName || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED');
    }
    if (itemIndex === 8) {
      const subs = getSubItems(8);
      return Boolean(subs?.students?.length && subs?.criteria?.length) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 9) {
      const subs = getSubItems(9);
      return Boolean(subs?.students?.length && subs?.criteria?.length) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 11 || itemIndex === 12) {
      return Boolean(getSubItems(9)?.students?.length || getSubItems(itemIndex)?.file?.fileName) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 13) {
      const subs = getSubItems(13);
      return Boolean(subs?.assignmentTopics?.length && (subs?.sampleAssignment?.fileName || subs?.marks?.length || subs?.marksFile?.fileName)) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 15) {
      const subs = getSubItems(15);
      return Boolean(subs?.gradeSheet?.fileName && subs?.students?.length) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    return dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED' || Boolean(dbItem.fileName);
  };

  const getStudentList = () => {
    const raw = getSubItems(4);
    let allStudents: any[] = [];
    const seenIds = new Set();

    const addStudent = (student: any, index: number) => {
      const id = student.id || student.studentId || student.enrolmentNumber || student.rollNo || `student-${index}`;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        allStudents.push({
          id,
          name: student.name || student.studentName || '',
          enrolmentNumber: student.enrolmentNumber || student.enrollmentNumber || student.rollNo || '',
          batch: student.batch
        });
      }
    };

    // Add main/Course Teacher Item 4 students first
    const mainStudents = (Array.isArray(raw?.students) ? raw.students : []).filter(Boolean);
    mainStudents.forEach(addStudent);

    // Add lab batch submission students if present (from Item 4 batchSubmissions)
    const item4Db = checklist.find((c: any) => c.itemIndex === 4);
    if (Array.isArray(item4Db?.batchSubmissions)) {
      item4Db.batchSubmissions.forEach((bSub: any) => {
        let bStudents: any[] = [];
        if (Array.isArray(bSub.students)) {
          bStudents = bSub.students;
        } else if (bSub.subItemsJson) {
          try {
            const parsed = JSON.parse(bSub.subItemsJson);
            if (Array.isArray(parsed.students)) bStudents = parsed.students;
          } catch (e) {}
        }
        bStudents.filter(Boolean).forEach(addStudent);
      });
    }

    return allStudents;
  };

  const syncStudentRows = (arg1: any, arg2: any[] = [], arg3: any[] = []) => {
    let itemIndex = 8;
    let rows: any[] = [];
    let criteria: any[] = [];

    if (typeof arg1 === 'number') {
      itemIndex = arg1;
      rows = arg2;
      criteria = arg3;
    } else {
      rows = arg1;
      criteria = arg2;
    }

    const studentList = getStudentList();
    const safeRows = (Array.isArray(rows) ? rows : []).filter(Boolean);
    const safeCriteria = normalizeCriteria(criteria);
    const storedById = new Map(safeRows.map((row: any) => [row.studentId || row.enrolmentNumber, row]));

    // Build lookup map of marks submitted by Lab Teachers across batches for Item 8 and Item 9
    const labMarksByStudentId = new Map<string, Record<string, number>>();
    const itemDb = checklist.find((c: any) => c.itemIndex === itemIndex);
    if (itemDb?.batchSubmissions && Array.isArray(itemDb.batchSubmissions)) {
      itemDb.batchSubmissions.forEach((bSub: any) => {
        let bStudents: any[] = [];
        if (Array.isArray(bSub.students)) {
          bStudents = bSub.students;
        } else if (bSub.subItemsJson) {
          try {
            const parsed = JSON.parse(bSub.subItemsJson);
            if (Array.isArray(parsed.students)) bStudents = parsed.students;
          } catch (e) {}
        }
        bStudents.forEach((st: any) => {
          const id = st.studentId || st.id || st.enrolmentNumber;
          if (id && st.marks) {
            const current = labMarksByStudentId.get(id) || {};
            labMarksByStudentId.set(id, { ...current, ...st.marks });
          }
        });
      });
    }

    // 1. Map auto-populated students from Item 4 merged list
    const autoRows = studentList.map((student: any) => {
      const previous = storedById.get(student.id) || storedById.get(student.enrolmentNumber) || {};
      const labMarks = labMarksByStudentId.get(student.id) || labMarksByStudentId.get(student.enrolmentNumber) || {};

      const marks: Record<string, number> = {};
      safeCriteria.forEach((criterion: any) => {
        const val = previous.marks?.[criterion.id] ?? labMarks[criterion.id];
        marks[criterion.id] = val !== undefined ? Number(val) : 0;
      });

      return {
        studentId: student.id,
        name: student.name,
        enrolmentNumber: student.enrolmentNumber,
        marks,
        batch: student.batch
      };
    });

    // 2. Map manually added students
    const manualRows = safeRows
      .filter((row: any) => row.isManual)
      .map((row: any) => {
        const marks = { ...(row.marks || {}) };
        safeCriteria.forEach((criterion: any) => { if (marks[criterion.id] === undefined) marks[criterion.id] = 0; });
        return {
          studentId: row.studentId,
          name: row.name,
          enrolmentNumber: row.enrolmentNumber,
          marks,
          isManual: true,
          batch: row.batch
        };
      });

    return [...autoRows, ...manualRows];
  };

  const handleManualAddStudent = async (itemIndex: number) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    if (!subs.students) subs.students = [];
    const defaultCriteria = itemIndex === 8
      ? [{ id: 'term-work', label: 'Term Work', max: 20, fixed: true }, { id: 'internal-viva', label: 'Internal Viva', max: 10, fixed: true }]
      : [{ id: 'internal-exam-1', label: 'Internal Exam 1', max: 30, fixed: true }, { id: 'internal-exam-2', label: 'Internal Exam 2', max: 30, fixed: true }];
    if (!Array.isArray(subs.criteria) || subs.criteria.length === 0) subs.criteria = defaultCriteria;
    const newStudentId = `manual-${Date.now()}`;
    const newStudent: any = { studentId: newStudentId, name: '', enrolmentNumber: '', marks: {}, isManual: true, batch: access.batch || 'A' };
    normalizeCriteria(subs.criteria).forEach((criterion: any) => { newStudent.marks[criterion.id] = 0; });
    subs.students.push(newStudent);
    await saveStructuredItem(itemIndex, subs, 'UPLOADED');
    // Add to lifted state immediately so table updates without fetchData round-trip
    if (itemIndex === 8) setItem8Rows(prev => [...prev, newStudent]);
    else if (itemIndex === 9) setItem9Rows(prev => [...prev, newStudent]);
  };

  const debouncedSaveStructuredItem = (itemIndex: number, subs: any, status = 'UPLOADED') => {
    if (saveTimeoutsRef.current[itemIndex]) {
      clearTimeout(saveTimeoutsRef.current[itemIndex]);
    }
    saveTimeoutsRef.current[itemIndex] = setTimeout(() => {
      saveStructuredItem(itemIndex, subs, status);
    }, 600);
  };

  const handleManualStudentFieldChange = (itemIndex: number, studentId: string, field: 'name' | 'enrolmentNumber', value: string) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    if (!subs.students) subs.students = [];
    const student = subs.students.find((st: any) => st.studentId === studentId);
    if (student) {
      student[field] = value;
      setChecklist((prev) => prev.map((item) => item.itemIndex === itemIndex ? { ...item, subItemsJson: JSON.stringify(subs) } : item));
      debouncedSaveStructuredItem(itemIndex, subs, 'UPLOADED');
    }
  };

  const handleRemoveManualStudent = async (itemIndex: number, studentId: string) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    if (subs.students) {
      subs.students = subs.students.filter((st: any) => st.studentId !== studentId);
      await saveStructuredItem(itemIndex, subs, 'UPLOADED');
      fetchData();
    }
  };

  const saveStructuredItem = async (itemIndex: number, subs: any, status = 'UPLOADED') => {
    await fetch(`/api/checklist/${courseFileId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIndex, status, fileName: subs.file?.fileName || `${itemIndex}-structured-data.json`, subItemsJson: JSON.stringify(subs) })
    });
    setChecklist((prev) => prev.map((item) => item.itemIndex === itemIndex ? { ...item, status, subItemsJson: JSON.stringify(subs), fileName: subs.file?.fileName } : item));
  };

  const handleStructuredFileUpload = async (itemIndex: number, file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    subs.file = file ? { fileName: file.name, fileUrl: await readFileAsDataUrl(file), uploadDate: new Date().toISOString().split('T')[0] } : null;
    await saveStructuredItem(itemIndex, subs, file || subs.students?.length || subs.criteria?.length ? 'UPLOADED' : 'EMPTY');
    setActionSuccess(file ? `File uploaded for Item #${itemIndex}.` : `File removed from Item #${itemIndex}.`);
    fetchData();
  };

  const handleSubFileUpload = async (itemIndex: number, key: string, file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    subs[key] = file ? { fileName: file.name, fileUrl: await readFileAsDataUrl(file), uploadDate: new Date().toISOString().split('T')[0] } : null;
    await saveStructuredItem(itemIndex, subs, file || subs.students?.length || subs.assignmentTopics?.length ? 'UPLOADED' : 'EMPTY');
    fetchData();
  };

  const handleAssignmentMarkChange = async (studentId: string, value: number) => {
    if (isLocked) return;
    const subs = getSubItems(13) || {};
    subs.marks = syncStudentRows(13, subs.marks, [{ id: 'assignment-marks', label: 'Marks', max: 100, fixed: true }]);
    const row = subs.marks.find((entry: any) => entry.studentId === studentId);
    if (row) {
      row.marks = row.marks && typeof row.marks === 'object' ? row.marks : {};
      row.marks['assignment-marks'] = Math.max(0, value || 0);
    }
    await saveStructuredItem(13, subs, 'UPLOADED');
    setChecklist((prev) => prev.map((item) => item.itemIndex === 13 ? { ...item, subItemsJson: JSON.stringify(subs) } : item));
  };

  const handleCriterion = async (itemIndex: number, criterion: any, remove = false) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || {};
    subs.criteria = remove ? (subs.criteria || []).filter((entry: any) => entry.id !== criterion.id) : [...(subs.criteria || []), criterion];
    subs.students = syncStudentRows(itemIndex, subs.students, subs.criteria);
    await saveStructuredItem(itemIndex, subs, 'UPLOADED');
    // Refresh lifted row state after criterion change
    const newCriteria = normalizeCriteria(subs.criteria);
    if (itemIndex === 8) {
      setItem8Criteria(newCriteria);
      setItem8Rows(prev => prev.map(r => { const m = { ...r.marks }; newCriteria.forEach((c: any) => { if (m[c.id] === undefined) m[c.id] = 0; }); return { ...r, marks: m }; }));
    } else {
      setItem9Criteria(newCriteria);
      setItem9Rows(prev => prev.map(r => { const m = { ...r.marks }; newCriteria.forEach((c: any) => { if (m[c.id] === undefined) m[c.id] = 0; }); return { ...r, marks: m }; }));
    }
    fetchData();
  };

  const handleMarkChange = useCallback((itemIndex: number, studentId: string, criterionId: string, value: number) => {
    if (isLocked) return;
    const clamped = Math.max(0, value || 0);
    // Update only the specific row in lifted state — O(1), no re-render of other rows
    if (itemIndex === 8) {
      setItem8Rows(prev => prev.map(r => r.studentId === studentId ? { ...r, marks: { ...r.marks, [criterionId]: clamped } } : r));
    } else if (itemIndex === 9) {
      setItem9Rows(prev => prev.map(r => r.studentId === studentId ? { ...r, marks: { ...r.marks, [criterionId]: clamped } } : r));
    }
    // Debounce the API save — build updated subs from the existing stored subItemsJson
    const saveRows = itemIndex === 8 ? item8Rows : item9Rows;
    const updatedRows = saveRows.map(r => r.studentId === studentId ? { ...r, marks: { ...r.marks, [criterionId]: clamped } } : r);
    if (saveTimeoutsRef.current[itemIndex]) clearTimeout(saveTimeoutsRef.current[itemIndex]);
    saveTimeoutsRef.current[itemIndex] = setTimeout(() => {
      const subs = getSubItems(itemIndex) || {};
      subs.students = updatedRows;
      saveStructuredItem(itemIndex, subs, 'UPLOADED');
    }, 600);
  }, [isLocked, item8Rows, item9Rows, checklist]);

  const handleLabTeacherSubmit = async () => {
    if (isLocked || submitLoading) return;
    setSubmitLoading(true);
    setActionError(''); setActionSuccess('');
    try {
      const allowedItems = [2, 4, 8, 9, 14];
      for (const idx of allowedItems) {
        const subs = getSubItems(idx) || {};
        await saveStructuredItem(idx, subs, 'SUBMITTED');
      }
      setActionSuccess(`Batch ${access.batch} lab data submitted successfully to Course Teacher!`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit lab data');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAssignmentTopic = async (topic: any, remove = false) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: [], sampleAssignment: null, marks: [], marksFile: null };
    subs.assignmentTopics = remove ? subs.assignmentTopics.filter((entry: any) => entry.id !== topic.id) : [...(subs.assignmentTopics || []), topic];
    await saveStructuredItem(13, subs, 'UPLOADED');
    fetchData();
  };

  const handleUpdateAssignmentTopic = async (topic: any) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: [], sampleAssignment: null, marks: [], marksFile: null };
    subs.assignmentTopics = (subs.assignmentTopics || []).map((entry: any) => entry.id === topic.id ? topic : entry);
    await saveStructuredItem(13, subs, 'UPLOADED');
  };

  const handleTogglePracticalGrade = async (enabled: boolean) => {
    if (isLocked) return;
    const subs = getSubItems(15) || { questionPaper: null, gradeSheet: null, students: [] };
    subs.hasSeparatePracticalGrade = enabled;
    await saveStructuredItem(15, subs, subs.gradeSheet?.fileName || subs.students?.length ? 'UPLOADED' : 'EMPTY');
    setHasSeparatePracticalGrade(enabled);
  };

  const handleGradeChange = async (studentId: string, field: 'theoryGrade' | 'practicalGrade', value: string) => {
    if (isLocked) return;
    const subs = getSubItems(15) || { questionPaper: null, gradeSheet: null, students: [] };
    const source = getStudentList();
    subs.students = source.map((student: any) => {
      const existing = (subs.students || []).find((row: any) => row.studentId === student.id) || {};
      return { ...existing, studentId: student.id, name: student.name, enrolmentNumber: student.enrolmentNumber, [field]: value };
    });
    await saveStructuredItem(15, subs, 'UPLOADED');
    setChecklist((prev) => prev.map((item) => item.itemIndex === 15 ? { ...item, subItemsJson: JSON.stringify(subs) } : item));
  };

  const isLabTeacher = access.mode === 'LAB_BATCH';
  const scopedChecklistItems = isLabTeacher
    ? CHECKLIST_ITEMS.filter((item) => LAB_TEACHER_ITEM_INDICES.includes(item.index))
    : CHECKLIST_ITEMS;
  const checklistTotal = scopedChecklistItems.length;
  const completedCount = scopedChecklistItems.filter((item) => isItemComplete(item.index)).length;
  const percent = Math.round((completedCount / checklistTotal) * 100);

  const handleSaveHeader = async () => {
    if (isLocked) return;
    setHeaderSaving(true); setActionError(''); setActionSuccess('');
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerEdit)
      });
      if (!res.ok) throw new Error('Failed to update header details');
      setActionSuccess('Faculty & Course details updated.');
      fetchData();
    } catch (err: any) { setActionError(err.message); } finally { setHeaderSaving(false); }
  };

  // Standard upload handler (converts file to real Data URL)
  const handleUpload = async (itemIndex: number, itemName: string, selectedFile?: File) => {
    if (isLocked) return;
    if (access.mode === 'LAB_BATCH' && !LAB_TEACHER_ITEM_INDICES.includes(itemIndex)) return;
    setActionError(''); setActionSuccess('');
    if (!selectedFile) return;

    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const isSig = itemIndex === 20 && access.mode !== 'LAB_BATCH';
      let studentListJson: string | undefined;
      if (itemIndex === 4 && /\.(csv|txt)$/i.test(selectedFile.name)) {
        const lines = (await selectedFile.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const rows = lines.slice(1).map((line, index) => {
          const [enrolmentNumber, name] = line.split(',').map((value) => value.trim());
          return { id: enrolmentNumber || `student-${index}`, enrolmentNumber: enrolmentNumber || '', name: name || '' };
        }).filter((student) => student.enrolmentNumber && student.name);
        studentListJson = JSON.stringify({ students: rows });
      }

      const res = await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex,
          status: 'UPLOADED',
          fileName: selectedFile.name,
          fileUrl: dataUrl,
          ...(studentListJson ? { subItemsJson: studentListJson } : {})
        })
      });
      if (!res.ok) throw new Error('Upload failed');

      if (isSig) {
        await fetch(`/api/course-files/${courseFileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facultySignatureUrl: dataUrl
          })
        });
      }

      setActionSuccess(`Item #${itemIndex} (${selectedFile.name}) uploaded.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleRemove = async (itemIndex: number) => {
    if (isLocked) return;
    if (access.mode === 'LAB_BATCH' && !LAB_TEACHER_ITEM_INDICES.includes(itemIndex)) return;
    setActionError(''); setActionSuccess('');
    try {
      const res = await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, status: 'EMPTY', fileName: null, fileUrl: null, subItemsJson: null })
      });
      if (!res.ok) throw new Error('Removal failed');
      setActionSuccess(`Item #${itemIndex} cleared.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // Item 1 Sub-upload handler with real Data URL
  const handleItem1SubUpload = async (subKey: 'vision' | 'mission' | 'peo' | 'pso' | 'po', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(1) || { vision: null, mission: null, peo: null, pso: null, po: null };

    if (!file) {
      subs[subKey] = null;
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      subs[subKey] = {
        fileName: file.name,
        fileUrl: dataUrl,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    }

    const isAll5Uploaded = !!(subs.vision?.fileName && subs.mission?.fileName && subs.peo?.fileName && subs.pso?.fileName && subs.po?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 1,
          status: isAll5Uploaded ? 'UPLOADED' : 'EMPTY',
          fileName: 'vision_mission_peo_pso_po_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess(`Item 1 (${subKey.toUpperCase()}) updated.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // IA Fixed Sub-upload handler with real Data URL
  const handleIaFixedUpload = async (itemIndex: number, subKey: 'timetable' | 'questionPaper' | 'sampleAnswerSheet', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex) || { timetable: null, questionPaper: null, sampleAnswerSheet: null, additionalDocuments: [] };
    
    if (!file) {
      subs[subKey] = null;
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      subs[subKey] = {
        fileName: file.name,
        fileUrl: dataUrl,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    }

    const isCompComplete = !!(subs.timetable?.fileName && subs.questionPaper?.fileName && subs.sampleAnswerSheet?.fileName && subs.markStatement?.fileName);
    const parentFileName = `ia${itemIndex === 11 ? 1 : 2}_package.pdf`;

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex,
          status: isCompComplete ? 'UPLOADED' : 'EMPTY',
          fileName: parentFileName,
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess(`Sub-item updated for Item #${itemIndex}.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // Item 13 Fixed Sub-upload Handler
  const handleItem13FixedUpload = async (subKey: 'assignmentTopics' | 'sampleAssignment', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: null, sampleAssignment: null, assignments: [], additionalDocuments: [] };
    
    if (!file) {
      subs[subKey] = null;
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      subs[subKey] = {
        fileName: file.name,
        fileUrl: dataUrl,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    }

    const isComplete = !!(subs.assignmentTopics?.fileName && subs.sampleAssignment?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 13,
          status: isComplete ? 'UPLOADED' : 'EMPTY',
          fileName: 'assignment_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('Item 13 sub-document updated.');
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // Item 13 Dynamic Assignment Handlers (+ Add Assignment)
  const handleAddAssignmentRow = async () => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: null, sampleAssignment: null, assignments: [], additionalDocuments: [] };
    const list = subs.assignments || [];
    const newCount = list.length + 1;
    list.push({
      id: `asgn-${Date.now()}`,
      name: `Assignment ${newCount} — Marks Statement`,
      fileName: null,
      fileUrl: null
    });
    subs.assignments = list;
    const isComplete = !!(subs.assignmentTopics?.fileName && subs.sampleAssignment?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 13,
          status: isComplete ? 'UPLOADED' : 'EMPTY',
          fileName: 'assignment_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleUpdateAssignmentName = async (id: string, name: string) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: null, sampleAssignment: null, assignments: [], additionalDocuments: [] };
    const list = subs.assignments || [];
    const target = list.find((a: any) => a.id === id);
    if (target) {
      target.name = name;
      subs.assignments = list;
      const isComplete = !!(subs.assignmentTopics?.fileName && subs.sampleAssignment?.fileName);
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 13,
          status: isComplete ? 'UPLOADED' : 'EMPTY',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setChecklist((prev) => prev.map((c) => c.itemIndex === 13 ? { ...c, subItemsJson: JSON.stringify(subs) } : c));
    }
  };

  const handleUploadAssignmentFile = async (id: string, file: File) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: null, sampleAssignment: null, assignments: [], additionalDocuments: [] };
    const list = subs.assignments || [];
    const target = list.find((a: any) => a.id === id);
    if (target && file) {
      const dataUrl = await readFileAsDataUrl(file);
      target.fileName = file.name;
      target.fileUrl = dataUrl;
      subs.assignments = list;
      const isComplete = !!(subs.assignmentTopics?.fileName && subs.sampleAssignment?.fileName);

      try {
        await fetch(`/api/checklist/${courseFileId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemIndex: 13,
            status: isComplete ? 'UPLOADED' : 'EMPTY',
            subItemsJson: JSON.stringify(subs)
          })
        });
        setActionSuccess(`File uploaded for ${target.name}.`);
        fetchData();
      } catch (err: any) { setActionError(err.message); }
    }
  };

  const handleRemoveAssignmentRow = async (id: string) => {
    if (isLocked) return;
    const subs = getSubItems(13) || { assignmentTopics: null, sampleAssignment: null, assignments: [], additionalDocuments: [] };
    subs.assignments = (subs.assignments || []).filter((a: any) => a.id !== id);
    const isComplete = !!(subs.assignmentTopics?.fileName && subs.sampleAssignment?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 13,
          status: isComplete ? 'UPLOADED' : 'EMPTY',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('Assignment row removed.');
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // IA Additional document handler with real Data URL
  const handleAddIaCustomDoc = async () => {
    if (!activeIaItem || isLocked) return;
    if (!addDocName.trim()) { setActionError('Document name is required'); return; }
    
    const subs = getSubItems(activeIaItem) || { timetable: null, questionPaper: null, sampleAnswerSheet: null, additionalDocuments: [] };
    const docs = subs.additionalDocuments || [];
    let dataUrl = SAMPLE_PDF_DATA_URL;

    if (addDocFile) {
      dataUrl = await readFileAsDataUrl(addDocFile);
    }

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: addDocName.trim(),
      fileName: addDocFile ? addDocFile.name : `${addDocName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      fileUrl: dataUrl,
      fileType: addDocFile ? (addDocFile.name.split('.').pop()?.toUpperCase() || 'PDF') : 'PDF',
      uploadDate: new Date().toISOString().split('T')[0]
    };

    docs.push(newDoc);
    subs.additionalDocuments = docs;
    const isCompComplete = !!(subs.timetable?.fileName && subs.questionPaper?.fileName && subs.sampleAnswerSheet?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: activeIaItem,
          status: isCompComplete ? 'UPLOADED' : 'EMPTY',
          fileName: `ia${activeIaItem === 11 ? 1 : 2}_package.pdf`,
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess(`Additional document added to Item #${activeIaItem}.`);
      setActiveIaItem(null);
      setAddDocName('Mark Statement & Result Analysis');
      setAddDocFile(null);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleRemoveIaCustomDoc = async (itemIndex: number, docId: string) => {
    if (isLocked) return;
    const subs = getSubItems(itemIndex);
    if (!subs) return;
    subs.additionalDocuments = (subs.additionalDocuments || []).filter((d: any) => d.id !== docId);
    const isCompComplete = !!(subs.timetable?.fileName && subs.questionPaper?.fileName && subs.sampleAnswerSheet?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex,
          status: isCompComplete ? 'UPLOADED' : 'EMPTY',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('Additional document removed.');
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  // University Exam Sub-upload handler with real Data URL
  const handleUnivSubUpload = async (subKey: 'questionPaper' | 'gradeSheet' | 'resultAnalysis', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(15) || { questionPaper: null, gradeSheet: null, resultAnalysis: null };
    
    if (!file) {
      subs[subKey] = null;
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      subs[subKey] = {
        fileName: file.name,
        fileUrl: dataUrl,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    }

    const isAllThreeUploaded = !!(subs.questionPaper?.fileName && subs.gradeSheet?.fileName && subs.resultAnalysis?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 15,
          status: isAllThreeUploaded ? 'UPLOADED' : 'EMPTY',
          fileName: 'university_exam_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('University Exam sub-document updated.');
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const openRubricsModalForBatch = (batchId: string) => {
    const subs = getSubItems(8) || {
      batches: [
        { id: 'batch-a', name: 'Batch A' },
        { id: 'batch-b', name: 'Batch B' }
      ]
    };
    const batch = (subs.batches || []).find((b: any) => b.id === batchId);
    setActiveRubricBatchId(batchId);
    if (batch?.practicalCols) setPracticalCols(batch.practicalCols);
    if (batch?.students) setRubricStudents(batch.students);
    setRubricsModalOpen(true);
  };

  const handleSaveItem8Rubrics = async () => {
    if (isLocked) return;
    const subs = getSubItems(8) || {
      batches: [
        { id: 'batch-a', name: 'Batch A' },
        { id: 'batch-b', name: 'Batch B' }
      ]
    };
    const list = subs.batches || [];
    let batch = list.find((b: any) => b.id === activeRubricBatchId);
    if (!batch) {
      batch = { id: activeRubricBatchId, name: activeRubricBatchId };
      list.push(batch);
    }
    batch.fileName = `${batch.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_rubrics.tbl`;
    batch.fileUrl = SAMPLE_PDF_DATA_URL;
    batch.practicalCols = practicalCols;
    batch.students = rubricStudents;

    subs.batches = list;
    const batchA = list.find((b: any) => b.id === 'batch-a');
    const batchB = list.find((b: any) => b.id === 'batch-b');
    const isBothCompComplete = !!(batchA?.fileName && batchB?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 8,
          status: isBothCompComplete ? 'UPLOADED' : 'EMPTY',
          fileName: 'laboratory_rubrics_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess(`Laboratory Rubrics for ${batch.name} saved.`);
      setRubricsModalOpen(false);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleBatchFileUpload = async (batchId: string, file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(8) || {
      batches: [
        { id: 'batch-a', name: 'Batch A' },
        { id: 'batch-b', name: 'Batch B' }
      ]
    };
    const list = subs.batches || [];
    const batch = list.find((b: any) => b.id === batchId);
    if (!batch) return;

    if (!file) {
      batch.fileName = null;
      batch.fileUrl = null;
    } else {
      const dataUrl = await readFileAsDataUrl(file);
      batch.fileName = file.name;
      batch.fileUrl = dataUrl;
    }

    subs.batches = list;
    const batchA = list.find((b: any) => b.id === 'batch-a');
    const batchB = list.find((b: any) => b.id === 'batch-b');
    const isBothCompComplete = !!(batchA?.fileName && batchB?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 8,
          status: isBothCompComplete ? 'UPLOADED' : 'EMPTY',
          fileName: 'laboratory_rubrics_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess(`File updated for ${batch.name}.`);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleAddBatch = async () => {
    if (isLocked) return;
    const subs = getSubItems(8) || {
      batches: [
        { id: 'batch-a', name: 'Batch A' },
        { id: 'batch-b', name: 'Batch B' }
      ]
    };
    const list = subs.batches || [];
    const nextChar = String.fromCharCode(65 + list.length);
    list.push({
      id: `batch-${Date.now()}`,
      name: `Batch ${nextChar}`,
      fileName: null,
      fileUrl: null,
      practicalCols: ['P-1', 'P-2', 'P-3', 'P-4', 'P-5'],
      students: rubricStudents
    });
    subs.batches = list;

    const batchA = list.find((b: any) => b.id === 'batch-a');
    const batchB = list.find((b: any) => b.id === 'batch-b');
    const isBothCompComplete = !!(batchA?.fileName && batchB?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 8,
          status: isBothCompComplete ? 'UPLOADED' : 'EMPTY',
          subItemsJson: JSON.stringify(subs)
        })
      });
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleUpdateBatchName = async (batchId: string, name: string) => {
    if (isLocked) return;
    const subs = getSubItems(8);
    if (!subs) return;
    const target = (subs.batches || []).find((b: any) => b.id === batchId);
    if (target) {
      target.name = name;
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 8,
          subItemsJson: JSON.stringify(subs)
        })
      });
      setChecklist((prev) => prev.map((c) => c.itemIndex === 8 ? { ...c, subItemsJson: JSON.stringify(subs) } : c));
    }
  };

  const handleRemoveBatch = async (batchId: string) => {
    if (isLocked || batchId === 'batch-a' || batchId === 'batch-b') return;
    const subs = getSubItems(8);
    if (!subs) return;
    subs.batches = (subs.batches || []).filter((b: any) => b.id !== batchId);

    const batchA = subs.batches.find((b: any) => b.id === 'batch-a');
    const batchB = subs.batches.find((b: any) => b.id === 'batch-b');
    const isBothCompComplete = !!(batchA?.fileName && batchB?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 8,
          status: isBothCompComplete ? 'UPLOADED' : 'EMPTY',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('Batch removed.');
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleSaveItem9Sheets = async () => {
    if (isLocked) return;
    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 9,
          status: 'UPLOADED',
          fileName: `continuous_eval_${experimentSheets.length}_experiments.tbl`,
          fileUrl: SAMPLE_PDF_DATA_URL,
          subItemsJson: JSON.stringify({ sheets: experimentSheets })
        })
      });
      setActionSuccess('Continuous Evaluation experiment sheets saved.');
      setItem9ModalOpen(false);
      fetchData();
    } catch (err: any) { setActionError(err.message); }
  };

  const handleSubmit = async () => {
    if (completedCount < 20) {
      setActionError('All 20 checklist items (including required sub-sections and Item 20 signature) must be complete before submission.');
      return;
    }
    if (!facultyConfirmed) {
      setActionError('Please confirm the mandatory checklist declaration checkbox.');
      return;
    }

    setSubmitLoading(true); setActionError(''); setActionSuccess('');
    try {
      const res = await fetch(`/api/course-files/${courseFileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SUBMITTED',
          facultySignatureName: facultySignatureName.trim() || courseFile.faculty?.name,
          facultySignedAt: new Date().toISOString(),
          facultyConfirmed: true
        })
      });
      if (!res.ok) throw new Error('Failed to submit');
      setActionSuccess('Course file submitted to Coordinator for review!');
      fetchData();
    } catch (err: any) { setActionError(err.message); } finally { setSubmitLoading(false); }
  };

  const studentListUploaded = access.mode === 'OWNER' ? true : isItemComplete(4);
  const visibleChecklistItems = CHECKLIST_ITEMS;

  return (
    <div>
      {/* Top Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <button
          className="btn btn-link p-0 text-secondary text-decoration-none d-flex align-items-center gap-1"
          onClick={() => router.back()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
          </svg>
          Back
        </button>

        <div className="d-flex align-items-center gap-2">
          <Link href={`/report/${courseFileId}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            🖨️ View / Print Form
          </Link>
          {courseFile.generatedReportPath && (
            <a href={courseFile.generatedReportPath} download className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
              Download DOCX Report
            </a>
          )}
          <span className={`badge-custom ${statusBadgeClass(courseFile.status)}`}>
            {statusLabel(courseFile.status)}
          </span>
        </div>
      </div>

      {actionError && (
        <Alert variant="danger" dismissible onClose={() => setActionError('')} className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>{actionError}</div>
          {actionError.toLowerCase().includes('not found') && (
            <Link href="/faculty/my-courses" className="btn btn-outline-danger btn-sm fw-bold">
              ← Return to My Courses
            </Link>
          )}
        </Alert>
      )}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      {access.mode === 'LAB_BATCH' && (
        <Card className="mb-4 border-0 shadow-sm" style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
          <Card.Body className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
            <div>
              <h6 className="fw-bold text-success mb-1">Batch {access.batch} Lab Teacher Submission Portal</h6>
              <p className="small text-secondary mb-0">Manage your assigned lab items (Items 2, 4, 8, 9, 14). Submitting will send your lab data & rubrics directly to the Course Teacher.</p>
            </div>
            <Button
              variant="success"
              size="sm"
              className="fw-bold px-3 py-2"
              disabled={isLocked || submitLoading}
              onClick={handleLabTeacherSubmit}
            >
              {submitLoading ? <Spinner animation="border" size="sm" /> : `✓ Submit Batch ${access.batch} Data`}
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* SECTION 0: Faculty & Course Details Header Block */}
      <Card className="card-custom mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-navy-900 mb-0">Faculty & Course Details</h5>
          {!isLocked && (
            <Button size="sm" variant="outline-primary" onClick={handleSaveHeader} disabled={headerSaving}>
              {headerSaving ? <Spinner animation="border" size="sm" /> : 'Save Header Info'}
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Faculty Name</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.facultyName}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, facultyName: e.target.value })}
                className="py-1"
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Department</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.department}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, department: e.target.value })}
                className="py-1"
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">School</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.school}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, school: e.target.value })}
                className="py-1"
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Semester</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.semester}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, semester: e.target.value })}
                className="py-1"
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Course Code</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.courseCode}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, courseCode: e.target.value })}
                className="py-1 font-mono-ppsu fw-bold"
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Course Title</Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.courseTitle}
                disabled={isLocked}
                onChange={(e) => setHeaderEdit({ ...headerEdit, courseTitle: e.target.value })}
                className="py-1"
              />
            </Col>
          </Row>

          <div className="mt-4">
            <div className="d-flex justify-content-between small text-secondary mb-1">
              <span>Overall Completion Progress</span>
              <span className="fw-bold font-mono-ppsu">{completedCount}/20 ({percent}%)</span>
            </div>
            <ProgressBar now={percent} className="progress-custom" style={{ height: 8 }} />
          </div>
        </Card.Body>
      </Card>

      {/* Lock banner */}
      {isLocked && courseFile.status !== 'NEEDS_REVISION' && (
        <Alert variant="info" className="d-flex align-items-center gap-2 py-2 mb-4 small">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          </svg>
          This course file is <strong className="mx-1">{statusLabel(courseFile.status)}</strong> — editing is locked.
        </Alert>
      )}

      {/* Course File Checklist Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="px-4 py-3 d-flex justify-content-between align-items-center" style={{ background: 'var(--ppsu-primary)', color: '#fff' }}>
          <span className="fw-bold">Course File Checklist — {checklistTotal} Particulars</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Matched to Official PPSU Form</span>
        </div>
        <div className="px-4 py-2 small text-secondary bg-light border-bottom">* indicates a required item</div>

        <div className="p-0">
          {visibleChecklistItems.map((item, idx) => {
            const dbItem = checklist.find((c) => c.itemIndex === item.index) ?? { status: 'EMPTY' };
            const complete = isItemComplete(item.index);
            const isItem1 = item.index === 1;
            const isItem8 = item.index === 8;
            const isIA = item.index === 11 || item.index === 12;
            const isUniv = item.index === 15;
            const isSigItem = item.index === 20;
            const isRestricted = access.mode === 'LAB_BATCH' && !LAB_TEACHER_ITEM_INDICES.includes(item.index);
            const isLockedByStudentList = false;

            return (
              <div
                key={item.index}
                className={`px-4 py-3 ${idx < CHECKLIST_ITEMS.length - 1 ? 'border-bottom' : ''}`}
                style={{
                  background: isRestricted ? '#f8fafc' : (complete ? 'rgba(22,163,74,0.03)' : 'transparent'),
                  opacity: isRestricted ? 0.6 : 1
                }}
              >
                {/* Header Row for Item */}
                <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                  <div className="d-flex align-items-start gap-3 flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                    <span
                      className="fw-bold font-mono-ppsu"
                      style={{
                        minWidth: 28, height: 28, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                        background: complete ? 'rgba(22,163,74,0.12)' : '#f1f5fd',
                        color: complete ? 'var(--ppsu-success-text)' : 'var(--ppsu-primary)',
                        flexShrink: 0
                      }}
                    >
                      {item.index}
                    </span>
                    <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-word' }}>
                      <div className="fw-semibold" style={{ fontSize: 14, color: 'var(--ppsu-navy-900)' }}>
                        {item.name}
                      </div>

                      {/* Locked banner for restricted items for Lab Teachers */}
                      {isRestricted && (
                        <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                          </svg>
                          <span>Locked — Course Teacher access only</span>
                        </div>
                      )}


                      {/* Single upload complete indicator */}
                      {!isItem1 && !isItem8 && !isIA && !isUniv && complete && !isRestricted && (
                        <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: 12, color: 'var(--ppsu-success-text)', overflow: 'hidden' }}>
                          <span>✓ <strong className="font-mono-ppsu text-truncate d-inline-block" style={{ maxWidth: '360px', verticalAlign: 'bottom' }}>{dbItem.fileName}</strong></span>
                        </div>
                      )}

                      {/* Per-item reviewer remarks display */}
                      {dbItem.score !== undefined && !isRestricted && (
                        <div className="mt-2 px-2 py-1 rounded small bg-light text-dark border">
                          Reviewer Score: <strong>{dbItem.score}/{item.maxScore}</strong>
                          {dbItem.remarks && <> — {dbItem.remarks}</>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 33: Item 8 Laboratory Rubrics Batch-wise Sub-sections */}
                  {false && isItem8 && !isLockedByStudentList && (
                    <div className="mt-3 ps-4 border-start border-2 border-primary ms-2 w-100">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-secondary fw-semibold">Batch-wise Laboratory Rubrics (Batch A & Batch B Compulsory):</span>
                        {!isLocked && (
                          <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={handleAddBatch}>
                            + Add Batch
                          </Button>
                        )}
                      </div>

                      <Row className="g-2 small">
                        {(getSubItems(8)?.batches || []).map((batch: any, bIdx: number) => {
                          const isComp = batch.id === 'batch-a' || batch.id === 'batch-b';
                          return (
                            <Col xs={12} md={6} key={batch.id}>
                              <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                                <div>
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    {isComp ? (
                                      <span className="fw-bold">
                                        ({String.fromCharCode(97 + bIdx)}) {batch.name} <span className="text-danger">*</span>
                                      </span>
                                    ) : (
                                      <Form.Control
                                        type="text"
                                        size="sm"
                                        value={batch.name}
                                        disabled={isLocked}
                                        onChange={(e) => handleUpdateBatchName(batch.id, e.target.value)}
                                        className="fw-bold py-0"
                                        style={{ fontSize: 12, maxWidth: 200 }}
                                      />
                                    )}

                                    {!isComp && !isLocked && (
                                      <Button variant="link" className="text-danger p-0 text-decoration-none" style={{ fontSize: 14 }} onClick={() => handleRemoveBatch(batch.id)} title="Remove Batch">
                                        ×
                                      </Button>
                                    )}
                                  </div>

                                  {batch.fileName ? (
                                    <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {batch.fileName}</div>
                                  ) : (
                                    <div className="text-muted mb-1" style={{ fontSize: 11 }}>✗ Not filled / uploaded</div>
                                  )}
                                </div>

                                <div className="d-flex gap-1 mt-2 flex-wrap">
                                  {!isLocked && (
                                    <Button variant="outline-primary" size="sm" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => openRubricsModalForBatch(batch.id)}>
                                      ✏️ Enter Marks
                                    </Button>
                                  )}

                                  {batch.fileName && (
                                    <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Laboratory Rubrics — ${batch.name}`, fileName: batch.fileName, fileUrl: batch.fileUrl })}>
                                      👁️ View
                                    </Button>
                                  )}

                                  {!isLocked && (
                                    <>
                                      <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                        {batch.fileName ? 'Replace' : 'Choose File'}
                                        <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBatchFileUpload(batch.id, f); }} />
                                      </label>
                                      {batch.fileName && (
                                        <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleBatchFileUpload(batch.id, undefined)}>
                                          Remove
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  )}

                  {/* Item 8: per-student Laboratory Rubrics */}
                  {isItem8 && (() => {
                    const subs = getMergedSubItems(8) || {};
                    const criteria = item8Criteria;
                    const rows = item8Rows;
                    return (
                      <div className="mt-3 ps-4 border-start border-2 border-primary ms-2 w-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-secondary fw-semibold">Per-student Laboratory Rubrics</span>
                          {!isLocked && (
                            <div className="d-flex gap-2">
                              <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => handleManualAddStudent(8)}>
                                + Add Student
                              </Button>
                              <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => { const label = window.prompt('Criterion label', 'Project'); const max = Number(window.prompt('Maximum marks', '10')); if (label?.trim() && max > 0) handleCriterion(8, { id: `criterion-${Date.now()}`, label: label.trim(), max, fixed: false }); }}>
                                + Add Criterion
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="alert alert-info small py-2 mb-2">
                          Student rows appear automatically from Item 4's Student List. Use '+ Add Student' to add someone not on that list.
                        </div>
                        <div className="table-responsive border rounded">
                          <Table bordered hover size="sm" className="small align-middle text-center mb-0" style={{ minWidth: 720 }}>
                            <thead className="bg-light">
                              <tr>
                                <th>Batch</th>
                                <th>Student Name</th>
                                <th>Enrolment Number</th>
                                {criteria.map((criterion: any) => (
                                  <th key={criterion.id}>
                                    {criterion.label} <span className="text-muted">({criterion.max})</span>
                                    {!criterion.fixed && !isLocked && (
                                      <button className="btn btn-link text-danger p-0 ms-1" onClick={() => handleCriterion(8, criterion, true)}>×</button>
                                    )}
                                  </th>
                                ))}
                                <th className="bg-warning-subtle">Total</th>
                                {!isLocked && <th style={{ width: '80px' }}>Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={criteria.length + 4} className="text-muted py-3">No students found. Use '+ Add Student' to add someone.</td>
                                </tr>
                              ) : (
                                rows.map((row: any) => {
                                  const total = criteria.reduce((sum: number, criterion: any) => sum + (Number(row.marks?.[criterion.id]) || 0), 0);
                                  return (
                                    <tr key={`${row.batch || 'A'}-${row.studentId}`}>
                                      <td className="fw-semibold">{row.batch || 'A'}</td>
                                      <td className="text-start fw-semibold">
                                        {row.isManual ? (
                                          <Form.Control
                                            type="text"
                                            size="sm"
                                            value={row.name}
                                            disabled={isLocked}
                                            onChange={(e) => handleManualStudentFieldChange(8, row.studentId, 'name', e.target.value)}
                                            placeholder="Student Name"
                                          />
                                        ) : (
                                          row.name
                                        )}
                                      </td>
                                      <td className="font-mono-ppsu">
                                        {row.isManual ? (
                                          <Form.Control
                                            type="text"
                                            size="sm"
                                            className="font-mono-ppsu"
                                            value={row.enrolmentNumber}
                                            disabled={isLocked}
                                            onChange={(e) => handleManualStudentFieldChange(8, row.studentId, 'enrolmentNumber', e.target.value)}
                                            placeholder="Enrolment Number"
                                          />
                                        ) : (
                                          row.enrolmentNumber
                                        )}
                                      </td>
                                      {criteria.map((criterion: any) => (
                                        <td key={criterion.id}>
                                          <Form.Control
                                            type="number"
                                            min={0}
                                            max={criterion.max}
                                            size="sm"
                                            className="text-center"
                                            value={row.marks?.[criterion.id] ?? 0}
                                            disabled={isLocked || (access.mode === 'OWNER' && row.batch && row.batch !== 'A')}
                                            onChange={(e) => handleMarkChange(8, row.studentId, criterion.id, Math.min(criterion.max, Number(e.target.value) || 0))}
                                          />
                                        </td>
                                      ))}
                                      <td className="fw-bold text-primary">{total}</td>
                                      {!isLocked && (
                                        <td>
                                          {row.isManual ? (
                                            <Button variant="link" className="text-danger p-0 border-0" onClick={() => handleRemoveManualStudent(8, row.studentId)}>
                                              Remove
                                            </Button>
                                          ) : (
                                            <span className="text-muted small">—</span>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </Table>
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-2 small">
                          {subs.file?.fileName ? (
                            <>
                              <span className="text-success fw-semibold">✓ {subs.file.fileName}</span>
                              <Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'Laboratory Rubrics', fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}>View</Button>
                              {!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleStructuredFileUpload(8)}>Remove</Button>}
                            </>
                          ) : (
                            !isLocked && (
                              <label className="btn btn-outline-secondary btn-sm">
                                Upload File
                                <input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleStructuredFileUpload(8, file); }} />
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Item 9: Continuous Evaluation Rubrics */}
                  {item.index === 9 && (() => {
                    const subs = getSubItems(9) || {};
                    const criteria = item9Criteria;
                    const rows = item9Rows;
                    return (
                      <div className="mt-3 ps-4 border-start border-2 border-success ms-2 w-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-secondary fw-semibold">Continuous Evaluation Rubrics — per-student marks</span>
                          {!isLocked && (
                            <div className="d-flex gap-2">
                              <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => handleManualAddStudent(9)}>
                                + Add Student
                              </Button>
                              <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => { const label = window.prompt('Criterion label', 'Assignment / Case Study / Other'); const max = Number(window.prompt('Maximum marks', '10')); if (label?.trim() && max > 0) handleCriterion(9, { id: `criterion-${Date.now()}`, label: label.trim(), max, fixed: false }); }}>
                                + Add Criterion
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="alert alert-info small py-2 mb-2">
                          Student rows appear automatically from Item 4's Student List. Use '+ Add Student' to add someone not on that list.
                        </div>
                        <div className="table-responsive border rounded">
                          <Table bordered hover size="sm" className="small align-middle text-center mb-0" style={{ minWidth: 720 }}>
                            <thead className="bg-light">
                              <tr>
                                <th>Student Name</th>
                                <th>Enrolment Number</th>
                                {criteria.map((criterion: any) => (
                                  <th key={criterion.id}>
                                    {criterion.label} <span className="text-muted">({criterion.max})</span>
                                    {!criterion.fixed && !isLocked && (
                                      <button className="btn btn-link text-danger p-0 ms-1" onClick={() => handleCriterion(9, criterion, true)}>×</button>
                                    )}
                                  </th>
                                ))}
                                <th className="bg-warning-subtle">Total</th>
                                {!isLocked && <th style={{ width: '80px' }}>Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={criteria.length + 3} className="text-muted py-3">No students found. Use '+ Add Student' to add someone.</td>
                                </tr>
                              ) : (
                                rows.map((row: any) => {
                                  const total = criteria.reduce((sum: number, criterion: any) => sum + (Number(row.marks?.[criterion.id]) || 0), 0);
                                  return (
                                    <tr key={row.studentId}>
                                      <td className="text-start fw-semibold">
                                        {row.isManual ? (
                                          <Form.Control
                                            type="text"
                                            size="sm"
                                            value={row.name}
                                            disabled={isLocked}
                                            onChange={(e) => handleManualStudentFieldChange(9, row.studentId, 'name', e.target.value)}
                                            placeholder="Student Name"
                                          />
                                        ) : (
                                          row.name
                                        )}
                                      </td>
                                      <td className="font-mono-ppsu">
                                        {row.isManual ? (
                                          <Form.Control
                                            type="text"
                                            size="sm"
                                            className="font-mono-ppsu"
                                            value={row.enrolmentNumber}
                                            disabled={isLocked}
                                            onChange={(e) => handleManualStudentFieldChange(9, row.studentId, 'enrolmentNumber', e.target.value)}
                                            placeholder="Enrolment Number"
                                          />
                                        ) : (
                                          row.enrolmentNumber
                                        )}
                                      </td>
                                      {criteria.map((criterion: any) => (
                                        <td key={criterion.id}>
                                          <Form.Control
                                            type="number"
                                            min={0}
                                            max={criterion.max}
                                            size="sm"
                                            className="text-center"
                                            value={row.marks?.[criterion.id] ?? 0}
                                            disabled={isLocked}
                                            onChange={(e) => handleMarkChange(9, row.studentId, criterion.id, Math.min(criterion.max, Number(e.target.value) || 0))}
                                          />
                                        </td>
                                      ))}
                                      <td className="fw-bold text-primary">{total}</td>
                                      {!isLocked && (
                                        <td>
                                          {row.isManual ? (
                                            <Button variant="link" className="text-danger p-0 border-0" onClick={() => handleRemoveManualStudent(9, row.studentId)}>
                                              Remove
                                            </Button>
                                          ) : (
                                            <span className="text-muted small">—</span>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </Table>
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-2 small">
                          {subs.file?.fileName ? (
                            <>
                              <span className="text-success fw-semibold">✓ {subs.file.fileName}</span>
                              <Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'Continuous Evaluation Rubrics', fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}>View</Button>
                              {!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleStructuredFileUpload(9)}>Remove</Button>}
                            </>
                          ) : (
                            !isLocked && (
                              <label className="btn btn-outline-secondary btn-sm">
                                Upload File
                                <input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleStructuredFileUpload(9, file); }} />
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Item 4: Merged / unified student list for Course Teacher & Coordinator */}
                  {item.index === 4 && access.mode !== 'LAB_BATCH' && !isRestricted && (() => {
                    const mergedStudents = getStudentList();
                    const item4Db = checklist.find((c: any) => c.itemIndex === 4);
                    const uploadedFile = item4Db?.fileName;
                    const uploadedFileUrl = item4Db?.fileUrl;
                    return (
                      <div className="mt-3 ps-4 border-start border-2 border-warning ms-2 w-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-secondary fw-semibold">
                            Combined Class List
                            {mergedStudents.length > 0 && (
                              <span className="ms-2 badge bg-primary text-white" style={{ fontSize: 11 }}>
                                {mergedStudents.length} students
                              </span>
                            )}
                          </span>
                          {!isLocked && (
                            <label className="btn btn-outline-secondary btn-sm" style={{ fontSize: 11 }}>
                              {uploadedFile ? 'Replace CSV' : '↑ Upload CSV / PDF'}
                              <input type="file" className="d-none" accept=".csv,.txt,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(4, 'Student Name List', f); e.currentTarget.value = ''; }} />
                            </label>
                          )}
                        </div>

                        {uploadedFile && (
                          <div className="d-flex align-items-center gap-2 small mb-2">
                            <span className="text-success fw-semibold">✓ {uploadedFile}</span>
                            <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }}
                              onClick={() => setViewingDoc({ title: 'Student Name List', fileName: uploadedFile, fileUrl: uploadedFileUrl })}>
                              View
                            </Button>
                            {!isLocked && (
                              <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }}
                                onClick={() => handleRemove(4)}>
                                Remove
                              </Button>
                            )}
                          </div>
                        )}

                        {mergedStudents.length > 0 ? (
                          <div className="table-responsive border rounded">
                            <Table bordered size="sm" className="small align-middle mb-0" style={{ minWidth: 420 }}>
                              <thead className="bg-light">
                                <tr>
                                  <th style={{ width: 36 }}>#</th>
                                  <th>Student Name</th>
                                  <th>Enrolment Number</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mergedStudents.map((student: any, idx: number) => (
                                  <tr key={student.id}>
                                    <td className="text-muted font-mono-ppsu">{idx + 1}</td>
                                    <td className="fw-semibold">{student.name}</td>
                                    <td className="font-mono-ppsu">{student.enrolmentNumber}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        ) : (
                          <div className="alert alert-light small py-2 mb-0">
                            No students yet. Upload a CSV file above, or Lab Teachers can submit their batch lists to auto-populate this list.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SECTION 16: Right-side controls for Standard Items (View, Replace, Remove) */}
                  {!isItem1 && !isItem8 && !isIA && !isUniv && !isLockedByStudentList && !isRestricted && item.index !== 4 && item.index !== 9 && (
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {false && item.index === 9 && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          disabled={isLocked}
                          style={{ fontSize: 12 }}
                          onClick={() => setItem9ModalOpen(true)}
                        >
                          ✏️ Enter Marks Manually
                        </Button>
                      )}

                      {complete ? (
                        <>
                          <Button
                            variant="outline-info"
                            size="sm"
                            style={{ fontSize: 12 }}
                            onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'document.pdf', fileUrl: dbItem.fileUrl })}
                          >
                            👁️ View
                          </Button>
                          {!isLocked && (
                            <>
                              <label
                                className="btn btn-outline-secondary btn-sm m-0"
                                style={{ fontSize: 12, cursor: 'pointer' }}
                                htmlFor={`file-replace-${item.index}`}
                              >
                                Replace
                                <input id={`file-replace-${item.index}`} type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.index, item.name, f); e.currentTarget.value = ''; }} />
                              </label>
                              <button className="btn btn-outline-danger btn-sm" style={{ fontSize: 12 }} onClick={() => handleRemove(item.index)}>
                                Remove
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <label
                          className="btn btn-sm"
                          style={{
                            background: isLocked ? '#e9ecef' : 'var(--ppsu-accent)',
                            color: isLocked ? '#6c757d' : '#fff',
                            fontSize: 12, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer'
                          }}
                          htmlFor={`file-upload-${item.index}`}
                        >
                          {isSigItem ? 'Upload Signature File' : 'Upload File'}
                          <input id={`file-upload-${item.index}`} type="file" className="d-none" disabled={isLocked} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.index, item.name, f); e.currentTarget.value = ''; }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 10 & 16: Item 1 Split into 5 Sub-uploads */}
                {isItem1 && !isRestricted && (
                  <div className="mt-3 ps-4 border-start border-2 border-info ms-2">
                    <div className="small text-secondary mb-2 fw-semibold">5 Compulsory Sub-uploads Required:</div>
                    <Row className="g-2 small">
                      {[
                        { key: 'vision', label: '(a) Vision' },
                        { key: 'mission', label: '(b) Mission' },
                        { key: 'peo', label: '(c) PEO (Program Educational Objectives)' },
                        { key: 'pso', label: '(d) PSO (Program Specific Outcomes)' },
                        { key: 'po', label: '(e) PO (Program Outcomes)' }
                      ].map((sub) => {
                        const subData = getSubItems(1)?.[sub.key];
                        return (
                          <Col xs={12} md={4} key={sub.key}>
                            <div className="p-2 bg-light rounded border">
                              <div className="fw-bold mb-1">{sub.label}</div>
                              {sub.key === 'gradeSheet' && <Form.Check type="switch" className="small mb-2" label="This course has a separate practical grade" checked={hasSeparatePracticalGrade} disabled={isLocked} onChange={(e) => handleTogglePracticalGrade(e.target.checked)} />}
                              {subData?.fileName ? (
                                <div>
                                  <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  <div className="d-flex gap-1">
                                    <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item 1 — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                      View
                                    </Button>
                                    {!isLocked && (
                                      <>
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 10 }}>
                                          Replace
                                          <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem1SubUpload(sub.key as any, f); }} />
                                        </label>
                                        <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleItem1SubUpload(sub.key as any, undefined)}>
                                          Remove
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <label className="btn btn-outline-secondary btn-sm py-0" style={{ fontSize: 11 }}>
                                  Choose Document
                                  <input type="file" className="d-none" disabled={isLocked} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem1SubUpload(sub.key as any, f); }} />
                                </label>
                              )}
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {/* SECTION 26: IA 1 & 2 */}
                {isIA && !isRestricted && (
                  <div className="mt-3 ps-4 border-start border-2 border-primary ms-2">
                    <Row className="g-2 small">
                      {[
                        { key: 'timetable', label: '(a) Timetable *' },
                        { key: 'questionPaper', label: '(b) Question Paper *' },
                        { key: 'sampleAnswerSheet', label: '(c) Sample Answer Sheet *' },
                      ].map((sub) => {
                        const subData = getSubItems(item.index)?.[sub.key];
                        return (
                          <Col xs={12} md={6} key={sub.key}>
                            <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="fw-bold mb-1">{sub.label}</div>
                                {subData?.fileName ? (
                                  <div>
                                    <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  </div>
                                ) : (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>✗ Not uploaded</div>
                                )}
                              </div>
                              <div className="d-flex gap-1 mt-2">
                                {subData?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item ${item.index} — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                    View
                                  </Button>
                                )}
                                {!isLocked && (
                                  <>
                                    <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                      {subData?.fileName ? 'Replace' : 'Choose File'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIaFixedUpload(item.index, sub.key as any, f); }} />
                                    </label>
                                    {subData?.fileName && (
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleIaFixedUpload(item.index, sub.key as any, undefined)}>
                                        Remove
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {/* Items 11 & 12: live Mark Statement and Result Analysis from Item 9 */}
                {isIA && !isRestricted && (() => {
                  const continuous = getSubItems(9) || {};
                  const criteria = normalizeCriteria(continuous.criteria);
                  const rows = syncStudentRows(continuous.students, criteria);
                  const totals = rows.map((row: any) => criteria.reduce((sum: number, criterion: any) => sum + (Number(row.marks?.[criterion.id]) || 0), 0));
                  const markBands = ['below 12', '13–15', '16–18', '19–21', '22–24', '25–27', '28–30'];
                  const markCounts = markBands.map((band) => totals.filter((value: number) => band === 'below 12' ? value < 12 : band === '13–15' ? value >= 13 && value <= 15 : band === '16–18' ? value >= 16 && value <= 18 : band === '19–21' ? value >= 19 && value <= 21 : band === '22–24' ? value >= 22 && value <= 24 : band === '25–27' ? value >= 25 && value <= 27 : value >= 28 && value <= 30).length);
                  const percentageBands = ['<40%', '41–50%', '51–60%', '61–70%', '71–80%', '81–90%', '>90%'];
                  const percentageCounts = percentageBands.map((band) => totals.filter((value: number) => { const percentage = (value / 30) * 100; return band === '<40%' ? percentage < 40 : band === '41–50%' ? percentage >= 41 && percentage <= 50 : band === '51–60%' ? percentage >= 51 && percentage <= 60 : band === '61–70%' ? percentage >= 61 && percentage <= 70 : band === '71–80%' ? percentage >= 71 && percentage <= 80 : band === '81–90%' ? percentage >= 81 && percentage <= 90 : percentage > 90; }).length);
                  const subs = getSubItems(item.index) || {};
                  const chart = (labels: string[], counts: number[]) => <div className="d-flex align-items-end gap-2 mt-2" style={{ height: 100 }}>{labels.map((label, index) => <div key={label} className="text-center flex-fill"><div className="bg-primary mx-auto" style={{ height: `${Math.max(4, counts[index] * 18)}px`, width: '70%' }} title={`${counts[index]} students`} /><small style={{ fontSize: 9 }}>{label}</small><div className="font-mono-ppsu" style={{ fontSize: 10 }}>{counts[index]}</div></div>)}</div>;
                  return <div className="mt-3 ps-4 border-start border-2 border-primary ms-2 w-100"><div className="small fw-semibold text-secondary mb-2">Mark Statement & Result Analysis — linked live to Item 9</div>{!rows.length ? <div className="alert alert-info small">Enter marks in Item 9 to populate this statement automatically.</div> : <><div className="table-responsive border rounded mb-3"><Table bordered size="sm" className="small mb-0"><thead className="bg-light"><tr><th>Student Name</th><th>Enrolment Number</th><th>Total Marks / 30</th></tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={row.studentId}><td>{row.name}</td><td className="font-mono-ppsu">{row.enrolmentNumber}</td><td className="fw-bold">{totals[index]}</td></tr>)}</tbody></Table></div><Row className="g-2 small"><Col md={6}><div className="p-2 bg-light border rounded"><strong>Marks-band distribution</strong>{chart(markBands, markCounts)}</div></Col><Col md={6}><div className="p-2 bg-light border rounded"><strong>Percentage distribution</strong>{chart(percentageBands, percentageCounts)}</div></Col></Row></>}{subs.file?.fileName ? <div className="d-flex align-items-center gap-2 mt-2 small"><span className="text-success fw-semibold">✓ {subs.file.fileName}</span><Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: `Internal Assessment ${item.index === 11 ? 1 : 2} Mark Statement`, fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}>View</Button>{!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleStructuredFileUpload(item.index)}>Remove</Button>}</div> : !isLocked && <label className="btn btn-outline-secondary btn-sm mt-2">Upload File<input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleStructuredFileUpload(item.index, file); }} /></label>}</div>;
                })()}

                {/* SECTION 27: Item 13 — Assignment topics, sample assignment, named assignments & custom docs */}
                {false && item.index === 13 && (
                  <div className="mt-3 ps-4 border-start border-2 border-info ms-2">
                    {/* Fixed slots (a) & (b) */}
                    <Row className="g-2 small mb-3">
                      {[
                        { key: 'assignmentTopics', label: '(a) Assignment Topics' },
                        { key: 'sampleAssignment', label: '(b) Sample Assignment' }
                      ].map((sub) => {
                        const subData = getSubItems(13)?.[sub.key];
                        return (
                          <Col xs={12} md={6} key={sub.key}>
                            <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="fw-bold mb-1">{sub.label}</div>
                                {subData?.fileName ? (
                                  <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                ) : (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>✗ Not uploaded</div>
                                )}
                              </div>
                              <div className="d-flex gap-1 mt-2">
                                {subData?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item 13 — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                    View
                                  </Button>
                                )}
                                {!isLocked && (
                                  <>
                                    <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                      {subData?.fileName ? 'Replace' : 'Choose File'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem13FixedUpload(sub.key as any, f); }} />
                                    </label>
                                    {subData?.fileName && (
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleItem13FixedUpload(sub.key as any, undefined)}>
                                        Remove
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>

                    {/* Named Assignment Statements List */}
                    <div className="p-2 bg-light rounded border mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-navy-900 small">Assignment Marks Statements</span>
                        {!isLocked && (
                          <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={handleAddAssignmentRow}>
                            + Add Assignment
                          </Button>
                        )}
                      </div>

                      {(getSubItems(13)?.assignments || []).map((asgn: any) => (
                        <div key={asgn.id} className="p-2 bg-white rounded border mb-2 small">
                          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                            <Form.Control
                              type="text"
                              size="sm"
                              value={asgn.name}
                              disabled={isLocked}
                              onChange={(e) => handleUpdateAssignmentName(asgn.id, e.target.value)}
                              className="fw-bold py-0"
                              style={{ fontSize: 12, maxWidth: 280 }}
                            />
                            {!isLocked && (
                              <Button variant="link" className="text-danger p-0 text-decoration-none" style={{ fontSize: 14 }} onClick={() => handleRemoveAssignmentRow(asgn.id)} title="Remove Assignment">
                                ×
                              </Button>
                            )}
                          </div>

                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                              {asgn.fileName ? (
                                <span className="text-success fw-bold font-mono-ppsu">✓ {asgn.fileName}</span>
                              ) : (
                                <span className="text-muted">No file attached</span>
                              )}
                            </div>
                            <div className="d-flex gap-1">
                              {asgn.fileName && (
                                <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: asgn.name, fileName: asgn.fileName, fileUrl: asgn.fileUrl })}>
                                  View
                                </Button>
                              )}
                              {!isLocked && (
                                <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                  {asgn.fileName ? 'Replace' : 'Choose File'}
                                  <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadAssignmentFile(asgn.id, f); }} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* General Additional / Supporting Documents (e.g. Industry Visit) */}
                    <div className="p-2 bg-light rounded border">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold small">Additional Supporting Documents (e.g. Industry Visit)</span>
                        {!isLocked && (
                          <Button variant="link" size="sm" className="p-0 text-decoration-none" style={{ fontSize: 11 }} onClick={() => setActiveIaItem(13)}>
                            + Add Document
                          </Button>
                        )}
                      </div>

                      {(getSubItems(13)?.additionalDocuments || []).map((doc: any) => (
                        <div key={doc.id} className="d-flex align-items-center justify-content-between p-2 bg-white rounded border mb-1" style={{ fontSize: 11 }}>
                          <div>
                            <span className="fw-bold">✓ {doc.name}:</span> <span className="font-mono-ppsu">{doc.fileName || 'No file selected'}</span>
                          </div>
                          <div className="d-flex gap-1 align-items-center">
                            <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: doc.name, fileName: doc.fileName || 'document.pdf', fileUrl: doc.fileUrl })}>
                              View
                            </Button>
                            {!isLocked && doc.id && (
                              <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleRemoveIaCustomDoc(13, doc.id)}>
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item 13: Assignment Topics, Sample Assignment, and Marks Statement */}
                {item.index === 13 && !isRestricted && (() => {
                  const subs = getSubItems(13) || { assignmentTopics: [], sampleAssignment: null, marks: [], marksFile: null };
                  const students = getStudentList();
                  const marks = syncStudentRows(subs.marks, [{ id: 'assignment-marks', label: 'Marks', max: 100, fixed: true }]);
                  return <div className="mt-3 ps-4 border-start border-2 border-info ms-2 w-100"><div className="small fw-semibold mb-2">(a) Assignment Topics</div>{(subs.assignmentTopics || []).map((topic: any) => <div key={topic.id} className="d-flex gap-2 mb-1"><Form.Control size="sm" value={topic.title} disabled={isLocked} onChange={(e) => handleUpdateAssignmentTopic({ ...topic, title: e.target.value })} />{!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleAssignmentTopic(topic, true)}>Remove</Button>}</div>)}{!isLocked && <Button size="sm" variant="outline-primary" onClick={() => { const title = window.prompt('Assignment topic/title', `Assignment ${(subs.assignmentTopics || []).length + 1}`); if (title?.trim()) handleAssignmentTopic({ id: `topic-${Date.now()}`, title: title.trim() }); }}>+ Add Assignment</Button>}
                    <div className="small fw-semibold mt-3 mb-2">(b) Sample Assignment</div><div className="d-flex align-items-center gap-2 small">{subs.sampleAssignment?.fileName ? <><span className="text-success fw-semibold">✓ {subs.sampleAssignment.fileName}</span><Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'Sample Assignment', fileName: subs.sampleAssignment.fileName, fileUrl: subs.sampleAssignment.fileUrl })}>View</Button>{!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleSubFileUpload(13, 'sampleAssignment')}>Remove</Button>}</> : !isLocked && <label className="btn btn-outline-secondary btn-sm">Upload File<input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSubFileUpload(13, 'sampleAssignment', file); }} /></label>}</div>
                    <div className="small fw-semibold mt-3 mb-2">(c) Marks Statement</div>{!students.length ? <div className="alert alert-info small">Student rows will appear automatically from Item 4.</div> : <div className="table-responsive border rounded"><Table bordered size="sm" className="small mb-0"><thead className="bg-light"><tr><th>Student Name</th><th>Enrolment Number</th><th>Marks</th></tr></thead><tbody>{marks.map((row: any) => <tr key={row.studentId}><td>{row.name}</td><td className="font-mono-ppsu">{row.enrolmentNumber}</td><td><Form.Control type="number" min={0} max={100} size="sm" value={row.marks['assignment-marks'] || 0} disabled={isLocked} onChange={(e) => handleAssignmentMarkChange(row.studentId, Number(e.target.value))} /></td></tr>)}</tbody></Table></div>}{subs.marksFile?.fileName && <div className="small mt-2"><span className="text-success fw-semibold">✓ {subs.marksFile.fileName}</span> <Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'Assignment Marks Statement', fileName: subs.marksFile.fileName, fileUrl: subs.marksFile.fileUrl })}>View</Button>{!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleSubFileUpload(13, 'marksFile')}>Remove</Button>}</div>}{!isLocked && <label className="btn btn-outline-secondary btn-sm mt-2">Upload Marks Statement<input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSubFileUpload(13, 'marksFile', file); }} /></label>}
                  </div>;
                })()}

                {/* SECTION 2 & 16: University Exam Sub-uploads */}
                {isUniv && !isRestricted && (
                  <div className="mt-3 ps-4 border-start border-2 border-warning ms-2">
                    <div className="small text-secondary mb-2 fw-semibold">3 Compulsory Sub-uploads Required:</div>
                    <Row className="g-2 small">
                      {[
                        { key: 'questionPaper', label: '(a) Question Paper' },
                        { key: 'gradeSheet', label: '(b) Grade Sheet' },
                      ].map((sub) => {
                        const subData = getSubItems(15)?.[sub.key];
                        return (
                          <Col xs={12} md={4} key={sub.key}>
                            <div className="p-2 bg-light rounded border">
                              <div className="fw-bold mb-1">{sub.label}</div>
                              {sub.key === 'gradeSheet' && <Form.Check type="switch" className="small mb-2" label="This course has a separate practical grade" checked={hasSeparatePracticalGrade} disabled={isLocked} onChange={(e) => handleTogglePracticalGrade(e.target.checked)} />}
                              {subData?.fileName ? (
                                <div>
                                  <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  <div className="d-flex gap-1">
                                    <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `University Exam — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                      View
                                    </Button>
                                    {!isLocked && (
                                      <>
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 10 }}>
                                          Replace
                                          <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUnivSubUpload(sub.key as any, f); }} />
                                        </label>
                                        <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleUnivSubUpload(sub.key as any, undefined)}>
                                          Remove
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <label className="btn btn-outline-secondary btn-sm py-0" style={{ fontSize: 11 }}>
                                  Upload Document
                                  <input type="file" className="d-none" disabled={isLocked} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUnivSubUpload(sub.key as any, f); }} />
                                </label>
                              )}
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {/* Item 15(c): University Exam Result Analysis — the existing auto-derived block follows. */}
                {isUniv && !isRestricted && (() => {
                  const subs = getSubItems(15) || { gradeSheet: null, students: [], hasSeparatePracticalGrade: false };
                  // Grade Sheet is rendered in the restored (b) card above; this block is (c) only.
                  subs.gradeSheet = null;
                  const storedStudents = Array.isArray(subs.students) ? subs.students.filter(Boolean) : [];
                  const rows = getStudentList().map((student: any) => ({ ...(storedStudents.find((entry: any) => entry.studentId === student.id) || {}), ...student }));
                  const grades = ['F', 'P', 'C', 'B', 'B+', 'A', 'A+', 'O'];
                  const theoryCounts = grades.map((grade) => rows.filter((row: any) => row.theoryGrade === grade).length);
                  const practicalCounts = grades.map((grade) => rows.filter((row: any) => row.practicalGrade === grade).length);
                  const chart = (counts: number[]) => <div className="d-flex align-items-end gap-2 mt-2" style={{ height: 100 }}>{grades.map((grade, index) => <div key={grade} className="text-center flex-fill"><div className="bg-warning mx-auto" style={{ height: `${Math.max(4, counts[index] * 18)}px`, width: '70%' }} /><small>{grade}</small><div className="font-mono-ppsu" style={{ fontSize: 10 }}>{counts[index]}</div></div>)}</div>;
                  return <div className="mt-3 ps-4 border-start border-2 border-warning ms-2 w-100"><div className="d-flex align-items-center justify-content-between mb-2"><span className="small fw-semibold text-secondary">Grade Sheet and Result Analysis</span><Form.Check type="switch" label="This course has a separate practical grade" checked={hasSeparatePracticalGrade} disabled={isLocked} onChange={(e) => handleTogglePracticalGrade(e.target.checked)} /></div><div className="d-flex align-items-center gap-2 small mb-2">{subs.gradeSheet?.fileName ? <><span className="text-success fw-semibold">✓ {subs.gradeSheet.fileName}</span><Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'University Exam Grade Sheet', fileName: subs.gradeSheet.fileName, fileUrl: subs.gradeSheet.fileUrl })}>View</Button>{!isLocked && <Button size="sm" variant="outline-danger" onClick={() => handleSubFileUpload(15, 'gradeSheet')}>Remove</Button>}</> : !isLocked && <label className="btn btn-outline-secondary btn-sm">Upload Grade Sheet<input type="file" className="d-none" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSubFileUpload(15, 'gradeSheet', file); }} /></label>}</div>{!rows.length ? <div className="alert alert-info small">Student rows will appear automatically from Item 4.</div> : <div className="table-responsive border rounded"><Table bordered size="sm" className="small mb-0"><thead className="bg-light"><tr><th>Enrolment Number</th><th>Student Name</th><th>Theory Grade</th>{hasSeparatePracticalGrade && <th>Practical Grade</th>}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.id}><td className="font-mono-ppsu">{row.enrolmentNumber}</td><td>{row.name}</td><td><Form.Select size="sm" value={row.theoryGrade || ''} disabled={isLocked} onChange={(e) => handleGradeChange(row.id, 'theoryGrade', e.target.value)}><option value="">Select</option>{grades.map((grade) => <option key={grade}>{grade}</option>)}</Form.Select></td>{hasSeparatePracticalGrade && <td><Form.Select size="sm" value={row.practicalGrade || ''} disabled={isLocked} onChange={(e) => handleGradeChange(row.id, 'practicalGrade', e.target.value)}><option value="">Select</option>{grades.map((grade) => <option key={grade}>{grade}</option>)}</Form.Select></td>}</tr>)}</tbody></Table></div>}<Row className="g-2 mt-2 small"><Col md={hasSeparatePracticalGrade ? 6 : 12}><div className="p-2 bg-light border rounded"><strong>Theory Grade Distribution</strong>{chart(theoryCounts)}</div></Col>{hasSeparatePracticalGrade && <Col md={6}><div className="p-2 bg-light border rounded"><strong>Practical Grade Distribution</strong>{chart(practicalCounts)}</div></Col>}</Row></div>;
                })()}
              </div>
            );
          })}
        </div>

        {/* SECTION 5: ERP Note */}
        <div className="p-3 bg-light border-top text-center text-muted small fw-bold">
          **Note: All related relevant documents to be attached should be fetched from ERP.
        </div>
      </div>

      {/* SECTION 7: Faculty Submission Gate & Declaration */}
      {!isLocked && !isLabTeacher && (
        <Card className="card-custom border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom">
            <h5 className="fw-bold text-navy-900 mb-0">Faculty Declaration & Submission Gate</h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3 p-3 rounded" style={{ background: '#fff8e6', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(245,158,11,0.1)' }}>
              <Form.Check
                type="checkbox"
                id="chk-faculty-declaration"
                label={
                  <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                    I confirm all the documents uploaded are correct and relevant as required. <span className="text-danger fw-bold">*</span>
                  </span>
                }
                checked={facultyConfirmed}
                onChange={(e) => setFacultyConfirmed(e.target.checked)}
                style={{ transform: 'scale(1.1)', transformOrigin: 'left center' }}
              />
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
              <div className="small text-secondary">
                {completedCount === 20
                  ? '✓ All 20 checklist items (including Item 20 signature upload) complete. Ready to submit.'
                  : `⚠️ ${20 - completedCount} item(s) remaining before submission.`}
              </div>

              <Button
                id="btn-submit-checklist"
                className="btn-ppsu-accent px-4 py-2"
                disabled={completedCount < 20 || !facultyConfirmed || submitLoading}
                onClick={handleSubmit}
              >
                {submitLoading
                  ? <><Spinner animation="border" size="sm" className="me-2" />Submitting…</>
                  : courseFile.status === 'NEEDS_REVISION' ? 'Resubmit for Review' : 'Submit for Review'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Lab Teacher Submission Gate */}
      {!isLocked && isLabTeacher && (
        <Card className="card-custom border-0 shadow-sm mb-4" style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
          <Card.Header className="bg-transparent py-3 border-bottom">
            <h5 className="fw-bold text-success mb-0">Batch {access.batch} Lab Teacher Submission Gate</h5>
          </Card.Header>
          <Card.Body>
            <p className="text-secondary small mb-3">
              Submit your Batch {access.batch} lab data (Items 2, 4, 8, 9, 14). This will automatically merge your student list and rubric marks into the Course Teacher and Coordinator views.
            </p>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
              <div className="small text-secondary">
                <span className="fw-bold text-dark font-mono-ppsu">{completedCount}/5</span> assigned lab items completed.
              </div>
              <Button
                id="btn-submit-lab-batch-bottom"
                variant="success"
                className="px-4 py-2 fw-bold"
                disabled={submitLoading}
                onClick={handleLabTeacherSubmit}
              >
                {submitLoading
                  ? <><Spinner animation="border" size="sm" className="me-2" />Submitting…</>
                  : `✓ Submit Batch ${access.batch} Data`}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* REAL DOCUMENT PREVIEW MODAL (Section 19 Real View Action) */}
      <Modal show={viewingDoc !== null} onHide={() => setViewingDoc(null)} size="xl" centered>
        <Modal.Header closeButton className="bg-navy-900 text-white py-2">
          <Modal.Title className="h6 fw-bold mb-0">Document Inspection Viewer — {viewingDoc?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2 px-1">
            <div>
              <strong className="font-mono-ppsu text-primary">{viewingDoc?.fileName}</strong>
              <span className="text-muted small ms-2">· Verified Document Inspection</span>
            </div>
            <a
              href={viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:') ? viewingDoc.fileUrl : SAMPLE_PDF_DATA_URL}
              download={viewingDoc?.fileName || 'document.pdf'}
              className="btn btn-outline-primary btn-sm"
            >
              ⬇ Download Original File
            </a>
          </div>

          {(() => {
            const url = viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:') ? viewingDoc.fileUrl : SAMPLE_PDF_DATA_URL;
            const isImage = viewingDoc?.fileName?.match(/\.(png|jpg|jpeg|gif|webp)$/i) || (viewingDoc?.fileUrl && viewingDoc.fileUrl.startsWith('data:image/'));

            if (isImage) {
              return (
                <div className="text-center p-3 bg-white rounded border shadow-sm" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={url}
                    alt={viewingDoc?.fileName}
                    style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                </div>
              );
            }

            return (
              <div style={{ width: '100%', height: '540px' }} className="rounded border bg-white shadow-sm overflow-hidden">
                <iframe
                  src={url}
                  title={viewingDoc?.fileName || 'Document Preview'}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={() => setViewingDoc(null)}>Close Viewer</Button>
        </Modal.Footer>
      </Modal>

      {/* SECTION 1: Add Additional Document Modal */}
      <Modal show={activeIaItem !== null} onHide={() => setActiveIaItem(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">Add Additional / Optional Document (IA {activeIaItem === 11 ? 1 : 2})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Activity / Document Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter document or activity name"
              value={addDocName}
              onChange={(e) => setAddDocName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Upload File</Form.Label>
            <Form.Control
              type="file"
              onChange={(e: any) => setAddDocFile(e.target.files?.[0] || null)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setActiveIaItem(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleAddIaCustomDoc}>Add Document</Button>
        </Modal.Footer>
      </Modal>

      {/* SECTION 18: Dynamic Practical Columns Laboratory Rubrics Modal (Item 8) */}
      <Modal show={false && rubricsModalOpen} onHide={() => setRubricsModalOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">
            Practical Continuous Evaluation — Laboratory Rubrics (Item 8)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="small text-muted fw-semibold">Practical Continuous Evaluation (20 Marks / Practical)</span>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                const nextP = `P-${practicalCols.length + 1}`;
                setPracticalCols([...practicalCols, nextP]);
                setRubricStudents(rubricStudents.map(s => ({
                  ...s,
                  scores: { ...s.scores, [nextP]: 18 }
                })));
              }}
            >
              + Add Practical Column
            </Button>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }} className="mb-3 border rounded">
            <Table bordered hover size="sm" className="small align-middle text-center mb-0" style={{ minWidth: 'max-content', tableLayout: 'fixed' }}>
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '55px', minWidth: '55px' }}>Sr No</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Enrollment No.</th>
                  <th style={{ width: '180px', minWidth: '180px' }}>Name of Students</th>
                  {practicalCols.map((pCol, cIdx) => (
                    <th key={pCol} style={{ width: '65px', minWidth: '65px', maxWidth: '65px' }}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <span>{pCol}</span>
                        {practicalCols.length > 1 && (
                          <button
                            className="btn btn-link text-danger p-0 border-0"
                            style={{ fontSize: 11, lineHeight: 1 }}
                            title="Remove Practical Column"
                            onClick={() => {
                              const newCols = practicalCols.filter((_, i) => i !== cIdx);
                              setPracticalCols(newCols);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="bg-warning-subtle" style={{ width: '150px', minWidth: '150px' }}>Average (P-1 to {practicalCols[practicalCols.length - 1]}) Total (20 Marks)</th>
                </tr>
              </thead>
              <tbody>
                {rubricStudents.map((st, idx) => {
                  const sum = practicalCols.reduce((acc, p) => acc + (Number(st?.scores?.[p]) || 0), 0);
                  const avg = practicalCols.length > 0 ? Math.round(sum / practicalCols.length) : 0;
                  return (
                    <tr key={idx}>
                      <td style={{ width: '55px' }}>{idx + 1}</td>
                      <td style={{ width: '120px' }}>
                        <Form.Control type="text" size="sm" value={st.rollNo} onChange={(e) => { const copy = [...rubricStudents]; copy[idx].rollNo = e.target.value; setRubricStudents(copy); }} />
                      </td>
                      <td style={{ width: '180px' }}>
                        <Form.Control type="text" size="sm" value={st.name} onChange={(e) => { const copy = [...rubricStudents]; copy[idx].name = e.target.value; setRubricStudents(copy); }} />
                      </td>
                      {practicalCols.map((pCol) => (
                        <td key={pCol} style={{ width: '65px' }}>
                          <Form.Control
                            type="number"
                            min={0}
                            max={20}
                            size="sm"
                            className="text-center font-mono-ppsu px-1"
                            value={st.scores?.[pCol] ?? 0}
                            onChange={(e) => {
                              const copy = [...rubricStudents];
                              copy[idx].scores = { ...copy[idx].scores, [pCol]: parseInt(e.target.value) || 0 };
                              setRubricStudents(copy);
                            }}
                          />
                        </td>
                      ))}
                      <td className="fw-bold font-mono-ppsu text-primary bg-light" style={{ width: '150px' }}>{avg} / 20</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <Button variant="outline-secondary" size="sm" onClick={() => {
            const newScores: Record<string, number> = {};
            practicalCols.forEach(p => newScores[p] = 18);
            setRubricStudents([...rubricStudents, { rollNo: String(101 + rubricStudents.length), name: `Student ${rubricStudents.length + 1}`, scores: newScores }]);
          }}>
            + Add Student Row
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setRubricsModalOpen(false)}>Cancel</Button>
          <Button variant="success" size="sm" onClick={handleSaveItem8Rubrics}>Save & Attach Marks Matrix</Button>
        </Modal.Footer>
      </Modal>

      {/* SECTION 17: Per-Experiment Continuous Evaluation Sheet Modal (Item 9) */}
      <Modal show={false && item9ModalOpen} onHide={() => setItem9ModalOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">
            Department of Computer Engineering — Laboratory Continuous Evaluation Sheet (Item 9)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Tabs activeKey={activeExpTab} onSelect={(k) => k && setActiveExpTab(k)} className="mb-0 border-bottom-0">
              {experimentSheets.map((sheet, index) => (
                <Tab eventKey={sheet.id} title={`${sheet.expNo || `Exp ${index + 1}`}`} key={sheet.id} />
              ))}
            </Tabs>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                const newId = `exp-${Date.now()}`;
                const newSheet = {
                  id: newId,
                  labName: courseFile.courseTitle || 'Laboratory',
                  academicYear: courseFile.academicYear || '2026-2027',
                  expNo: `Experiment ${experimentSheets.length + 1}`,
                  expTitle: `Experiment Title ${experimentSheets.length + 1}`,
                  expDate: new Date().toISOString().split('T')[0],
                  students: [
                    { rollNo: '101', name: 'Aarav Patel', a: 5, b: 5, c: 4, d: 5 },
                    { rollNo: '102', name: 'Ananya Sharma', a: 5, b: 5, c: 5, d: 5 }
                  ]
                };
                setExperimentSheets([...experimentSheets, newSheet]);
                setActiveExpTab(newId);
              }}
            >
              + Add Experiment Sheet
            </Button>
          </div>

          {experimentSheets.map((sheet, sIdx) => {
            if (sheet.id !== activeExpTab) return null;
            return (
              <div key={sheet.id} className="p-3 bg-light rounded border">
                <Row className="g-2 mb-3 small">
                  <Col xs={12} md={4}>
                    <Form.Label className="fw-semibold text-secondary mb-1">Name of Laboratory</Form.Label>
                    <Form.Control type="text" size="sm" value={sheet.labName} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].labName = e.target.value; setExperimentSheets(copy); }} />
                  </Col>
                  <Col xs={12} md={2}>
                    <Form.Label className="fw-semibold text-secondary mb-1">Academic Year</Form.Label>
                    <Form.Control type="text" size="sm" value={sheet.academicYear} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].academicYear = e.target.value; setExperimentSheets(copy); }} />
                  </Col>
                  <Col xs={12} md={2}>
                    <Form.Label className="fw-semibold text-secondary mb-1">Experiment No.</Form.Label>
                    <Form.Control type="text" size="sm" value={sheet.expNo} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].expNo = e.target.value; setExperimentSheets(copy); }} />
                  </Col>
                  <Col xs={12} md={2}>
                    <Form.Label className="fw-semibold text-secondary mb-1">Date</Form.Label>
                    <Form.Control type="date" size="sm" value={sheet.expDate} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].expDate = e.target.value; setExperimentSheets(copy); }} />
                  </Col>
                  <Col xs={12} md={12}>
                    <Form.Label className="fw-semibold text-secondary mb-1">Title of Experiment</Form.Label>
                    <Form.Control type="text" size="sm" value={sheet.expTitle} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].expTitle = e.target.value; setExperimentSheets(copy); }} />
                  </Col>
                </Row>

                <Table responsive bordered hover size="sm" className="small align-middle text-center bg-white mb-2">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '6%' }}>Sr. No.</th>
                      <th style={{ width: '15%' }}>Enrolment No.</th>
                      <th style={{ width: '25%' }}>Name of Student</th>
                      <th style={{ width: '10%' }}>A (Max 5)</th>
                      <th style={{ width: '10%' }}>B (Max 5)</th>
                      <th style={{ width: '10%' }}>C (Max 5)</th>
                      <th style={{ width: '10%' }}>D (Max 5)</th>
                      <th style={{ width: '14%' }} className="bg-warning-subtle">Total Out of (20)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.students.map((st: any, idx: number) => {
                      const total = (st.a || 0) + (st.b || 0) + (st.c || 0) + (st.d || 0);
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <Form.Control type="text" size="sm" value={st.rollNo} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].students[idx].rollNo = e.target.value; setExperimentSheets(copy); }} />
                          </td>
                          <td>
                            <Form.Control type="text" size="sm" value={st.name} onChange={(e) => { const copy = [...experimentSheets]; copy[sIdx].students[idx].name = e.target.value; setExperimentSheets(copy); }} />
                          </td>
                          {['a', 'b', 'c', 'd'].map((field) => (
                            <td key={field}>
                              <Form.Control
                                type="number"
                                min={0}
                                max={5}
                                size="sm"
                                className="text-center font-mono-ppsu"
                                value={st[field] ?? 0}
                                onChange={(e) => {
                                  const copy = [...experimentSheets];
                                  copy[sIdx].students[idx][field] = Math.min(5, Math.max(0, parseInt(e.target.value) || 0));
                                  setExperimentSheets(copy);
                                }}
                              />
                            </td>
                          ))}
                          <td className="fw-bold font-mono-ppsu text-primary bg-light">{total} / 20</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>

                <div className="p-2 bg-white rounded border small text-muted font-mono-ppsu">
                  <strong>Criteria Legend:</strong> A. Conduction of Practical (Max 5) &nbsp; B. Regular Record Writing (Max 5) &nbsp; C. Viva Voce (Max 5) &nbsp; D. Understanding of Experiment (Max 5)
                </div>

                <div className="mt-2">
                  <Button variant="outline-secondary" size="sm" onClick={() => {
                    const copy = [...experimentSheets];
                    copy[sIdx].students.push({ rollNo: String(101 + sheet.students.length), name: `Student ${sheet.students.length + 1}`, a: 4, b: 4, c: 4, d: 4 });
                    setExperimentSheets(copy);
                  }}>
                    + Add Student Row
                  </Button>
                </div>
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setItem9ModalOpen(false)}>Cancel</Button>
          <Button variant="success" size="sm" onClick={handleSaveItem9Sheets}>Save & Attach Experiment Sheets</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
