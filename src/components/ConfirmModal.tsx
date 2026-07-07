import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  type = "danger"
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl z-10 text-zinc-200"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon + Header */}
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-2.5 shrink-0 ${
              type === "danger" 
                ? "bg-rose-950/40 text-rose-400 border border-rose-500/20" 
                : "bg-amber-950/40 text-amber-400 border border-amber-500/20"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            
            <div className="space-y-1.5 flex-1 pr-6">
              <h3 className="font-display font-bold text-white text-sm">
                {title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-900 pt-4 mt-6">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all shadow-lg cursor-pointer ${
                type === "danger"
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/10"
                  : "bg-[#f26522] hover:bg-[#ea580c] shadow-orange-500/10"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
