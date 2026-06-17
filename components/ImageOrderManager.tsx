"use client";

import React, { useState, useRef, useCallback } from "react";
import { GripVertical, Replace, Trash2, Star, Upload } from "lucide-react";
import FileUpload from "./FileUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageOrderManagerProps {
  mainImage: string;
  images: string[];
  videos?: string[];
  onMainImageChange: (url: string) => void;
  onImagesChange: (images: string[]) => void;
  onVideosChange?: (videos: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ImageOrderManager: React.FC<ImageOrderManagerProps> = ({
  mainImage,
  images,
  videos = [],
  onMainImageChange,
  onImagesChange,
  onVideosChange,
}) => {
  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragType, setDragType] = useState<"image" | "video" | null>(null);

  // Replace state — which index is currently being replaced
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [replacingType, setReplacingType] = useState<"image" | "video" | "main" | null>(null);

  // Video drag state
  const [videoDragIndex, setVideoDragIndex] = useState<number | null>(null);
  const [videoDragOverIndex, setVideoDragOverIndex] = useState<number | null>(null);

  // ─── Image drag handlers ──────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    setDragType("image");
    e.dataTransfer.effectAllowed = "move";
    // Make drag image semi-transparent
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
    setDragType(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
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

  // ─── Video drag handlers ──────────────────────────────────────────────

  const handleVideoDragStart = useCallback((e: React.DragEvent, index: number) => {
    setVideoDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }, []);

  const handleVideoDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setVideoDragIndex(null);
    setVideoDragOverIndex(null);
  }, []);

  const handleVideoDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setVideoDragOverIndex(index);
  }, []);

  const handleVideoDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (videoDragIndex === null || videoDragIndex === toIndex || !onVideosChange) {
        setVideoDragIndex(null);
        setVideoDragOverIndex(null);
        return;
      }

      const newVideos = [...videos];
      const [moved] = newVideos.splice(videoDragIndex, 1);
      newVideos.splice(toIndex, 0, moved);
      onVideosChange(newVideos);

      setVideoDragIndex(null);
      setVideoDragOverIndex(null);
    },
    [videoDragIndex, videos, onVideosChange]
  );

  // ─── Actions ──────────────────────────────────────────────────────────

  const deleteImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange]
  );

  const deleteVideo = useCallback(
    (index: number) => {
      if (onVideosChange) {
        onVideosChange(videos.filter((_, i) => i !== index));
      }
    },
    [videos, onVideosChange]
  );

  const setAsMain = useCallback(
    (index: number) => {
      const oldMain = mainImage;
      const newMain = images[index];
      // Swap: the gallery image becomes main, old main goes to that gallery position
      const newImages = [...images];
      if (oldMain) {
        newImages[index] = oldMain;
      } else {
        newImages.splice(index, 1);
      }
      onMainImageChange(newMain);
      onImagesChange(newImages);
    },
    [mainImage, images, onMainImageChange, onImagesChange]
  );

  const deleteMainImage = useCallback(() => {
    // If there are gallery images, promote the first one to main
    if (images.length > 0) {
      const [first, ...rest] = images;
      onMainImageChange(first);
      onImagesChange(rest);
    } else {
      onMainImageChange("");
    }
  }, [images, onMainImageChange, onImagesChange]);

  const handleReplace = useCallback(
    (url: string, type: "image" | "video" | "main", index: number) => {
      if (type === "main") {
        onMainImageChange(url);
      } else if (type === "image") {
        const newImages = [...images];
        newImages[index] = url;
        onImagesChange(newImages);
      } else if (type === "video" && onVideosChange) {
        const newVideos = [...videos];
        newVideos[index] = url;
        onVideosChange(newVideos);
      }
      setReplacingIndex(null);
      setReplacingType(null);
    },
    [images, videos, onMainImageChange, onImagesChange, onVideosChange]
  );

  // ─── New upload handler ───────────────────────────────────────────────

  const handleNewUpload = useCallback(
    (url: string, isVideo?: boolean) => {
      if (!mainImage && !isVideo) {
        onMainImageChange(url);
      } else if (isVideo && onVideosChange) {
        onVideosChange([...videos, url]);
      } else {
        onImagesChange([...images, url]);
      }
    },
    [mainImage, images, videos, onMainImageChange, onImagesChange, onVideosChange]
  );

  // ─── Render ───────────────────────────────────────────────────────────

  const hasMedia = mainImage || images.length > 0 || videos.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-white/50 mb-2 font-medium">
        الصور والفيديوهات الخاصة بالمنتج الأساسي — اسحب لإعادة الترتيب
      </p>

      {hasMedia && (
        <div className="bg-white/[0.02] p-5 rounded-xl border border-white/[0.05] space-y-6">
          {/* ── Main Image ───────────────────────────────────────────── */}
          {mainImage && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                الصورة الرئيسية
              </p>
              <div className="relative group w-32 h-32 inline-block">
                <img
                  src={mainImage}
                  alt="الرئيسية"
                  className="w-full h-full object-cover rounded-xl border-2 border-amber-400/60"
                />
                <span className="absolute bottom-1 right-1 bg-amber-400 text-black text-[10px] px-2 py-0.5 rounded shadow font-bold">
                  الرئيسية
                </span>

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setReplacingIndex(0);
                      setReplacingType("main");
                    }}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="استبدال"
                  >
                    <Replace className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={deleteMainImage}
                    className="p-1.5 bg-red-500/40 hover:bg-red-500/60 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>

              {/* Inline replace uploader for main image */}
              {replacingType === "main" && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-[11px] text-amber-300 mb-2 font-medium">
                    اختر صورة بديلة للصورة الرئيسية
                  </p>
                  <FileUpload
                    label="استبدال الصورة الرئيسية"
                    accept="image/*"
                    onUpload={(url) => handleReplace(url, "main", 0)}
                  />
                  <button
                    onClick={() => {
                      setReplacingIndex(null);
                      setReplacingType(null);
                    }}
                    className="mt-2 text-[11px] text-white/50 hover:text-white transition-colors"
                  >
                    إلغاء الاستبدال
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Gallery Images (draggable) ────────────────────────────── */}
          {images.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                صور المعرض ({images.length}) — اسحب لإعادة الترتيب
              </p>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div
                    key={`img-${idx}-${img.slice(-20)}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`relative group w-28 h-28 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                      dragOverIndex === idx && dragIndex !== idx
                        ? "ring-2 ring-blue-400 scale-105"
                        : ""
                    } ${dragIndex === idx ? "opacity-40" : ""}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover rounded-xl border border-white/[0.12]"
                      draggable={false}
                    />

                    {/* Position badge */}
                    <span className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold min-w-[20px] text-center">
                      {idx + 1}
                    </span>

                    {/* Drag handle indicator */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3.5 h-3.5 text-white/70" />
                    </div>

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsMain(idx);
                        }}
                        className="p-1.5 bg-amber-500/40 hover:bg-amber-500/60 rounded-lg transition-colors"
                        title="تعيين كصورة رئيسية"
                      >
                        <Star className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplacingIndex(idx);
                          setReplacingType("image");
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="استبدال"
                      >
                        <Replace className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImage(idx);
                        }}
                        className="p-1.5 bg-red-500/40 hover:bg-red-500/60 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline replace uploader for gallery images */}
              {replacingType === "image" && replacingIndex !== null && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-[11px] text-blue-300 mb-2 font-medium">
                    استبدال الصورة رقم {replacingIndex + 1}
                  </p>
                  <FileUpload
                    label={`استبدال الصورة #${replacingIndex + 1}`}
                    accept="image/*"
                    onUpload={(url) => handleReplace(url, "image", replacingIndex)}
                  />
                  <button
                    onClick={() => {
                      setReplacingIndex(null);
                      setReplacingType(null);
                    }}
                    className="mt-2 text-[11px] text-white/50 hover:text-white transition-colors"
                  >
                    إلغاء الاستبدال
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Videos (draggable) ────────────────────────────────────── */}
          {videos.length > 0 && onVideosChange && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                الفيديوهات ({videos.length}) — اسحب لإعادة الترتيب
              </p>
              <div className="flex flex-wrap gap-3">
                {videos.map((vid, idx) => (
                  <div
                    key={`vid-${idx}-${vid.slice(-20)}`}
                    draggable
                    onDragStart={(e) => handleVideoDragStart(e, idx)}
                    onDragEnd={handleVideoDragEnd}
                    onDragOver={(e) => handleVideoDragOver(e, idx)}
                    onDragLeave={() => setVideoDragOverIndex(null)}
                    onDrop={(e) => handleVideoDrop(e, idx)}
                    className={`relative group w-28 h-28 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                      videoDragOverIndex === idx && videoDragIndex !== idx
                        ? "ring-2 ring-purple-400 scale-105"
                        : ""
                    } ${videoDragIndex === idx ? "opacity-40" : ""}`}
                  >
                    <video
                      src={vid}
                      className="w-full h-full object-cover rounded-xl border border-white/[0.12]"
                      muted
                      draggable={false}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded">
                      فيديو
                    </div>

                    {/* Position badge */}
                    <span className="absolute top-1 right-1 bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold min-w-[20px] text-center">
                      {idx + 1}
                    </span>

                    {/* Drag handle */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3.5 h-3.5 text-white/70" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplacingIndex(idx);
                          setReplacingType("video");
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="استبدال"
                      >
                        <Replace className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteVideo(idx);
                        }}
                        className="p-1.5 bg-red-500/40 hover:bg-red-500/60 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline replace uploader for videos */}
              {replacingType === "video" && replacingIndex !== null && (
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <p className="text-[11px] text-purple-300 mb-2 font-medium">
                    استبدال الفيديو رقم {replacingIndex + 1}
                  </p>
                  <FileUpload
                    label={`استبدال الفيديو #${replacingIndex + 1}`}
                    accept="video/*"
                    onUpload={(url) => handleReplace(url, "video", replacingIndex)}
                  />
                  <button
                    onClick={() => {
                      setReplacingIndex(null);
                      setReplacingType(null);
                    }}
                    className="mt-2 text-[11px] text-white/50 hover:text-white transition-colors"
                  >
                    إلغاء الاستبدال
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Upload new media ──────────────────────────────────────────── */}
      <div className="bg-black/30 border border-white/[0.08] p-5 rounded-xl">
        <FileUpload
          label="رفع وسائط (صورة/فيديو)"
          accept="image/*,video/*"
          onUpload={handleNewUpload}
        />
      </div>
    </div>
  );
};

export default ImageOrderManager;
