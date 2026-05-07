"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid, List, Filter, FileText, Video, FileImage, File, MoreVertical, Eye, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { PdfThumbnail } from "./PdfThumbnail";

type ToolsApiRow = {
  id: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  description: string | null;
};

export function AcademicTools() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [apiFiles, setApiFiles] = useState<ToolsApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch("/api/tools");
        if (!response.ok) {
          throw new Error("Could not load academic tools.");
        }
        const payload = (await response.json()) as { data?: ToolsApiRow[] };
        setApiFiles(payload.data ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load academic tools.";
        setApiFiles([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTools();
  }, []);

  const runtimeFiles = useMemo(() => {
    return apiFiles.map((item) => ({
      id: item.id,
      name: item.title,
      type: item.mimeType.includes("video")
        ? "Video"
        : item.mimeType.includes("image")
        ? "Image"
        : item.mimeType.includes("pdf")
        ? "PDF"
        : "Document",
      mimeType: item.mimeType,
      size: `${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date(item.createdAt).toLocaleDateString(),
      grade: "All Grades",
      subject: item.description ?? "General",
    }));
  }, [apiFiles]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "Video":
        return { icon: Video, bg: "bg-[#fef3c7]", color: "text-[#f59e0b]" };
      case "Image":
        return { icon: FileImage, bg: "bg-[#dbeafe]", color: "text-[#2563eb]" };
      case "PDF":
      case "Document":
        return { icon: FileText, bg: "bg-[#ede9fe]", color: "text-[#8b5cf6]" };
      default:
        return { icon: File, bg: "bg-[#f1f5f9]", color: "text-[#64748b]" };
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b] mb-1">Academic Tools</h1>
        <p className="text-[#64748b]">Manage and organize your educational resources</p>
        {isLoading && <p className="text-xs text-[#94a3b8] mt-2">Loading academic tools...</p>}
        {loadError && <p className="text-xs text-[#ef4444] mt-2">{loadError}</p>}
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white rounded-xl border border-[#e3e6ef] p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#64748b]" />
              <span className="text-sm font-medium text-[#64748b]">Filters:</span>
            </div>

            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-1.5 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option>All Grades</option>
              <option>Grade 9</option>
              <option>Grade 10</option>
              <option>Grade 11</option>
              <option>Grade 12</option>
            </select>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option>All Subjects</option>
              <option>Math</option>
              <option>Science</option>
              <option>English</option>
              <option>History</option>
              <option>Geography</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option>All Types</option>
              <option>PDF</option>
              <option>Video</option>
              <option>Image</option>
              <option>Document</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-[#f8f9fc] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#2563eb] shadow-sm"
                  : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-all ${
                viewMode === "list"
                  ? "bg-white text-[#2563eb] shadow-sm"
                  : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {runtimeFiles.map((file, index) => {
            const { icon: Icon, bg, color } = getFileIcon(file.type);
            const isPdf = file.mimeType === "application/pdf";
            return (
              <div
                key={file.id}
                className="bg-white rounded-xl border border-[#e3e6ef] p-4 hover:shadow-lg hover:border-[#2563eb]/20 transition-all group cursor-pointer"
              >
                <div className="relative mb-3">
                  <div className={`w-full aspect-square ${bg} rounded-lg flex items-center justify-center overflow-hidden`}>
                    {isPdf ? (
                      <PdfThumbnail assetId={file.id} enabled={index < 8} className="w-full h-full" scale={0.55} />
                    ) : (
                      <Icon className={`w-12 h-12 ${color}`} />
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-[#f8f9fc]">
                      <MoreVertical className="w-4 h-4 text-[#64748b]" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-[#1e293b] mb-2 truncate">{file.name}</h3>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs bg-[#dbeafe] text-[#2563eb] px-2 py-0.5 rounded">
                    {file.grade}
                  </span>
                  <span className="text-xs bg-[#d1fae5] text-[#10b981] px-2 py-0.5 rounded">
                    {file.subject}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-3">
                  <span>{file.type}</span>
                  <span>{file.size}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#e3e6ef]">
                  <button
                    onClick={() => setPreviewAssetId(file.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-[#2563eb] hover:bg-[#f1f5f9] rounded transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={async () => {
                      const response = await fetch(`/api/assets/${file.id}/download`);
                      if (!response.ok) {
                        toast.error("Could not generate download link.");
                        return;
                      }
                      const payload = (await response.json()) as { url: string };
                      window.open(payload.url, "_blank", "noopener,noreferrer");
                    }}
                    className="p-1.5 text-[#64748b] hover:text-[#10b981] hover:bg-[#f1f5f9] rounded transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-[#64748b] hover:text-[#8b5cf6] hover:bg-[#f1f5f9] rounded transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {runtimeFiles.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#e3e6ef] p-8 text-center text-sm text-[#94a3b8]">
              No academic tools yet. Upload files in this module to populate this section.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e3e6ef] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f8f9fc]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden md:table-cell">
                  Grade
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden lg:table-cell">
                  Subject
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden sm:table-cell">
                  Size
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden xl:table-cell">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e6ef]">
              {runtimeFiles.map((file) => {
                const { icon: Icon, bg, color } = getFileIcon(file.type);
                return (
                  <tr key={file.id} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                          <div className="font-medium text-[#1e293b]">{file.name}</div>
                          <div className="text-sm text-[#94a3b8]">{file.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden md:table-cell">{file.grade}</td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden lg:table-cell">{file.subject}</td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden sm:table-cell">{file.size}</td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden xl:table-cell">{file.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewAssetId(file.id)}
                          className="p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] rounded transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const response = await fetch(`/api/assets/${file.id}/download`);
                            if (!response.ok) {
                              toast.error("Could not generate download link.");
                              return;
                            }
                            const payload = (await response.json()) as { url: string };
                            window.open(payload.url, "_blank", "noopener,noreferrer");
                          }}
                          className="p-1.5 text-[#64748b] hover:text-[#10b981] hover:bg-[#f1f5f9] rounded transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {runtimeFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#94a3b8]">
                    No academic tools found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AssetPreviewModal
        open={Boolean(previewAssetId)}
        onOpenChange={(open) => {
          if (!open) setPreviewAssetId(null);
        }}
        assetId={previewAssetId}
      />
    </div>
  );
}
