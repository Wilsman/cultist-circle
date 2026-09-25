/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { SCAN_LIMITS } from "@/lib/stash-scan/types";

export interface QueuedImage {
  id: string;
  file: File;
  url: string;
}

interface UploadZoneProps {
  images: QueuedImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function UploadZone({ images, onAdd, onRemove, disabled }: UploadZoneProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || disabled) return;
      if (files.length) onAdd([...files]);
    },
    [disabled, onAdd],
  );

  // Screenshots usually live on the clipboard (Print Screen, Snipping Tool).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const full = images.length >= SCAN_LIMITS.maxImages;

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging
            ? "border-cyan-300/60 bg-cyan-300/[0.06]"
            : "border-white/15 bg-black/20 hover:border-white/25 hover:bg-white/[0.03]"
        }`}
      >
        <ImagePlus className="h-7 w-7 text-slate-400" strokeWidth={1.6} />
        <span className="text-sm font-medium text-slate-200">
          {full
            ? t("Screenshot limit reached")
            : t("Drop screenshots here, click to choose, or paste with Ctrl+V or Cmd+V")}
        </span>
        <span className="text-xs text-slate-500">
          {t("Stash, containers or scav case. PNG, JPEG or WebP, up to {count} at a time; each under {size} MB.", {
            count: SCAN_LIMITS.maxImages,
            size: Math.round(SCAN_LIMITS.maxSourceBytes / 1024 / 1024),
          })}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={SCAN_LIMITS.acceptedTypes.join(",")}
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((image) => {
            const mb = image.file.size / 1024 / 1024;
            const sizeLabel = mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
            return (
              <li
                key={image.id}
                title={`${image.file.name} · ${sizeLabel}`}
                className="group relative w-28 overflow-hidden rounded-lg border border-white/10 bg-black/40"
              >
                <div className="relative h-20 w-full overflow-hidden">
                  <img src={image.url} alt={image.file.name} className="h-full w-full object-cover" />
                  {disabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] text-slate-300">
                      {t("Scanning...")}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(image.id)}
                    disabled={disabled}
                    aria-label={t("Remove {name}", { name: image.file.name })}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-slate-300 opacity-90 hover:text-white disabled:hidden"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="truncate px-1.5 pt-1 text-[11px] text-slate-300">{image.file.name}</div>
                <div className="px-1.5 pb-1.5 text-[10px] tabular-nums text-slate-500">{sizeLabel}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
