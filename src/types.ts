export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "club_admin" | "student";
  department?: string;
  rollNumber?: string;
  phone?: string;
  section?: string;
  about?: string;
  skills?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  profilePic?: string;
  clubId?: string;
  clubName?: string;
  assignedClubId?: string;
  assignedClubName?: string;
  approved?: boolean;
  savedEvents?: string[];
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner?: string;
  category: string;
  adminId: string;
  approved: boolean;
  memberCount: number;
  facultyCoordinator?: string;
  studentCoordinator?: string;
  department?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  status?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  clubId: string;
  clubName: string;
  hostingClubId?: string;
  category: string;
  venue: string;
  date: string;
  time: string;
  banner: string;
  poster?: string;
  maxParticipants: number;
  deadline: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  registeredCount: number;
  requirements?: string;
  organizer?: string;
  driveLink?: string;
  createdBy?: string;
  viewDetailsCount?: number;
  viewPhotosCount?: number;
}

export interface EventAnalyticsData {
  id: string;
  eventId: string;
  title: string;
  clubName: string;
  clubId: string;
  banner: string;
  date: string;
  time?: string;
  driveLink?: string;
  description?: string;
  viewDetailsCount: number;
  viewPhotosCount: number;
  totalInteractions: number;
  createdBy?: string;
  creatorEmail?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNumber: string;
  studentDepartment: string;
  status: "Pending" | "Approved" | "Rejected";
  registeredAt: string;
  attendanceMarked: boolean;
}

export interface Announcement {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  students: number;
  totalStudentsAndAdmins?: number; // non-super_admin users
  clubs: number;
  pendingClubs: number;
  totalRegistrations: number;
  recentActivity: Array<{
    type: "registration" | "announcement";
    user: string;
    target: string;
    time: string;
    details: string;
  }>;
}

export const CLUB_ROLE_MAP: Record<string, string> = {
  "club_arts": "Art's Club Admin",
  "club_sports": "Sport's Club Admin",
  "club_genai": "GenAI Club Admin",
  "club_advance_tech": "Advance Tech Club Admin",
  "club_social_media": "Social Media Club Admin"
};

export function getClubAdminRole(clubId: string, clubName?: string): string {
  if (CLUB_ROLE_MAP[clubId]) {
    return CLUB_ROLE_MAP[clubId];
  }
  const baseName = clubName || "Club";
  let formattedName = baseName;
  if (baseName.toLowerCase().endsWith(" club")) {
    formattedName = baseName.substring(0, baseName.length - 5) + " Club";
  } else if (!baseName.toLowerCase().endsWith("club")) {
    formattedName = baseName + " Club";
  } else {
    formattedName = baseName.substring(0, baseName.length - 4) + "Club";
  }
  if (formattedName.toLowerCase() === "genai club") {
    formattedName = "GenAI Club";
  }
  return `${formattedName} Admin`;
}

