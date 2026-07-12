"use client";

import React, { useState, useCallback } from "react";
import { GripVertical, Replace, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import FileUpload from "./FileUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantImageManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

// ─── Mini image manager for variant-level images ──────────────────────────────

const VariantImageManager: React.FC<VariantImageManagerProps> = ({
  images,
  onImagesChange,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === toIndex) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newImages = [...images];
      const [moved] = newImages.splice(dragIndex, 1);
      newImages.splice(toIndex, 0, moved);
      onImagesChange(newImages);

      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, images, onImagesChange]
  );

  return (
    <div>
      <p className="text-[12px] text-white/60 mb-3 font-medium">
        صور خاصة بهذا المتغير {images.length > 1 && "— اسحب لإعادة الترتيب"}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        {images.map((img, i) => (
          <div
            key={`vimg-${i}-${img.slice(-20)}`}
            draggable={images.length > 1}
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(i);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, i)}
            className={`relative group w-14 h-14 transition-all duration-200 ${
              images.length > 1 ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              dragOverIndex === i && dragIndex !== i
                ? "ring-2 ring-blue-400 scale-110"
                : ""
            } ${dragIndex === i ? "opacity-40" : ""}`}
          >
            <img
              src={img}
              className="w-full h-full object-cover rounded-lg border border-white/20"
              alt=""
              draggable={false}
            />

            {/* Position badge */}
            {images.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-black/80 text-white text-[8px] px-1 py-0.5 rounded font-mono font-bold min-w-[14px] text-center">
                {i + 1}
              </span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1">
              {images.length > 1 && (
                <GripVertical className="w-2.5 h-2.5 text-white/60 absolute top-0.5 left-0.5" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReplacingIndex(i);
                }}
                className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                title="استبدال"
              >
                <Replace className="w-2.5 h-2.5 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImagesChange(images.filter((_, idx) => idx !== i));
                  toast.success('تم حذف الصورة');
                }}
                className="p-1 bg-red-500/40 hover:bg-red-500/60 rounded transition-colors"
                title="حذف"
              >
                <Trash2 className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          </div>
        ))}

        {/* Add new image */}
        <div className="scale-90 origin-right">
          <FileUpload
            label="رفع صورة"
            accept="image/*"
            onUpload={(url) => onImagesChange([...images, url])}
          />
        </div>
      </div>

      {/* Inline replace uploader */}
      {replacingIndex !== null && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-[10px] text-blue-300 mb-1 font-medium">
            استبدال الصورة رقم {replacingIndex + 1}
          </p>
          <FileUpload
            label={`استبدال #${replacingIndex + 1}`}
            accept="image/*"
            onUpload={(url) => {
              const newImages = [...images];
              newImages[replacingIndex] = url;
              onImagesChange(newImages);
              setReplacingIndex(null);
              toast.success(`تم استبدال الصورة رقم ${replacingIndex + 1}`);
            }}
          />
          <button
            onClick={() => setReplacingIndex(null)}
            className="mt-1 text-[10px] text-white/50 hover:text-white transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
};

export default VariantImageManager;
