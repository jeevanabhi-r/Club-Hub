export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "club_admin" | "student";
  department?: string;
  rollNumber?: string;
  phone?: string;
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
