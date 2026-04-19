export type Classroom = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
};

export type ClassroomAssignment = {
  id: string;
  classCode: string;
  setId: string;
  setTitle: string;
  dueDate: string;
  createdAt: string;
};

export type ClassroomMemberRole = "teacher" | "student";

export type ClassroomMember = {
  id: string;
  classCode: string;
  name: string;
  role: ClassroomMemberRole;
  joinedAt: string;
};

export type ClassroomProgressSnapshot = {
  id: string;
  classCode: string;
  studentName: string;
  accuracy: number;
  studyMinutes: number;
  pendingTasks: number;
  streakDays: number;
  submittedAt: string;
};

export type ClassroomTeacherSummary = {
  classCode: string;
  memberCount: number;
  latestSnapshotCount: number;
  averageAccuracy: number;
  averageStudyMinutes: number;
  riskAlerts: Array<{
    studentName: string;
    reason: string;
  }>;
};
