"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const previewUrlCache = new Map<string, string>();
const PDFJS_CDN_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284";

type Props = {
  assetId: string;
  enabled?: boolean;
  className?: string;
  scale?: number;
};

export function PdfThumbnail({ assetId, enabled = true, className, scale = 0.6 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(previewUrlCache.get(assetId) ?? null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!enabled) return;
    if (previewUrl) return;

    let cancelled = false;
    setStatus("loading");
    fetch(`/api/assets/${assetId}/preview`)
      .then(async (res) => {
        if (!res.ok) throw new Error("preview url failed");
        const payload = (await res.json()) as { url: string };
        if (cancelled) return;
        previewUrlCache.set(assetId, payload.url);
        setPreviewUrl(payload.url);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled, previewUrl]);

  useEffect(() => {
    if (!enabled) return;
    if (!previewUrl) return;
    if (!canvasRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        const pdfjsLib = await import(`${PDFJS_CDN_BASE}/legacy/build/pdf.min.mjs`);
        setStatus("loading");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(previewUrl);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (cancelled) return;
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [enabled, previewUrl, scale]);

  const overlay = useMemo(() => {
    if (status === "error") return "Preview unavailable";
    if (status === "loading" || status === "idle") return "Loading...";
    return null;
  }, [status]);

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-white overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#64748b] bg-white/80">
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}

