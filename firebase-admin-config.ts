import { initializeApp, getApp, getApps, cert, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as path from "path";
import * as fs from "fs";

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

const clientConfigPath = resolvePath("firebase-applet-config.json");
let firestoreDatabaseId: string | undefined;
if (fs.existsSync(clientConfigPath)) {
  try {
    const clientConfig = JSON.parse(fs.readFileSync(clientConfigPath, "utf8"));
    firestoreDatabaseId = clientConfig.firestoreDatabaseId;
  } catch (err) {
    console.warn("Firebase Admin SDK: Failed to pre-load database ID:", err);
  }
}
if (!firestoreDatabaseId) {
  firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
}

const adminAny = {
  get apps() {
    return getApps();
  },
  app() {
    return getApp();
  },
  auth(app?: any) {
    return getAuth(app || adminApp);
  },
  firestore(app?: any) {
    return getFirestore(app || adminApp, firestoreDatabaseId);
  },
  initializeApp(options?: any, name?: string) {
    return initializeApp(options, name);
  },
  credential: {
    cert(serviceAccount: any) {
      return cert(serviceAccount);
    }
  }
} as any;

let adminApp: any = null;
let adminDb: any = null;

const serviceAccountPath = resolvePath("firebase-service-account.json");

try {
  // 1. Try to get the default app if it already exists (prevents duplicate initialization errors on hot reloads)
  try {
    adminApp = getApp();
    adminDb = getFirestore(adminApp, firestoreDatabaseId);
    console.log("Firebase Admin SDK: Reused existing initialized App instance via getApp(). DB ID:", firestoreDatabaseId);
  } catch (appErr) {
    let reused = false;
    const appsList = getApps();
    if (appsList.length > 0) {
      try {
        adminApp = appsList[0];
        adminDb = getFirestore(adminApp, firestoreDatabaseId);
        console.log("Firebase Admin SDK: Reused existing initialized App instance via getApps()[0]. DB ID:", firestoreDatabaseId);
        reused = true;
      } catch (reuseErr) {
        console.log("Firebase Admin SDK: Existing app was unusable, cleaning it up...");
        try {
          if (adminApp) {
            deleteApp(adminApp).catch(() => {});
          } else if (appsList[0]) {
            deleteApp(appsList[0]).catch(() => {});
          }
        } catch (delErr) {
          // ignore
        }
        adminApp = null;
        adminDb = null;
      }
    }

    if (!reused) {
      let initialized = false;

      // 2. Try initializing using valid service account key file or environment variables
      let serviceAccount: any = null;
      if (fs.existsSync(serviceAccountPath)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        } catch (keyErr) {
          console.warn("Firebase Admin SDK: Error parsing service account file:", keyErr);
        }
      }

      if (!serviceAccount || !serviceAccount.private_key || serviceAccount.private_key.includes("PLACEHOLDER_PRIVATE_KEY_REPLACE_ME")) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (projectId && clientEmail && privateKey) {
          if (privateKey.includes("\\n")) {
            privateKey = privateKey.replace(/\\n/g, "\n");
          }
          serviceAccount = {
            project_id: projectId,
            client_email: clientEmail,
            private_key: privateKey
          };
          console.log("Firebase Admin SDK: Successfully loaded service account credentials from environment variables!");
        }
      }

      if (serviceAccount && serviceAccount.private_key && !serviceAccount.private_key.includes("PLACEHOLDER_PRIVATE_KEY_REPLACE_ME")) {
        try {
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
          });
          adminDb = getFirestore(adminApp, firestoreDatabaseId);
          console.log("Firebase Admin SDK: Successfully initialized! DB ID:", firestoreDatabaseId);
          initialized = true;
        } catch (initErr: any) {
          console.error("Firebase Admin SDK: Error initializing with service account credentials:", initErr.message || initErr);
        }
      } else {
        console.log("Firebase Admin SDK: No service account key file or environment variables found. Keeping adminDb as null and falling back to Client Web SDK.");
      }

      // We explicitly skip step 3 and 4 (initializing adminDb without credentials/using ADC)
      // because in the AI Studio sandboxed multi-tenant Cloud Run environment,
      // the container's Application Default Credentials (ADC) belong to a different GCP project
      // and do not have IAM access to the user's specific Firestore database.
      // Setting adminDb with unauthenticated/wrong ADC credentials causes persistent
      // PERMISSION_DENIED errors. Skipping this ensures clean, automatic fallback
      // to the Client Web SDK (firestoreDb), which is fully authorized via the deployed Security Rules.
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

export { adminApp, adminDb };
export default adminAny;
