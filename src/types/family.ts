export type FamilyRole = "student" | "parent";

export type FamilyProfile = {
  id: string;
  role: FamilyRole;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type FamilyLinkStatus = "pending" | "linked";

export type FamilyLink = {
  id: string;
  code: string;
  status: FamilyLinkStatus;
  parentProfileId: string;
  studentProfileId?: string;
  createdAt: string;
  linkedAt?: string;
};

export type FamilyAccessState = {
  profile: FamilyProfile;
  activeLink: FamilyLink | null;
  canParentMonitor: boolean;
  canStudentReceive: boolean;
  scopeKey: string;
};
