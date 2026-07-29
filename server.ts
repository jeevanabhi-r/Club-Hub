import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, doc, getDoc, setDoc, setLogLevel } from "firebase/firestore";
import adminAny, { adminDb, adminApp } from "./firebase-admin-config";

setLogLevel("silent");

function resolvePath(filename: string): string {
  const cwdPath = path.join(process.cwd(), filename);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }
  const dirPath = path.join(__dirname, filename);
  if (fs.existsSync(dirPath)) {
    return dirPath;
  }
  return cwdPath;
}

export const app = express();
const PORT = 3000;
const DB_FILE = process.env.VERCEL ? "/tmp/db.json" : resolvePath("db.json");

// Define state variables for db caching and synchronization
let cachedDb: any = null;
let lastSyncTime = 0;
let syncPromise: Promise<void> | null = null;

async function ensureDbSynced(force: boolean = false): Promise<void> {
  const now = Date.now();
  if (cachedDb && !force && (now - lastSyncTime < 8000)) {
    return;
  }
  if (syncPromise) {
    return syncPromise;
  }
  
  syncPromise = (async () => {
    try {
      let cloudData: any = null;
      if (adminDb) {
        console.log("[Admin SDK] Syncing database state from Firestore...");
        const docRef = adminDb.collection("system_data").doc("database");
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          cloudData = docSnap.data();
          console.log("[Admin SDK] Database successfully retrieved from Firestore cloud!");
        }
      } else if (firestoreDb) {
        console.log("Syncing database state from Firestore...");
        const docRef = doc(firestoreDb, "system_data", "database");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          cloudData = docSnap.data();
          console.log("Database successfully retrieved from Firestore cloud!");
        }
      }
      
      if (cloudData) {
        fs.writeFileSync(DB_FILE, JSON.stringify(cloudData, null, 2), "utf8");
        // Clear cachedDb to force re-parsing & healing
        cachedDb = null;
        getDb();
      }
    } catch (err: any) {
      console.warn("Failed to sync database from Firestore:", err.message || err);
    }
  })();
  
  await syncPromise;
  syncPromise = null;
}

app.use(express.json({ limit: "20mb" }));

// Pre-request Sync Middleware: ensures the local database is perfectly fresh from the cloud
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    try {
      await ensureDbSynced();
    } catch (err) {
      console.error("Error in pre-request database sync middleware:", err);
    }
  }
  next();
});

const UPLOADS_DIR = process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/assets/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(process.cwd(), "public")));

app.post("/api/upload", (req, res) => {
  const { name, type, data } = req.body;
  if (!data) return res.status(400).json({ error: "No data provided" });

  try {
    const base64Data = data.includes("base64,") ? data.split("base64,")[1] : data;
    const buffer = Buffer.from(base64Data, "base64");
    const fileExtension = type ? type.split("/")[1] || "png" : "png";
    const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
    const uploadDir = process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const downloadUrl = `/uploads/${fileName}`;
    res.json({ url: downloadUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to save file on server" });
  }
});

// --- DATABASE SETUP & SEEDING ---
interface Club {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  adminId: string;
  approved: boolean;
  memberCount: number;
  banner?: string;
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

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "club_admin" | "student";
  password?: string; // Stored in plain-text or simple base64 for local dev/proto compliance
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
  clubId?: string; // For club_admin
  clubName?: string;
  assignedClubId?: string;
  assignedClubName?: string;
  approved?: boolean; // For club_admin
  savedEvents?: string[]; // eventIds
}

interface Event {
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
  creatorEmail?: string;
  viewDetailsCount?: number;
  viewPhotosCount?: number;
}

interface Registration {
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

interface Announcement {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  read: boolean;
  createdAt: string;
}

interface InteractionRecord {
  id: string;
  eventId: string;
  userId: string;
  sessionId?: string;
  type: "view_details" | "view_photos";
  timestamp: string;
}

interface DatabaseSchema {
  users: User[];
  clubs: Club[];
  events: Event[];
  registrations: Registration[];
  announcements: Announcement[];
  notifications: Notification[];
  interactions?: InteractionRecord[];
  settings?: {
    logoUrl: string | null;
    updatedAt: string;
    updatedBy: string;
  };
}

const initialDatabase = (): DatabaseSchema => {
  return {
    users: [
      {
        id: "usr_super_admin",
        name: "Super Admin",
        email: "superadmin@clubhub.com",
        role: "super_admin",
        password: "password123",
        department: "Administration",
        rollNumber: "SA-01",
        phone: "+1 (555) 019-9000",
        about: "Overall platform system administrator for ClubHub.",
        profilePic: "",
        approved: true
      },
      {
        id: "usr_club_admin_acm",
        name: "Alex Rivera",
        email: "admin@clubhub.com",
        role: "club_admin",
        password: "password123",
        department: "Computer Science",
        rollNumber: "CS-ADMIN-01",
        phone: "+1 (555) 019-9111",
        about: "President of ACM Student Chapter. Passionate about algorithms and web development.",
        profilePic: "",
        clubId: "club_acm",
        approved: true
      },
      {
        id: "usr_club_admin_robotics",
        name: "Elena Rostova",
        email: "robotics_admin@clubhub.com",
        role: "club_admin",
        password: "password123",
        department: "Robotics & Electronics",
        rollNumber: "RE-ADMIN-02",
        phone: "+1 (555) 019-9222",
        about: "President of the Robotics and AI Club. Building the future, one actuator at a time.",
        profilePic: "",
        clubId: "club_robotics",
        approved: true
      },
      {
        id: "usr_student_jeevan",
        name: "Jeevan Abhi",
        email: "student@clubhub.com",
        role: "student",
        password: "password123",
        department: "Computer Science",
        rollNumber: "CS-2026-042",
        phone: "+1 (555) 019-9333",
        about: "Undergraduate Computer Science student. Full-stack explorer and coding enthusiast.",
        skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
        socialLinks: {
          github: "github.com/jeevanabhi",
          linkedin: "linkedin.com/in/jeevanabhi"
        },
        profilePic: "",
        savedEvents: ["evt_hackfest"]
      }
    ],
    clubs: [
      {
        id: "club_arts",
        name: "Art's club",
        description: "Express your creativity through sketching, painting, crafts, and graphic designs.",
        logo: "🎨",
        category: "Arts",
        adminId: "usr_1782969566089",
        approved: true,
        memberCount: 75
      },
      {
        id: "club_advance_tech",
        name: "Advance Tech club",
        description: "Explore the cutting-edge technologies including Web3, cloud computing, advanced web architectures, and system designs.",
        logo: "💻",
        category: "Technology",
        adminId: "usr_club_admin_acm",
        approved: true,
        memberCount: 145
      },
      {
        id: "club_social_media",
        name: "Social Media club",
        description: "Learn and grow in content creation, branding, digital marketing, and managing campus publications.",
        logo: "📱",
        category: "Media",
        adminId: "",
        approved: true,
        memberCount: 64
      },
      {
        id: "club_entrepreneur",
        name: "Entrepreneur club",
        description: "Fostering the next generation of business leaders, startups, pitching contests, and business model designs.",
        logo: "💼",
        category: "Business",
        adminId: "",
        approved: true,
        memberCount: 48
      },
      {
        id: "club_genai",
        name: "Genai club",
        description: "Unlocking the potential of Generative AI, Large Language Models, prompt engineering, and building AI agents.",
        logo: "🤖",
        category: "AI & ML",
        adminId: "usr_club_admin_robotics",
        approved: true,
        memberCount: 92
      },
      {
        id: "club_sports",
        name: "Sport's club",
        description: "Promoting physical fitness, team spirit, and competitive sports across university tournaments.",
        logo: "⚽",
        category: "Sports",
        adminId: "",
        approved: true,
        memberCount: 120
      }
    ],
    events: [
      {
        id: "evt_hackfest",
        title: "Hackfest 2026",
        description: "The biggest 24-hour campus hackathon of the year! Bring your team, code innovative solutions, and win amazing cash prizes up to $5,000. Free food, stickers, and swag for all participants.",
        clubId: "club_advance_tech",
        clubName: "Advance Tech club",
        category: "Coding",
        venue: "Main Auditorium Annex",
        date: "2026-10-15",
        time: "09:00 AM",
        banner: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
        maxParticipants: 150,
        deadline: "2026-10-10",
        status: "Upcoming",
        registeredCount: 42
      },
      {
        id: "evt_ai_workshop",
        title: "Introduction to Large Language Models",
        description: "Hands-on technical workshop building generative AI apps using modern frameworks. Bring a laptop with Python/Node environments ready.",
        clubId: "club_genai",
        clubName: "Genai club",
        category: "AI & ML",
        venue: "Computer Lab 4B",
        date: "2026-08-20",
        time: "02:00 PM",
        banner: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800",
        maxParticipants: 60,
        deadline: "2026-08-18",
        status: "Upcoming",
        registeredCount: 15
      },
      {
        id: "evt_shakespeare",
        title: "Shakespearean Soliloquies Showcase",
        description: "An evening of dramatic performances from classical literature, interpreted by modern student actors.",
        clubId: "club_arts",
        clubName: "Art's club",
        category: "Culture",
        venue: "Open Air Amphitheatre",
        date: "2026-04-12",
        time: "06:30 PM",
        banner: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
        maxParticipants: 200,
        deadline: "2026-04-10",
        status: "Completed",
        registeredCount: 124
      }
    ],
    registrations: [
      {
        id: "reg_001",
        eventId: "evt_hackfest",
        eventTitle: "Hackfest 2026",
        studentId: "usr_student_jeevan",
        studentName: "Jeevan Abhi",
        studentEmail: "student@clubhub.com",
        studentRollNumber: "CS-2026-042",
        studentDepartment: "Computer Science",
        status: "Approved",
        registeredAt: "2026-06-28T14:32:00Z",
        attendanceMarked: false
      },
      {
        id: "reg_002",
        eventId: "evt_shakespeare",
        eventTitle: "Shakespearean Soliloquies Showcase",
        studentId: "usr_student_jeevan",
        studentName: "Jeevan Abhi",
        studentEmail: "student@clubhub.com",
        studentRollNumber: "CS-2026-042",
        studentDepartment: "Computer Science",
        status: "Approved",
        registeredAt: "2026-04-05T10:15:00Z",
        attendanceMarked: true
      }
    ],
    announcements: [
      {
        id: "ann_001",
        clubId: "club_advance_tech",
        clubName: "Advance Tech club",
        title: "Hackfest 2026 Registration Open!",
        content: "We are thrilled to open registrations for Hackfest 2026. Teams can consist of 1 to 4 members. Ensure to mention all details correctly. Food requests (vegetarian/vegan) can be specified.",
        createdAt: "2026-06-25T10:00:00Z"
      },
      {
        id: "ann_002",
        clubId: "club_genai",
        clubName: "Genai club",
        title: "New AI Hardware Kits Arrived",
        content: "We have received 5 new NVIDIA Jetson Nano kits for student projects! Members can apply to lease them starting next Monday. Contact the club desk for allocations.",
        createdAt: "2026-06-28T09:12:00Z"
      }
    ],
    notifications: [
      {
        id: "not_001",
        userId: "usr_student_jeevan",
        title: "Registration Confirmed!",
        message: "Your registration for Hackfest 2026 has been approved. See you at the Main Auditorium Annex on October 15th at 09:00 AM.",
        type: "success",
        read: false,
        createdAt: "2026-06-28T15:00:00Z"
      }
    ],
    settings: {
      logoUrl: null,
      updatedAt: "2026-06-28T15:00:00Z",
      updatedBy: "usr_super_admin"
    }
  };
};

let firestoreDb: any = null;

try {
  let firebaseConfig: any = null;
  const configPath = resolvePath("firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    // Fallback to environment variables if config file doesn't exist (e.g., standard production environments)
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID
    };
  }

  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    const firebaseApp = initializeApp(firebaseConfig, "server-client-fallback");
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase App & Firestore initialized successfully on server.");
  } else {
    console.warn("Firebase config is incomplete. Falling back to local-only mode.");
  }
} catch (err) {
  console.error("Firebase App initialization failed on server:", err);
}

function getDb(): DatabaseSchema {
  if (cachedDb) {
    return cachedDb;
  }
  if (process.env.VERCEL && !fs.existsSync(DB_FILE)) {
    const bundleDbPath = resolvePath("db.json");
    try {
      if (fs.existsSync(bundleDbPath)) {
        fs.copyFileSync(bundleDbPath, DB_FILE);
        console.log("Copied seeded db.json from bundle to Vercel /tmp directory.");
      } else {
        const data = initialDatabase();
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
        console.log("Initialized new database in Vercel /tmp directory.");
      }
    } catch (err) {
      console.error("Failed to initialize Vercel tmp database:", err);
    }
  }
  if (!fs.existsSync(DB_FILE)) {
    const data = initialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    cachedDb = data;
    lastSyncTime = Date.now();
    return data;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(content) as any;
    
    // Defensive safeguards to ensure all critical arrays exist even if DB file was mutated or old schema loaded
    if (!parsed.users) parsed.users = [];
    
    // Ensure Super Admin user exists
    const hasSuperAdmin = parsed.users.some((u: any) => u.role === "super_admin" || u.email === "superadmin@clubhub.com");
    if (!hasSuperAdmin) {
      parsed.users.unshift({
        id: "usr_super_admin",
        name: "Super Admin",
        email: "superadmin@clubhub.com",
        role: "super_admin",
        password: "password123",
        department: "Administration",
        rollNumber: "SA-01",
        phone: "+1 (555) 019-9000",
        about: "Overall platform system administrator for ClubHub.",
        profilePic: "",
        approved: true
      });
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
      } catch (e) {
        console.error("Failed to persist injected super admin", e);
      }
    }

    if (!parsed.events) parsed.events = [];
    if (!parsed.registrations) parsed.registrations = [];
    if (!parsed.announcements) parsed.announcements = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.interactions) parsed.interactions = [];

    // Standardize all events to match the 6 requested clubs exactly
    parsed.events = parsed.events.map((e: any) => {
      let clubId = e.clubId;
      let clubName = e.clubName;
      if (clubId === "club_acm" || clubId === "club_advance_tech" || clubName === "ACM Student Chapter") {
        clubId = "club_advance_tech";
        clubName = "Advance Tech club";
      } else if (clubId === "club_robotics" || clubId === "club_genai" || clubName === "Robotics & AI Club") {
        clubId = "club_genai";
        clubName = "Genai club";
      } else if (clubId === "club_theater" || clubId === "club_arts" || clubId === "club_1782969566089" || clubName === "Arts club" || clubName === "Drama & Theater Society" || clubName === "Arts club") {
        clubId = "club_arts";
        clubName = "Art's club";
      } else if (clubId === "club_sports") {
        clubName = "Sport's club";
      } else if (clubId === "club_social_media") {
        clubName = "Social Media club";
      } else if (clubId === "club_entrepreneur") {
        clubName = "Entrepreneur club";
      }

      if (e.viewDetailsCount === undefined) {
        e.viewDetailsCount = 0;
      }
      if (e.viewPhotosCount === undefined) {
        e.viewPhotosCount = 0;
      }

      return { ...e, clubId, clubName };
    });

    // Standardize all announcements to match the 6 requested clubs exactly
    parsed.announcements = parsed.announcements.map((a: any) => {
      let clubId = a.clubId;
      let clubName = a.clubName;
      if (clubId === "club_acm" || clubId === "club_advance_tech" || clubName === "ACM Student Chapter") {
        clubId = "club_advance_tech";
        clubName = "Advance Tech club";
      } else if (clubId === "club_robotics" || clubId === "club_genai" || clubName === "Robotics & AI Club") {
        clubId = "club_genai";
        clubName = "Genai club";
      } else if (clubId === "club_theater" || clubId === "club_arts" || clubId === "club_1782969566089" || clubName === "Arts club" || clubName === "Drama & Theater Society" || clubName === "Arts club") {
        clubId = "club_arts";
        clubName = "Art's club";
      } else if (clubId === "club_sports") {
        clubName = "Sport's club";
      } else if (clubId === "club_social_media") {
        clubName = "Social Media club";
      } else if (clubId === "club_entrepreneur") {
        clubName = "Entrepreneur club";
      }
      return { ...a, clubId, clubName };
    });
    
    // Always enforce the 6 requested clubs exactly
    parsed.clubs = [
      {
        id: "club_arts",
        name: "Art's club",
        description: "Express your creativity through sketching, painting, crafts, and graphic designs.",
        logo: "🎨",
        category: "Arts",
        adminId: "usr_1782969566089",
        approved: true,
        memberCount: 75
      },
      {
        id: "club_advance_tech",
        name: "Advance Tech club",
        description: "Explore the cutting-edge technologies including Web3, cloud computing, advanced web architectures, and system designs.",
        logo: "💻",
        category: "Technology",
        adminId: "usr_club_admin_acm",
        approved: true,
        memberCount: 145
      },
      {
        id: "club_social_media",
        name: "Social Media club",
        description: "Learn and grow in content creation, branding, digital marketing, and managing campus publications.",
        logo: "📱",
        category: "Media",
        adminId: "",
        approved: true,
        memberCount: 64
      },
      {
        id: "club_entrepreneur",
        name: "Entrepreneur club",
        description: "Fostering the next generation of business leaders, startups, pitching contests, and business model designs.",
        logo: "💼",
        category: "Business",
        adminId: "",
        approved: true,
        memberCount: 48
      },
      {
        id: "club_genai",
        name: "Genai club",
        description: "Unlocking the potential of Generative AI, Large Language Models, prompt engineering, and building AI agents.",
        logo: "🤖",
        category: "AI & ML",
        adminId: "usr_club_admin_robotics",
        approved: true,
        memberCount: 92
      },
      {
        id: "club_sports",
        name: "Sport's club",
        description: "Promoting physical fitness, team spirit, and competitive sports across university tournaments.",
        logo: "⚽",
        category: "Sports",
        adminId: "",
        approved: true,
        memberCount: 120
      }
    ];
    
    // Ensure all admin/club_admin users have the club fields properly synchronized
    let userDbHealed = false;
    parsed.users = parsed.users.map((u: any) => {
      if (u.role === "club_admin" || u.role === "admin") {
        const oldClubId = u.clubId;
        const oldClubName = u.clubName;
        const oldAssignedClubId = u.assignedClubId;
        const oldAssignedClubName = u.assignedClubName;

        // Find if there's an existing club with this adminId
        let associatedClub = parsed.clubs.find((c: any) => c.adminId === u.id);
        
        // If not found by adminId, try by their existing clubId or assignedClubId
        if (!associatedClub && u.clubId) {
          associatedClub = parsed.clubs.find((c: any) => c.id === u.clubId);
        }
        if (!associatedClub && u.assignedClubId) {
          associatedClub = parsed.clubs.find((c: any) => c.id === u.assignedClubId);
        }

        // If found, heal the fields
        if (associatedClub) {
          u.clubId = associatedClub.id;
          u.clubName = associatedClub.name;
          u.assignedClubId = associatedClub.id;
          u.assignedClubName = associatedClub.name;
        } else {
          // If no club is associated at all, make sure fields are initialized or set (e.g. empty)
          u.clubId = u.clubId || "";
          u.clubName = u.clubName || "";
          u.assignedClubId = u.assignedClubId || "";
          u.assignedClubName = u.assignedClubName || "";
        }

        if (
          u.clubId !== oldClubId ||
          u.clubName !== oldClubName ||
          u.assignedClubId !== oldAssignedClubId ||
          u.assignedClubName !== oldAssignedClubName
        ) {
          userDbHealed = true;
        }
      }
      return u;
    });

    if (userDbHealed) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
        console.log("Database successfully migrated/healed with proper admin club associations!");
      } catch (e) {
        console.error("Failed to write healed database to file", e);
      }
    }

    cachedDb = parsed;
    lastSyncTime = Date.now();
    return parsed as DatabaseSchema;
  } catch (error) {
    console.warn("Failed to parse database file, resetting to defaults...", error);
    const data = initialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    cachedDb = data;
    lastSyncTime = Date.now();
    return data;
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

async function saveDb(data: DatabaseSchema): Promise<void> {
  // Update in-memory cache immediately
  cachedDb = data;
  lastSyncTime = Date.now();

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Local database file write failed:", err);
  }
  
  try {
    if (adminDb) {
      await adminDb.collection("system_data").doc("database").set(sanitizeForFirestore(data));
      console.log("[Admin SDK] Firestore cloud backup succeeded!");
    } else if (firestoreDb) {
      const docRef = doc(firestoreDb, "system_data", "database");
      await setDoc(docRef, sanitizeForFirestore(data));
      console.log("Firestore cloud backup succeeded!");
    }
  } catch (err: any) {
    console.warn("[Backup] Firestore cloud backup failed (continuing with local db):", err.message || err);
  }
}

// Ensure database is initialized
getDb();

async function syncDatabaseFromFirestore() {
  await ensureDbSynced(true);
}

syncDatabaseFromFirestore();


// --- AUTHENTICATION ENDPOINTS ---

// Mock Session Token Store (simple map in-memory for validation)
const ACTIVE_SESSIONS = new Map<string, string>(); // token -> userId

// Override Map.get to support fallback session recovery automatically for all endpoints
const originalGet = ACTIVE_SESSIONS.get.bind(ACTIVE_SESSIONS);
const originalSet = ACTIVE_SESSIONS.set.bind(ACTIVE_SESSIONS);

ACTIVE_SESSIONS.set = function(token: string, userId: string): Map<string, string> {
  if (!token) return ACTIVE_SESSIONS;
  const cleaned = token.replace(/['"]/g, "").trim();
  return originalSet(cleaned, userId);
};

ACTIVE_SESSIONS.get = function(token: string): string | undefined {
  if (!token) return undefined;
  const cleaned = token.replace(/['"]/g, "").trim();
  let userId = originalGet(cleaned);
  if (!userId) {
    if (cleaned.startsWith("token_")) {
      // Remove "token_" prefix
      let parsedId = cleaned.substring(6);
      // Remove "_timestamp" suffix from the end
      const lastUnderscore = parsedId.lastIndexOf("_");
      if (lastUnderscore !== -1) {
        parsedId = parsedId.substring(0, lastUnderscore);
      }
      const db = getDb();
      const user = db.users.find(u => u.id === parsedId);
      if (user) {
        originalSet(cleaned, user.id);
        userId = user.id;
      }
    }
  }
  return userId;
};

// --- WEBSITE SETTINGS ENDPOINTS ---
app.get("/api/settings", (req, res) => {
  try {
    const db = getDb();
    res.json(db.settings || { logoUrl: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { logoUrl } = req.body || {};
    const db = getDb();
    
    db.settings = {
      logoUrl: logoUrl || null,
      updatedAt: new Date().toISOString(),
      updatedBy: "usr_super_admin"
    };
    
    await saveDb(db);
    res.json({ success: true, settings: db.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

// --- ADMIN USER MANAGEMENT ENDPOINTS ---
app.get("/api/admin/users", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const currentUser = db.users.find(u => u.id === userId);
    if (!currentUser || currentUser.role !== "super_admin") {
      return res.status(403).json({ error: "403 Forbidden: Access denied. Super Admin role required." });
    }

    const userEmail = (currentUser.email || "").trim().toLowerCase();
    const isAuthorizedForPasswords = (
      userEmail === "clubhuboffcial@gmail.com" || 
      userEmail === "clubhubofficial@gmail.com"
    );

    if (isAuthorizedForPasswords) {
      res.json(db.users);
    } else {
      const sanitizedUsers = db.users.map(({ password, ...u }: any) => u);
      res.json(sanitizedUsers);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.get("/api/admin/users/export", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const currentUser = db.users.find(u => u.id === userId);
    if (!currentUser || currentUser.role !== "super_admin") {
      return res.status(403).json({ error: "403 Forbidden: Access denied. Super Admin role required." });
    }

    const userEmail = (currentUser.email || "").trim().toLowerCase();
    const isAuthorizedForPasswords = (
      userEmail === "clubhuboffcial@gmail.com" || 
      userEmail === "clubhubofficial@gmail.com"
    );

    const worksheetData = db.users.map((u: any) => {
      const clubName = u.role === "club_admin" 
        ? (db.clubs.find((c: any) => c.id === (u.clubId || u.assignedClubId))?.name || u.clubName || u.assignedClubName || "—")
        : (u.assignedClubName || u.clubName || "—");

      const roleLabel = u.role === "super_admin" 
        ? "Super Admin" 
        : u.role === "club_admin" 
          ? "Club Admin" 
          : "Student";

      const row: Record<string, any> = {
        "Name": u.name || "—",
        "Roll Number": u.rollNumber || "—",
        "Email": u.email || "—",
        "Department": u.department || "—",
        "Role": roleLabel,
        "Assigned Club": clubName
      };

      if (isAuthorizedForPasswords) {
        row["Password"] = u.password || "—";
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    const wscols = Object.keys(worksheetData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...worksheetData.map((r: any) => String(r[key] || "").length)
      ) + 2
    }));
    worksheet["!cols"] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const filename = isAuthorizedForPasswords 
      ? "ClubHub_Users_With_Passwords.xlsx" 
      : "ClubHub_Users.xlsx";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(excelBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || err });
  }
});

app.put("/api/admin/users/:id/role", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const currentUser = db.users.find(u => u.id === userId);
    if (!currentUser || currentUser.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }

    const targetUserId = req.params.id;
    const { role, clubId } = req.body || {};

    if (!role || !["super_admin", "club_admin", "student"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    if (targetUserId === currentUser.id && role !== "super_admin") {
      return res.status(400).json({ error: "You cannot change your own super_admin role to prevent losing access." });
    }

    const targetUserIdx = db.users.findIndex(u => u.id === targetUserId);
    if (targetUserIdx === -1) {
      return res.status(404).json({ error: "User not found." });
    }

    const targetUser = db.users[targetUserIdx];

    const targetEmail = (targetUser.email || "").trim().toLowerCase();
    const currentEmail = (currentUser.email || "").trim().toLowerCase();
    const isTargetMainSuperAdmin = targetEmail === "clubhuboffcial@gmail.com" || targetEmail === "clubhubofficial@gmail.com";
    const isCurrentMainSuperAdmin = currentEmail === "clubhuboffcial@gmail.com" || currentEmail === "clubhubofficial@gmail.com";

    if (isTargetMainSuperAdmin && !isCurrentMainSuperAdmin) {
      return res.status(403).json({ error: "Access denied. Other Super Admins cannot change the role of the primary Super Admin." });
    }

    targetUser.role = role;

    if (role === "club_admin") {
      // If we got a specific clubId, use it
      if (clubId) {
        targetUser.clubId = clubId;
        // Update the club's adminId
        const club = db.clubs.find(c => c.id === clubId);
        if (club) {
          club.adminId = targetUserId;
        }
        // Remove this user from being the admin of other clubs
        db.clubs.forEach(c => {
          if (c.adminId === targetUserId && c.id !== clubId) {
            c.adminId = "";
          }
        });
      } else if (!targetUser.clubId) {
        // Fallback: create a new club if they don't have one associated
        const existingClub = db.clubs.find(c => c.adminId === targetUserId);
        if (!existingClub) {
          const newClubId = `club_${Date.now()}`;
          const newClub: Club = {
            id: newClubId,
            name: `${targetUser.name}'s Club`,
            description: "A newly created club for student coordinator management.",
            logo: "🌟",
            category: "General",
            adminId: targetUserId,
            approved: true,
            memberCount: 1
          };
          db.clubs.push(newClub);
          targetUser.clubId = newClubId;
        } else {
          targetUser.clubId = existingClub.id;
        }
      }
    } else {
      // For student or super_admin, clear clubId and club's adminId mapping
      targetUser.clubId = "";
      db.clubs.forEach(c => {
        if (c.adminId === targetUserId) {
          c.adminId = "";
        }
      });
    }

    await saveDb(db);

    const { password, ...safeUser } = db.users[targetUserIdx];
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const currentUser = db.users.find(u => u.id === userId);
    if (!currentUser || currentUser.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }

    const targetUserId = req.params.id;
    if (targetUserId === currentUser.id) {
      return res.status(400).json({ error: "You cannot delete yourself!" });
    }

    const targetUserIdx = db.users.findIndex(u => u.id === targetUserId);
    if (targetUserIdx === -1) {
      return res.status(404).json({ error: "User not found." });
    }

    const targetUser = db.users[targetUserIdx];
    const targetEmail = (targetUser.email || "").trim().toLowerCase();
    const isTargetMainSuperAdmin = targetEmail === "clubhuboffcial@gmail.com" || targetEmail === "clubhubofficial@gmail.com";

    if (isTargetMainSuperAdmin) {
      return res.status(403).json({ error: "Access denied. The primary Super Admin account (clubhuboffcial@gmail.com) cannot be deleted." });
    }

    // Clean up registrations
    db.registrations = db.registrations.filter(r => r.studentId !== targetUserId);

    // If club admin, clean up related clubs adminId mappings
    db.clubs.forEach(c => {
      if (c.adminId === targetUserId) {
        c.adminId = "";
      }
    });

    // Remove user sessions
    for (const [sToken, sUid] of ACTIVE_SESSIONS.entries()) {
      if (sUid === targetUserId) {
        ACTIVE_SESSIONS.delete(sToken);
      }
    }

    // Try to delete from Firebase Authentication using Firebase Admin SDK
    try {
      if (adminAny && adminAny.apps && adminAny.apps.length > 0) {
        const adminAuth = adminAny.auth();
        const userRecord = await adminAuth.getUserByEmail(targetUser.email.toLowerCase());
        await adminAuth.deleteUser(userRecord.uid);
        console.log(`[Firebase Admin Auth] Successfully deleted user from Firebase Auth: ${targetUser.email}`);
      }
    } catch (authErr: any) {
      console.warn("[Firebase Admin Auth] Warning deleting user in Firebase Authentication:", authErr.message || authErr);
    }

    // Delete user from db list
    db.users.splice(targetUserIdx, 1);

    await saveDb(db);

    res.json({ success: true, message: "User deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.get("/api/diagnostics", (req, res) => {
  try {
    const cwdFiles = fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : [];
    const dirFiles = fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : [];
    
    res.json({
      processCwd: process.cwd(),
      __dirname: __dirname,
      cwdFiles: cwdFiles.filter(f => f.endsWith(".json") || f.endsWith(".ts") || f.endsWith(".js")),
      dirFiles: dirFiles.filter(f => f.endsWith(".json") || f.endsWith(".ts") || f.endsWith(".js")),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? "PRESENT" : "MISSING",
        FIREBASE_DATABASE_ID: process.env.FIREBASE_DATABASE_ID ? "PRESENT" : "MISSING",
      },
      firebaseAdmin: {
        initialized: adminApp !== null,
        dbInitialized: adminDb !== null,
        clientConfigPath: resolvePath("firebase-applet-config.json"),
        clientConfigExists: fs.existsSync(resolvePath("firebase-applet-config.json")),
        serviceAccountPath: resolvePath("firebase-service-account.json"),
        serviceAccountExists: fs.existsSync(resolvePath("firebase-service-account.json")),
      },
      firebaseClient: {
        dbInitialized: firestoreDb !== null,
      },
      dbFile: {
        path: DB_FILE,
        exists: fs.existsSync(DB_FILE),
        size: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDb();
  if (!db || !Array.isArray(db.users)) {
    return res.status(500).json({ error: "Database users not found or initialized" });
  }

  const user = db.users.find(u => u && typeof u.email === "string" && u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Generate a mock token
  const token = `token_${user.id}_${Date.now()}`;
  ACTIVE_SESSIONS.set(token, user.id);

  // Return user info and token (excluding password)
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { email: rawEmail, name, profilePic, googleUid } = req.body || {};
    if (!rawEmail) {
      return res.status(400).json({ error: "Email is required for Google authentication" });
    }

    const email = rawEmail.toLowerCase().trim();
    const db = getDb();
    if (!db || !Array.isArray(db.users)) {
      return res.status(500).json({ error: "Database users not found or initialized" });
    }

    let user = db.users.find(u => u && typeof u.email === "string" && u.email.toLowerCase() === email);

    if (!user) {
      // Auto-register student user via Google authentication
      const newUserId = `usr_g_${googleUid || Date.now()}`;
      user = {
        id: newUserId,
        name: name || email.split("@")[0] || "User",
        email: email,
        role: "student",
        password: "", // No password needed for OAuth users
        department: "General",
        rollNumber: "",
        phone: "",
        about: "Registered via Google Authentication",
        skills: [],
        socialLinks: {},
        savedEvents: [],
        profilePic: profilePic || "",
        approved: true
      };
      db.users.push(user);
      await saveDb(db);
    } else {
      // Update profile picture if missing or updated
      if (profilePic && !user.profilePic) {
        user.profilePic = profilePic;
        await saveDb(db);
      }
    }

    const token = `token_${user.id}_${Date.now()}`;
    ACTIVE_SESSIONS.set(token, user.id);

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Google Auth backend error:", err);
    res.status(500).json({ error: err.message || "Google authentication failed on server" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email: rawEmail, password, role, department, rollNumber, phone, clubName, clubDescription, clubCategory } = req.body;
  const db = getDb();

  if (!name || !rawEmail || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const email = rawEmail.toLowerCase().trim();
  const existing = db.users.find(u => u.email.toLowerCase() === email);
  if (existing) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const userId = `usr_${Date.now()}`;
  
  if (role === "club_admin") {
    // Requires a club creation/association
    const clubId = `club_${Date.now()}`;
    const newClub: Club = {
      id: clubId,
      name: clubName || `${name}'s New Club`,
      description: clubDescription || "Pending description.",
      logo: "🌟",
      category: clubCategory || "General",
      adminId: userId,
      approved: true, // Auto-approved
      memberCount: 1
    };

    const newUser: User = {
      id: userId,
      name,
      email,
      role: "club_admin",
      password,
      department: department || "",
      rollNumber: rollNumber || "",
      phone: phone || "",
      clubId,
      approved: true, // Auto-approved
      about: "",
      profilePic: ""
    };

    db.users.push(newUser);
    db.clubs.push(newClub);
    await saveDb(db);

    const token = `token_${newUser.id}_${Date.now()}`;
    ACTIVE_SESSIONS.set(token, newUser.id);

    const { password: _, ...safeUser } = newUser;
    return res.json({ token, user: safeUser });
  } else {
    // Student registration
    const newUser: User = {
      id: userId,
      name,
      email,
      role: "student",
      password,
      department: department || "",
      rollNumber: rollNumber || "",
      phone: phone || "",
      about: "",
      skills: [],
      socialLinks: {},
      savedEvents: [],
      profilePic: ""
    };

    db.users.push(newUser);
    await saveDb(db);

    const token = `token_${newUser.id}_${Date.now()}`;
    ACTIVE_SESSIONS.set(token, newUser.id);

    const { password: _, ...safeUser } = newUser;
    res.json({ token, user: safeUser });
  }
});

// Store reset tokens in memory securely with expiration, attempts, and verification state
interface OtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}
const OTP_STORE = new Map<string, OtpRecord>();

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Email not found" });
  }

  let host = process.env.SMTP_HOST;
  let port = parseInt(process.env.SMTP_PORT || "465");
  let user_email = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  // Check for placeholder or default environment values
  const isPlaceholderUser = !user_email || user_email.includes("your-email") || user_email.includes("placeholder") || user_email === "";
  const isPlaceholderPass = !pass || pass.includes("your-password") || pass.includes("placeholder") || pass === "";
  const isPlaceholderHost = !host || host.includes("your-host") || host === "";

  if (isPlaceholderUser || isPlaceholderPass || isPlaceholderHost) {
    host = "smtp.gmail.com";
    port = 465;
    user_email = "clubhuboffical@gmail.com";
    pass = "cfkv tldr lznk kakr";
  }

  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store securely
  OTP_STORE.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    otp,
    expiresAt,
    attempts: 0,
    verified: false
  });

  const sendEmailWithCredentials = async (smtpHost: string, smtpPort: number, smtpUser: string, smtpPass: string) => {
    const isGmail = smtpHost.includes("gmail") || smtpUser.toLowerCase().endsWith("@gmail.com");
    
    const cleanUser = smtpUser.trim();
    const cleanPass = isGmail ? smtpPass.replace(/\s+/g, "") : smtpPass.trim();

    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: "gmail",
            auth: {
              user: cleanUser,
              pass: cleanPass
            }
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: cleanUser,
              pass: cleanPass
            }
          }
    );

    const mailOptions = {
      from: `"ClubHub Admin" <${smtpUser}>`,
      to: email,
      subject: "ClubHub Password Reset",
      text: `Hello,

Your ClubHub password reset verification code is:

${otp}

This code is valid for 10 minutes.

If you did not request this password reset, ignore this email.

Regards,
ClubHub Team`
    };

    return new Promise<void>((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };

  try {
    // Attempt sending with current configuration
    await sendEmailWithCredentials(host!, port, user_email!, pass!);
    res.json({
      success: true,
      message: "Verification code sent successfully to your email."
    });
  } catch (err: any) {
    const isAuthError = err.message && (err.message.includes("535") || err.message.includes("Username and Password not accepted") || err.message.includes("Invalid login"));
    
    console.log(`[SMTP Notice]: Primary credentials (${user_email}) failed: ${err.message || err}.`);
    
    if (isAuthError) {
      console.log(`
      💡 [SMTP Helpful Tip]: Since your SMTP user is "${user_email}", if you are using Gmail, 
      please note that standard passwords will NOT work for SMTP. You must use a 16-character Google App Password.
      To fix this:
      1. Go to your Google Account Settings -> Security
      2. Enable 2-Step Verification (if not already enabled)
      3. Search for "App passwords" or go to https://myaccount.google.com/apppasswords
      4. Generate an App Password for "Mail" and select your device type
      5. Copy the 16-character code (e.g. "xxxx xxxx xxxx xxxx")
      6. In your AI Studio UI, update the SMTP_PASS secret with this 16-character code (without spaces) and save.
      `);
    }

    console.log("Trying fallback SMTP helper to deliver your email...");
    
    // Auto fallback to verified Gmail app password
    try {
      const fallbackHost = "smtp.gmail.com";
      const fallbackPort = 465;
      const fallbackUser = "abhi2007g1@gmail.com";
      const fallbackPass = "cvai bmhl xxjw izfr";
      
      await sendEmailWithCredentials(fallbackHost, fallbackPort, fallbackUser, fallbackPass);
      console.log("[SMTP Notice]: OTP email successfully delivered via fallback SMTP helper.");
      res.json({
        success: true,
        message: "Verification code sent successfully to your email (via fallback helper)."
      });
    } catch (fallbackErr: any) {
      console.error("[SMTP Error]: Both primary and fallback attempts failed:", fallbackErr.message || fallbackErr);
      res.status(500).json({
        error: "Failed to send email. There was an issue with the SMTP/Gmail connection: " + (fallbackErr.message || "Please check your network settings.")
      });
    }
  }
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const record = OTP_STORE.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Increment attempts
  record.attempts += 1;

  if (record.attempts > 5) {
    return res.status(400).json({ error: "Too many attempts. Maximum 5 attempts allowed." });
  }

  if (Date.now() > record.expiresAt) {
    OTP_STORE.delete(email.toLowerCase());
    return res.status(400).json({ error: "OTP expired" });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  record.verified = true;
  res.json({ success: true, message: "OTP verified successfully" });
});

app.post("/api/auth/update-password", async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Password mismatch" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Weak password" });
  }

  const record = OTP_STORE.get(email.toLowerCase());
  if (!record || !record.verified) {
    return res.status(400).json({ error: "Unauthorized password update request" });
  }

  const db = getDb();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ error: "Email not found" });
  }

  // Update in local JSON db
  db.users[userIndex].password = password;
  await saveDb(db);

  // Update Firebase Authentication password using Firebase Admin SDK
  try {
    if (adminAny && adminAny.apps && adminAny.apps.length > 0) {
      const adminAuth = adminAny.auth();
      const userRecord = await adminAuth.getUserByEmail(email.toLowerCase());
      await adminAuth.updateUser(userRecord.uid, { password });
      console.log(`[Firebase Admin Auth] Successfully updated password for user: ${email}`);
    }
  } catch (authErr: any) {
    console.warn("[Firebase Admin Auth] Warning updating password in Firebase Authentication:", authErr.message || authErr);
  }

  // Delete OTP
  OTP_STORE.delete(email.toLowerCase());

  res.json({
    success: true,
    message: "Password changed successfully."
  });
});

// Backward compatibility legacy endpoint
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, code, password } = req.body;
  // If email is not passed, find if we have any OTP that matches this code
  let targetEmail = email;
  if (!targetEmail) {
    for (const [key, value] of OTP_STORE.entries()) {
      if (value.otp === code?.trim()) {
        targetEmail = key;
        break;
      }
    }
  }

  if (!targetEmail || !code || !password) {
    return res.status(400).json({ error: "Email, reset code and password are required" });
  }

  const record = OTP_STORE.get(targetEmail.toLowerCase());
  if (!record || record.otp !== code.trim()) {
    return res.status(400).json({ error: "Expired or invalid reset code" });
  }

  if (Date.now() > record.expiresAt) {
    OTP_STORE.delete(targetEmail.toLowerCase());
    return res.status(400).json({ error: "Expired or invalid reset code" });
  }

  const db = getDb();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === targetEmail.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  db.users[userIndex].password = password;
  await saveDb(db);

  try {
    if (adminAny && adminAny.apps && adminAny.apps.length > 0) {
      const adminAuth = adminAny.auth();
      const userRecord = await adminAuth.getUserByEmail(targetEmail.toLowerCase());
      await adminAuth.updateUser(userRecord.uid, { password });
    }
  } catch (authErr: any) {
    console.warn("[Firebase Admin Auth C] Warning updating password:", authErr.message || authErr);
  }

  OTP_STORE.delete(targetEmail.toLowerCase());

  res.json({
    success: true,
    message: "Password updated successfully."
  });
});

app.post("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);

  if (!userId) {
    // Attempt fallback of matching direct token suffix for resilience
    if (token.startsWith("token_")) {
      // Remove "token_" prefix
      let parsedId = token.substring(6);
      // Remove "_timestamp" suffix from the end
      const lastUnderscore = parsedId.lastIndexOf("_");
      if (lastUnderscore !== -1) {
        parsedId = parsedId.substring(0, lastUnderscore);
      }
      const db = getDb();
      const user = db.users.find(u => u.id === parsedId);
      if (user) {
        ACTIVE_SESSIONS.set(token, user.id);
        const { password: _, ...safeUser } = user;
        return res.json({ user: safeUser });
      }
    }
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// --- PROFILE SETTINGS ---
app.put("/api/users/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { name, email, department, rollNumber, phone, section, about, skills, socialLinks, profilePic, password } = req.body;
  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === userId);
  if (userIdx === -1) return res.status(404).json({ error: "User not found" });

  if (name !== undefined) db.users[userIdx].name = name;
  if (email !== undefined) db.users[userIdx].email = typeof email === "string" ? email.toLowerCase().trim() : email;
  if (department !== undefined) db.users[userIdx].department = department;
  if (rollNumber !== undefined) db.users[userIdx].rollNumber = rollNumber;
  if (phone !== undefined) db.users[userIdx].phone = phone;
  if (section !== undefined) db.users[userIdx].section = section;
  if (about !== undefined) db.users[userIdx].about = about;
  if (skills !== undefined) db.users[userIdx].skills = skills;
  if (socialLinks !== undefined) db.users[userIdx].socialLinks = socialLinks;
  if (profilePic !== undefined) db.users[userIdx].profilePic = profilePic;
  if (password) db.users[userIdx].password = password;

  await saveDb(db);
  const { password: _, ...safeUser } = db.users[userIdx];
  res.json({ message: "Profile updated successfully!", user: safeUser });
});

// Delete Profile
app.delete("/api/users/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === userId);
  if (userIdx === -1) return res.status(404).json({ error: "User not found" });

  const user = db.users[userIdx];

  // Clean registrations
  db.registrations = db.registrations.filter(r => r.studentId !== userId);

  // If user is admin, clean up their clubs, events, and announcements
  if (user.role === "club_admin") {
    const userClubs = db.clubs.filter(c => c.adminId === userId).map(c => c.id);
    db.clubs = db.clubs.filter(c => c.adminId !== userId);
    db.events = db.events.filter(e => !userClubs.includes(e.clubId));
    db.announcements = db.announcements.filter(a => !userClubs.includes(a.clubId));
    db.registrations = db.registrations.filter(r => !userClubs.includes(r.eventId));
  }

  // Remove user
  db.users.splice(userIdx, 1);

  // Remove session
  ACTIVE_SESSIONS.delete(token);

  await saveDb(db);
  res.json({ message: "Profile and all associated data deleted successfully" });
});


// --- STUDENT FEATURE ENDPOINTS ---

// Helper to parse a single date token cleanly
function parseSingleDatePartServer(partStr: string, fallbackYear: number): { year: number; month: number; day: number } | null {
  if (!partStr) return null;
  const trimmed = partStr.trim();
  if (!trimmed) return null;

  // 1. ISO YYYY-MM-DD or YYYY/MM/DD
  let m = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 2. Standard DD/MM/YYYY or DD/MM/YY or DD-MM-YYYY or DD-MM-YY
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 3. Typo DD/MMYYYY e.g. 28/072026
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})(\d{4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 4. Partial DD/MM or DD-MM without year
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: fallbackYear, month: mo, day: d };
    }
  }

  // 5. Fallback Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() };
  }

  return null;
}

// Helper to compare dates and times correctly (handles single-day, multi-day ranges, ISO dates, and time ranges)
function isPastDate(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const str = String(dateStr).trim();
    const yearMatches = str.match(/\b(20\d{2})\b/g);
    const fallbackYear = yearMatches ? parseInt(yearMatches[yearMatches.length - 1], 10) : new Date().getFullYear();

    // Split multi-day date strings safely
    const parts = str.split(/[\s&\|,;]+|\s+to\s+|\s+and\s+|\s+[\-–—]\s+/i);
    const candidates: { year: number; month: number; day: number }[] = [];

    for (const p of parts) {
      const parsed = parseSingleDatePartServer(p, fallbackYear);
      if (parsed) candidates.push(parsed);
    }

    if (candidates.length === 0) {
      const fallbackParsed = parseSingleDatePartServer(str, fallbackYear);
      if (fallbackParsed) candidates.push(fallbackParsed);
    }

    if (candidates.length === 0) return false;

    // Select the latest END date candidate
    let maxCandidate = candidates[0];
    let maxTimeVal = new Date(maxCandidate.year, maxCandidate.month, maxCandidate.day).getTime();

    for (let i = 1; i < candidates.length; i++) {
      const cand = candidates[i];
      const t = new Date(cand.year, cand.month, cand.day).getTime();
      if (t > maxTimeVal) {
        maxTimeVal = t;
        maxCandidate = cand;
      }
    }

    // Extract time
    let hours = 23;
    let minutes = 59;
    let seconds = 59;

    if (timeStr && String(timeStr).trim()) {
      const trimmedTime = String(timeStr).trim();
      const timeParts = trimmedTime.split(/[-–—to]/i);
      const lastTimePart = timeParts[timeParts.length - 1].trim();

      const timeMatch = lastTimePart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;

        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          hours = h;
          minutes = m;
          seconds = 0;
        }
      }
    }

    const finalDate = new Date(maxCandidate.year, maxCandidate.month, maxCandidate.day, hours, minutes, seconds);
    return Date.now() > finalDate.getTime();
  } catch (e) {
    return false;
  }
}

// Get Events (filtered, with details)
app.get("/api/events", (req, res) => {
  const db = getDb();
  let list = [...db.events];
  
  // Clean past/completed statuses dynamically based on date comparison
  list = list.map(evt => {
    if (evt.status === "Upcoming" && isPastDate(evt.date, evt.time)) {
      return { ...evt, status: "Completed" };
    }
    return evt;
  });

  res.json(list);
});

// Get only past/completed events efficiently
app.get("/api/events/past", (req, res) => {
  const db = getDb();
  let list = db.events
    .map(evt => {
      if (evt.status === "Upcoming" && isPastDate(evt.date, evt.time)) {
        return { ...evt, status: "Completed" };
      }
      return evt;
    })
    .filter(evt => evt.status === "Completed" || evt.status === "Cancelled" || isPastDate(evt.date, evt.time));

  res.json(list);
});

// Event Interaction Tracking Endpoint
app.post("/api/events/:id/interaction", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized session" });

    const eventId = req.params.id;
    const { type } = req.body || {}; // "view_details" | "view_photos"

    if (type !== "view_details" && type !== "view_photos") {
      return res.status(400).json({ error: "Invalid interaction type" });
    }

    const db = getDb();
    const event = db.events.find(e => e.id === eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (!db.interactions) db.interactions = [];

    // DUPLICATE PROTECTION:
    // Track interactions per event, user, session token, and interaction type.
    const sessionKey = `${eventId}_${userId}_${token}_${type}`;
    const existing = db.interactions.find(
      i => i.id === sessionKey || 
           (i.eventId === eventId && i.userId === userId && (i.sessionId === token || i.id === sessionKey) && i.type === type)
    );

    let newlyRecorded = false;
    if (!existing) {
      const prevDetails = event.viewDetailsCount || 0;
      const prevPhotos = event.viewPhotosCount || 0;

      const newRecord = {
        id: sessionKey,
        eventId,
        userId,
        sessionId: token,
        type,
        timestamp: new Date().toISOString()
      };

      if (type === "view_details") {
        event.viewDetailsCount = prevDetails + 1;
      } else if (type === "view_photos") {
        event.viewPhotosCount = prevPhotos + 1;
      }
      db.interactions.push(newRecord);

      try {
        await saveDb(db);
        newlyRecorded = true;
      } catch (saveErr: any) {
        // Revert in-memory counter if save/Firebase operation fails
        event.viewDetailsCount = prevDetails;
        event.viewPhotosCount = prevPhotos;
        db.interactions.pop();
        console.error("Firebase/Database error recording interaction:", saveErr);
        return res.status(500).json({ error: "Failed to save interaction to Firebase database" });
      }
    }

    const viewDetailsCount = event.viewDetailsCount || 0;
    const viewPhotosCount = event.viewPhotosCount || 0;
    const totalInteractions = viewDetailsCount + viewPhotosCount;

    res.json({
      success: true,
      eventId: event.id,
      viewDetailsCount,
      viewPhotosCount,
      totalInteractions,
      newlyRecorded
    });
  } catch (err: any) {
    console.error("Interaction tracking error:", err);
    res.status(500).json({ error: err.message || "Failed to record event interaction" });
  }
});

// Helper to normalize club names for matching
function normalizeClubName(s?: string): string {
  if (!s) return "";
  let n = s.toLowerCase().replace(/[\x27\x22\u2019\u2018\u201C\u201D]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  if (n.includes("enterpreneur")) n = n.replace("enterpreneur", "entrepreneur");
  return n;
}

// Event Interaction Analytics Endpoint (Strictly filtered by backend for Club Admin)
app.get("/api/analytics/events", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized session" });

    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User profile not found" });

    let filteredEvents = [...db.events];

    // MANDATORY BACKEND SECURITY FILTERING:
    // Club Admins MUST ONLY see analytics for events belonging to THEIR OWN ASSIGNED CLUB.
    if (user.role === "club_admin") {
      const adminClubId = (user.clubId || user.assignedClubId || "").trim();
      const adminClubName = (user.clubName || user.assignedClubName || "").trim();
      const adminEmail = (user.email || "").trim().toLowerCase();

      // Find matched club object in db if available
      const matchedClub = db.clubs.find(
        c => (adminClubId && c.id === adminClubId) || 
             (user.id && c.adminId === user.id) || 
             (adminClubName && normalizeClubName(c.name) === normalizeClubName(adminClubName))
      );

      const validClubIds = new Set<string>();
      if (adminClubId) validClubIds.add(adminClubId);
      if (matchedClub?.id) validClubIds.add(matchedClub.id);

      const validClubNames = new Set<string>();
      if (adminClubName) validClubNames.add(normalizeClubName(adminClubName));
      if (matchedClub?.name) validClubNames.add(normalizeClubName(matchedClub.name));

      filteredEvents = filteredEvents.filter(e => {
        const eClubId = (e.clubId || e.hostingClubId || "").trim();
        const eClubName = normalizeClubName(e.clubName || "");

        // 1. Match by Club ID or Hosting Club ID
        if (eClubId && validClubIds.has(eClubId)) return true;

        // 2. Match by Normalized Club Name
        if (eClubName && validClubNames.has(eClubName)) return true;

        // 3. Fallback only if event has no explicit clubId or clubName
        if (!eClubId && !eClubName) {
          if (e.createdBy && e.createdBy === user.id) return true;
          if (e.creatorEmail && adminEmail && e.creatorEmail.toLowerCase() === adminEmail) return true;
        }

        return false;
      });

      // Optional search & sort within assigned club's events
      const { search, sort } = req.query;
      if (search && typeof search === "string" && search.trim() !== "") {
        const query = search.toLowerCase().trim();
        filteredEvents = filteredEvents.filter(
          e => e.title.toLowerCase().includes(query) ||
               (e.description && e.description.toLowerCase().includes(query))
        );
      }

      if (sort === "highest") {
        filteredEvents.sort((a, b) => {
          const totalA = (a.viewDetailsCount || 0) + (a.viewPhotosCount || 0);
          const totalB = (b.viewDetailsCount || 0) + (b.viewPhotosCount || 0);
          return totalB - totalA;
        });
      } else if (sort === "lowest") {
        filteredEvents.sort((a, b) => {
          const totalA = (a.viewDetailsCount || 0) + (a.viewPhotosCount || 0);
          const totalB = (b.viewDetailsCount || 0) + (b.viewPhotosCount || 0);
          return totalA - totalB;
        });
      }
    } else if (user.role === "super_admin") {
      // Super Admin sees ALL clubs with optional query params
      const { club, search, sort } = req.query;

      if (club && typeof club === "string" && club !== "All") {
        const normClub = normalizeClubName(club);
        filteredEvents = filteredEvents.filter(
          e => normalizeClubName(e.clubName) === normClub || e.clubId === club
        );
      }

      if (search && typeof search === "string" && search.trim() !== "") {
        const query = search.toLowerCase().trim();
        filteredEvents = filteredEvents.filter(
          e => (e.title && e.title.toLowerCase().includes(query)) ||
               (e.clubName && e.clubName.toLowerCase().includes(query)) ||
               (e.description && e.description.toLowerCase().includes(query))
        );
      }

      if (sort === "highest") {
        filteredEvents.sort((a, b) => {
          const totalA = (a.viewDetailsCount || 0) + (a.viewPhotosCount || 0);
          const totalB = (b.viewDetailsCount || 0) + (b.viewPhotosCount || 0);
          return totalB - totalA;
        });
      } else if (sort === "lowest") {
        filteredEvents.sort((a, b) => {
          const totalA = (a.viewDetailsCount || 0) + (a.viewPhotosCount || 0);
          const totalB = (b.viewDetailsCount || 0) + (b.viewPhotosCount || 0);
          return totalA - totalB;
        });
      }
    } else {
      return res.status(403).json({ error: "Access denied. Analytics are restricted to Club Admins and Super Admins." });
    }

    // Map output analytics list
    const analyticsList = filteredEvents.map(e => {
      const viewDetailsCount = e.viewDetailsCount || 0;
      const viewPhotosCount = e.viewPhotosCount || 0;
      const totalInteractions = viewDetailsCount + viewPhotosCount;

      return {
        id: e.id,
        eventId: e.id,
        title: e.title,
        clubName: e.clubName,
        clubId: e.clubId,
        banner: e.banner,
        date: e.date,
        time: e.time,
        driveLink: e.driveLink || "",
        description: e.description || "",
        viewDetailsCount,
        viewPhotosCount,
        totalInteractions,
        createdBy: e.createdBy || "",
        creatorEmail: e.creatorEmail || user.email
      };
    });

    res.json(analyticsList);
  } catch (err: any) {
    console.error("Analytics fetch error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch event analytics" });
  }
});

// Save (Bookmark) Event Toggle
app.post("/api/events/:id/save", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.params.id;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.savedEvents) user.savedEvents = [];
  const idx = user.savedEvents.indexOf(eventId);
  if (idx > -1) {
    user.savedEvents.splice(idx, 1);
  } else {
    user.savedEvents.push(eventId);
  }

  await saveDb(db);
  res.json({ savedEvents: user.savedEvents });
});

// Register for Event
app.post("/api/events/:id/register", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.params.id;
  const db = getDb();

  const student = db.users.find(u => u.id === userId);
  const event = db.events.find(e => e.id === eventId);

  if (!student || student.role !== "student") {
    return res.status(403).json({ error: "Only students can register for events" });
  }
  if (!event) return res.status(404).json({ error: "Event not found" });

  const existingReg = db.registrations.find(r => r.eventId === eventId && r.studentId === userId);
  if (existingReg) {
    return res.status(400).json({ error: "Already registered or registration pending" });
  }

  if (event.registeredCount >= event.maxParticipants) {
    return res.status(400).json({ error: "Event is fully booked!" });
  }

  const newReg: Registration = {
    id: `reg_${Date.now()}`,
    eventId,
    eventTitle: event.title,
    studentId: userId,
    studentName: student.name,
    studentEmail: student.email,
    studentRollNumber: student.rollNumber || "N/A",
    studentDepartment: student.department || "N/A",
    status: "Approved", // Auto-approved for fast prototyping usability
    registeredAt: new Date().toISOString(),
    attendanceMarked: false
  };

  db.registrations.push(newReg);
  event.registeredCount += 1;

  // Notification for student
  db.notifications.push({
    id: `not_${Date.now()}`,
    userId,
    title: "Registration Approved!",
    message: `You are successfully registered for ${event.title}.`,
    type: "success",
    read: false,
    createdAt: new Date().toISOString()
  });

  await saveDb(db);
  res.json({ message: "Registered successfully!", registration: newReg });
});

// Cancel Registration
app.post("/api/registrations/:id/cancel", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const regId = req.params.id;
  const db = getDb();

  const regIdx = db.registrations.findIndex(r => r.id === regId && r.studentId === userId);
  if (regIdx === -1) return res.status(404).json({ error: "Registration not found" });

  const reg = db.registrations[regIdx];
  const event = db.events.find(e => e.id === reg.eventId);
  if (event) {
    event.registeredCount = Math.max(0, event.registeredCount - 1);
  }

  db.registrations.splice(regIdx, 1);
  await saveDb(db);

  res.json({ message: "Registration cancelled successfully!" });
});

// Get student's registrations
app.get("/api/student/registrations", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const list = db.registrations.filter(r => r.studentId === userId);
  res.json(list);
});


// --- ADMIN & SUPER ADMIN ENDPOINTS ---

// Dashboard analytics statistics
app.get("/api/dashboard/stats", (req, res) => {
  const db = getDb();
  
  const stats = {
    totalEvents: db.events.length,
    upcomingEvents: db.events.filter(e => (e.status === "Upcoming" || !e.status) && !isPastDate(e.date, e.time)).length,
    pastEvents: db.events.filter(e => e.status === "Completed" || e.status === "Cancelled" || isPastDate(e.date, e.time)).length,
    students: db.users.filter(u => u.role === "student").length,
    totalStudentsAndAdmins: db.users.filter(u => u.role === "student" || u.role === "club_admin").length,
    clubs: db.clubs.filter(c => c.approved).length,
    pendingClubs: db.clubs.filter(c => !c.approved).length,
    totalRegistrations: db.registrations.length,
    recentActivity: [
      ...db.registrations.slice(-5).map(r => ({
        type: "registration",
        user: r.studentName,
        target: r.eventTitle,
        time: r.registeredAt,
        details: "Registered for Event"
      })),
      ...db.announcements.slice(-3).map(a => ({
        type: "announcement",
        user: a.clubName,
        target: a.title,
        time: a.createdAt,
        details: "Published Announcement"
      }))
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10)
  };

  res.json(stats);
});

// Get Clubs
app.get("/api/clubs", (req, res) => {
  const db = getDb();
  res.json(db.clubs);
});

// Create Club
app.post("/api/clubs", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== "club_admin") {
    return res.status(403).json({ error: "Only admins can manage clubs" });
  }

  const {
    name, description, logo, banner, category, facultyCoordinator,
    studentCoordinator, department, email, phone, instagram, linkedin, website, status
  } = req.body;

  if (!name || !description || !category) {
    return res.status(400).json({ error: "Name, Description, and Category are required" });
  }

  const newClub = {
    id: `club_${Date.now()}`,
    name,
    description,
    logo: logo || "🔥",
    banner: banner || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    category,
    adminId: userId,
    approved: true,
    memberCount: 1,
    facultyCoordinator: facultyCoordinator || "",
    studentCoordinator: studentCoordinator || "",
    department: department || "",
    email: email || "",
    phone: phone || "",
    instagram: instagram || "",
    linkedin: linkedin || "",
    website: website || "",
    status: status || "Active"
  };

  db.clubs.push(newClub);
  await saveDb(db);
  res.json({ message: "Club created successfully!", club: newClub });
});

// Edit Club
app.put("/api/clubs/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== "club_admin") {
    return res.status(403).json({ error: "Only admins can manage clubs" });
  }

  const clubId = req.params.id;
  const club = db.clubs.find(c => c.id === clubId);
  if (!club) return res.status(404).json({ error: "Club not found" });

  const {
    name, description, logo, banner, category, facultyCoordinator,
    studentCoordinator, department, email, phone, instagram, linkedin, website, status
  } = req.body;

  if (name) club.name = name;
  if (description) club.description = description;
  if (logo) club.logo = logo;
  if (banner) club.banner = banner;
  if (category) club.category = category;
  if (facultyCoordinator !== undefined) club.facultyCoordinator = facultyCoordinator;
  if (studentCoordinator !== undefined) club.studentCoordinator = studentCoordinator;
  if (department !== undefined) club.department = department;
  if (email !== undefined) club.email = email;
  if (phone !== undefined) club.phone = phone;
  if (instagram !== undefined) club.instagram = instagram;
  if (linkedin !== undefined) club.linkedin = linkedin;
  if (website !== undefined) club.website = website;
  if (status !== undefined) club.status = status;

  await saveDb(db);
  res.json({ message: "Club updated successfully!", club });
});

// Delete Club
app.delete("/api/clubs/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== "club_admin") {
    return res.status(403).json({ error: "Only admins can delete clubs" });
  }

  const clubId = req.params.id;
  const clubIdx = db.clubs.findIndex(c => c.id === clubId);
  if (clubIdx === -1) return res.status(404).json({ error: "Club not found" });

  // Delete all linked events and registrations
  const linkedEventIds = db.events.filter(e => e.clubId === clubId).map(e => e.id);
  db.events = db.events.filter(e => e.clubId !== clubId);
  db.registrations = db.registrations.filter(r => !linkedEventIds.includes(r.eventId));

  db.clubs.splice(clubIdx, 1);
  await saveDb(db);
  res.json({ message: "Club deleted successfully!" });
});

// Create Event
app.post("/api/events", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Only admins can create events" });
  }

  const { title, description, category, venue, date, time, banner, maxParticipants, deadline, driveLink, clubId: rClubId } = req.body;
  if (!title || !description || !category || !venue || !date || !time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Enforce secure club-based access control for Club Admin
  if (user.role === "club_admin") {
    const adminClubId = user.clubId || user.assignedClubId;
    if (!adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
    // If a different club ID was requested, reject immediately
    if (rClubId && rClubId !== adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
  }

  // Find club association
  let club: any = null;

  // 1. If a Hosting Club was selected from the dropdown/payload (i.e., rClubId), find that club
  if (rClubId) {
    club = db.clubs.find(c => c.id === rClubId);
  }

  // 2. If not found via dropdown selection, try to automatically retrieve the club assigned to this admin user
  if (!club) {
    // Check by user.clubId, user.assignedClubId, or any club where the user is the admin
    club = db.clubs.find(c => c.id === user.clubId || c.id === user.assignedClubId || c.adminId === user.id);
  }

  // 3. Fallback: if user is super_admin and still has no club, default to first club
  if (!club && user.role === "super_admin") {
    club = db.clubs[0];
  }

  // 4. If we STILL have no club associated or selected:
  if (!club) {
    if (user.role === "club_admin" || (user.role as any) === "admin") {
      return res.status(400).json({ error: "Please assign a club to this admin account in the Admin Panel." });
    }
    return res.status(400).json({ error: "No club associated with this user" });
  }

  const clubId = club.id;
  const clubName = club.name;

  const newEvent: Event = {
    id: `evt_${Date.now()}`,
    title,
    description,
    clubId,
    clubName,
    hostingClubId: clubId, // Automatically save hostingClubId = clubId
    category,
    venue,
    date,
    time,
    banner: banner || "",
    maxParticipants: parseInt(maxParticipants) || 100,
    deadline: deadline || date,
    status: "Upcoming",
    registeredCount: 0,
    driveLink: driveLink || "",
    createdBy: userId
  };

  db.events.push(newEvent);

  // Send system-wide notifications to student users
  db.users.filter(u => u.role === "student").forEach(st => {
    db.notifications.push({
      id: `not_${Date.now()}_${st.id}`,
      userId: st.id,
      title: "New Event Discovered",
      message: `${clubName} posted a new event: ${title}. Registration is now open!`,
      type: "info",
      read: false,
      createdAt: new Date().toISOString()
    });
  });

  await saveDb(db);
  res.json({ message: "Event created successfully!", event: newEvent });
});

// Get Single Event (with authorization checks)
app.get("/api/events/:id", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.params.id;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const event = db.events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: "Event not found" });

  if (user.role === "club_admin") {
    const adminClubId = user.clubId || user.assignedClubId;
    const eventClubId = event.hostingClubId || event.clubId;
    if (!adminClubId || eventClubId !== adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
  }

  res.json(event);
});

// Edit Event
app.put("/api/events/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.params.id;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const event = db.events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: "Event not found" });

  // Enforce secure club-based access control for Club Admin
  if (user.role === "club_admin") {
    const adminClubId = user.clubId || user.assignedClubId;
    const eventClubId = event.hostingClubId || event.clubId;
    if (!adminClubId || eventClubId !== adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
  }

  const { title, description, category, venue, date, time, banner, poster, maxParticipants, deadline, status, driveLink, clubId, clubName, requirements } = req.body;
  
  // Extra safety: block Club Admin from moving the event to another club
  if (user.role === "club_admin") {
    const adminClubId = user.clubId || user.assignedClubId;
    if (clubId && clubId !== adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
  }

  if (title) event.title = title;
  if (description) event.description = description;
  if (category) event.category = category;
  if (venue) event.venue = venue;
  if (date) event.date = date;
  if (time) event.time = time;
  if (banner) event.banner = banner;
  if (poster) event.poster = poster;
  if (maxParticipants) event.maxParticipants = parseInt(maxParticipants);
  if (deadline) event.deadline = deadline;
  if (status) event.status = status;
  if (driveLink !== undefined) event.driveLink = driveLink;
  if (clubId) {
    event.clubId = clubId;
    event.hostingClubId = clubId;
  }
  if (clubName) event.clubName = clubName;
  if (requirements !== undefined) event.requirements = requirements;

  // Make sure hostingClubId is set
  if (!event.hostingClubId) {
    event.hostingClubId = event.clubId;
  }

  await saveDb(db);
  res.json({ message: "Event updated successfully!", event });
});

// Delete Event
app.delete("/api/events/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.params.id;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const eventIdx = db.events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return res.status(404).json({ error: "Event not found" });

  const event = db.events[eventIdx];

  // Enforce secure club-based access control for Club Admin
  if (user.role === "club_admin") {
    const adminClubId = user.clubId || user.assignedClubId;
    const eventClubId = event.hostingClubId || event.clubId;
    if (!adminClubId || eventClubId !== adminClubId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify another club's events."
      });
    }
  }

  // Remove event registrations too
  db.registrations = db.registrations.filter(r => r.eventId !== eventId);
  db.events.splice(eventIdx, 1);
  await saveDb(db);

  res.json({ message: "Event deleted successfully!" });
});

// Post Announcement
app.post("/api/announcements", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing title or content" });

  let club = db.clubs.find(c => c.id === user.clubId);
  if (!club && user.role === "super_admin") {
    club = db.clubs[0];
  }
  if (!club) return res.status(400).json({ error: "No club associated with this admin" });
  const clubId = club.id;
  const clubName = club.name;

  const newAnn: Announcement = {
    id: `ann_${Date.now()}`,
    clubId,
    clubName,
    title,
    content,
    createdAt: new Date().toISOString()
  };

  db.announcements.push(newAnn);

  // Send notifications to all students
  db.users.filter(u => u.role === "student").forEach(st => {
    db.notifications.push({
      id: `not_${Date.now()}_${st.id}`,
      userId: st.id,
      title: "New Announcement",
      message: `${clubName} posted: "${title}"`,
      type: "info",
      read: false,
      createdAt: new Date().toISOString()
    });
  });

  await saveDb(db);
  res.json({ message: "Announcement posted!", announcement: newAnn });
});

app.get("/api/announcements", (req, res) => {
  const db = getDb();
  res.json(db.announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Delete Announcement
app.delete("/api/announcements/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const annId = req.params.id;
  const annIdx = db.announcements.findIndex(a => a.id === annId);
  if (annIdx === -1) return res.status(404).json({ error: "Announcement not found" });

  const announcement = db.announcements[annIdx];
  if (user.clubId && announcement.clubId !== user.clubId) {
    return res.status(403).json({ error: "You can only delete announcements for your own organization." });
  }

  db.announcements.splice(annIdx, 1);
  await saveDb(db);
  res.json({ message: "Notice deleted successfully" });
});

// Get Registrations for Admin/Super Admin
app.get("/api/registrations", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (user.role === "super_admin") {
    return res.json(db.registrations);
  }

  // Only return registrations for events of this admin's club
  const clubEvents = db.events.filter(e => e.clubId === user.clubId).map(e => e.id);
  return res.json(db.registrations.filter(r => clubEvents.includes(r.eventId)));
});

// Update Registration Status (Approve/Reject)
app.put("/api/registrations/:id/status", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { status } = req.body; // Approved or Rejected
  const regId = req.params.id;
  const db = getDb();

  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const reg = db.registrations.find(r => r.id === regId);
  if (!reg) return res.status(404).json({ error: "Registration not found" });

  reg.status = status;

  // Add Notification
  db.notifications.push({
    id: `not_${Date.now()}`,
    userId: reg.studentId,
    title: `Registration ${status}`,
    message: `Your registration for ${reg.eventTitle} has been ${status.toLowerCase()} by the organizer.`,
    type: status === "Approved" ? "success" : "warning",
    read: false,
    createdAt: new Date().toISOString()
  });

  await saveDb(db);
  res.json({ message: `Registration ${status} successfully!`, registration: reg });
});

// Mark QR Attendance
app.post("/api/registrations/:id/attendance", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.replace("Bearer ", "");
  const userId = ACTIVE_SESSIONS.get(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const regId = req.params.id;
  const db = getDb();

  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== "club_admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const reg = db.registrations.find(r => r.id === regId);
  if (!reg) return res.status(404).json({ error: "Registration not found" });

  reg.attendanceMarked = !reg.attendanceMarked;
  await saveDb(db);

  res.json({ message: "Attendance status toggled successfully!", registration: reg });
});


// --- NOTIFICATION SYSTEM ---
app.get("/api/notifications", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const rawNotifications = db.notifications || [];
    const list = Array.isArray(rawNotifications) ? rawNotifications.filter(n => n && n.userId === userId) : [];
    res.json(list.sort((a, b) => {
      const dateA = a.createdAt || "";
      const dateB = b.createdAt || "";
      return dateB.localeCompare(dateA);
    }));
  } catch (err) {
    console.error("Error in GET /api/notifications:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/notifications/read", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const userId = ACTIVE_SESSIONS.get(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const rawNotifications = db.notifications || [];
    if (Array.isArray(rawNotifications)) {
      rawNotifications.filter(n => n && n.userId === userId).forEach(n => {
        n.read = true;
      });
    }

    await saveDb(db);
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Error in POST /api/notifications/read:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- VITE MIDDLEWARE / ASSET SERVING ---

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClubHub Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error("Failed to bootstrap server", err);
  });
}

export default app;
