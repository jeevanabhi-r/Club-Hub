import React from "react";
import { X } from "lucide-react";

interface ImageLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ imageUrl, onClose, title }) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[92vh] flex flex-col items-center justify-center bg-zinc-950 p-2 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-white bg-black/80 hover:bg-black rounded-full border border-white/20 transition-all shadow-lg cursor-pointer"
            title="Close full view"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {title && (
          <div className="absolute top-3 left-4 z-20 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-xs text-zinc-300 font-medium max-w-[80%] truncate">
            {title}
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={title || "Full size view"} 
          className="max-w-full max-h-[86vh] object-contain rounded-xl"
        />
      </div>
    </div>
  );
};

export default ImageLightboxModal;
