"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FileImage, File, Video, Play } from "lucide-react";
import { toast } from "sonner";
import { PdfThumbnail } from "./PdfThumbnail";

const previewUrlCache = new Map<string, string>();

type AssetThumbnailProps = {
  assetId: string;
  mimeType: string;
  enabled?: boolean;
  className?: string;
  scale?: number;
};

type AssetKind = "Image" | "Video" | "PDF" | "Document" | "Other";

function getAssetKind(mimeType: string): AssetKind {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf") return "PDF";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "Document";
  }
  return "Other";
}

function getFallbackIcon(kind: AssetKind) {
  if (kind === "Image") return FileImage;
  if (kind === "Video") return Video;
  return FileText;
}

export function AssetThumbnail({
  assetId,
  mimeType,
  enabled = true,
  className,
  scale = 0.65,
}: AssetThumbnailProps) {
  const kind = useMemo(() => getAssetKind(mimeType), [mimeType]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(previewUrlCache.get(assetId) ?? null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    previewUrl ? "ready" : "idle",
  );

  useEffect(() => {
    if (!enabled || previewUrl || kind === "Document" || kind === "Other") return;
    let cancelled = false;

    const loadPreview = async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/assets/${assetId}/preview`);
        if (!response.ok) throw new Error("Could not load thumbnail.");
        const payload = (await response.json()) as { url: string };
        if (cancelled) return;
        previewUrlCache.set(assetId, payload.url);
        setPreviewUrl(payload.url);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        toast.error(error instanceof Error ? error.message : "Could not load thumbnail.");
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled, previewUrl, kind]);

  const Icon = getFallbackIcon(kind);

  if (kind === "PDF") {
    return <PdfThumbnail assetId={assetId} enabled={enabled} className={className} scale={scale} />;
  }

  return (
    <div className={className ?? "w-full h-full"}>
      <div className="relative w-full h-full bg-white overflow-hidden rounded-xl flex items-center justify-center">
        {kind === "Image" && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="File thumbnail"
            className="w-full h-full object-cover"
          />
        ) : kind === "Video" && previewUrl ? (
          <video
            src={previewUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-[#64748b] p-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center text-[#2563eb] shadow-sm">
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-xs text-center">
              {status === "loading" ? "Loading thumbnail…" : status === "error" ? "Preview unavailable" : "No thumbnail"}
            </div>
          </div>
        )}
        {kind === "Video" && previewUrl && status === "ready" && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full">
            Video
          </div>
        )}
      </div>
    </div>
  );
}
