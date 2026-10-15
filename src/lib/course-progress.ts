/**
 * Shared Course Progress & Checklist Completion Module
 * 
 * Central source of truth for checklist item completion and course progress calculation.
 * Ensures the My Courses dashboard cards and the checklist detail page always show identical numbers.
 */

export const SHARED_COORDINATOR_ITEMS = [1, 3, 6, 7, 10, 11, 12, 15, 18];

export function isChecklistItemComplete(dbItem: any, courseFile?: any): boolean {
  if (!dbItem) return false;
  const itemIndex = dbItem.itemIndex;

  // Item 1: Institute Vision, Mission & PEO, PSO & PO
  if (itemIndex === 1) {
    if (dbItem.fileName || dbItem.fileUrl || dbItem.sharedFileName || dbItem.coordinatorUploaded || dbItem.status === 'UPLOADED') {
      return true;
    }
    let subs: any = {};
    try {
      if (typeof dbItem.subItemsJson === 'string') {
        subs = JSON.parse(dbItem.subItemsJson);
      } else if (dbItem.subItemsJson && typeof dbItem.subItemsJson === 'object') {
        subs = dbItem.subItemsJson;
      }
    } catch {}
    const subKeys = ['vision', 'mission', 'deptVision', 'deptMission', 'peo', 'pso', 'po'];
    const hasFile = subKeys.some((k: string) => subs[k]?.fileUrl || subs[k]?.fileName);
    const hasText = subKeys.some((k: string) => subs[k]?.textContent?.trim());
    return Boolean(hasFile || hasText);
  }

  // Item 5: Department Academic Calendar (Admin-published)
  if (itemIndex === 5) {
    return Boolean(
      dbItem.isAdminPublished ||
      dbItem.fileName ||
      dbItem.fileUrl ||
      dbItem.status === 'UPLOADED' ||
      dbItem.status === 'SUBMITTED'
    );
  }

  // Item 20: Course Faculty Signature & Declaration
  if (itemIndex === 20) {
    return Boolean(
      courseFile?.facultyConfirmed ||
      courseFile?.facultySignedAt ||
      courseFile?.facultySignatureUrl ||
      dbItem.status === 'UPLOADED' ||
      dbItem.status === 'SUBMITTED' ||
      dbItem.fileName
    );
  }

  // Coordinator-shared items: 3, 6, 7, 10, 11, 12, 15, 18
  if (dbItem.isCoordinatorShared) {
    let subs: any = {};
    try {
      if (typeof dbItem.subItemsJson === 'string') subs = JSON.parse(dbItem.subItemsJson);
      else if (dbItem.subItemsJson && typeof dbItem.subItemsJson === 'object') subs = dbItem.subItemsJson;
    } catch {}

    if (itemIndex === 6) {
      return Boolean(
        subs?.outcomeLecture?.fileName ||
        subs?.lessonPlanLecture?.fileName ||
        dbItem.coordinatorUploaded ||
        dbItem.fileName ||
        dbItem.sharedFileName ||
        dbItem.status === 'UPLOADED' ||
        dbItem.status === 'SUBMITTED'
      );
    }
    if (itemIndex === 11 || itemIndex === 12) {
      const hasSampleAnswer = Boolean(subs?.sampleAnswerSheet?.fileName);
      const hasQp = Boolean(subs?.questionPaper?.fileName);
      const hasTt = Boolean(subs?.timetable?.fileName);
      return Boolean(
        hasSampleAnswer ||
        hasQp ||
        hasTt ||
        dbItem.coordinatorUploaded ||
        dbItem.fileName ||
        dbItem.sharedFileName ||
        dbItem.status === 'UPLOADED' ||
        dbItem.status === 'SUBMITTED'
      );
    }
    if (itemIndex === 15) {
      return Boolean(
        subs?.questionPaper?.fileName ||
        subs?.gradeSheet?.fileName ||
        subs?.resultAnalysis?.fileName ||
        subs?.students?.length ||
        dbItem.coordinatorUploaded ||
        dbItem.fileName ||
        dbItem.sharedFileName ||
        dbItem.status === 'UPLOADED' ||
        dbItem.status === 'SUBMITTED'
      );
    }
    return Boolean(
      dbItem.coordinatorUploaded ||
      dbItem.fileName ||
      dbItem.sharedFileName ||
      dbItem.status === 'UPLOADED' ||
      dbItem.status === 'SUBMITTED'
    );
  }

  // Standard Faculty-managed items
  let subs: any = {};
  try {
    if (typeof dbItem.subItemsJson === 'string') subs = JSON.parse(dbItem.subItemsJson);
    else if (dbItem.subItemsJson && typeof dbItem.subItemsJson === 'object') subs = dbItem.subItemsJson;
  } catch {}

  if (itemIndex === 4) {
    return Boolean(subs?.students?.length || dbItem.fileName || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED');
  }
  if (itemIndex === 8) {
    const hasAnyBatchData = Boolean(
      subs?.batches?.some((b: any) => b.fileName || b.fileUrl || (b.students?.length && b.practicalCols?.length)) ||
      (subs?.students?.length && subs?.criteria?.length) ||
      dbItem.fileName ||
      dbItem.status === 'UPLOADED' ||
      dbItem.status === 'SUBMITTED'
    );
    return hasAnyBatchData;
  }
  if (itemIndex === 9) {
    return Boolean((subs?.students?.length && subs?.criteria?.length) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED' || dbItem.fileName);
  }
  if (itemIndex === 13) {
    return Boolean((subs?.assignmentTopics?.length && (subs?.sampleAssignment?.fileName || subs?.marks?.length || subs?.marksFile?.fileName)) || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED' || dbItem.fileName);
  }
  if (itemIndex === 19) {
    return Boolean(subs?.documents?.length || dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED' || dbItem.fileName);
  }

  return Boolean(dbItem.status === 'UPLOADED' || dbItem.status === 'SUBMITTED' || dbItem.fileName || dbItem.fileUrl);
}

export function calculateCourseProgress(
  mergedChecklistItems: any[],
  courseFile?: any,
  allowedItemIndices?: number[]
): { completed: number; total: number; percent: number } {
  const indices = allowedItemIndices && allowedItemIndices.length > 0
    ? allowedItemIndices
    : Array.from({ length: 20 }, (_, i) => i + 1);

  const total = indices.length;
  const completed = indices.filter((idx) => {
    const item = mergedChecklistItems.find((it) => it.itemIndex === idx);
    return isChecklistItemComplete(item, courseFile);
  }).length;
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { completed, total, percent };
}
