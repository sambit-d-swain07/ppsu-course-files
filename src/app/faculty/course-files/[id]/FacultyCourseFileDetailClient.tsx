'use client';

import { useEffect, useState, useRef, useCallback, use, memo } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  { index: 7,  name: 'List of Laboratory Experiments', maxScore: 10 },
  { index: 8,  name: 'Laboratory Rubrics', maxScore: 10 },
  { index: 9,  name: 'Theory Continuous Evaluation Rubrics', maxScore: 10 },
  { index: 10, name: 'Lab Manuals / Tutorials', maxScore: 10 },
  { index: 11, name: 'Internal Assessment 1', maxScore: 10 },
  { index: 12, name: 'Internal Assessment 2', maxScore: 10 },
  { index: 13, name: 'Guidelines / Documents related to Evaluation Criteria', maxScore: 10 },
  { index: 14, name: 'Attendance register (ERP)', maxScore: 10 },
  { index: 15, name: 'University exam', maxScore: 10 },
  { index: 16, name: 'CO Attainment output sheet', maxScore: 10 },
  { index: 17, name: 'PO Attainment output sheet', maxScore: 10 },
  { index: 18, name: 'Action to be taken for next year based on CO attainment', maxScore: 10 },
  { index: 19, name: 'Lecture notes', maxScore: 20 },
  { index: 20, name: 'Course Faculty Signature', maxScore: 10 }
];

const PREDEFINED_THEORY_CRITERIA = [
  { id: 'predef-project',      label: 'Project' },
  { id: 'predef-case-study',   label: 'Case Study' },
  { id: 'predef-assignment',   label: 'Assignment' },
  { id: 'predef-termwork',     label: 'Termwork' },
  { id: 'predef-gd',           label: 'Group Discussion' },
  { id: 'predef-field-visit',  label: 'Field Visit' },
  { id: 'predef-presentation', label: 'Presentation' },
  { id: 'predef-self-learning',label: 'Self Learning' },
  { id: 'predef-faculty-eval', label: 'Faculty Evaluation' },
];

const LAB_TEACHER_ITEM_INDICES = [2, 4, 8, 9, 14, 20];
const LAB_TEACHER_EDITABLE_ITEM_INDICES = [2, 8, 9, 14, 20];

// Title-case helper for criterion labels
const toTitleCase = (s: string) => s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
const SCHOOL_LABELS: Record<string, string> = {
  SOE: 'SOE (School of Engineering)',
  IDS: 'IDS',
  ICA: 'ICA'
};

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

export default function FacultyCourseFileDetailClient({ courseFileId }: { courseFileId: string }) {
  const router = useRouter();
  const [courseFile, setCourseFile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerEdit, setHeaderEdit] = useState({
    facultyName: '', department: '', school: '', semester: '', courseCode: '', courseTitle: '', division: ''
  });
  const [facultyConfirmed, setFacultyConfirmed] = useState(false);
  const [facultySignatureName, setFacultySignatureName] = useState('');
  const [access, setAccess] = useState<{ mode: string; batch?: string; facultyName?: string; allowedItems?: number[]; editableItems?: number[] }>({ mode: 'OWNER' });
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
  const [numPracticals, setNumPracticals] = useState<number>(4);
  const [item8Rows, setItem8Rows] = useState<any[]>([]);
  const [item8Criteria, setItem8Criteria] = useState<any[]>([]);
  const [item9Rows, setItem9Rows] = useState<any[]>([]);
  const [item9Criteria, setItem9Criteria] = useState<any[]>([]);
  // Item 9 custom criterion add panel state
  const [item9CustomLabel, setItem9CustomLabel] = useState('');
  const [item9CustomMax, setItem9CustomMax] = useState<number>(10);
  const [labTeacherDeclared, setLabTeacherDeclared] = useState(false);
  const [uploadingItem, setUploadingItem] = useState<number | string | null>(null);

  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const generateBreakdown = useCallback((totalMark: number, seedKey: string, maxMark = 20) => {
    const roundedTotal = Math.max(0, Math.min(maxMark, Math.round((Number(totalMark) || 0) * 10) / 10));
    
    if (roundedTotal === maxMark) {
      const q = maxMark / 4;
      return { a: q, b: q, c: q, d: q, total: maxMark };
    }
    if (roundedTotal === 0) {
      return { a: 0, b: 0, c: 0, d: 0, total: 0 };
    }

    const hash = hashString(`${seedKey}-${roundedTotal}`);
    const scaleFactor = 20 / maxMark;
    const targetUnits = Math.round(roundedTotal * scaleFactor * 2);
    const maxUnitsPerCol = 10;
    
    const baseAvg = Math.floor(targetUnits / 4);
    let units = [baseAvg, baseAvg, baseAvg, baseAvg];
    let remainder = targetUnits - (baseAvg * 4);

    const shift = hash % 4;
    const shuffledOrder = [
      (0 + shift) % 4,
      (1 + shift) % 4,
      (2 + shift) % 4,
      (3 + shift) % 4,
    ];

    for (let i = 0; i < remainder; i++) {
      const colIdx = shuffledOrder[i % 4];
      units[colIdx]++;
    }

    for (let i = 0; i < 4; i++) {
      if (units[i] > maxUnitsPerCol) {
        const overflow = units[i] - maxUnitsPerCol;
        units[i] = maxUnitsPerCol;
        for (let j = 0; j < 4; j++) {
          if (i !== j && units[j] + overflow <= maxUnitsPerCol) {
            units[j] += overflow;
            break;
          }
        }
      }
    }

    for (let pass = 0; pass < 5; pass++) {
      let changed = false;
      for (let i = 0; i < 3; i++) {
        if (units[i] === units[i + 1]) {
          const otherIdx = (i + 2) % 4;
          if (units[i] < maxUnitsPerCol && units[otherIdx] > 0) {
            units[i]++;
            units[otherIdx]--;
            changed = true;
          } else if (units[i] > 0 && units[otherIdx] < maxUnitsPerCol) {
            units[i]--;
            units[otherIdx]++;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    const a = units[0] / 2;
    const b = units[1] / 2;
    const c = units[2] / 2;
    const d = units[3] / 2;
    const sum = Number((a + b + c + d).toFixed(1));

    return { a, b, c, d, total: sum };
  }, []);

  const calcStudentAverages = useCallback((row: any, numP: number) => {
    const practicals = row.practicals || {};
    let sum = 0;
    for (let i = 1; i <= numP; i++) {
      sum += Number(practicals[`P${i}`]) || 0;
    }
    const avg10 = numP > 0 ? Number((sum / numP).toFixed(2)) : 0;
    const avg20 = Number((avg10 * 2).toFixed(2));
    return { avg10, avg20 };
  }, []);

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
      if (!data || !data.courseFile) {
        setActionError('Course file not found or inaccessible.');
        setLoading(false);
        return;
      }
      setCourseFile(data.courseFile);
      const checklistItems = Array.isArray(data.checklistItems) ? data.checklistItems.filter(Boolean) : [];
      setChecklist(checklistItems);
      const loadedAccess = data.courseFile.access || { mode: 'OWNER' };
      setAccess(loadedAccess);

      setHeaderEdit({
        facultyName: data.courseFile.facultyName || data.courseFile.faculty?.name || '',
        department: data.courseFile.department || data.courseFile.faculty?.department || '',
        school: data.courseFile.school || data.courseFile.faculty?.school || 'School of Engineering',
        semester: data.courseFile.semester || '',
        courseCode: data.courseFile.courseCode || '',
        courseTitle: data.courseFile.courseTitle || '',
        division: data.courseFile.division || ''
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
        return loadedAccess.mode === 'LAB_BATCH' && loadedAccess.batch
          ? all.filter((student) => String(student.batch || '').toUpperCase() === loadedAccess.batch)
          : all;
      };

      const buildItem8Rows = (items: any[], studentList: any[]) => {
        const dbItem = items.find((c: any) => c.itemIndex === 8);
        let rawSubs: any = {};
        try { if (dbItem?.subItemsJson) rawSubs = JSON.parse(dbItem.subItemsJson); } catch {}
        
        if (rawSubs.numPracticals) {
          setNumPracticals(Math.max(1, Math.min(20, Number(rawSubs.numPracticals))));
        }

        const storedById = new Map<string, any>(
          (Array.isArray(rawSubs.students) ? rawSubs.students : []).filter(Boolean).map((r: any) => [r.studentId || r.enrolmentNumber, r])
        );

        const labDataMap = new Map<string, any>();
        if (Array.isArray(dbItem?.batchSubmissions)) {
          dbItem.batchSubmissions.forEach((bSub: any) => {
            let bs: any[] = Array.isArray(bSub.students) ? bSub.students : [];
            if (!bs.length && bSub.subItemsJson) {
              try { const p = JSON.parse(bSub.subItemsJson); if (Array.isArray(p.students)) bs = p.students; } catch {}
            }
            bs.forEach((st: any) => {
              const id = st.studentId || st.id || st.enrolmentNumber;
              if (id) labDataMap.set(id, { ...(labDataMap.get(id) || {}), ...st });
            });
          });
        }

        const autoRows = studentList.map((s: any) => {
          const prev = storedById.get(s.id) || storedById.get(s.enrolmentNumber) || {};
          const lm = labDataMap.get(s.id) || labDataMap.get(s.enrolmentNumber) || {};

          const practicals = lm.practicals || lm.scores || prev.practicals || prev.scores || {};
          const termWork = lm.termWork ?? prev.termWork ?? prev.marks?.['term-work'] ?? 0;
          const internalViva = lm.internalViva ?? prev.internalViva ?? prev.marks?.['internal-viva'] ?? 0;
          const esePerformance = lm.esePerformance ?? prev.esePerformance ?? prev.marks?.['ese-performance'] ?? 0;
          const eseExternalViva = lm.eseExternalViva ?? prev.eseExternalViva ?? prev.marks?.['ese-external-viva'] ?? 0;

          return {
            studentId: s.id,
            name: s.name,
            enrolmentNumber: s.enrolmentNumber,
            batch: s.batch || lm.batch || prev.batch || 'A',
            practicals,
            termWork: Number(termWork) || 0,
            internalViva: Number(internalViva) || 0,
            esePerformance: Number(esePerformance) || 0,
            eseExternalViva: Number(eseExternalViva) || 0
          };
        });

        const manualRows = (Array.isArray(rawSubs.students) ? rawSubs.students : [])
          .filter((r: any) => r?.isManual)
          .map((r: any) => ({
            studentId: r.studentId,
            name: r.name,
            enrolmentNumber: r.enrolmentNumber,
            batch: r.batch || 'A',
            isManual: true,
            practicals: r.practicals || {},
            termWork: Number(r.termWork) || 0,
            internalViva: Number(r.internalViva) || 0,
            esePerformance: Number(r.esePerformance) || 0,
            eseExternalViva: Number(r.eseExternalViva) || 0
          }));

        return [...autoRows, ...manualRows];
      };

      const buildRows = (items: any[], itemIndex: number, studentList: any[]) => {
        const dbItem = items.find((c: any) => c.itemIndex === itemIndex);
        let rawSubs: any = {};
        try { if (dbItem?.subItemsJson) rawSubs = JSON.parse(dbItem.subItemsJson); } catch {}
        const defaultCriteria = [{ id: 'internal-exam-1', label: 'Internal Exam 1', max: 30, fixed: true }, { id: 'internal-exam-2', label: 'Internal Exam 2', max: 30, fixed: true }];
        const criteria = (Array.isArray(rawSubs.criteria) && rawSubs.criteria.length ? rawSubs.criteria : defaultCriteria)
          .filter((c: any) => c && String(c.id || '').trim())
          .map((c: any) => ({ ...c, id: String(c.id), label: String(c.label || 'Criterion'), max: Number(c.max) || 0 }));

        const storedById = new Map<string, any>(
          (Array.isArray(rawSubs.students) ? rawSubs.students : []).filter(Boolean).map((r: any) => [r.studentId || r.enrolmentNumber, r])
        );
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
          criteria.forEach((c: any) => { const v = lm[c.id] ?? prev.marks?.[c.id]; marks[c.id] = v !== undefined ? Number(v) : 0; });
          return { studentId: s.id, name: s.name, enrolmentNumber: s.enrolmentNumber, marks, batch: s.batch || lm.batch || prev.batch || 'A' };
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
      const r8 = buildItem8Rows(checklistItems, mergedStudentList);
      const { rows: r9, criteria: c9 } = buildRows(checklistItems, 9, mergedStudentList);
      setItem8Rows(r8);
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

  const isLocked = !['DRAFT', 'NEEDS_REVISION'].includes(courseFile?.status);

  const isRowEditableByCurrentFaculty = useCallback((rowBatch?: string) => {
    if (isLocked) return false;
    const targetBatch = String(rowBatch || 'A').toUpperCase();
    const isLabTeacherMode = access?.mode === 'LAB_BATCH';

    if (isLabTeacherMode) {
      return targetBatch === String(access.batch || 'A').toUpperCase();
    }

    const assignedBatches: string[] = (access as any)?.assignedBatches;
    if (Array.isArray(assignedBatches) && assignedBatches.length > 0) {
      return assignedBatches.includes(targetBatch);
    }

    const hasLabTeacherB = Boolean(courseFile?.subject?.labTeacherBId);
    const hasLabTeacherC = Boolean(courseFile?.subject?.labTeacherCId);

    if (targetBatch === 'B' && hasLabTeacherB) return false;
    if (targetBatch === 'C' && hasLabTeacherC) return false;

    return true;
  }, [isLocked, access, courseFile]);

  const handleItem8StudentChange = useCallback((studentId: string, field: string, value: any, pKey?: string) => {
    if (isLocked) return;
    const targetRow = item8Rows.find(r => r.studentId === studentId || r.id === studentId);
    if (targetRow && !isRowEditableByCurrentFaculty(targetRow.batch)) return;

    const numVal = Math.max(0, Number(value) || 0);

    setItem8Rows(prev => {
      const updated = prev.map(row => {
        if (row.studentId !== studentId && row.id !== studentId) return row;
        if (!isRowEditableByCurrentFaculty(row.batch)) return row;
        if (pKey) {
          const practicals = { ...(row.practicals || {}) };
          practicals[pKey] = Math.min(10, numVal);
          return { ...row, practicals };
        } else {
          return { ...row, [field]: Math.min(20, numVal) };
        }
      });
      if (saveTimeoutsRef.current[8]) clearTimeout(saveTimeoutsRef.current[8]);
      saveTimeoutsRef.current[8] = setTimeout(() => {
        const subs = getSubItems(8) || {};
        subs.numPracticals = numPracticals;
        subs.students = updated;
        saveStructuredItem(8, subs, 'UPLOADED');
      }, 600);
      return updated;
    });
  }, [isLocked, numPracticals, item8Rows, isRowEditableByCurrentFaculty]);

  const handleNumPracticalsChange = useCallback((val: number) => {
    if (isLocked || access.mode === 'LAB_BATCH') return;
    const clamped = Math.max(1, Math.min(20, val || 1));
    setNumPracticals(clamped);
    const subs = getSubItems(8) || {};
    subs.numPracticals = clamped;
    subs.students = item8Rows;
    debouncedSaveStructuredItem(8, subs, 'UPLOADED');
  }, [isLocked, access.mode, item8Rows]);

  // Item 9 — toggle a predefined criterion on/off
  const handleToggleTheoryCriterion = useCallback((predefId: string, label: string, checked: boolean, maxMarks: number) => {
    if (isLocked) return;
    const subs = getSubItems(9) || {};
    const existing: any[] = Array.isArray(subs.criteria) ? subs.criteria : [];

    if (checked) {
      // Add criterion if not already present
      if (!existing.find((c: any) => c.id === predefId)) {
        subs.criteria = [...existing, { id: predefId, label, max: maxMarks, fixed: false, predefined: true }];
      } else {
        return; // already there
      }
    } else {
      // Check if any student has marks for this criterion
      const students: any[] = Array.isArray(subs.students) ? subs.students : [];
      const hasMarks = students.some((s: any) => (s.marks?.[predefId] || 0) > 0);
      if (hasMarks) {
        const confirmed = window.confirm(
          `Some students have marks entered for "${label}". Removing this criterion will delete those marks. Continue?`
        );
        if (!confirmed) return;
        // Clear marks for this criterion
        subs.students = students.map((s: any) => {
          const m = { ...(s.marks || {}) };
          delete m[predefId];
          return { ...s, marks: m };
        });
      }
      subs.criteria = existing.filter((c: any) => c.id !== predefId);
    }

    subs.students = syncStudentRows(9, subs.students || [], subs.criteria);
    const newCriteria = normalizeCriteria(subs.criteria);
    setItem9Criteria(newCriteria);
    setItem9Rows(prev => prev.map(r => {
      const m = { ...r.marks };
      newCriteria.forEach((c: any) => { if (m[c.id] === undefined) m[c.id] = 0; });
      return { ...r, marks: m };
    }));
    debouncedSaveStructuredItem(9, subs, 'UPLOADED');
  }, [isLocked, checklist, item9Criteria]);

  // Item 9 — add a fully custom criterion
  const handleAddCustomTheoryCriterion = useCallback((label: string, maxMarks: number) => {
    if (isLocked || !label.trim() || maxMarks <= 0) return;
    const subs = getSubItems(9) || {};
    const existing: any[] = Array.isArray(subs.criteria) ? subs.criteria : [];
    const newId = `custom-${Date.now()}`;
    subs.criteria = [...existing, { id: newId, label: toTitleCase(label.trim()), max: maxMarks, fixed: false, predefined: false }];
    subs.students = syncStudentRows(9, subs.students || [], subs.criteria);
    const newCriteria = normalizeCriteria(subs.criteria);
    setItem9Criteria(newCriteria);
    setItem9Rows(prev => prev.map(r => {
      const m = { ...r.marks };
      newCriteria.forEach((c: any) => { if (m[c.id] === undefined) m[c.id] = 0; });
      return { ...r, marks: m };
    }));
    debouncedSaveStructuredItem(9, subs, 'UPLOADED');
  }, [isLocked, checklist]);

  // Item 9 — remove any (non-fixed) criterion with optional confirmation
  const handleRemoveTheoryCriterion = useCallback((criterionId: string, label: string) => {
    if (isLocked) return;
    const subs = getSubItems(9) || {};
    const students: any[] = Array.isArray(subs.students) ? subs.students : [];
    const hasMarks = students.some((s: any) => (s.marks?.[criterionId] || 0) > 0);
    if (hasMarks) {
      const confirmed = window.confirm(
        `Some students have marks entered for "${label}". Removing this criterion will delete those marks. Continue?`
      );
      if (!confirmed) return;
      subs.students = students.map((s: any) => {
        const m = { ...(s.marks || {}) };
        delete m[criterionId];
        return { ...s, marks: m };
      });
    }
    subs.criteria = (Array.isArray(subs.criteria) ? subs.criteria : []).filter((c: any) => c.id !== criterionId);
    subs.students = syncStudentRows(9, subs.students || [], subs.criteria);
    const newCriteria = normalizeCriteria(subs.criteria);
    setItem9Criteria(newCriteria);
    setItem9Rows(prev => prev.map(r => {
      const m = { ...r.marks };
      newCriteria.forEach((c: any) => { if (m[c.id] === undefined) m[c.id] = 0; });
      return { ...r, marks: m };
    }));
    debouncedSaveStructuredItem(9, subs, 'UPLOADED');
  }, [isLocked, checklist]);

  // Item 9 — update max marks on a predefined criterion inline
  const handleUpdateTheoryCriterionMax = useCallback((criterionId: string, newMax: number) => {
    if (isLocked || newMax <= 0) return;
    const subs = getSubItems(9) || {};
    subs.criteria = (Array.isArray(subs.criteria) ? subs.criteria : []).map((c: any) =>
      c.id === criterionId ? { ...c, max: newMax } : c
    );
    const newCriteria = normalizeCriteria(subs.criteria);
    setItem9Criteria(newCriteria);
    debouncedSaveStructuredItem(9, subs, 'UPLOADED');
  }, [isLocked, checklist]);

  const handleMarkChange = useCallback((itemIndex: number, studentId: string, criterionId: string, value: number) => {
    if (isLocked) return;
    if (itemIndex === 8) {
      const targetRow = item8Rows.find(r => r.studentId === studentId || r.id === studentId);
      if (targetRow && !isRowEditableByCurrentFaculty(targetRow.batch)) return;
    }
    const clamped = Math.max(0, value || 0);
    if (itemIndex === 8) {
      setItem8Rows(prev => prev.map(r => (r.studentId === studentId || r.id === studentId) ? (isRowEditableByCurrentFaculty(r.batch) ? { ...r, marks: { ...r.marks, [criterionId]: clamped } } : r) : r));
    } else if (itemIndex === 9) {
      setItem9Rows(prev => prev.map(r => (r.studentId === studentId || r.id === studentId) ? { ...r, marks: { ...r.marks, [criterionId]: clamped } } : r));
    }
    const saveRows = itemIndex === 8 ? item8Rows : item9Rows;
    const updatedRows = saveRows.map(r => (r.studentId === studentId || r.id === studentId) ? (itemIndex === 8 && !isRowEditableByCurrentFaculty(r.batch) ? r : { ...r, marks: { ...r.marks, [criterionId]: clamped } }) : r);
    if (saveTimeoutsRef.current[itemIndex]) clearTimeout(saveTimeoutsRef.current[itemIndex]);
    saveTimeoutsRef.current[itemIndex] = setTimeout(() => {
      const subs = getSubItems(itemIndex) || {};
      subs.students = updatedRows;
      saveStructuredItem(itemIndex, subs, 'UPLOADED');
    }, 600);
  }, [isLocked, item8Rows, item9Rows, checklist, isRowEditableByCurrentFaculty]);

  const handleItem8SectionFileUpload = async (sectionKey: 'sec21' | 'sec22' | 'sec23' | 'sec31' | 'sec32' | 'main', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(8) || {};
    const sectionFiles = subs.sectionFiles || {};

    if (!file) {
      delete sectionFiles[sectionKey];
      if (sectionKey === 'main') {
        subs.file = null;
      }
      await saveStructuredItem(8, { ...subs, sectionFiles }, 'UPLOADED');
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    sectionFiles[sectionKey] = {
      fileName: file.name,
      fileUrl: dataUrl,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    if (sectionKey === 'main') {
      subs.file = { fileName: file.name, fileUrl: dataUrl };
    }

    // Auto-parse if CSV
    if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type.includes('text/plain')) {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const header = lines[0].split(',').map(c => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
          const enrolIdx = header.findIndex(h => h.includes('enrol') || h.includes('roll') || h.includes('id'));
          
          if (enrolIdx !== -1) {
            let updated = false;
            const newRows = item8Rows.map(row => {
              const enrol = String(row.enrolmentNumber || '').trim().toLowerCase();
              const matchLine = lines.slice(1).find(l => {
                const cols = l.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
                return cols[enrolIdx] && cols[enrolIdx].toLowerCase() === enrol;
              });
              if (!matchLine) return row;
              const cols = matchLine.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
              const updatedRow = { ...row };

              header.forEach((h, idx) => {
                const val = Number(cols[idx]);
                if (isNaN(val)) return;
                if (/^p\d+$/i.test(h)) {
                  const pNum = h.toUpperCase();
                  updatedRow.practicals = { ...(updatedRow.practicals || {}), [pNum]: Math.min(10, Math.max(0, val)) };
                  updated = true;
                } else if (h.includes('viva') && (h.includes('int') || sectionKey === 'sec23')) {
                  updatedRow.internalViva = Math.min(20, Math.max(0, val));
                  updated = true;
                } else if ((h.includes('perf') || h.includes('quiz')) && (h.includes('ese') || sectionKey === 'sec31')) {
                  updatedRow.esePerformance = Math.min(30, Math.max(0, val));
                  updated = true;
                } else if (h.includes('ext') && (h.includes('viva') || sectionKey === 'sec32')) {
                  updatedRow.eseExternalViva = Math.min(30, Math.max(0, val));
                  updated = true;
                }
              });

              return updatedRow;
            });

            if (updated) {
              setItem8Rows(newRows);
              subs.students = newRows;
              setActionSuccess(`CSV parsed successfully! Marks populated for Item 8.`);
            }
          }
        }
      } catch (err: any) {
        console.error('CSV Parse Error:', err);
      }
    }

    await saveStructuredItem(8, { ...subs, sectionFiles }, 'UPLOADED');
  };

  const handleDownloadStudentCsv = (students: any[], batchName?: string) => {
    if (!students || students.length === 0) return;
    const headers = ['Sr No', 'Student Name', 'Enrolment Number', 'Batch'];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.enrolmentNumber || '').replace(/"/g, '""')}"`,
      `"${(s.batch || 'Unassigned').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student_list_${batchName ? `batch_${batchName}` : 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCeGuidelineUpload = async (criterionId: string, file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(13) || {};
    const currentGuidelines = subs.ceGuidelines || {};
    let updatedGuidelines = { ...currentGuidelines };

    if (file) {
      const fileUrl = await readFileAsDataUrl(file);
      updatedGuidelines[criterionId] = { fileName: file.name, fileUrl };
    } else {
      delete updatedGuidelines[criterionId];
    }

    await saveStructuredItem(13, { ...subs, ceGuidelines: updatedGuidelines }, 'UPLOADED');
  };

  const handleGradeChange = (studentId: string, field: 'theoryGrade' | 'practicalGrade', value: string) => {
    if (isLocked) return;
    const subs = getSubItems(15) || { questionPaper: null, gradeSheet: null, hasSeparatePracticalGrade: false, students: [] };
    const currentStudents = Array.isArray(subs.students) ? [...subs.students] : [];

    const existingIdx = currentStudents.findIndex((s: any) => s && (s.studentId === studentId || s.id === studentId));
    if (existingIdx >= 0) {
      currentStudents[existingIdx] = { ...currentStudents[existingIdx], studentId, id: studentId, [field]: value };
    } else {
      currentStudents.push({ studentId, id: studentId, [field]: value });
    }

    subs.students = currentStudents;
    setChecklist((prev) => prev.map((item) => item.itemIndex === 15 ? { ...item, status: 'UPLOADED', subItemsJson: JSON.stringify(subs) } : item));
    debouncedSaveStructuredItem(15, subs, 'UPLOADED');
  };



  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" style={{ color: 'var(--ppsu-primary)' }} />
    </div>
  );

  if (!courseFile) return <Alert variant="danger">Course file not found.</Alert>;

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
            { id: 'internal-1', label: 'Internal 1', max: 30, fixed: true },
            { id: 'internal-2', label: 'Internal 2', max: 30, fixed: true }
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

    if (itemIndex === 6) {
      const subs = getSubItems(6);
      return Boolean(subs?.outcomeLecture?.fileName || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED');
    }

    // Coordinator-owned items and Admin-owned Item 5:
    // Faculty is not responsible for uploading these items;
    // they do not block the faculty's completion count or submission gate.
    if (dbItem.isCoordinatorShared || itemIndex === 5) {
      return true;
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
      const subs = getSubItems(itemIndex);
      const hasSampleAnswer = Boolean(subs?.sampleAnswerSheet?.fileName);
      const hasMarks = Boolean(getSubItems(9)?.students?.length || subs?.file?.fileName || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED');
      return hasSampleAnswer || hasMarks || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 13) {
      const subs = getSubItems(13);
      return Boolean(subs?.assignmentTopics?.length && (subs?.sampleAssignment?.fileName || subs?.marks?.length || subs?.marksFile?.fileName)) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED';
    }
    if (itemIndex === 15) {
      const subs = getSubItems(15);
      return Boolean((subs?.gradeSheet?.fileName || subs?.students?.length) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED');
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

    return access.mode === 'LAB_BATCH' && access.batch
      ? allStudents.filter((student) => String(student.batch || '').toUpperCase() === access.batch)
      : allStudents;
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
    
    if (itemIndex === 8) {
      const newStudentId = `manual-${Date.now()}`;
      const newStudent: any = {
        studentId: newStudentId,
        name: '',
        enrolmentNumber: '',
        batch: access.batch || 'A',
        isManual: true,
        practicals: {},
        termWork: 0,
        internalViva: 0,
        esePerformance: 0,
        eseExternalViva: 0
      };
      subs.numPracticals = numPracticals;
      subs.students.push(newStudent);
      await saveStructuredItem(8, subs, 'UPLOADED');
      setItem8Rows(prev => [...prev, newStudent]);
      return;
    }

    const defaultCriteria = [{ id: 'internal-exam-1', label: 'Internal Exam 1', max: 30, fixed: true }, { id: 'internal-exam-2', label: 'Internal Exam 2', max: 30, fixed: true }];
    if (!Array.isArray(subs.criteria) || subs.criteria.length === 0) subs.criteria = defaultCriteria;
    const newStudentId = `manual-${Date.now()}`;
    const newStudent: any = { studentId: newStudentId, name: '', enrolmentNumber: '', marks: {}, isManual: true, batch: access.batch || 'A' };
    normalizeCriteria(subs.criteria).forEach((criterion: any) => { newStudent.marks[criterion.id] = 0; });
    subs.students.push(newStudent);
    await saveStructuredItem(itemIndex, subs, 'UPLOADED');
    setItem9Rows(prev => [...prev, newStudent]);
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
    if (itemIndex === 8) {
      const targetRow = item8Rows.find(r => r.studentId === studentId || r.id === studentId);
      if (targetRow && !isRowEditableByCurrentFaculty(targetRow.batch)) return;
      setItem8Rows(prev => prev.map(r => (r.studentId === studentId || r.id === studentId) ? { ...r, [field]: value } : r));
    }
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


  const handleLabTeacherSubmit = async () => {
    if (isLocked || submitLoading) return;
    if (!labTeacherDeclared) {
      setActionError('Please confirm the mandatory checklist declaration checkbox.');
      return;
    }
    setSubmitLoading(true);
    setActionError(''); setActionSuccess('');
    try {
      const allowedItems = [2, 4, 8, 9, 14, 20];
      for (const idx of allowedItems) {
        const subs = getSubItems(idx) || {};
        await saveStructuredItem(idx, subs, 'SUBMITTED');
      }
      setActionSuccess(`Batch ${access.batch} lab data submitted successfully to Course Teacher!`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit lab data.');
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
    if (access.mode === 'LAB_BATCH' && !LAB_TEACHER_EDITABLE_ITEM_INDICES.includes(itemIndex)) return;
    setActionError(''); setActionSuccess('');
    if (!selectedFile) return;

    setUploadingItem(itemIndex);
    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const isSig = itemIndex === 20 && access.mode !== 'LAB_BATCH';
      let studentListJson: string | undefined;
      if (itemIndex === 4 && /\.(csv|txt)$/i.test(selectedFile.name)) {
        const lines = (await selectedFile.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const header = lines[0]?.split(',').map((value) => value.trim().toLowerCase()) || [];
        const findIndex = (patterns: string[], fallback: number) => {
          const found = header.findIndex((label) => patterns.some((pattern) => label.includes(pattern)));
          return found >= 0 ? found : fallback;
        };
        const enrolmentIndex = findIndex(['enrol', 'enroll', 'roll'], 0);
        const nameIndex = findIndex(['name', 'student'], 1);
        const batchIndex = findIndex(['batch'], 2);
        const rows = lines.slice(1).map((line, index) => {
          const values = line.split(',').map((value) => value.trim());
          const enrolmentNumber = values[enrolmentIndex] || '';
          const name = values[nameIndex] || '';
          const batch = String(values[batchIndex] || '').toUpperCase();
          return { id: enrolmentNumber || `student-${index}`, enrolmentNumber, name, batch: ['A', 'B', 'C'].includes(batch) ? batch : '' };
        }).filter((student) => student.enrolmentNumber && student.name);
        studentListJson = JSON.stringify({ students: rows });
      }

      setChecklist((prev) => prev.map((item) => item.itemIndex === itemIndex ? {
        ...item,
        status: 'UPLOADED',
        fileName: selectedFile.name,
        fileUrl: dataUrl,
        ...(studentListJson ? { subItemsJson: studentListJson } : {})
      } : item));

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
      if (!res.ok) {
        fetchData();
        throw new Error('Upload failed');
      }

      if (isSig) {
        await fetch(`/api/course-files/${courseFileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facultySignatureUrl: dataUrl
          })
        });
      }

      setActionSuccess(`Item #${itemIndex} (${selectedFile.name}) uploaded successfully.`);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemove = async (itemIndex: number) => {
    if (isLocked) return;
    if (access.mode === 'LAB_BATCH' && !LAB_TEACHER_EDITABLE_ITEM_INDICES.includes(itemIndex)) return;
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
  const handleStudentBatchChange = async (studentId: string, newBatch: string) => {
    if (isLocked || access.mode === 'LAB_BATCH') return;
    const item4Db = checklist.find((c: any) => c.itemIndex === 4);
    let subs: any = {};
    try { if (item4Db?.subItemsJson) subs = JSON.parse(item4Db.subItemsJson); } catch (e) {}
    const students: any[] = Array.isArray(subs.students) ? subs.students : [];

    let found = false;
    const updatedStudents = students.map((st: any) => {
      const id = st.id || st.studentId || st.enrolmentNumber;
      if (id === studentId || st.enrolmentNumber === studentId) {
        found = true;
        return { ...st, batch: newBatch };
      }
      return st;
    });

    if (!found) {
      const student = getStudentList().find((s: any) => s.id === studentId || s.enrolmentNumber === studentId);
      if (student) {
        updatedStudents.push({ ...student, batch: newBatch });
      }
    }

    const updatedSubJson = JSON.stringify({ ...subs, students: updatedStudents });

    try {
      const res = await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 4,
          subItemsJson: updatedSubJson
        })
      });
      if (!res.ok) throw new Error('Failed to update student batch');
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    }
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

  // Item 6 Sub-upload Handler (coordinator-only; 6 sub-items: lecture/lab/tutorial plans + outcomes)
  const handleItem6SubUpload = async (subKey: 'lessonPlanLecture' | 'lessonPlanLab' | 'lessonPlanTutorial' | 'outcomeLecture' | 'outcomeLab' | 'outcomeTutorial', file?: File) => {
    if (isLocked) return;
    const subs = getSubItems(6) || {
      lessonPlanLecture: null, lessonPlanLab: null, lessonPlanTutorial: null,
      outcomeLecture: null, outcomeLab: null, outcomeTutorial: null
    };

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

    // Required: lessonPlanLecture + outcomeLecture; optional: lab + tutorial slots
    const isComplete = !!(subs.lessonPlanLecture?.fileName && subs.outcomeLecture?.fileName);

    try {
      await fetch(`/api/checklist/${courseFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex: 6,
          status: isComplete ? 'UPLOADED' : 'EMPTY',
          fileName: 'course_delivery_details_package.pdf',
          subItemsJson: JSON.stringify(subs)
        })
      });
      setActionSuccess('Item 6 (Course Delivery Details) updated.');
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
          <Link href={`/faculty/course-files/${courseFileId}/preview`} target="_blank" className="btn btn-warning btn-sm fw-bold d-flex align-items-center gap-1 shadow-sm">
            👁️ Preview Merged Course File
          </Link>
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
          <Card.Body className="py-3">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h6 className="fw-bold text-success mb-1">Batch {access.batch} Lab Teacher Submission Portal</h6>
                <p className="small text-secondary mb-0">Manage your assigned lab items (Items 2, 4, 8, 9, 14, and 20). Submitting will send your lab data & rubrics directly to the Course Teacher.</p>
              </div>
              <Button
                variant="success"
                size="sm"
                className="fw-bold px-3 py-2"
                disabled={isLocked || submitLoading || !labTeacherDeclared}
                onClick={handleLabTeacherSubmit}
              >
                {submitLoading ? <Spinner animation="border" size="sm" /> : `✓ Submit Batch ${access.batch} Data`}
              </Button>
            </div>
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
              <Form.Label className="small fw-semibold text-secondary mb-1">
                {access.mode === 'LAB_BATCH' ? 'Faculty Name' : 'Course Faculty'}
              </Form.Label>
              <Form.Control
                type="text"
                value={access.mode === 'LAB_BATCH' ? (access.facultyName || headerEdit.facultyName) : headerEdit.facultyName}
                disabled={isLocked || access.mode === 'LAB_BATCH'}
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
            <Col xs={12} md={access.mode === 'LAB_BATCH' ? 2 : 4}>
              <Form.Label className="small fw-semibold text-secondary mb-1">
                Division
                <span className="ms-1 text-muted" style={{ fontSize: 11, fontWeight: 400 }}>(from subject allocation)</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={headerEdit.division}
                readOnly
                disabled
                className="py-1 bg-light text-secondary font-mono-ppsu fw-bold"
                placeholder="—"
                title="Division is set by Admin in Subject Allocation"
              />
            </Col>
            {access.mode === 'LAB_BATCH' && (
              <Col xs={12} md={2}>
                <Form.Label className="small fw-semibold text-secondary mb-1">
                  Batch
                </Form.Label>
                <Form.Control
                  type="text"
                  value={access.batch || 'B'}
                  readOnly
                  disabled
                  className="py-1 font-mono-ppsu fw-bold text-success bg-success-subtle border-success-subtle"
                />
              </Col>
            )}
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
            const isItem6 = item.index === 6;
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

                      {/* Course Coordinator Centrally Uploaded & Locked Banner */}
                      {dbItem.isCoordinatorShared && !isRestricted && (
                        <div className="mt-1.5 d-flex align-items-center gap-2">
                          {dbItem.coordinatorUploaded ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill small fw-semibold">
                              ✓ Uploaded by Course Coordinator — view only
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 rounded-pill small fw-semibold">
                              ⏳ Not uploaded yet — pending Course Coordinator (Locked)
                            </span>
                          )}
                        </div>
                      )}


                      {/* Single upload complete indicator */}
                      {!isItem1 && !isItem6 && !isItem8 && !isIA && !isUniv && item.index !== 18 && (dbItem.fileName || dbItem.sharedFileName) && !isRestricted && !dbItem.isCoordinatorShared && (
                        <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: 12, color: 'var(--ppsu-success-text)', overflow: 'hidden' }}>
                          <span>✓ <strong className="font-mono-ppsu text-truncate d-inline-block" style={{ maxWidth: '360px', verticalAlign: 'bottom' }}>{dbItem.fileName || dbItem.sharedFileName}</strong></span>
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
                    const rows = item8Rows;
                    const isCoordinatorUser = access.mode !== 'LAB_BATCH';

                    return (
                      <div className="mt-3 ps-3 border-start border-3 border-primary ms-2 w-100">
                        {/* 1. COURSE COORDINATOR SETUP BOX */}
                        <div className="p-3 bg-light rounded border mb-4">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                              <h6 className="fw-bold text-primary mb-1">
                                ⚙️ Course Coordinator Setup — Practical Evaluation Configuration
                              </h6>
                              <p className="text-muted small mb-0">
                                Set the number of practicals for this subject. This automatically generates P1...Pn columns for all lab teachers and course faculty.
                              </p>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              <Form.Label className="mb-0 fw-semibold small text-nowrap">Number of Practicals:</Form.Label>
                              {isCoordinatorUser && !isLocked ? (
                                <Form.Control
                                  type="number"
                                  min={1}
                                  max={20}
                                  size="sm"
                                  className="text-center font-mono-ppsu fw-bold"
                                  style={{ width: '80px' }}
                                  value={numPracticals}
                                  onChange={(e) => handleNumPracticalsChange(Number(e.target.value))}
                                />
                              ) : (
                                <span className="badge bg-primary fs-6 px-3 py-2">
                                  {numPracticals} (P1–P{numPracticals})
                                </span>
                              )}

                              {!isLocked && isCoordinatorUser && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="ms-2 text-nowrap"
                                  onClick={() => handleManualAddStudent(8)}
                                >
                                  + Add Student
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="alert alert-info small py-2 mb-3">
                          {access.mode === 'LAB_BATCH'
                            ? `Student rows are automatically filtered to Batch ${access.batch} from Item 4. Unassigned students are hidden.`
                            : "Student rows appear automatically from Item 4's Student List. Use '+ Add Student' to add someone not on that list."}
                        </div>

                        {/* 2. CONTINUOUS EVALUATION (CE) SECTION */}
<div className="mb-4 border rounded p-3 bg-white shadow-sm">
                          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                            <h5 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                              <span className="badge bg-primary">CE</span> Continuous Evaluation (Laboratory)
                            </h5>
                            <span className="text-muted small">Practicals + Term Work + Internal Viva</span>
                          </div>

                          {/* 2.1 Practical Marks Table */}
                          <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <h6 className="fw-bold text-secondary small mb-0">
                                2.1 Practical Marks Table (Out of 10 per Practical) (Term Work)
                              </h6>
                              {(() => {
                                const secFile = subs.sectionFiles?.sec21;
                                return (
                                  <div className="d-flex align-items-center gap-1.5">
                                    {secFile?.fileName ? (
                                      <div className="d-flex align-items-center gap-1 small">
                                        <span className="text-success fw-semibold font-mono-ppsu" style={{ fontSize: 10 }}>✓ {secFile.fileName}</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: '2.1 Practical Marks', fileName: secFile.fileName, fileUrl: secFile.fileUrl })}>
                                          👁️ View
                                        </Button>
                                        {!isLocked && (
                                          <>
                                            <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 9 }}>
                                              Replace
                                              <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec21', f); e.currentTarget.value = ''; }} />
                                            </label>
                                            <Button size="sm" variant="outline-danger" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => handleItem8SectionFileUpload('sec21', undefined)}>
                                              Remove
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      !isLocked && (
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                          Upload CSV / PDF
                                          <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec21', f); e.currentTarget.value = ''; }} />
                                        </label>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="table-responsive border rounded">
                              <Table bordered hover size="sm" className="small align-middle text-center mb-0">
                                <thead className="bg-light">
                                  <tr>
                                    <th style={{ width: '60px' }}>Batch</th>
                                    <th>Student Name</th>
                                    <th>Enrolment Number</th>
                                    {Array.from({ length: numPracticals }).map((_, i) => (
                                      <th key={i} style={{ width: '70px' }} className="bg-primary-subtle text-primary">
                                        P{i + 1}
                                      </th>
                                    ))}
                                    <th className="bg-info-subtle" style={{ width: '90px' }}>Avg of 10</th>
                                    <th className="bg-warning-subtle" style={{ width: '90px' }}>Avg of 20</th>
                                    {!isLocked && <th style={{ width: '70px' }}>Actions</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.length === 0 ? (
                                    <tr>
                                      <td colSpan={numPracticals + 5} className="text-muted py-3">
                                        No students found.
                                      </td>
                                    </tr>
                                  ) : (
                                    rows.map((row: any) => {
                                      const { avg10, avg20 } = calcStudentAverages(row, numPracticals);
                                      const isRowEditable = isRowEditableByCurrentFaculty(row.batch);
                                      return (
                                        <tr key={`prac-${row.studentId}`}>
                                          <td className="fw-semibold">{row.batch || 'A'}</td>
                                          <td className="text-start fw-semibold">
                                            {row.isManual ? (
                                              <Form.Control
                                                type="text"
                                                size="sm"
                                                value={row.name}
                                                disabled={!isRowEditable}
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
                                                disabled={!isRowEditable}
                                                onChange={(e) => handleManualStudentFieldChange(8, row.studentId, 'enrolmentNumber', e.target.value)}
                                                placeholder="Enrolment Number"
                                              />
                                            ) : (
                                              row.enrolmentNumber
                                            )}
                                          </td>

                                          {Array.from({ length: numPracticals }).map((_, i) => {
                                            const pKey = `P${i + 1}`;
                                            return (
                                              <td key={pKey}>
                                                <Form.Control
                                                  type="number"
                                                  min={0}
                                                  max={10}
                                                  step={0.5}
                                                  size="sm"
                                                  className="text-center font-mono-ppsu px-1"
                                                  value={row.practicals?.[pKey] ?? 0}
                                                  disabled={!isRowEditable}
                                                  onChange={(e) => handleItem8StudentChange(row.studentId, '', e.target.value, pKey)}
                                                />
                                              </td>
                                            );
                                          })}

                                          <td className="fw-bold text-info font-mono-ppsu">{avg10}</td>
                                          <td className="fw-bold text-primary font-mono-ppsu">{avg20}</td>

                                          {!isLocked && (
                                            <td>
                                              {row.isManual && isRowEditable ? (
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
                          </div>

                          {/* 2.2 CE — Practicals 4-Criteria Breakdown Table */}
                          <div className="mb-4 p-3 bg-light rounded border">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <h6 className="fw-bold text-dark small mb-0">
                                2.2 Practicals Auto-Generated 4-Criteria Breakdown Table
                              </h6>
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-secondary">Auto-Calculated from Avg of 20 (Max 5 per criterion)</span>
                                {(() => {
                                  const secFile = subs.sectionFiles?.sec22;
                                  return (
                                    <div className="d-flex align-items-center gap-1">
                                      {secFile?.fileName ? (
                                        <div className="d-flex align-items-center gap-1 small">
                                          <span className="text-success fw-semibold font-mono-ppsu" style={{ fontSize: 10 }}>✓ {secFile.fileName}</span>
                                          <Button size="sm" variant="outline-info" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: '2.2 Practicals Breakdown', fileName: secFile.fileName, fileUrl: secFile.fileUrl })}>
                                            👁️ View
                                          </Button>
                                          {!isLocked && (
                                            <>
                                              <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 9 }}>
                                                Replace
                                                <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec22', f); e.currentTarget.value = ''; }} />
                                              </label>
                                              <Button size="sm" variant="outline-danger" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => handleItem8SectionFileUpload('sec22', undefined)}>
                                                Remove
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        !isLocked && (
                                          <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                            Upload CSV / PDF
                                            <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec22', f); e.currentTarget.value = ''; }} />
                                          </label>
                                        )
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="table-responsive border rounded bg-white">
                              <Table bordered size="sm" className="small align-middle text-center mb-0">
                                <thead className="bg-light text-muted">
                                  <tr>
                                    <th style={{ width: '60px' }}>Batch</th>
                                    <th>Student Name</th>
                                    <th>Enrolment Number</th>
                                    <th style={{ width: '130px' }}>A (Understanding)</th>
                                    <th style={{ width: '130px' }}>B (Performance)</th>
                                    <th style={{ width: '130px' }}>C (Record Maint.)</th>
                                    <th style={{ width: '130px' }}>D (Viva)</th>
                                    <th className="bg-warning-subtle" style={{ width: '90px' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row: any) => {
                                    const { avg20 } = calcStudentAverages(row, numPracticals);
                                    const bd = generateBreakdown(avg20, `${row.studentId}-ce-prac`);
                                    return (
                                      <tr key={`prac-bd-${row.studentId}`}>
                                        <td className="fw-semibold">{row.batch || 'A'}</td>
                                        <td className="text-start">{row.name}</td>
                                        <td className="font-mono-ppsu">{row.enrolmentNumber}</td>
                                        <td className="font-mono-ppsu">{bd.a}</td>
                                        <td className="font-mono-ppsu">{bd.b}</td>
                                        <td className="font-mono-ppsu">{bd.c}</td>
                                        <td className="font-mono-ppsu">{bd.d}</td>
                                        <td className="fw-bold text-primary font-mono-ppsu">{bd.total}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          </div>

                          {/* 2.3 Internal Viva Evaluation & Breakdown */}
                          <div className="p-3 bg-light rounded border">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <h6 className="fw-bold text-dark small mb-0">
                                2.3 Internal Viva Evaluation & Auto-Breakdown (Score out of 20)
                              </h6>
                              {(() => {
                                const secFile = subs.sectionFiles?.sec23;
                                return (
                                  <div className="d-flex align-items-center gap-1">
                                    {secFile?.fileName ? (
                                      <div className="d-flex align-items-center gap-1 small">
                                        <span className="text-success fw-semibold font-mono-ppsu" style={{ fontSize: 10 }}>✓ {secFile.fileName}</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: '2.3 Internal Viva', fileName: secFile.fileName, fileUrl: secFile.fileUrl })}>
                                          👁️ View
                                        </Button>
                                        {!isLocked && (
                                          <>
                                            <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 9 }}>
                                              Replace
                                              <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec23', f); e.currentTarget.value = ''; }} />
                                            </label>
                                            <Button size="sm" variant="outline-danger" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => handleItem8SectionFileUpload('sec23', undefined)}>
                                              Remove
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      !isLocked && (
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                          Upload CSV / PDF
                                          <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec23', f); e.currentTarget.value = ''; }} />
                                        </label>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <Row className="g-3">
                              <Col md={5}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Direct Mark Entry (Max 20)</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>Student</th>
                                        <th style={{ width: '110px' }}>Internal Viva (20)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const isRowEditable = isRowEditableByCurrentFaculty(row.batch);
                                        return (
                                          <tr key={`iv-in-${row.studentId}`}>
                                            <td className="text-start text-truncate" style={{ maxWidth: '150px' }}>{row.name}</td>
                                            <td>
                                              <Form.Control
                                                type="number"
                                                min={0}
                                                max={20}
                                                step={0.5}
                                                size="sm"
                                                className="text-center font-mono-ppsu px-1"
                                                value={row.internalViva ?? 0}
                                                disabled={!isRowEditable}
                                                onChange={(e) => handleItem8StudentChange(row.studentId, 'internalViva', e.target.value)}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                              <Col md={7}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Auto-Generated 4-Criteria Breakdown</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>A</th>
                                        <th>B</th>
                                        <th>C</th>
                                        <th>D</th>
                                        <th className="bg-warning-subtle">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const bd = generateBreakdown(row.internalViva ?? 0, `${row.studentId}-ce-iv`);
                                        return (
                                          <tr key={`iv-bd-${row.studentId}`}>
                                            <td className="font-mono-ppsu">{bd.a}</td>
                                            <td className="font-mono-ppsu">{bd.b}</td>
                                            <td className="font-mono-ppsu">{bd.c}</td>
                                            <td className="font-mono-ppsu">{bd.d}</td>
                                            <td className="fw-bold text-primary font-mono-ppsu">{bd.total}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                            </Row>
                          </div>
                        </div>

                        {/* 3. END SEMESTER EXAM (ESE) SECTION */}
                        <div className="mb-4 border rounded p-3 bg-white shadow-sm">
                          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                            <h5 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                              <span className="badge bg-success">ESE</span> End Semester Exam (Laboratory)
                            </h5>
                            <span className="text-muted small">Performance / Quiz + External Viva</span>
                          </div>

                          {/* 3.1 Performance / Quiz Evaluation & Breakdown */}
                          <div className="mb-4 p-3 bg-light rounded border">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <h6 className="fw-bold text-dark small mb-0">
                                3.1 Performance / Quiz Evaluation & Auto-Breakdown (Score out of 30)
                              </h6>
                              {(() => {
                                const secFile = subs.sectionFiles?.sec31;
                                return (
                                  <div className="d-flex align-items-center gap-1">
                                    {secFile?.fileName ? (
                                      <div className="d-flex align-items-center gap-1 small">
                                        <span className="text-success fw-semibold font-mono-ppsu" style={{ fontSize: 10 }}>✓ {secFile.fileName}</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: '3.1 Performance / Quiz', fileName: secFile.fileName, fileUrl: secFile.fileUrl })}>
                                          👁️ View
                                        </Button>
                                        {!isLocked && (
                                          <>
                                            <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 9 }}>
                                              Replace
                                              <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec31', f); e.currentTarget.value = ''; }} />
                                            </label>
                                            <Button size="sm" variant="outline-danger" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => handleItem8SectionFileUpload('sec31', undefined)}>
                                              Remove
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      !isLocked && (
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                          Upload CSV / PDF
                                          <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec31', f); e.currentTarget.value = ''; }} />
                                        </label>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <Row className="g-3">
                              <Col md={5}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Direct Mark Entry (Max 30)</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>Student</th>
                                        <th style={{ width: '130px' }}>Perf / Quiz (30)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const isRowEditable = isRowEditableByCurrentFaculty(row.batch);
                                        return (
                                          <tr key={`pq-in-${row.studentId}`}>
                                            <td className="text-start text-truncate" style={{ maxWidth: '150px' }}>{row.name}</td>
                                            <td>
                                              <Form.Control
                                                type="number"
                                                min={0}
                                                max={30}
                                                step={0.5}
                                                size="sm"
                                                className="text-center font-mono-ppsu px-1"
                                                value={row.esePerformance ?? 0}
                                                disabled={!isRowEditable}
                                                onChange={(e) => handleItem8StudentChange(row.studentId, 'esePerformance', e.target.value)}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                              <Col md={7}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Auto-Generated 4-Criteria Breakdown</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>A</th>
                                        <th>B</th>
                                        <th>C</th>
                                        <th>D</th>
                                        <th className="bg-warning-subtle">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const bd = generateBreakdown(row.esePerformance ?? 0, `${row.studentId}-ese-pq`, 30);
                                        return (
                                          <tr key={`pq-bd-${row.studentId}`}>
                                            <td className="font-mono-ppsu">{bd.a}</td>
                                            <td className="font-mono-ppsu">{bd.b}</td>
                                            <td className="font-mono-ppsu">{bd.c}</td>
                                            <td className="font-mono-ppsu">{bd.d}</td>
                                            <td className="fw-bold text-success font-mono-ppsu">{bd.total}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                            </Row>
                          </div>

                          {/* 3.2 External Viva Evaluation & Breakdown */}
                          <div className="p-3 bg-light rounded border">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <h6 className="fw-bold text-dark small mb-0">
                                3.2 External Viva Evaluation & Auto-Breakdown (Score out of 30)
                              </h6>
                              {(() => {
                                const secFile = subs.sectionFiles?.sec32;
                                return (
                                  <div className="d-flex align-items-center gap-1">
                                    {secFile?.fileName ? (
                                      <div className="d-flex align-items-center gap-1 small">
                                        <span className="text-success fw-semibold font-mono-ppsu" style={{ fontSize: 10 }}>✓ {secFile.fileName}</span>
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => setViewingDoc({ title: '3.2 External Viva', fileName: secFile.fileName, fileUrl: secFile.fileUrl })}>
                                          👁️ View
                                        </Button>
                                        {!isLocked && (
                                          <>
                                            <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 9 }}>
                                              Replace
                                              <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec32', f); e.currentTarget.value = ''; }} />
                                            </label>
                                            <Button size="sm" variant="outline-danger" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => handleItem8SectionFileUpload('sec32', undefined)}>
                                              Remove
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      !isLocked && (
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                          Upload CSV / PDF
                                          <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem8SectionFileUpload('sec32', f); e.currentTarget.value = ''; }} />
                                        </label>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <Row className="g-3">
                              <Col md={5}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Direct Mark Entry (Max 30)</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>Student</th>
                                        <th style={{ width: '130px' }}>Ext Viva (30)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const isRowEditable = isRowEditableByCurrentFaculty(row.batch);
                                        return (
                                          <tr key={`ev-in-${row.studentId}`}>
                                            <td className="text-start text-truncate" style={{ maxWidth: '150px' }}>{row.name}</td>
                                            <td>
                                              <Form.Control
                                                type="number"
                                                min={0}
                                                max={30}
                                                step={0.5}
                                                size="sm"
                                                className="text-center font-mono-ppsu px-1"
                                                value={row.eseExternalViva ?? 0}
                                                disabled={!isRowEditable}
                                                onChange={(e) => handleItem8StudentChange(row.studentId, 'eseExternalViva', e.target.value)}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                              <Col md={7}>
                                <div className="border rounded bg-white p-2">
                                  <div className="fw-semibold text-secondary small mb-2">Auto-Generated 4-Criteria Breakdown</div>
                                  <Table bordered size="sm" className="small align-middle text-center mb-0">
                                    <thead className="bg-light">
                                      <tr>
                                        <th>A</th>
                                        <th>B</th>
                                        <th>C</th>
                                        <th>D</th>
                                        <th className="bg-warning-subtle">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row: any) => {
                                        const bd = generateBreakdown(row.eseExternalViva ?? 0, `${row.studentId}-ese-ev`, 30);
                                        return (
                                          <tr key={`ev-bd-${row.studentId}`}>
                                            <td className="font-mono-ppsu">{bd.a}</td>
                                            <td className="font-mono-ppsu">{bd.b}</td>
                                            <td className="font-mono-ppsu">{bd.c}</td>
                                            <td className="font-mono-ppsu">{bd.d}</td>
                                            <td className="fw-bold text-success font-mono-ppsu">{bd.total}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>
                            </Row>
                          </div>
                        </div>

                        {/* Single Attached Document upload slot for Item 8 (CSV or PDF) */}
                        <div className="d-flex align-items-center gap-2 mt-3 p-3 bg-light rounded border">
                          <span className="small text-secondary fw-semibold">
                            Item 8 Attached Document (CSV or PDF):
                          </span>
                          {subs.file?.fileName ? (
                            <div className="d-flex align-items-center gap-2 small ms-auto">
                              <span className="text-success fw-bold font-mono-ppsu">✓ {subs.file.fileName}</span>
                              <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setViewingDoc({ title: 'Laboratory Rubrics', fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}>View</Button>
                              {!isLocked && (
                                <>
                                  <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                    Replace
                                    <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleItem8SectionFileUpload('main', file); e.currentTarget.value = ''; }} />
                                  </label>
                                  <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleItem8SectionFileUpload('main', undefined)}>Remove</Button>
                                </>
                              )}
                            </div>
                          ) : (
                            !isLocked && (
                              <label className="btn btn-outline-secondary btn-sm ms-auto m-0" style={{ fontSize: 11 }}>
                                Upload Laboratory Rubrics File (CSV / PDF)
                                <input type="file" className="d-none" accept=".csv,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleItem8SectionFileUpload('main', file); e.currentTarget.value = ''; }} />
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Item 9: Theory Continuous Evaluation Rubrics */}
                  {item.index === 9 && (() => {
                    if (access.mode === 'LAB_BATCH') {
                      return (
                        <div className="mt-3 ps-4 border-start border-2 border-secondary ms-2 w-100">
                          <div className="alert alert-secondary small mb-0 d-flex align-items-center gap-2">
                            <span>🔒 <strong>Item 9 (Theory Continuous Evaluation Rubrics)</strong> is managed exclusively by the Course Teacher (Theory Faculty) and is locked/read-only for Lab Teachers.</span>
                          </div>
                        </div>
                      );
                    }
                    const subs = getSubItems(9) || {};

                    // Fixed base criteria (always present)
                    const FIXED_CRITERIA = [
                      { id: 'internal-1', label: 'Internal 1', max: 30, fixed: true },
                      { id: 'internal-2', label: 'Internal 2', max: 30, fixed: true },
                    ];

                    // Dynamic selected criteria (predefined + custom, non-fixed)
                    const selectedCriteria = item9Criteria.filter((c: any) => !c.fixed);

                    // All criteria combined for table columns
                    const allCriteria = [...FIXED_CRITERIA, ...selectedCriteria];

                    const rows = item9Rows;

                    // Compute avg of internals and total for a row
                    const computeRow = (row: any) => {
                      const i1 = Number(row.marks?.['internal-1'] || 0);
                      const i2 = Number(row.marks?.['internal-2'] || 0);
                      const avgInternals = Number(((i1 + i2) / 2).toFixed(1));
                      const criteriaSum = selectedCriteria.reduce((sum: number, c: any) => sum + (Number(row.marks?.[c.id]) || 0), 0);
                      const total = Number((avgInternals + criteriaSum).toFixed(1));
                      return { avgInternals, total };
                    };

                    return (
                      <div className="mt-3 ps-4 border-start border-2 border-success ms-2 w-100">

                        {/* Header row */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-secondary fw-semibold">Theory Continuous Evaluation Rubrics — per-student marks</span>
                          {!isLocked && access.mode !== 'LAB_BATCH' && (
                            <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => handleManualAddStudent(9)}>
                              + Add Student
                            </Button>
                          )}
                        </div>

                        {/* Info banner */}
                        <div className="alert alert-info small py-2 mb-3">
                          {access.mode === 'LAB_BATCH'
                            ? `Student rows are automatically filtered to Batch ${access.batch} from Item 4. Unassigned students are hidden.`
                            : "Student rows appear automatically from Item 4's Student List. Use '+ Add Student' to add someone not on that list."}
                        </div>

                        {/* ── Criteria Selection Panel ── */}
                        {!isLocked && (
                          <div className="border rounded p-3 mb-3" style={{ background: '#f8f9fa' }}>
                            <div className="fw-semibold small mb-2" style={{ color: '#0d6efd' }}>
                              📋 Select Evaluation Criteria
                            </div>
                            <div className="row g-2 mb-3">
                              {PREDEFINED_THEORY_CRITERIA.map((predef) => {
                                const active = item9Criteria.find((c: any) => c.id === predef.id);
                                const isChecked = Boolean(active);
                                return (
                                  <div key={predef.id} className="col-6 col-md-4 col-lg-3">
                                    <div className={`d-flex align-items-center gap-2 p-2 rounded border ${isChecked ? 'border-primary bg-white' : 'border-light bg-white'}`}
                                      style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}>
                                      <Form.Check
                                        type="checkbox"
                                        id={`theory-crit-${predef.id}`}
                                        checked={isChecked}
                                        onChange={(e) => handleToggleTheoryCriterion(predef.id, predef.label, e.target.checked, active?.max || 10)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <label htmlFor={`theory-crit-${predef.id}`} className="small fw-semibold mb-0 flex-grow-1" style={{ cursor: 'pointer' }}>
                                        {predef.label}
                                      </label>
                                      {isChecked && (
                                        <div className="d-flex align-items-center gap-1">
                                          <span className="text-muted small">Max:</span>
                                          <Form.Control
                                            type="number"
                                            min={1}
                                            size="sm"
                                            value={active?.max || 10}
                                            style={{ width: 55, fontSize: 12 }}
                                            onChange={(e) => handleUpdateTheoryCriterionMax(predef.id, Number(e.target.value) || 10)}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Custom criterion add row */}
                            <div className="d-flex align-items-center gap-2 pt-2 border-top">
                              <span className="small text-muted fw-semibold">+ Add Custom:</span>
                              <Form.Control
                                type="text"
                                size="sm"
                                placeholder="Criterion name"
                                value={item9CustomLabel}
                                onChange={(e) => setItem9CustomLabel(e.target.value)}
                                style={{ maxWidth: 200, fontSize: 12 }}
                              />
                              <span className="small text-muted">out of</span>
                              <Form.Control
                                type="number"
                                min={1}
                                size="sm"
                                value={item9CustomMax}
                                onChange={(e) => setItem9CustomMax(Number(e.target.value) || 10)}
                                style={{ width: 70, fontSize: 12 }}
                              />
                              <Button
                                variant="outline-success"
                                size="sm"
                                style={{ fontSize: 11 }}
                                disabled={!item9CustomLabel.trim() || item9CustomMax <= 0}
                                onClick={() => {
                                  handleAddCustomTheoryCriterion(item9CustomLabel, item9CustomMax);
                                  setItem9CustomLabel('');
                                  setItem9CustomMax(10);
                                }}
                              >
                                Add
                              </Button>
                            </div>

                            {/* Currently selected non-fixed criteria badges */}
                            {selectedCriteria.length > 0 && (
                              <div className="d-flex flex-wrap gap-1 mt-2">
                                {selectedCriteria.map((c: any) => (
                                  <span key={c.id} className="badge" style={{ background: '#e8f0fe', color: '#1a73e8', fontSize: 11, fontWeight: 500 }}>
                                    {toTitleCase(c.label)} ({c.max})
                                    {!isLocked && (
                                      <button
                                        className="btn btn-link p-0 ms-1 text-danger"
                                        style={{ fontSize: 11, lineHeight: 1, verticalAlign: 'middle' }}
                                        title={`Remove ${c.label}`}
                                        onClick={() => handleRemoveTheoryCriterion(c.id, c.label)}
                                      >×</button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Per-Student Marks Table ── */}
                        <div className="table-responsive border rounded">
                          <Table bordered hover size="sm" className="small align-middle text-center mb-0"
                            style={{ minWidth: 700 + selectedCriteria.length * 120 }}>
                            <thead className="bg-light">
                              <tr>
                                <th className="text-start" style={{ minWidth: 140 }}>Student Name</th>
                                <th style={{ minWidth: 130 }}>Enrolment Number</th>
                                <th style={{ minWidth: 60 }}>Batch</th>
                                <th style={{ minWidth: 90 }}>Internal 1 <span className="text-muted">(30)</span></th>
                                <th style={{ minWidth: 90 }}>Internal 2 <span className="text-muted">(30)</span></th>
                                <th className="bg-info bg-opacity-10" style={{ minWidth: 110 }}>Avg of Internals <span className="text-muted">(30)</span></th>
                                {selectedCriteria.map((c: any) => (
                                  <th key={c.id} style={{ minWidth: 100 }}>
                                    {toTitleCase(c.label)} <span className="text-muted">({c.max})</span>
                                  </th>
                                ))}
                                <th className="bg-warning-subtle fw-bold" style={{ minWidth: 90 }}>Total</th>
                                {!isLocked && <th style={{ width: 70 }}>Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={6 + selectedCriteria.length + (isLocked ? 0 : 1)} className="text-muted py-3">
                                    No students found. Use &apos;+ Add Student&apos; to add someone.
                                  </td>
                                </tr>
                              ) : (
                                rows.map((row: any) => {
                                  const { avgInternals, total } = computeRow(row);
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
                                        ) : row.name}
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
                                            placeholder="Enrolment No."
                                          />
                                        ) : row.enrolmentNumber}
                                      </td>
                                      <td>{row.batch || '—'}</td>
                                      {/* Internal 1 */}
                                      <td>
                                        <Form.Control
                                          type="number" min={0} max={30} size="sm" className="text-center"
                                          value={row.marks?.['internal-1'] ?? 0}
                                          disabled={isLocked}
                                          onChange={(e) => handleMarkChange(9, row.studentId, 'internal-1', Math.min(30, Number(e.target.value) || 0))}
                                        />
                                      </td>
                                      {/* Internal 2 */}
                                      <td>
                                        <Form.Control
                                          type="number" min={0} max={30} size="sm" className="text-center"
                                          value={row.marks?.['internal-2'] ?? 0}
                                          disabled={isLocked}
                                          onChange={(e) => handleMarkChange(9, row.studentId, 'internal-2', Math.min(30, Number(e.target.value) || 0))}
                                        />
                                      </td>
                                      {/* Average of Internals — auto-calculated, read-only */}
                                      <td className="fw-semibold text-info-emphasis bg-info bg-opacity-10">{avgInternals}</td>
                                      {/* Dynamic selected criteria */}
                                      {selectedCriteria.map((c: any) => (
                                        <td key={c.id}>
                                          <Form.Control
                                            type="number" min={0} max={c.max} size="sm" className="text-center"
                                            value={row.marks?.[c.id] ?? 0}
                                            disabled={isLocked}
                                            onChange={(e) => handleMarkChange(9, row.studentId, c.id, Math.min(c.max, Number(e.target.value) || 0))}
                                          />
                                        </td>
                                      ))}
                                      {/* Total — auto-calculated */}
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

                        {/* File upload */}
                        <div className="d-flex align-items-center gap-2 mt-2 small">
                          {subs.file?.fileName ? (
                            <>
                              <span className="text-success fw-semibold">✓ {subs.file.fileName}</span>
                              <Button size="sm" variant="outline-info" onClick={() => setViewingDoc({ title: 'Theory Continuous Evaluation Rubrics', fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}>View</Button>
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

                  {/* Item 4: Merged / unified student list for Course Teacher & Coordinator; filtered read-only for Lab Teachers */}
                  {item.index === 4 && !isRestricted && (() => {
                    const mergedStudents = getStudentList();
                    const item4Db = checklist.find((c: any) => c.itemIndex === 4);
                    const uploadedFile = item4Db?.fileName;
                    const uploadedFileUrl = item4Db?.fileUrl;
                    const isLabBatchView = access.mode === 'LAB_BATCH';
                    return (
                      <div className="mt-3 ps-4 border-start border-2 border-warning ms-2 w-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-secondary fw-semibold">
                            {isLabBatchView ? `Batch ${access.batch} Student List` : 'Combined Class List'}
                            {mergedStudents.length > 0 && (
                              <span className="ms-2 badge bg-primary text-white" style={{ fontSize: 11 }}>
                                {mergedStudents.length} students
                              </span>
                            )}
                          </span>
                          <div className="d-flex align-items-center gap-2">
                            {mergedStudents.length > 0 && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                style={{ fontSize: 11 }}
                                onClick={() => handleDownloadStudentCsv(mergedStudents, isLabBatchView ? access.batch : undefined)}
                              >
                                ⬇ Download as CSV
                              </Button>
                            )}
                            {!isLocked && !isLabBatchView && (
                              <label className="btn btn-outline-secondary btn-sm m-0" style={{ fontSize: 11 }}>
                                {uploadedFile ? 'Replace CSV' : '↑ Upload CSV / PDF'}
                                <input type="file" className="d-none" accept=".csv,.txt,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(4, 'Student Name List', f); e.currentTarget.value = ''; }} />
                              </label>
                            )}
                          </div>
                        </div>

                        {uploadedFile && (
                          <div className="d-flex align-items-center gap-2 small mb-2">
                            <span className="text-success fw-semibold">✓ {uploadedFile}</span>
                            <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }}
                              onClick={() => setViewingDoc({ title: 'Student Name List', fileName: uploadedFile, fileUrl: uploadedFileUrl })}>
                              View
                            </Button>
                            {!isLocked && !isLabBatchView && (
                              <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }}
                                onClick={() => handleRemove(4)}>
                                Remove
                              </Button>
                            )}
                          </div>
                        )}

                        {isLabBatchView && (
                          <div className="alert alert-info small py-1.5 px-3 mb-2 d-flex align-items-center justify-content-between">
                            <span>🔍 <strong>Auto-filtered for Batch {access.batch}:</strong> Showing only students assigned to Batch {access.batch}.</span>
                            <span className="badge bg-primary">{mergedStudents.length} Students</span>
                          </div>
                        )}

                        {mergedStudents.length > 0 ? (
                          <div className="table-responsive border rounded">
                            <Table bordered size="sm" className="small align-middle mb-0" style={{ minWidth: 520 }}>
                              <thead className="bg-light">
                                <tr>
                                  <th style={{ width: 36 }}>#</th>
                                  <th>Student Name</th>
                                  <th>Enrolment Number</th>
                                  <th style={{ width: 110 }}>Batch</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mergedStudents.map((student: any, idx: number) => (
                                  <tr key={student.id}>
                                    <td className="text-muted font-mono-ppsu">{idx + 1}</td>
                                    <td className="fw-semibold">{student.name}</td>
                                    <td className="font-mono-ppsu">{student.enrolmentNumber}</td>
                                    <td>
                                      {!isLocked && !isLabBatchView ? (
                                        <Form.Select
                                          size="sm"
                                          style={{ fontSize: 11, padding: '2px 4px', width: 100 }}
                                          value={student.batch || ''}
                                          onChange={(e) => handleStudentBatchChange(student.id, e.target.value)}
                                        >
                                          <option value="">Unassigned</option>
                                          <option value="A">Batch A</option>
                                          <option value="B">Batch B</option>
                                          <option value="C">Batch C</option>
                                        </Form.Select>
                                      ) : (
                                        <span className={`badge ${student.batch ? 'bg-primary text-white' : 'bg-secondary text-white'}`} style={{ fontSize: 11 }}>
                                          {student.batch ? `Batch ${student.batch}` : 'Unassigned'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        ) : (
                          <div className="alert alert-light small py-2 mb-0">
                            {isLabBatchView
                              ? `No Batch ${access.batch} students available. Students without a Batch value are hidden until the Course Teacher assigns A, B, or C.`
                              : 'No students yet. Upload a CSV file above with Student Name, Enrolment Number, and Batch.'}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Item 5: Centrally Managed Admin Academic Calendar */}
                  {item.index === 5 && !isRestricted && (
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {dbItem.fileName ? (
                        <>
                          <span className="badge bg-success-subtle text-success border" style={{ fontSize: 11 }}>
                            ✓ Published by Admin — view only
                          </span>
                          <Button
                            variant="outline-info"
                            size="sm"
                            style={{ fontSize: 12 }}
                            onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || 'Academic_Calendar.pdf', fileUrl: dbItem.fileUrl })}
                          >
                            👁️ View
                          </Button>
                        </>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: 11 }}>
                          ⏳ Not uploaded yet — pending Admin
                        </span>
                      )}
                    </div>
                  )}

                  {/* Item 10: Centrally Managed Course Coordinator Lab Manuals / Tutorials */}
                  {item.index === 10 && !isRestricted && (
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {(dbItem.fileName || dbItem.sharedFileName || dbItem.coordinatorUploaded) && (
                        <Button
                          variant="outline-info"
                          size="sm"
                          style={{ fontSize: 12 }}
                          onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || dbItem.sharedFileName || 'Lab_Manual.pdf', fileUrl: dbItem.fileUrl || dbItem.sharedFileUrl })}
                        >
                          👁️ View
                        </Button>
                      )}
                    </div>
                  )}

                  {/* SECTION 16: Right-side controls for Standard Items (View, Replace, Remove) */}
                  {!isItem1 && !isItem6 && !isItem8 && !isIA && !isUniv && !isLockedByStudentList && !isRestricted && item.index !== 4 && item.index !== 5 && item.index !== 9 && item.index !== 10 && item.index !== 18 && (
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {dbItem.isCoordinatorShared ? (
                        (dbItem.fileName || dbItem.sharedFileName || dbItem.coordinatorUploaded) ? (
                          <Button
                            variant="outline-info"
                            size="sm"
                            style={{ fontSize: 12 }}
                            onClick={() => setViewingDoc({ title: item.name, fileName: dbItem.fileName || dbItem.sharedFileName || 'document.pdf', fileUrl: dbItem.fileUrl || dbItem.sharedFileUrl })}
                          >
                            👁️ View
                          </Button>
                        ) : null
                      ) : (
                        complete ? (
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
                                  <input id={`file-replace-${item.index}`} type="file" className="d-none" accept={isSigItem ? ".pdf,.png,.jpg,.jpeg" : ".pdf"} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.index, item.name, f); e.currentTarget.value = ''; }} />
                                </label>
                                <button className="btn btn-outline-danger btn-sm" style={{ fontSize: 12 }} onClick={() => handleRemove(item.index)}>
                                  Remove
                                </button>
                              </>
                            )}
                          </>
                        ) : uploadingItem === item.index ? (
                          <Button variant="secondary" size="sm" disabled style={{ fontSize: 12 }}>
                            <Spinner animation="border" size="sm" className="me-1" /> Uploading…
                          </Button>
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
                            <input id={`file-upload-${item.index}`} type="file" className="d-none" accept={isSigItem ? ".pdf,.png,.jpg,.jpeg" : ".pdf"} disabled={isLocked} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.index, item.name, f); e.currentTarget.value = ''; }} />
                          </label>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 10 & 16: Item 1 Split into 5 Sub-uploads */}
                {isItem1 && !isRestricted && (
                  <div className="mt-3 ps-4 border-start border-2 border-info ms-2">
                    <div className="small text-secondary mb-2 fw-semibold">
                      5 Compulsory Sub-uploads Required
                      {dbItem.isCoordinatorShared && (
                        <span className="ms-2 badge bg-info-subtle text-info-emphasis border">
                          School: {SCHOOL_LABELS[getSubItems(1)?.school] || getSubItems(1)?.school || courseFile.school || 'Not selected'}
                        </span>
                      )}
                    </div>
                    <Row className="g-2 small">
                      {[
                        { key: 'vision', label: '(a) Vision *' },
                        { key: 'mission', label: '(b) Mission *' },
                        { key: 'peo', label: '(c) PEO *' },
                        { key: 'pso', label: '(d) PSO *' },
                        { key: 'po', label: '(e) PO *' }
                      ].map((sub) => {
                        const subData = getSubItems(1)?.[sub.key];
                        return (
                          <Col xs={12} md={6} lg={4} key={sub.key}>
                            <div className="p-2 bg-light rounded border">
                              <div className="fw-bold mb-1">
                                {sub.label}
                                {dbItem.isCoordinatorShared && <span className="ms-2 badge bg-secondary" style={{ fontSize: 9 }}>Coordinator Upload</span>}
                              </div>
                              {sub.key === 'gradeSheet' && <Form.Check type="switch" className="small mb-2" label="This course has a separate practical grade" checked={hasSeparatePracticalGrade} disabled={isLocked} onChange={(e) => handleTogglePracticalGrade(e.target.checked)} />}
                              {subData?.fileName ? (
                                <div>
                                  <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  <div className="d-flex gap-1">
                                    <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item 1 — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                      View
                                    </Button>
                                    {!isLocked && !dbItem.isCoordinatorShared && (
                                      <>
                                        <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 10 }}>
                                          Replace
                                          <input type="file" className="d-none" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem1SubUpload(sub.key as any, f); }} />
                                        </label>
                                        <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleItem1SubUpload(sub.key as any, undefined)}>
                                          Remove
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                dbItem.isCoordinatorShared ? (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>
                                    Not uploaded yet — pending Course Coordinator
                                  </div>
                                ) : (
                                  <label className="btn btn-outline-secondary btn-sm py-0" style={{ fontSize: 11 }}>
                                    Choose Document
                                    <input type="file" className="d-none" accept=".pdf" disabled={isLocked} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem1SubUpload(sub.key as any, f); }} />
                                  </label>
                                )
                              )}
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {/* SECTION 6: Item 6 — Course Delivery Details (Planning: Coordinator · Outcomes: Faculty) */}
                {isItem6 && !isRestricted && (() => {
                  const subs = getSubItems(6) || {};
                  const isCoordShared = Boolean(dbItem.isCoordinatorShared);
                  const subDefs = [
                    { key: 'lessonPlanLecture',   label: '(a) Lesson Plan — Lecture',         required: true,  section: 'planning' },
                    { key: 'lessonPlanLab',       label: '(b) Lesson Plan — Lab',             required: false, section: 'planning' },
                    { key: 'lessonPlanTutorial',  label: '(c) Lesson Plan — Tutorial',        required: false, section: 'planning' },
                    { key: 'outcomeLecture',      label: '(d) Outcome of Lesson (Lecture)',   required: true,  section: 'outcomes' },
                    { key: 'outcomeLab',          label: '(e) Outcome of Lab',                required: false, section: 'outcomes' },
                    { key: 'outcomeTutorial',     label: '(f) Outcome of Tutorial',           required: false, section: 'outcomes' },
                  ];
                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-primary ms-2">
                      <div className="small text-secondary mb-2 fw-semibold d-flex align-items-center gap-2 flex-wrap">
                        6 Sub-uploads
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: 9 }}>Planning: Course Coordinator</span>
                        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle" style={{ fontSize: 9 }}>Outcomes: Course Faculty</span>
                      </div>
                      {['planning', 'outcomes'].map((section) => (
                        <div key={section} className="mb-3">
                          <div className="small fw-bold text-uppercase text-secondary mb-2" style={{ letterSpacing: 1 }}>
                            {section === 'planning' ? '📋 Planning (Coordinator Managed)' : '📊 Outcomes (Faculty Managed)'}
                          </div>
                          <Row className="g-2 small">
                            {subDefs.filter(s => s.section === section).map((sub) => {
                              const subData = subs[sub.key as keyof typeof subs];
                              const isSubCoordShared = isCoordShared && sub.section === 'planning';
                              return (
                                <Col xs={12} md={6} lg={4} key={sub.key}>
                                  <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                                    <div>
                                      <div className="fw-bold mb-1 d-flex align-items-center gap-1 flex-wrap">
                                        <span>{sub.label}</span>
                                        {sub.required
                                          ? <span className="text-danger">*</span>
                                          : <span className="text-muted" style={{ fontSize: 9 }}>(optional)</span>
                                        }
                                        {isSubCoordShared && <span className="ms-1 badge bg-secondary" style={{ fontSize: 9 }}>Coordinator Upload</span>}
                                      </div>
                                      {subData?.fileName ? (
                                        <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                      ) : (
                                        <div className="text-muted mb-1" style={{ fontSize: 11 }}>
                                          {isSubCoordShared ? 'Not uploaded yet — pending Course Coordinator' : '✗ Not uploaded'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="d-flex gap-1 mt-2 flex-wrap">
                                      {subData?.fileName && (
                                        <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }}
                                          onClick={() => setViewingDoc({ title: `Item 6 — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                          👁️ View
                                        </Button>
                                      )}
                                      {!isLocked && !isSubCoordShared && (
                                        <>
                                          <label className="btn btn-outline-secondary btn-sm p-0 px-2 m-0" style={{ fontSize: 10 }}>
                                            {subData?.fileName ? 'Replace' : 'Choose File'}
                                            <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItem6SubUpload(sub.key as any, f); }} />
                                          </label>
                                          {subData?.fileName && (
                                            <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }}
                                              onClick={() => handleItem6SubUpload(sub.key as any, undefined)}>
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
                      ))}
                    </div>
                  );
                })()}

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
                        const isSubLockedByCoord = dbItem.isCoordinatorShared && ['timetable', 'questionPaper'].includes(sub.key);
                        return (
                          <Col xs={12} md={6} key={sub.key}>
                            <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="fw-bold mb-1">
                                  {sub.label}
                                  {isSubLockedByCoord && (
                                    <span className="ms-2 badge bg-secondary" style={{ fontSize: 9 }}>Coordinator Upload</span>
                                  )}
                                </div>
                                {subData?.fileName ? (
                                  <div>
                                    <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  </div>
                                ) : (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>
                                    {isSubLockedByCoord ? 'Not uploaded yet — pending Course Coordinator' : '✗ Not uploaded'}
                                  </div>
                                )}
                              </div>
                              <div className="d-flex gap-1 mt-2">
                                {subData?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `Item ${item.index} — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                    View
                                  </Button>
                                )}
                                {!isLocked && !isSubLockedByCoord && (
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

                {/* Items 11 & 12: (d) live Mark Statement and Result Analysis from Item 9 */}
                {isIA && !isRestricted && (() => {
                  const targetExamId = item.index === 11 ? 'internal-exam-1' : 'internal-exam-2';
                  const examTitle = item.index === 11 ? 'Internal Exam 1' : 'Internal Exam 2';

                  // 1. Gather student rows for Item 9
                  let sourceStudents: any[] = [];
                  if (item9Rows && item9Rows.length > 0) {
                    sourceStudents = item9Rows;
                  } else {
                    const item9Db = checklist.find((c: any) => c.itemIndex === 9);
                    if (item9Db?.subItemsJson) {
                      try {
                        const parsed = JSON.parse(item9Db.subItemsJson);
                        if (Array.isArray(parsed.students)) sourceStudents = parsed.students;
                      } catch (e) {}
                    }
                  }

                  if (!sourceStudents || sourceStudents.length === 0) {
                    sourceStudents = getStudentList();
                  }

                  const studentRecords = sourceStudents.map((s: any) => {
                    const studentId = s.studentId || s.id || s.enrolmentNumber;
                    const name = s.name || s.studentName || 'Student';
                    const enrolmentNumber = s.enrolmentNumber || s.enrollmentNumber || s.rollNo || '';
                    const mark = Number(
                      s.marks?.[targetExamId] ??
                      s.marks?.[targetExamId.replace('-exam', '')] ??
                      s.marks?.[targetExamId.replace('internal-exam-', 'internal-')] ??
                      s[targetExamId] ??
                      0
                    ) || 0;
                    return { studentId, name, enrolmentNumber, mark: Math.min(30, Math.max(0, mark)) };
                  });

                  const hasStudentsWithMarks = studentRecords.some((r: any) => r.mark > 0);
                  const markBands = ['below 12', '13–15', '16–18', '19–21', '22–24', '25–27', '28–30'];
                  const markCounts = markBands.map((band) =>
                    studentRecords.filter((r: any) => {
                      const m = r.mark;
                      if (band === 'below 12') return m < 12;
                      if (band === '13–15') return m >= 12 && m <= 15;
                      if (band === '16–18') return m >= 16 && m <= 18;
                      if (band === '19–21') return m >= 19 && m <= 21;
                      if (band === '22–24') return m >= 22 && m <= 24;
                      if (band === '25–27') return m >= 25 && m <= 27;
                      return m >= 28;
                    }).length
                  );

                  const percentageBands = ['<40%', '41–50%', '51–60%', '61–70%', '71–80%', '81–90%', '>90%'];
                  const percentageCounts = percentageBands.map((band) =>
                    studentRecords.filter((r: any) => {
                      const pct = (r.mark / 30) * 100;
                      if (band === '<40%') return pct < 40;
                      if (band === '41–50%') return pct >= 40 && pct <= 50;
                      if (band === '51–60%') return pct > 50 && pct <= 60;
                      if (band === '61–70%') return pct > 60 && pct <= 70;
                      if (band === '71–80%') return pct > 70 && pct <= 80;
                      if (band === '81–90%') return pct > 80 && pct <= 90;
                      return pct > 90;
                    }).length
                  );

                  const subs = getSubItems(item.index) || {};

                  const renderChart = (title: string, labels: string[], counts: number[]) => {
                    const maxVal = Math.max(...counts, 1);
                    return (
                      <Card className="border shadow-sm h-100">
                        <Card.Header className="bg-light py-2 border-bottom d-flex align-items-center justify-content-between">
                          <span className="fw-bold text-navy-900 small">📊 {title}</span>
                          <span className="badge bg-secondary font-mono-ppsu" style={{ fontSize: 10 }}>Total: {studentRecords.length}</span>
                        </Card.Header>
                        <Card.Body className="p-3 d-flex flex-column justify-content-between">
                          <div className="d-flex align-items-end gap-2 pt-4 pb-2 px-1 border-bottom" style={{ height: 130 }}>
                            {labels.map((label, i) => {
                              const cnt = counts[i];
                              const barPct = Math.max(8, Math.round((cnt / maxVal) * 75));
                              return (
                                <div key={label} className="d-flex flex-column align-items-center flex-fill h-100 justify-content-end">
                                  <div className="fw-bold font-mono-ppsu text-primary mb-1" style={{ fontSize: 11 }}>
                                    {cnt}
                                  </div>
                                  <div
                                    className="rounded-top shadow-sm"
                                    style={{
                                      height: `${barPct}%`,
                                      width: '70%',
                                      backgroundColor: cnt > 0 ? '#1E3A8A' : '#CBD5E1',
                                      minHeight: '4px'
                                    }}
                                    title={`${label}: ${cnt} students`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="d-flex gap-1 pt-2 px-1">
                            {labels.map((label) => (
                              <div key={label} className="flex-fill text-center text-muted fw-semibold" style={{ fontSize: 9, lineHeight: 1.1 }}>
                                {label}
                              </div>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  };

                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-primary ms-2 w-100">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-bold text-primary">
                          (d) Mark Statement & Result Analysis — linked live to Item 9 ({examTitle})
                        </span>
                        <span className="badge bg-info text-dark" style={{ fontSize: 10 }}>
                          Auto-Fetched Live
                        </span>
                      </div>

                      {studentRecords.length === 0 || !hasStudentsWithMarks ? (
                        <div className="alert alert-info small py-2 mb-3">
                          ℹ️ Enter marks for <strong>{examTitle}</strong> in Item 9 (Theory Continuous Evaluation Rubrics) to populate this Mark Statement and Result Analysis automatically.
                        </div>
                      ) : (
                        <>
                          {/* Mark Statement Table */}
                          <div className="table-responsive border rounded mb-3 shadow-sm" style={{ maxHeight: 280 }}>
                            <Table bordered hover size="sm" className="small align-middle mb-0">
                              <thead className="bg-light sticky-top">
                                <tr>
                                  <th style={{ width: 40 }}>#</th>
                                  <th>Student Name</th>
                                  <th>Enrolment Number</th>
                                  <th className="text-center bg-primary-subtle text-primary" style={{ width: 160 }}>
                                    {examTitle} Marks (/ 30)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentRecords.map((row: any, idx: number) => (
                                  <tr key={row.studentId || idx}>
                                    <td className="text-muted font-mono-ppsu">{idx + 1}</td>
                                    <td className="fw-semibold">{row.name}</td>
                                    <td className="font-mono-ppsu">{row.enrolmentNumber}</td>
                                    <td className="text-center fw-bold font-mono-ppsu text-primary">
                                      {row.mark} / 30
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>

                          {/* Result Analysis Column Charts */}
                          <Row className="g-3 mb-3">
                            <Col md={6}>
                              {renderChart('Marks-Band Distribution', markBands, markCounts)}
                            </Col>
                            <Col md={6}>
                              {renderChart('Percentage Distribution', percentageBands, percentageCounts)}
                            </Col>
                          </Row>
                        </>
                      )}

                      {/* Optional File Upload alongside Analysis */}
                      <div className="p-2 bg-light rounded border d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span className="small text-secondary fw-semibold">
                          Optional Document Upload for (d) Mark Statement / Result Analysis:
                        </span>
                        {subs.file?.fileName ? (
                          <div className="d-flex align-items-center gap-2 small">
                            <span className="text-success fw-semibold">✓ {subs.file.fileName}</span>
                            <Button
                              size="sm"
                              variant="outline-info"
                              style={{ fontSize: 11, padding: '2px 8px' }}
                              onClick={() => setViewingDoc({ title: `Internal Assessment ${item.index === 11 ? 1 : 2} Mark Statement Document`, fileName: subs.file.fileName, fileUrl: subs.file.fileUrl })}
                            >
                              👁️ View
                            </Button>
                            {!isLocked && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                style={{ fontSize: 11, padding: '2px 8px' }}
                                onClick={() => handleStructuredFileUpload(item.index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ) : (
                          !isLocked && (
                            <label className="btn btn-outline-secondary btn-sm m-0" style={{ fontSize: 11 }}>
                              ↑ Upload Document File
                              <input
                                type="file"
                                className="d-none"
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleStructuredFileUpload(item.index, file); }}
                              />
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Item 13: Continuous Evaluation Parameters (Guidelines, Marks Statements, and Result Analysis per Item 9 Criterion) */}
                {item.index === 13 && !isRestricted && (() => {
                  const subs = getSubItems(13) || {};
                  const ceGuidelines = subs.ceGuidelines || {};

                  // Extract Item 9 criteria
                  const item9Db = checklist.find((c: any) => c.itemIndex === 9);
                  let item9CriteriaList: any[] = [];
                  if (item9Db?.subItemsJson) {
                    try {
                      const parsed = JSON.parse(item9Db.subItemsJson);
                      if (Array.isArray(parsed.criteria)) item9CriteriaList = parsed.criteria;
                    } catch (e) {}
                  }
                  if (!item9CriteriaList.length && item9Criteria) {
                    item9CriteriaList = item9Criteria;
                  }
                  // Selected non-fixed criteria from Item 9
                  const selectedCeCriteria = item9CriteriaList.filter((c: any) =>
                    c && c.id && !['internal-exam-1', 'internal-exam-2', 'internal-1', 'internal-2'].includes(String(c.id).toLowerCase())
                  );

                  // Student rows from Item 9
                  let studentRows: any[] = [];
                  if (item9Rows && item9Rows.length > 0) {
                    studentRows = item9Rows;
                  } else if (item9Db?.subItemsJson) {
                    try {
                      const parsed = JSON.parse(item9Db.subItemsJson);
                      if (Array.isArray(parsed.students)) studentRows = parsed.students;
                    } catch (e) {}
                  }
                  if (!studentRows.length) {
                    studentRows = getStudentList();
                  }

                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-info ms-2 w-100">
                      {selectedCeCriteria.length === 0 ? (
                        <div className="alert alert-info small py-3 mb-0 d-flex align-items-center gap-2">
                          <span>ℹ️ <strong>No Continuous Evaluation criteria selected in Item 9 yet.</strong> Select evaluation criteria in <strong>Item 9 (Theory Continuous Evaluation Rubrics)</strong> — such as Project, Assignment, Case Study, Field Visit, etc. — to automatically generate guidelines document upload slots, marks statements, and result analysis sections here.</span>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-4">
                          {selectedCeCriteria.map((crit: any, idx: number) => {
                            const fileData = ceGuidelines[crit.id];
                            const critLabel = toTitleCase(crit.label || 'Criterion');
                            const maxMarks = crit.max || 10;

                            // Student marks for this criterion
                            const critMarks = studentRows.map((r: any) => ({
                              studentId: r.studentId || r.id,
                              name: r.name || r.studentName || '',
                              enrolmentNumber: r.enrolmentNumber || r.enrollmentNumber || '',
                              batch: r.batch || '—',
                              mark: Number(r.marks?.[crit.id] ?? 0)
                            }));

                            // Distribution for analysis chart
                            const markValues = critMarks.map(r => r.mark);
                            const mBands = ['<40%', '41–50%', '51–60%', '61–70%', '71–80%', '81–90%', '>90%'];
                            const mCounts = [
                              markValues.filter(m => (m / maxMarks) * 100 <= 40).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 40 && (m / maxMarks) * 100 <= 50).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 50 && (m / maxMarks) * 100 <= 60).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 60 && (m / maxMarks) * 100 <= 70).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 70 && (m / maxMarks) * 100 <= 80).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 80 && (m / maxMarks) * 100 <= 90).length,
                              markValues.filter(m => (m / maxMarks) * 100 > 90).length,
                            ];
                            const maxValM = Math.max(...mCounts, 1);

                            return (
                              <Card key={crit.id} className="border shadow-sm">
                                <Card.Header className="bg-light py-2 border-bottom d-flex align-items-center justify-content-between">
                                  <div className="fw-bold text-navy-900 small d-flex align-items-center gap-2">
                                    <span className="badge bg-primary">#{idx + 1}</span>
                                    <span>{critLabel}</span>
                                    <span className="badge bg-secondary font-mono-ppsu" style={{ fontSize: 10 }}>Max Marks: {maxMarks}</span>
                                  </div>
                                  <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle" style={{ fontSize: 10 }}>Auto-driven from Item 9</span>
                                </Card.Header>
                                <Card.Body className="p-3">
                                  {/* 1. Guidelines / Documents Upload Slot */}
                                  <div className="p-2.5 bg-light rounded border mb-3">
                                    <div className="fw-bold text-dark small mb-1">📋 Guidelines / Documents related to {critLabel}</div>
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                      {fileData?.fileName ? (
                                        <div className="text-success fw-semibold font-mono-ppsu small">✓ {fileData.fileName}</div>
                                      ) : (
                                        <div className="text-muted small">✗ Guidelines document not uploaded yet</div>
                                      )}
                                      <div className="d-flex align-items-center gap-1">
                                        {fileData?.fileName && (
                                          <Button size="sm" variant="outline-info" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setViewingDoc({ title: `Guidelines — ${critLabel}`, fileName: fileData.fileName, fileUrl: fileData.fileUrl })}>
                                            👁️ View
                                          </Button>
                                        )}
                                        {!isLocked && (
                                          <>
                                            <label className="btn btn-outline-secondary btn-sm m-0" style={{ fontSize: 11, padding: '2px 8px' }}>
                                              {fileData?.fileName ? 'Replace' : 'Upload Guidelines File (PDF)'}
                                              <input type="file" className="d-none" accept=".pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCeGuidelineUpload(crit.id, file); }} />
                                            </label>
                                            {fileData?.fileName && (
                                              <Button size="sm" variant="outline-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => handleCeGuidelineUpload(crit.id, undefined)}>
                                                Remove
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 2. Marks Statement (Read-only pull from Item 9) */}
                                  <div className="mb-3">
                                    <div className="fw-bold text-dark small mb-2 d-flex align-items-center justify-content-between">
                                      <span>📝 Marks Statement ({critLabel})</span>
                                      <span className="text-muted" style={{ fontSize: 11 }}>Read-only (auto-populated from Item 9 rubrics table)</span>
                                    </div>
                                    {critMarks.length === 0 ? (
                                      <div className="alert alert-light border small py-2 mb-0">No student marks recorded in Item 9.</div>
                                    ) : (
                                      <div className="table-responsive border rounded" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                        <Table bordered hover size="sm" className="small mb-0 align-middle text-center">
                                          <thead className="bg-light sticky-top">
                                            <tr>
                                              <th style={{ width: 40 }}>#</th>
                                              <th className="text-start">Student Name</th>
                                              <th>Enrolment Number</th>
                                              <th style={{ width: 70 }}>Batch</th>
                                              <th style={{ width: 110 }} className="bg-primary-subtle text-primary fw-bold">Marks (/ {maxMarks})</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {critMarks.map((row, sIdx) => (
                                              <tr key={row.studentId || sIdx}>
                                                <td className="text-muted font-mono-ppsu">{sIdx + 1}</td>
                                                <td className="text-start fw-semibold">{row.name}</td>
                                                <td className="font-mono-ppsu">{row.enrolmentNumber}</td>
                                                <td>{row.batch}</td>
                                                <td className="fw-bold font-mono-ppsu text-primary">{row.mark}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>

                                  {/* 3. Analysis (Result Distribution Chart) */}
                                  <div>
                                    <div className="fw-bold text-dark small mb-2">📊 Result Analysis ({critLabel})</div>
                                    <Card className="border shadow-sm">
                                      <Card.Header className="bg-light py-1.5 px-3 border-bottom d-flex align-items-center justify-content-between">
                                        <span className="fw-semibold text-secondary small">Percentage Band Distribution</span>
                                        <span className="badge bg-secondary font-mono-ppsu" style={{ fontSize: 10 }}>Total Students: {critMarks.length}</span>
                                      </Card.Header>
                                      <Card.Body className="p-3">
                                        <div className="d-flex align-items-end gap-2 pt-3 pb-2 px-1 border-bottom" style={{ height: 120 }}>
                                          {mBands.map((bLabel, bIdx) => {
                                            const cnt = mCounts[bIdx];
                                            const barPct = Math.max(8, Math.round((cnt / maxValM) * 75));
                                            return (
                                              <div key={bLabel} className="d-flex flex-column align-items-center flex-fill h-100 justify-content-end">
                                                <div className="fw-bold font-mono-ppsu text-primary mb-1" style={{ fontSize: 11 }}>{cnt}</div>
                                                <div className="rounded-top shadow-sm" style={{ height: `${barPct}%`, width: '70%', backgroundColor: cnt > 0 ? '#1E3A8A' : '#CBD5E1', minHeight: '4px' }} title={`${bLabel}: ${cnt} students`} />
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <div className="d-flex gap-1 pt-2 px-1">
                                          {mBands.map((bLabel) => (
                                            <div key={bLabel} className="flex-fill text-center text-muted fw-semibold" style={{ fontSize: 9, lineHeight: 1.1 }}>{bLabel}</div>
                                          ))}
                                        </div>
                                      </Card.Body>
                                    </Card>
                                  </div>
                                </Card.Body>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Item 14: Attendance Register (Course Teacher + Batch A, B, C Split) */}
                {item.index === 14 && !isRestricted && (() => {
                  const batchSubs = dbItem.batchSubmissions || [];
                  const teacherSub = dbItem.fileName ? { fileName: dbItem.fileName, fileUrl: dbItem.fileUrl } : null;

                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-info ms-2 w-100">
                      <div className="small fw-bold text-navy-900 mb-2">
                        Attendance Registers — Role & Batch Split
                      </div>

                      <Row className="g-2 small">
                        {/* Course Teacher Theory Attendance Register Slot */}
                        {!isLabTeacher && (
                          <Col xs={12} md={6}>
                            <div className="p-3 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="fw-bold mb-1 text-primary">Attendance Register — Course Teacher (Theory / Class)</div>
                                {teacherSub?.fileName ? (
                                  <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {teacherSub.fileName}</div>
                                ) : (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>✗ Not uploaded</div>
                                )}
                              </div>
                              <div className="d-flex gap-1 mt-2">
                                {teacherSub?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setViewingDoc({ title: 'Attendance Register — Course Teacher', fileName: teacherSub.fileName, fileUrl: teacherSub.fileUrl })}>
                                    👁️ View
                                  </Button>
                                )}
                                {!isLocked && (
                                  <>
                                    <label className="btn btn-outline-secondary btn-sm m-0" style={{ fontSize: 11, padding: '2px 8px' }}>
                                      {teacherSub?.fileName ? 'Replace' : 'Upload Register'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(14, item.name, f); }} />
                                    </label>
                                    {teacherSub?.fileName && (
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => handleRemove(14)}>
                                        Remove
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </Col>
                        )}

                        {/* Lab Batch Attendance Register Slots */}
                        {['A', 'B', 'C'].map((batchKey) => {
                          if (isLabTeacher && access?.batch !== batchKey) return null;
                          const batchData = batchSubs.find((s: any) => s.batch === batchKey);

                          return (
                            <Col xs={12} md={6} key={batchKey}>
                              <div className="p-3 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                                <div>
                                  <div className="fw-bold mb-1 text-dark">
                                    Attendance Register — Batch {batchKey}
                                    <span className="ms-2 badge bg-primary" style={{ fontSize: 9 }}>Lab Batch {batchKey}</span>
                                  </div>
                                  {batchData?.fileName ? (
                                    <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {batchData.fileName}</div>
                                  ) : (
                                    <div className="text-muted mb-1" style={{ fontSize: 11 }}>✗ Not uploaded yet</div>
                                  )}
                                </div>
                                <div className="d-flex gap-1 mt-2">
                                  {batchData?.fileName && (
                                    <Button size="sm" variant="outline-info" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setViewingDoc({ title: `Attendance Register — Batch ${batchKey}`, fileName: batchData.fileName, fileUrl: batchData.fileUrl })}>
                                      👁️ View
                                    </Button>
                                  )}
                                  {!isLocked && isLabTeacher && access?.batch === batchKey && (
                                    <label className="btn btn-outline-secondary btn-sm m-0" style={{ fontSize: 11, padding: '2px 8px' }}>
                                      {batchData?.fileName ? 'Replace' : 'Upload Register'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(14, 'Attendance Register', f); }} />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  );
                })()}

                {/* Item 15: University Exam Sub-uploads & Grade Sheet Result Analysis */}
                {isUniv && !isRestricted && (
                  <div className="mt-3 ps-4 border-start border-2 border-warning ms-2 w-100">
                    <div className="small text-secondary mb-2 fw-semibold">3 Compulsory Sub-uploads Required:</div>
                    <Row className="g-2 small mb-3">
                      {[
                        { key: 'questionPaper', label: '(a) Question Paper' },
                        { key: 'gradeSheet', label: '(b) Grade Sheet' },
                      ].map((sub) => {
                        const subData = getSubItems(15)?.[sub.key];
                        const isSubLockedByCoord = dbItem.isCoordinatorShared && sub.key === 'questionPaper';
                        return (
                          <Col xs={12} md={6} key={sub.key}>
                            <div className="p-2 bg-light rounded border h-100 d-flex flex-column justify-content-between">
                              <div>
                                <div className="fw-bold mb-1">
                                  {sub.label}
                                  {isSubLockedByCoord && (
                                    <span className="ms-2 badge bg-secondary" style={{ fontSize: 9 }}>Coordinator Upload</span>
                                  )}
                                </div>
                                {sub.key === 'gradeSheet' && (
                                  <Form.Check type="switch" className="small mb-2" label="This course has a separate practical grade" checked={hasSeparatePracticalGrade} disabled={isLocked} onChange={(e) => handleTogglePracticalGrade(e.target.checked)} />
                                )}
                                {subData?.fileName ? (
                                  <div>
                                    <div className="text-success fw-bold font-mono-ppsu mb-1 text-truncate">✓ {subData.fileName}</div>
                                  </div>
                                ) : (
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>
                                    {isSubLockedByCoord ? 'Not uploaded yet — pending Course Coordinator' : '✗ Not uploaded'}
                                  </div>
                                )}
                              </div>
                              <div className="d-flex gap-1 mt-2">
                                {subData?.fileName && (
                                  <Button size="sm" variant="outline-info" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => setViewingDoc({ title: `University Exam — ${sub.label}`, fileName: subData.fileName, fileUrl: subData.fileUrl })}>
                                    👁️ View
                                  </Button>
                                )}
                                {!isLocked && !isSubLockedByCoord && (
                                  <>
                                    <label className="btn btn-outline-secondary btn-sm p-0 px-1 m-0" style={{ fontSize: 10 }}>
                                      {subData?.fileName ? 'Replace' : 'Upload Document'}
                                      <input type="file" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUnivSubUpload(sub.key as any, f); }} />
                                    </label>
                                    {subData?.fileName && (
                                      <Button size="sm" variant="outline-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => handleUnivSubUpload(sub.key as any, undefined)}>
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

                {/* Item 15(c): University Exam Result Analysis */}
                {isUniv && !isRestricted && (() => {
                  const subs = getSubItems(15) || { gradeSheet: null, students: [], hasSeparatePracticalGrade: false };
                  const storedStudents = Array.isArray(subs.students) ? subs.students.filter(Boolean) : [];
                  const rows = getStudentList().map((student: any) => {
                    const found = storedStudents.find((entry: any) => entry && (entry.studentId === student.id || entry.id === student.id));
                    return { ...student, ...(found || {}) };
                  });
                  const grades = ['F', 'P', 'C', 'B', 'B+', 'A', 'A+', 'O'];
                  const theoryCounts = grades.map((g) => rows.filter((r: any) => r.theoryGrade === g).length);
                  const practicalCounts = grades.map((g) => rows.filter((r: any) => r.practicalGrade === g).length);

                  const renderGradeDistributionChart = (title: string, counts: number[], barColor: string) => {
                    const maxVal = Math.max(...counts, 1);
                    const total = counts.reduce((a, b) => a + b, 0);
                    return (
                      <Card className="border shadow-sm h-100">
                        <Card.Header className="bg-light py-2 border-bottom d-flex align-items-center justify-content-between">
                          <span className="fw-bold text-navy-900 small">📊 {title}</span>
                          <span className="badge bg-secondary font-mono-ppsu" style={{ fontSize: 10 }}>Total: {total}</span>
                        </Card.Header>
                        <Card.Body className="p-3 d-flex flex-column justify-content-between">
                          <div className="d-flex align-items-end gap-2 pt-4 pb-2 px-2 border-bottom" style={{ height: 130 }}>
                            {grades.map((g, idx) => {
                              const cnt = counts[idx];
                              const barPct = Math.max(8, Math.round((cnt / maxVal) * 75));
                              return (
                                <div key={g} className="d-flex flex-column align-items-center flex-fill h-100 justify-content-end">
                                  <div className="fw-bold font-mono-ppsu text-primary mb-1" style={{ fontSize: 11 }}>
                                    {cnt}
                                  </div>
                                  <div
                                    className="rounded-top shadow-sm"
                                    style={{
                                      height: `${barPct}%`,
                                      width: '70%',
                                      backgroundColor: cnt > 0 ? barColor : '#cbd5e1',
                                      minHeight: '4px'
                                    }}
                                    title={`${g}: ${cnt} students`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="d-flex gap-2 pt-2 px-2">
                            {grades.map((g) => (
                              <div key={g} className="flex-fill text-center fw-bold text-dark" style={{ fontSize: 10 }}>
                                {g}
                              </div>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  };

                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-warning ms-2 w-100">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-bold text-secondary">(c) Grade Sheet & Result Analysis</span>
                      </div>
                      {!rows.length ? (
                        <div className="alert alert-info small">Student rows will appear automatically from Item 4.</div>
                      ) : (
                        <div className="table-responsive border rounded mb-3 shadow-sm">
                          <Table bordered hover size="sm" className="small mb-0 align-middle">
                            <thead className="bg-light">
                              <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th>Enrolment Number</th>
                                <th>Student Name</th>
                                <th>Theory Grade</th>
                                {hasSeparatePracticalGrade && <th>Practical Grade</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row: any, idx: number) => (
                                <tr key={row.id}>
                                  <td className="text-muted font-mono-ppsu">{idx + 1}</td>
                                  <td className="font-mono-ppsu">{row.enrolmentNumber}</td>
                                  <td className="fw-semibold">{row.name}</td>
                                  <td>
                                    <Form.Select size="sm" value={row.theoryGrade || ''} disabled={isLocked} onChange={(e) => handleGradeChange(row.id, 'theoryGrade', e.target.value)}>
                                      <option value="">Select Grade</option>
                                      {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                                    </Form.Select>
                                  </td>
                                  {hasSeparatePracticalGrade && (
                                    <td>
                                      <Form.Select size="sm" value={row.practicalGrade || ''} disabled={isLocked} onChange={(e) => handleGradeChange(row.id, 'practicalGrade', e.target.value)}>
                                        <option value="">Select Grade</option>
                                        {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                                      </Form.Select>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                      <Row className="g-3 mt-1 small">
                        <Col md={hasSeparatePracticalGrade ? 6 : 12}>
                          {renderGradeDistributionChart('Theory Grade Distribution', theoryCounts, '#1E3A8A')}
                        </Col>
                        {hasSeparatePracticalGrade && (
                          <Col md={6}>
                            {renderGradeDistributionChart('Practical Grade Distribution', practicalCounts, '#0D9488')}
                          </Col>
                        )}
                      </Row>
                    </div>
                  );
                })()}

                {/* Item 18: Action to be taken for next year based on CO Attainment (School Dropdown & Coordinator Upload) */}
                {item.index === 18 && !isRestricted && (() => {
                  const selectedSchoolCode = getSubItems(18)?.school || courseFile.school || 'SOE';
                  const schoolLabel = SCHOOL_LABELS[selectedSchoolCode] || selectedSchoolCode;

                  return (
                    <div className="mt-3 ps-4 border-start border-2 border-secondary ms-2 w-100">
                      <div className="p-3 bg-light rounded border">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                          <div className="fw-bold small text-navy-900">
                            Select School for CO Attainment Action Plan
                          </div>
                          <span className="badge bg-secondary" style={{ fontSize: 9 }}>Coordinator Upload</span>
                        </div>

                        <Form.Group className="mb-3" style={{ maxWidth: 320 }}>
                          <Form.Label className="small text-secondary fw-semibold">School Scope</Form.Label>
                          <Form.Select
                            size="sm"
                            value={selectedSchoolCode}
                            disabled={true}
                          >
                            <option value="SOE">SOE (School of Engineering)</option>
                            <option value="IDS">IDS</option>
                            <option value="ICA">ICA</option>
                          </Form.Select>
                        </Form.Group>

                        <div className="p-2 bg-white rounded border d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <div>
                            <div className="fw-bold small text-dark">
                              Action Plan Document — {schoolLabel}
                            </div>
                            {dbItem.fileName || dbItem.sharedFileName ? (
                              <div className="text-success fw-bold font-mono-ppsu small">
                                ✓ {dbItem.fileName || dbItem.sharedFileName}
                              </div>
                            ) : (
                              <div className="text-muted small">
                                ⏳ Not uploaded yet — pending Course Coordinator (Locked)
                              </div>
                            )}
                          </div>

                          {(dbItem.fileName || dbItem.sharedFileName) && (
                            <Button
                              size="sm"
                              variant="outline-info"
                              style={{ fontSize: 11, padding: '2px 8px' }}
                              onClick={() => setViewingDoc({ title: `Item 18 Action Plan — ${schoolLabel}`, fileName: dbItem.fileName || dbItem.sharedFileName || 'Action_Plan.pdf', fileUrl: dbItem.fileUrl || dbItem.sharedFileUrl })}
                            >
                              👁️ View Document
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
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

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Link
                  href={`/faculty/course-files/${courseFileId}/preview`}
                  target="_blank"
                  className="btn btn-warning px-3 py-2 fw-bold d-inline-flex align-items-center gap-1 shadow-sm"
                >
                  👁️ Preview Merged Course File
                </Link>
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
            <div className="mb-3 p-3 rounded" style={{ background: '#fff8e6', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(245,158,11,0.1)' }}>
              <Form.Check
                type="checkbox"
                id="chk-lab-teacher-declaration"
                label={
                  <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                    I confirm all required documents are uploaded correctly <span className="text-danger fw-bold">*</span>
                  </span>
                }
                checked={labTeacherDeclared}
                onChange={(e) => setLabTeacherDeclared(e.target.checked)}
                style={{ transform: 'scale(1.1)', transformOrigin: 'left center' }}
              />
            </div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
              <div className="small text-secondary">
                <span className="fw-bold text-dark font-mono-ppsu">{completedCount}/5</span> assigned lab items completed.
              </div>
              <Button
                id="btn-submit-lab-batch-bottom"
                variant="success"
                className="px-4 py-2 fw-bold"
                disabled={submitLoading || !labTeacherDeclared}
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
            const isCsv = viewingDoc?.fileName?.match(/\.(csv|txt)$/i) || (viewingDoc?.fileUrl && (viewingDoc.fileUrl.includes('data:text/csv') || viewingDoc.fileUrl.includes('data:text/plain') || viewingDoc.fileUrl.includes('data:application/vnd.ms-excel')));

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

            if (isCsv) {
              const parseCsvContent = (rawUrl?: string): string[][] => {
                if (!rawUrl) return [];
                try {
                  let text = '';
                  if (rawUrl.startsWith('data:')) {
                    const b64Idx = rawUrl.indexOf(';base64,');
                    if (b64Idx !== -1) {
                      text = atob(rawUrl.slice(b64Idx + 8));
                    } else {
                      const cIdx = rawUrl.indexOf(',');
                      if (cIdx !== -1) text = decodeURIComponent(rawUrl.slice(cIdx + 1));
                    }
                  } else if (rawUrl.includes(',') || rawUrl.includes('\n')) {
                    text = rawUrl;
                  }

                  if (text) {
                    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    return lines.map(line => {
                      const row: string[] = [];
                      let cur = '';
                      let inQ = false;
                      for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') inQ = !inQ;
                        else if (char === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
                        else cur += char;
                      }
                      row.push(cur.trim());
                      return row;
                    });
                  }
                } catch (e) {
                  console.error('CSV Parse Error:', e);
                }
                return [];
              };

              const parsedRows = parseCsvContent(viewingDoc?.fileUrl);
              const studentFallback = (parsedRows.length === 0 && (viewingDoc?.title?.includes('Student') || viewingDoc?.fileName?.includes('student')))
                ? getStudentList()
                : null;

              return (
                <div className="bg-white rounded border p-3 shadow-sm" style={{ minHeight: '480px' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                    <h6 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                      <span>📊 CSV Table Data Preview</span>
                      {parsedRows.length > 0 && <span className="badge bg-primary font-mono-ppsu">{parsedRows.length - 1} Rows</span>}
                    </h6>
                    <span className="small text-muted font-mono-ppsu">{viewingDoc?.fileName}</span>
                  </div>

                  {parsedRows.length > 0 ? (
                    <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <Table bordered hover striped size="sm" className="small align-middle text-center mb-0">
                        <thead className="bg-light sticky-top">
                          <tr>
                            {parsedRows[0].map((headerCol, hIdx) => (
                              <th key={hIdx} className="bg-light fw-bold text-navy-900 border-bottom border-2">{headerCol}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(1).map((rowItems, rIdx) => (
                            <tr key={rIdx}>
                              {rowItems.map((cellVal, cIdx) => (
                                <td key={cIdx} className={cIdx === 0 ? 'fw-semibold text-start' : 'font-mono-ppsu'}>{cellVal}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : studentFallback && studentFallback.length > 0 ? (
                    <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <Table bordered hover striped size="sm" className="small align-middle text-center mb-0">
                        <thead className="bg-light sticky-top">
                          <tr>
                            <th style={{ width: '60px' }}>Sr No</th>
                            <th className="text-start">Student Name</th>
                            <th>Enrolment Number</th>
                            <th>Batch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentFallback.map((s, idx) => (
                            <tr key={s.id || idx}>
                              <td className="fw-semibold">{idx + 1}</td>
                              <td className="text-start fw-semibold">{s.name}</td>
                              <td className="font-mono-ppsu">{s.enrolmentNumber}</td>
                              <td><span className="badge bg-secondary">{s.batch || 'A'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <div className="fs-1 mb-2">📄</div>
                      <p className="fw-semibold mb-1">CSV file data is ready for inspection.</p>
                      <p className="small text-secondary mb-3 font-mono-ppsu">{viewingDoc?.fileName}</p>
                      {viewingDoc?.fileUrl && (
                        <a href={viewingDoc.fileUrl} download={viewingDoc.fileName || 'data.csv'} className="btn btn-primary btn-sm px-3">
                          ⬇ Download CSV File
                        </a>
                      )}
                    </div>
                  )}
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
