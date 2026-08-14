export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  employeeId?: string;
  role: 'FACULTY' | 'COORDINATOR' | 'ADMIN';
  department?: string;
  school?: string;
  designation?: string;
}

export interface CourseFile {
  id: string;
  courseCode: string;
  courseTitle: string;
  semester: string;
  academicYear: string;
  progress: number; // completed checklist items (0-19)
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';
  facultyId: string;
  facultyName?: string;
  department?: string;
  school?: string;
  lastUpdated: string; // ISO String
  createdAt?: string;  // ISO String

  // Evaluation fields
  totalScore?: number;
  rating?: 'Excellent' | 'Good' | 'Moderate & Update' | 'Fair & Revise' | 'Poor & Revise';
  coordinatorRemarks?: string;

  // Report
  generatedReportPath?: string;
}

export interface ChecklistItem {
  id: string;
  courseFileId: string;
  itemIndex: number; // 1 to 19
  status: 'EMPTY' | 'UPLOADED';
  fileName?: string;
  fileUrl?: string;
  subItemsJson?: string; // JSON string representing checked sub-items (e.g. '{"a":true, "b":false}')
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
