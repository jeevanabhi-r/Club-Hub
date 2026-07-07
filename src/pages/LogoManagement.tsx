import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLogo } from "../context/LogoContext";
import { db, storage, auth } from "../firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";
import axios from "axios";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { 
  UploadCloud, 
  Trash2, 
  Save, 
  X, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle,
  FileImage,
  RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function LogoManagement() {
  const { user } = useAuth();
  const { logoUrl: currentLogoUrl } = useLogo();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Set initial preview to existing logo URL
  useEffect(() => {
    if (currentLogoUrl) {
      setLogoPreview(currentLogoUrl);
    } else {
      setLogoPreview(null);
    }
  }, [currentLogoUrl]);

  // Security Guard: Only Super Admin
  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-zinc-900/30 rounded-xl border border-zinc-900">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Access Restriced</h3>
        <p className="text-xs text-zinc-400 max-w-md">
          Only the Super Admin is authorized to upload, modify, or remove the website logo.
        </p>
      </div>
    );
  }

  // File Validation
  const validateFile = (file: File): boolean => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file format! Please upload PNG, JPG, JPEG, SVG, or WebP.");
      return false;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      toast.error("File size is too large! Maximum limit is 5 MB.");
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success("Logo file selected successfully! Click 'Save Changes' to upload.");
    }
  };

  // Drag-and-drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Clear or Remove Logo state locally before saving
  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Logo cleared from preview. Click 'Save Changes' to persist.");
  };

  // Cancel edits
  const handleCancel = () => {
    setSelectedFile(null);
    setLogoPreview(currentLogoUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast("Changes cancelled", { icon: "↩️" });
    navigate("/dashboard");
  };

  // Save changes and handle upload to Firebase Storage & Firestore settings collection
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setUploadProgress(0);

    try {
      // 1. Authenticate with Firebase Auth if not already authenticated
      if (!auth.currentUser) {
        try {
          console.log("Authenticating anonymously with Firebase Auth...");
          await signInAnonymously(auth);
          console.log("Authenticated with Firebase Auth anonymously as:", auth.currentUser?.uid);
        } catch (authErr: any) {
          console.warn("Firebase Auth anonymous sign-in failed (proceeding anyway):", authErr);
        }
      }

      let finalUrl = currentLogoUrl;

      // Case 1: Logo has been cleared/removed
      if (logoPreview === null) {
        // Clear settings collection
        const docRef = doc(db, "settings", "website");
        try {
          await setDoc(docRef, {
            logoUrl: null,
            updatedAt: new Date().toISOString(),
            updatedBy: user.id
          });
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.WRITE, "settings/website");
        }
        toast.success("Website logo deleted successfully!");
        setSelectedFile(null);
        setIsSaving(false);
        return;
      }

      // Case 2: New file selected for upload
      if (selectedFile) {
        setIsUploading(true);
        setUploadProgress(10);

        console.log("Starting upload of:", selectedFile.name, "via local /api/upload");
        
        const reader = new FileReader();
        const uploadPromise = new Promise<string>((resolve, reject) => {
          reader.readAsDataURL(selectedFile);
          reader.onload = async () => {
            try {
              setUploadProgress(30);
              const res = await axios.post("/api/upload", {
                name: selectedFile.name,
                type: selectedFile.type,
                data: reader.result as string
              }, {
                onUploadProgress: (progressEvent) => {
                  if (progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(Math.min(95, 30 + Math.round(progress * 0.65)));
                  }
                }
              });
              setUploadProgress(100);
              resolve(res.data.url);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = (error) => {
            reject(error);
          };
        });

        finalUrl = await uploadPromise;
        console.log("Local upload complete. Obtained URL:", finalUrl);
        
        // Save to Firestore settings collection
        console.log("Saving download URL to Firestore...");
        const docRef = doc(db, "settings", "website");
        try {
          await setDoc(docRef, {
            logoUrl: finalUrl,
            updatedAt: new Date().toISOString(),
            updatedBy: user.id
          });
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.WRITE, "settings/website");
        }

        toast.success("Website logo updated successfully!");
        setSelectedFile(null);
        setIsUploading(false);
        setIsSaving(false);
      } else {
        // No changes to file, but user clicked save
        toast("No new logo file was uploaded.", { icon: "ℹ️" });
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error("Save Changes Error:", err);
      
      let displayError = err.message || "An error occurred while saving settings.";
      // Parse JSON if it's from our handleFirestoreError
      try {
        if (err.message && err.message.trim().startsWith("{")) {
          const parsed = JSON.parse(err.message);
          displayError = parsed.error || displayError;
        }
      } catch (parseErr) {
        // fallback to original error
      }

      toast.error(displayError);
      setIsUploading(false);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Logo Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Upload, replace, or configure the default branding logo displayed across the entire platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || (logoPreview === currentLogoUrl && !selectedFile)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#f26522] text-white hover:bg-orange-600 transition-all cursor-pointer shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Drag & Drop Upload Zone */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Upload New Logo</h3>
            
            {/* Dropzone Container */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                dragActive 
                  ? "border-[#f26522] bg-orange-500/5" 
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <UploadCloud className={`h-12 w-12 mb-4 transition-transform duration-200 ${dragActive ? "text-[#f26522] scale-110" : "text-zinc-500"}`} />
              
              <p className="text-xs font-bold text-zinc-200">
                Drag and drop your logo file here, or <span className="text-[#f26522] underline">browse files</span>
              </p>
              
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-zinc-500">
                <span>Formats: PNG, JPG, JPEG, SVG, WebP</span>
                <span className="hidden md:inline">•</span>
                <span>Max Size: 5 MB</span>
              </div>
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-[#f26522]" />
                  <div className="truncate max-w-[200px] md:max-w-sm">
                    <p className="font-semibold text-zinc-200 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-[#f26522]" />
                    Uploading to Firebase Storage...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#f26522] to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4 flex flex-col h-full min-h-[300px]">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Logo Preview</h3>

            <div className="flex-1 border border-zinc-800 rounded-xl bg-zinc-950/40 p-6 flex flex-col items-center justify-center relative min-h-[160px]">
              {logoPreview ? (
                <div className="space-y-4 flex flex-col items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="max-h-24 w-auto object-contain select-none max-w-full"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const fallback = "/logo.png";
                      if (!img.src.endsWith(fallback)) {
                        img.src = fallback;
                      }
                    }}
                  />
                  <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live Preview
                  </span>
                </div>
              ) : (
                <div className="text-center p-4">
                  <span className="bg-gradient-to-r from-[#f26522] to-amber-500 bg-clip-text text-transparent text-2xl font-black tracking-tight block">
                    ClubHub
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-2 max-w-[200px]">
                    No logo uploaded. The system will fall back to displaying this styled typography default.
                  </p>
                </div>
              )}

              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isSaving}
                  className="absolute top-3 right-3 p-1.5 bg-zinc-900 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 rounded-lg border border-zinc-800 hover:border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Remove Logo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="text-[10px] text-zinc-500 bg-zinc-950/20 rounded-lg p-3 border border-zinc-800/40">
              <span className="font-bold text-zinc-400 block mb-1">Branding Rule:</span>
              Once uploaded, this logo is synchronized across all screens including Sidebars, Navbars, Login cards, and Loading portals automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
