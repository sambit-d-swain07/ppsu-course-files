/**
 * Shared Subject Access Control & Batch Ownership Module
 *
 * LAB_ITEMS         — the items a lab teacher can READ and WRITE to.
 * LAB_VISIBLE_ITEMS  — all items shown to a lab teacher (LAB_ITEMS + locked 9 + locked 20).
 * LAB_EDITABLE_ITEMS — alias for LAB_ITEMS (editable subset).
 * LAB_ITEM_NAMES_STRING — human-readable list for banners, derived from LAB_ITEMS.
 */

export const LAB_ITEMS = [2, 4, 8, 14];
export const LAB_EDITABLE_ITEMS = LAB_ITEMS;
export const LAB_VISIBLE_ITEMS  = [2, 4, 8, 9, 14, 20]; // visible but 9 and 20 are locked
export const LAB_ITEM_NAMES_STRING = LAB_ITEMS.join(', ');

export interface SubjectRoles {
  userId: string;
  subjectId: string;
  isCourseTeacher: boolean;
  isLabTeacherA: boolean;
  isLabTeacherB: boolean;
  isLabTeacherC: boolean;
  isCourseCoordinator: boolean;
  isEvaluator: boolean;
  ownedBatches: string[]; // e.g. ['A'] or ['B'] or ['A', 'B']
  accessLevel: 'FULL' | 'LAB' | 'NONE';
  rolesSummary: string; // e.g. "Your roles on this subject: Course Teacher · Lab Batch B"
}

export function getSubjectRoles(userId: string | undefined | null, subject: any): SubjectRoles {
  if (!userId || !subject) {
    return {
      userId: userId || '',
      subjectId: subject?.id || '',
      isCourseTeacher: false,
      isLabTeacherA: false,
      isLabTeacherB: false,
      isLabTeacherC: false,
      isCourseCoordinator: false,
      isEvaluator: false,
      ownedBatches: [],
      accessLevel: 'NONE',
      rolesSummary: 'None'
    };
  }

  const isCourseTeacher = subject.courseTeacherId === userId;
  const isLabTeacherA = subject.labTeacherAId === userId;
  const isLabTeacherB = subject.labTeacherBId === userId;
  const isLabTeacherC = subject.labTeacherCId === userId;
  const isCourseCoordinator = subject.courseCoordinatorId === userId;
  const isEvaluator = subject.evaluatorId === userId;

  const ownedBatches: string[] = [];
  if (isLabTeacherA) ownedBatches.push('A');
  if (isLabTeacherB) ownedBatches.push('B');
  if (isLabTeacherC) ownedBatches.push('C');

  let accessLevel: 'FULL' | 'LAB' | 'NONE' = 'NONE';
  if (isCourseTeacher) {
    // Rule A: Course Teacher gets FULL ACCESS
    accessLevel = 'FULL';
  } else if (ownedBatches.length > 0) {
    // Rule B: Lab Teacher (and NOT Course Teacher) gets LAB ACCESS
    accessLevel = 'LAB';
  }

  const rolesList: string[] = [];
  if (isCourseTeacher) rolesList.push('Course Teacher');
  if (isLabTeacherA) rolesList.push('Lab Batch A');
  if (isLabTeacherB) rolesList.push('Lab Batch B');
  if (isLabTeacherC) rolesList.push('Lab Batch C');
  if (isCourseCoordinator) rolesList.push('Course Coordinator');
  if (isEvaluator) rolesList.push('Evaluator');

  const rolesSummary = rolesList.length > 0
    ? `Your roles on this subject: ${rolesList.join(' · ')}`
    : 'Your roles on this subject: None';

  return {
    userId,
    subjectId: subject.id,
    isCourseTeacher,
    isLabTeacherA,
    isLabTeacherB,
    isLabTeacherC,
    isCourseCoordinator,
    isEvaluator,
    ownedBatches,
    accessLevel,
    rolesSummary
  };
}

export function getBatchOwnerInfo(subject: any, batch: string) {
  if (!subject) return { ownerId: null, isCourseTeacherOwner: false, ownerName: 'Unassigned', ownerUser: null };

  const b = (batch || 'A').toUpperCase();
  let ownerId: string | null = null;
  let ownerUser: any = null;

  if (b === 'A') {
    ownerId = subject.labTeacherAId || subject.courseTeacherId;
    ownerUser = subject.labTeacherA || subject.courseTeacher;
  } else if (b === 'B') {
    ownerId = subject.labTeacherBId || null;
    ownerUser = subject.labTeacherB || null;
  } else if (b === 'C') {
    ownerId = subject.labTeacherCId || null;
    ownerUser = subject.labTeacherC || null;
  }

  if (!ownerId) {
    ownerId = subject.courseTeacherId;
    ownerUser = subject.courseTeacher;
  }

  const isCourseTeacherOwner = ownerId === subject.courseTeacherId;
  const ownerName = ownerUser?.name || (isCourseTeacherOwner ? subject.courseTeacher?.name : 'Assigned Teacher');

  return { ownerId, isCourseTeacherOwner, ownerName, ownerUser };
}

export function canUserEditItem(userId: string | undefined | null, subject: any, itemIndex: number): boolean {
  if (!userId || !subject) return false;
  const roles = getSubjectRoles(userId, subject);

  if (roles.accessLevel === 'FULL') {
    // Course Teacher can edit non-coordinator-shared items
    return true;
  }
  if (roles.accessLevel === 'LAB') {
    // Lab-only user can ONLY edit lab items: 2, 4, 8, 14
    // Items 9 (Theory CE) and 20 (Course Teacher signature) stay locked!
    return LAB_ITEMS.includes(itemIndex);
  }

  return false;
}

export function canUserEditBatchData(
  userId: string | undefined | null,
  subject: any,
  batch: string,
  hasOwnerSubmitted: boolean
): boolean {
  if (!userId || !subject) return false;
  const roles = getSubjectRoles(userId, subject);

  if (roles.accessLevel === 'LAB') {
    // Lab-only user can edit ONLY their owned batch, and ONLY if not submitted yet
    const ownsBatch = roles.ownedBatches.includes(batch);
    return ownsBatch && !hasOwnerSubmitted;
  }

  if (roles.accessLevel === 'FULL') {
    // Course Teacher access
    const { ownerId, isCourseTeacherOwner } = getBatchOwnerInfo(subject, batch);
    if (isCourseTeacherOwner || ownerId === userId) {
      // CT is the owner -> edits directly
      return true;
    }
    // Owner is someone else:
    // If owner HAS submitted -> read-only for CT too
    // If owner HAS NOT submitted -> CT can edit as fallback
    return !hasOwnerSubmitted;
  }

  return false;
}

export function getLockBannerText(ownedBatch: string): string {
  return `Your Batch ${ownedBatch} lab data (Items ${LAB_ITEM_NAMES_STRING}) has been submitted to the Course Teacher and is locked.`;
}
