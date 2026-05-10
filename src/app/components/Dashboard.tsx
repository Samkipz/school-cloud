"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Files, Upload, HardDrive, TrendingUp, FileText, Video, FileImage, Search, MoreVertical, Eye, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { PdfThumbnail } from "./PdfThumbnail";

const statsTemplate = [
  { label: "Total Files", icon: Files },
  { label: "Recent Uploads", icon: Upload },
  { label: "Storage Used", icon: HardDrive },
  { label: "Active Students", icon: TrendingUp },
];

type OverviewResponse = {
  actor: {
    fullName: string;
    learningAreas: { id: string; name: string }[];
  };
  stats: {
    totalFiles: number;
    recentUploads: number;
    storageBytes: number;
    totalStudents: number;
  };
  recentFiles: {
    id: string;
    title: string;
    mimeType: string;
    fileSizeBytes: number;
    createdAt: string;
    module: "portfolio" | "resources" | "media" | "tools";
    studentNames: string[];
    learningAreas: string[];
  }[];
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatRelativeTime = (dateString: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatModule = (module: OverviewResponse["recentFiles"][number]["module"]) => {
  switch (module) {
    case "portfolio":
      return "Portfolio";
    case "resources":
      return "Resources";
    case "media":
      return "Media";
    case "tools":
      return "Tools";
  }
};

export function Dashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; module: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch("/api/dashboard/overview");
        if (!response.ok) {
          throw new Error("Could not load dashboard data.");
        }
        const payload = (await response.json()) as OverviewResponse;
        setOverview(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load dashboard data.";
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const runtimeStats = useMemo(() => {
    return [
      {
        ...statsTemplate[0],
        value: (overview?.stats.totalFiles ?? 0).toLocaleString(),
        change: "Live",
      },
      {
        ...statsTemplate[1],
        value: (overview?.stats.recentUploads ?? 0).toLocaleString(),
        change: "7 days",
      },
      {
        ...statsTemplate[2],
        value: formatBytes(overview?.stats.storageBytes ?? 0),
        change: "Used",
      },
      {
        ...statsTemplate[3],
        value: (overview?.stats.totalStudents ?? 0).toLocaleString(),
        change: "Active",
      },
    ];
  }, [overview]);

  const openUploadPanel = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("schoolCloudOpenUpload"));
  };

  const quickAccessItems = useMemo(() => {
    if (!overview) return [];

    const recentFiles = overview.recentFiles;
    const areaCounts = overview.actor.learningAreas.reduce<Record<string, number>>((acc, area) => {
      acc[area.name] = 0;
      return acc;
    }, {});

    recentFiles.forEach((file) => {
      file.learningAreas.forEach((area) => {
        areaCounts[area] = (areaCounts[area] ?? 0) + 1;
      });
    });

    const areaItems = overview.actor.learningAreas.slice(0, 2).map((area) => ({
      label: area.name,
      description: `${areaCounts[area.name] ?? 0} recent files`,
      target: "/resources",
    }));

    const moduleItems = [
      { label: "Resources", module: "resources" as const, target: "/resources" },
      { label: "Media Library", module: "media" as const, target: "/media" },
    ].map((item) => ({
      label: item.label,
      description: `${recentFiles.filter((file) => file.module === item.module).length} recent`,
      target: item.target,
    }));

    return areaItems.length > 0 ? [...areaItems, ...moduleItems] : moduleItems;
  }, [overview]);

  const recentActivityItems = useMemo(() => {
    return (overview?.recentFiles ?? [])
      .slice(0, 4)
      .map((file) => ({
        id: file.id,
        title: file.title,
        subtitle: `${formatModule(file.module)} · ${file.learningAreas[0] ?? "General"}`,
        time: formatRelativeTime(file.createdAt),
      }));
  }, [overview]);

  const runtimeRecentFiles = useMemo(() => {
    return (overview?.recentFiles ?? []).map((file) => {
      const isVideo = file.mimeType.includes("video");
      const isImage = file.mimeType.includes("image");
      const isPdf = file.mimeType === "application/pdf";
      return {
        id: file.id,
        name: file.title,
        type: file.mimeType,
        size: formatBytes(file.fileSizeBytes),
        date: new Date(file.createdAt).toLocaleDateString(),
        tags: [...file.learningAreas, ...file.studentNames.map((s) => `Student: ${s}`)],
        thumbnail: isVideo ? "video" : isImage ? "image" : isPdf ? "pdf" : "document",
      };
    }); 
  }, [overview]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Welcome Message */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b] mb-1">
          Welcome back {overview?.actor.fullName?.split(" ")[0] ?? "Teacher"}.
        </h1>
        <p className="text-[#64748b] max-w-2xl">
          A focused, easy-to-use place for school files, student resources, and classroom media.
        </p>
        {isLoading && <p className="text-xs text-[#94a3b8] mt-2">Loading dashboard data...</p>}
        {loadError && <p className="text-xs text-[#ef4444] mt-2">{loadError}</p>}

        <div className="grid gap-3 sm:grid-cols-[1.8fr_auto] items-end mt-5">
          <div className="relative bg-white border border-[#e3e6ef] rounded-3xl overflow-hidden focus-within:ring-2 focus-within:ring-[#2563eb] transition-all">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search files, students, or subjects"
              value={searchQuery}
              onChange={async (event) => {
                const value = event.target.value;
                setSearchQuery(value);
                if (!value.trim()) {
                  setSearchResults([]);
                  return;
                }
                setIsSearching(true);
                const response = await fetch(`/api/search?q=${encodeURIComponent(value)}&limit=6`);
                setIsSearching(false);
                if (!response.ok) {
                  setSearchResults([]);
                  return;
                }
                const payload = (await response.json()) as {
                  data: { id: string; title: string; module: string }[];
                };
                setSearchResults(payload.data ?? []);
              }}
              className="w-full pl-14 pr-4 py-3 bg-transparent text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#e3e6ef] rounded-3xl shadow-lg z-20 overflow-hidden">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const path = item.module === "portfolio" ? "/portfolios" : `/${item.module}`;
                      router.push(path);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#f8f9fc] transition-colors"
                  >
                    <div className="text-sm font-medium text-[#1e293b]">{item.title}</div>
                    <div className="text-xs text-[#64748b] mt-1">{item.module}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openUploadPanel}
            className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#e3e6ef] bg-white px-4 py-3 text-sm font-medium text-[#1e293b] shadow-sm transition hover:shadow-md"
          >
            <Upload className="w-4 h-4 text-[#2563eb]" />
            Upload file
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {runtimeStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 border border-[#e3e6ef] hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-[#f8fafc] rounded-2xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-[#2563eb]" />
              </div>
              <span className="text-xs font-medium text-[#475569] bg-[#f1f5f9] px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-semibold text-[#1e293b] mb-1">{stat.value}</div>
            <div className="text-sm text-[#64748b]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e3e6ef] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3e6ef] flex items-center justify-between">
            <h2 className="font-semibold text-[#1e293b]">Recent Files</h2>
            <button className="text-sm text-[#2563eb] hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fc]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden sm:table-cell">
                    Size
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e6ef]">
                {runtimeRecentFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-[#e3e6ef]">
                          {file.thumbnail === "pdf" ? (
                            <PdfThumbnail assetId={file.id} enabled className="w-full h-full" scale={0.4} />
                          ) : file.thumbnail === "video" ? (
                            <Video className="w-5 h-5 text-[#f59e0b]" />
                          ) : file.thumbnail === "image" ? (
                            <FileImage className="w-5 h-5 text-[#2563eb]" />
                          ) : (
                            <FileText className="w-5 h-5 text-[#8b5cf6]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#1e293b] truncate">{file.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.map((tag) => (
                              <span key={tag} className="text-xs text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden md:table-cell">{file.type}</td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden sm:table-cell">{file.size}</td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden lg:table-cell">{file.date}</td>
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
                        <button
                          onClick={async () => {
                            const ok = window.confirm("Delete this file?");
                            if (!ok) return;
                            const response = await fetch(`/api/assets/${file.id}`, { method: "DELETE" });
                            if (!response.ok) {
                              toast.error("Could not delete file.");
                              return;
                            }
                            setOverview((prev) =>
                              prev
                                ? { ...prev, recentFiles: prev.recentFiles.filter((entry) => entry.id !== file.id) }
                                : prev,
                            );
                            toast.success("File deleted.");
                          }}
                          className="p-1.5 text-[#64748b] hover:text-[#ef4444] hover:bg-[#f1f5f9] rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {runtimeRecentFiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#94a3b8]">
                      No files yet. Use Upload to add your first asset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <h2 className="font-semibold text-[#1e293b] mb-4">Quick Access</h2>
          <div className="space-y-3">
            {quickAccessItems.length > 0 ? (
              quickAccessItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.target)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#f3f4f6] bg-[#fafafb] text-left transition hover:border-[#dbeafe] hover:bg-[#f8fafc]"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#1e293b]">{item.label}</div>
                    <div className="text-xs text-[#64748b] mt-1">{item.description}</div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-[#94a3b8]" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Quick access will appear once your first files are uploaded.
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mt-6 pt-6 border-t border-[#e3e6ef]">
            <h3 className="text-sm font-semibold text-[#1e293b] mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivityItems.length > 0 ? (
                recentActivityItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1e293b] font-medium truncate">{item.title}</p>
                      <p className="text-xs text-[#64748b] mt-1">{item.subtitle}</p>
                    </div>
                    <div className="text-xs text-[#94a3b8] whitespace-nowrap">{item.time}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                  Recent activity will show here after your first uploads.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

