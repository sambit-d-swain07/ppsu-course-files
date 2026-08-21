export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  employeeId?: string;
  role: 'FACULTY' | 'COORDINATOR' | 'ADMIN';
  department?: string;
  school?: string;
  division?: string;
  designation?: string;
  assignedCoordinatorId?: string; // For FACULTY users
}

export interface CourseFile {
  id: string;
  courseCode: string;
  courseTitle: string;
  semester: string;
  academicYear: string;
  progress: number; // completed checklist items (0-20)
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';
  facultyId: string;
  facultyName?: string;
  department?: string;
  school?: string;
  division?: string;
  subjectId?: string;
  lastUpdated: string; // ISO String
  createdAt?: string;  // ISO String

  // Verification & Signatures
  facultySignatureName?: string;
  facultySignatureUrl?: string;
  facultySignedAt?: string;
  facultyConfirmed?: boolean;
  reviewerSignatureName?: string;
  reviewerSignatureUrl?: string;
  reviewerSignedAt?: string;
  reviewerConfirmed?: boolean;

  // Evaluation fields
  totalScore?: number;
  rating?: 'Excellent' | 'Good' | 'Moderate & Update' | 'Fair & Revise' | 'Poor & Revise';
  coordinatorRemarks?: string;

  // Report
  generatedReportPath?: string;
}

export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  school: string;
  division: string;
  semester: string;
  academicYear: string;
  courseCoordinatorId: string;
  courseTeacherId: string;
  labTeacherAId?: string;
  labTeacherBId?: string;
  labTeacherCId?: string;
  evaluatorId: string;
  createdAt?: string;
  courseCoordinator?: User;
  courseTeacher?: User;
  labTeacherA?: User;
  labTeacherB?: User;
  labTeacherC?: User;
  evaluator?: User;
  courseFile?: CourseFile;
}

export interface ChecklistItem {
  id: string;
  courseFileId: string;
  itemIndex: number; // 1 to 20
  status: 'EMPTY' | 'UPLOADED';
  fileName?: string;
  fileUrl?: string;
  subItemsJson?: string; // JSON string representing checked/uploaded sub-items or manual mark tables
  score?: number; // 0-10 or 0-20 for item 19
  remarks?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  timestamp: string; // ISO String
  read: boolean;
}

export interface SubjectSharedDocument {
  id: string;
  subjectId: string;
  itemIndex: number;
  status: 'EMPTY' | 'UPLOADED';
  fileName?: string;
  fileUrl?: string;
  subItemsJson?: string;
  createdAt?: string;
  updatedAt?: string;
}
