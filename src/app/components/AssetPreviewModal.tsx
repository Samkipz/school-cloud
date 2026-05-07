"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

type AssetDetails = {
  id: string;
  title: string;
  description: string | null;
  mimeType: string;
  storageKey: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
};

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}
function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}
function isPdf(mimeType: string) {
  return mimeType === "application/pdf";
}

function isOfficeDoc(mimeType: string) {
  return (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
}

export function AssetPreviewModal({ open, onOpenChange, assetId }: Props) {
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfThumbError, setPdfThumbError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !assetId) return;

    const load = async () => {
      setIsLoading(true);
      setAsset(null);
      setSignedUrl(null);
      try {
        const assetRes = await fetch(`/api/assets/${assetId}`);
        if (!assetRes.ok) {
          throw new Error("Could not load file details.");
        }
        const assetPayload = (await assetRes.json()) as { data: AssetDetails };
        setAsset(assetPayload.data);

        const urlRes = await fetch(`/api/assets/${assetId}/preview`);
        if (!urlRes.ok) {
          throw new Error("Could not generate preview link.");
        }
        const urlPayload = (await urlRes.json()) as { url: string };
        setSignedUrl(urlPayload.url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load preview.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [assetId, open]);

  const previewKind = useMemo(() => {
    if (!asset) return "unknown";
    if (isImage(asset.mimeType)) return "image";
    if (isVideo(asset.mimeType)) return "video";
    if (isPdf(asset.mimeType)) return "pdf";
    if (isOfficeDoc(asset.mimeType)) return "office";
    return "file";
  }, [asset]);

  useEffect(() => {
    if (!open) return;
    if (!asset || !signedUrl) return;
    if (!isPdf(asset.mimeType)) return;
    if (!canvasRef.current) return;

    const renderThumb = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        setPdfThumbError(null);
        // Worker setup for bundlers
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        const loadingTask = pdfjsLib.getDocument(signedUrl);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
      } catch (e) {
        setPdfThumbError("PDF thumbnail could not be rendered.");
      }
    };

    renderThumb();
  }, [asset, open, signedUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{asset?.title ?? "Preview"}</DialogTitle>
          <DialogDescription>{asset?.description ?? "File preview"}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-[#e3e6ef] bg-[#f8f9fc] overflow-hidden">
          {isLoading && <div className="p-6 text-sm text-[#64748b]">Loading preview...</div>}

          {!isLoading && asset && signedUrl && previewKind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signedUrl} alt={asset.title} className="w-full h-auto max-h-[70vh] object-contain bg-white" />
          )}

          {!isLoading && asset && signedUrl && previewKind === "video" && (
            <video src={signedUrl} controls className="w-full max-h-[70vh] bg-black" />
          )}

          {!isLoading && asset && signedUrl && previewKind === "pdf" && (
            <div className="bg-white">
              <div className="p-4 border-b border-[#e3e6ef]">
                <div className="text-sm font-medium text-[#1e293b] mb-2">Preview (first page)</div>
                {pdfThumbError ? (
                  <div className="text-sm text-[#94a3b8]">{pdfThumbError}</div>
                ) : (
                  <canvas ref={canvasRef} className="w-full h-auto border border-[#e3e6ef] rounded" />
                )}
              </div>
              <iframe title={asset.title} src={signedUrl} className="w-full h-[55vh] bg-white" />
            </div>
          )}

          {!isLoading && asset && signedUrl && previewKind === "office" && (
            <iframe
              title={asset.title}
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
              className="w-full h-[70vh] bg-white"
            />
          )}

          {!isLoading && asset && signedUrl && previewKind === "file" && (
            <div className="p-6 bg-white">
              <div className="text-sm text-[#64748b] mb-2">{asset.mimeType}</div>
              <div className="text-[#1e293b]">Preview is not available for this file type. Use Download.</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-md border border-[#e3e6ef] text-[#1e293b]"
          >
            Close
          </button>
          {assetId && (
            <button
              type="button"
              onClick={async () => {
                const response = await fetch(`/api/assets/${assetId}/download`);
                if (!response.ok) {
                  toast.error("Could not generate download link.");
                  return;
                }
                const payload = (await response.json()) as { url: string };
                window.open(payload.url, "_blank", "noopener,noreferrer");
              }}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Download
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

