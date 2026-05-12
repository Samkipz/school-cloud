"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FolderOpen, FileText, Video, FileImage, Download, Share2, Star, Eye, Search, Upload, Calendar, Users, School } from "lucide-react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { AssetThumbnail } from "./AssetThumbnail";
import { UploadModal } from "./UploadModal";
import { predefinedStaffResourceFolders } from "@/lib/staff-resource-folders";

type ResourceApiRow = {
  id: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  description: string | null;
  approvalStatus: "raw" | "approved" | "rejected";
  tags: string[];
};

const FOLDER_TAG_PREFIX = "folder:";

const getFileIcon = (type: string) => {
  switch (type) {
    case "Folder":
      return { icon: FolderOpen, bg: "bg-[#fef3c7]", color: "text-[#f59e0b]" };
    case "Video":
      return { icon: Video, bg: "bg-[#fef3c7]", color: "text-[#f59e0b]" };
    case "Image":
      return { icon: FileImage, bg: "bg-[#dbeafe]", color: "text-[#2563eb]" };
    default:
      return { icon: FileText, bg: "bg-[#ede9fe]", color: "text-[#8b5cf6]" };
  }
};

const folderStyles: Record<string, { icon: typeof FolderOpen; bg: string; color: string }> = {
  "Schedules & timetables": { icon: Calendar, bg: "bg-[#E6F1FB]", color: "text-[#185FA5]" },
  "Duty rosters": { icon: Users, bg: "bg-[#FAEEDA]", color: "text-[#854F0B]" },
  "Class documents": { icon: School, bg: "bg-[#E1F5EE]", color: "text-[#0F6E56]" },
  Administration: { icon: FileText, bg: "bg-[#EEEDFE]", color: "text-[#534AB7]" },
};

const categorizeResource = (title: string, description: string | null) => {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (text.includes("timetable") || text.includes("schedule") || text.includes("programme") || text.includes("calendar")) {
    return "Schedules & timetables";
  }
  if (text.includes("roster") || text.includes("duty") || text.includes("prefect") || text.includes("dorm")) {
    return "Duty rosters";
  }
  if (text.includes("class") || text.includes("grade") || text.includes("form") || text.includes("lesson")) {
    return "Class documents";
  }
  return "Administration";
};

const getFolderStyle = (name: string) => {
  return folderStyles[name] ?? { icon: FileText, bg: "bg-[#f8fafc]", color: "text-[#475569]" };
};

const getTagBadgeStyles = (tag: string) => {
  const normalized = tag.toLowerCase();
  if (normalized === "urgent") return "bg-[#fee2e2] text-[#b91c1c]";
  if (normalized === "important") return "bg-[#ede9ff] text-[#5b21b6]";
  if (normalized === "new") return "bg-[#dbeafe] text-[#1d4ed8]";
  return "bg-[#f1f5f9] text-[#475569]";
};

export function StaffResources() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [apiResources, setApiResources] = useState<ResourceApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/resources");
      if (!response.ok) {
        throw new Error("Could not load staff resources.");
      }
      const payload = (await response.json()) as { data?: ResourceApiRow[] };
      setApiResources(payload.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load staff resources.";
      setApiResources([]);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const runtimeResources = useMemo(() => {
    return apiResources.map((item) => {
      const folderTag = item.tags.find((tag) => tag.startsWith(FOLDER_TAG_PREFIX));
      const folder = folderTag ? folderTag.replace(FOLDER_TAG_PREFIX, "") : categorizeResource(item.title, item.description);
      const extraTags = item.tags.filter((tag) => !tag.startsWith(FOLDER_TAG_PREFIX));
      const createdAt = new Date(item.createdAt);
      return {
        id: item.id,
        name: item.title,
        type: item.mimeType.includes("video")
          ? "Video"
          : item.mimeType.includes("image")
          ? "Image"
          : "Document",
        mimeType: item.mimeType,
        size: `${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        folder,
        extraTags,
        lastModified: createdAt.toLocaleDateString(),
        createdAt,
        approvalStatus: item.approvalStatus,
        downloads: 0,
        isNew: createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    });
  }, [apiResources]);

  const stats = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const totalFiles = runtimeResources.length;
    const thisTerm = runtimeResources.filter((r) => r.createdAt >= threeMonthsAgo).length;
    const announcements = 5; // hardcoded for now
    const pendingUploads = runtimeResources.filter((r) => r.approvalStatus === "raw").length;
    return { totalFiles, thisTerm, announcements, pendingUploads };
  }, [runtimeResources]);

  const folderData = useMemo(() => {
    const folderNames = new Set([...predefinedStaffResourceFolders, ...runtimeResources.map((r) => r.folder)]);
    return Array.from(folderNames).map((name) => {
      const resources = runtimeResources.filter((resource) => resource.folder === name);
      const latest = [...resources].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return {
        name,
        count: resources.length,
        latest,
        ...getFolderStyle(name),
      };
    });
  }, [runtimeResources]);

  const filteredResources = useMemo(() => {
    return runtimeResources.filter((resource) => {
      const matchesQuery = query.trim().length === 0 ? true : resource.name.toLowerCase().includes(query.toLowerCase());
      const matchesFolder = selectedFolder ? resource.folder === selectedFolder : true;
      return matchesQuery && matchesFolder;
    });
  }, [query, runtimeResources, selectedFolder]);

  const announcements = [
    {
      text: "Mid-term exams begin Monday 19th May. All teachers to submit revision schedules by Friday.",
      date: "Posted 9 May 2026 · Deputy Principal",
      color: "#378ADD",
    },
    {
      text: "Updated remedial timetable for evening session (6:30 pm – 7:30 pm) now available under Schedules.",
      date: "Posted 7 May 2026 · Academic Office",
      color: "#1D9E75",
    },
    {
      text: "Dorm masters are reminded to submit night prep attendance registers by 10 pm daily.",
      date: "Posted 5 May 2026 · Dean of Students",
      color: "#BA7517",
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Topbar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Staff Resources</h1>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch md:items-center w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-[#e3e6ef] rounded-lg px-3 py-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-[#94a3b8]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files..."
              className="flex-1 border-none outline-none text-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1d4ed8] transition-colors w-full sm:w-auto" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#e3e6ef] p-4">
            <div className="text-sm text-[#64748b] mb-1">Total files</div>
            <div className="text-2xl font-semibold text-[#1e293b]">{stats.totalFiles}</div>
          </div>
          <div className="bg-white rounded-lg border border-[#e3e6ef] p-4">
            <div className="text-sm text-[#64748b] mb-1">This term</div>
            <div className="text-2xl font-semibold text-[#1e293b]">{stats.thisTerm}</div>
          </div>
          <div className="bg-white rounded-lg border border-[#e3e6ef] p-4">
            <div className="text-sm text-[#64748b] mb-1">Announcements</div>
            <div className="text-2xl font-semibold text-[#1e293b]">{stats.announcements}</div>
          </div>
          <div className="bg-white rounded-lg border border-[#e3e6ef] p-4">
            <div className="text-sm text-[#64748b] mb-1">Pending uploads</div>
            <div className="text-2xl font-semibold text-[#1e293b]">{stats.pendingUploads}</div>
          </div>
        </div>
      )}

      {/* Noticeboard */}
      {!selectedFolder && (
        <div className="bg-white rounded-lg border border-[#e3e6ef] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1e293b]">Noticeboard</h2>
            <span className="text-sm text-[#2563eb] cursor-pointer hover:underline">See all →</span>
          </div>
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: announcement.color }}></div>
                <div>
                  <p className="text-sm text-[#1e293b] mb-1">{announcement.text}</p>
                  <p className="text-xs text-[#64748b]">{announcement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Grid or Folder View */}
      {selectedFolder ? (
        <div className="bg-white rounded-lg border border-[#e3e6ef] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1e293b]">{selectedFolder}</h2>
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-sm text-[#2563eb] hover:underline"
            >
              ← Back to folders
            </button>
          </div>
          <div className="space-y-3">
            {filteredResources.map((resource) => {
              const { icon: Icon, color } = getFileIcon(resource.type);
              return (
                <div key={resource.id} className="flex items-center justify-between p-3 border border-[#f1f5f9] rounded-lg hover:bg-[#f8fafc] transition-colors cursor-pointer" onClick={() => setPreviewAssetId(resource.id)}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <p className="font-medium text-[#1e293b]">{resource.name}</p>
                      <p className="text-sm text-[#64748b]">{resource.size} • {resource.lastModified}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resource.isNew && (
                      <span className="bg-[#E1F5EE] text-[#0F6E56] text-xs px-2 py-0.5 rounded-full">New</span>
                    )}
                    <Download className="w-4 h-4 text-[#64748b] hover:text-[#2563eb] cursor-pointer" />
                    <Share2 className="w-4 h-4 text-[#64748b] hover:text-[#2563eb] cursor-pointer" />
                  </div>
                </div>
              );
            })}
            {filteredResources.length === 0 && (
              <div className="text-center py-8 text-[#94a3b8]">No files found in this folder.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {folderData.map((folder) => (
            <div key={folder.name} className="bg-white rounded-lg border border-[#e3e6ef] p-5 cursor-pointer hover:border-[#2563eb]/20 transition-colors" onClick={() => setSelectedFolder(folder.name)}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 ${folder.bg} rounded-lg flex items-center justify-center`}>
                  <folder.icon className={`w-6 h-6 ${folder.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e293b]">{folder.name}</h3>
                  <p className="text-sm text-[#64748b]">{folder.count} documents</p>
                </div>
              </div>
              <div className="space-y-2">
                {folder.latest ? (
                  <div className="flex items-center justify-between gap-2 text-sm text-[#64748b] py-1 border-t border-[#f1f5f9] first:border-t-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{folder.latest.name}</span>
                    </div>
                    {folder.latest.isNew && (
                      <span className="bg-[#E1F5EE] text-[#0F6E56] text-xs px-2 py-0.5 rounded-full flex-shrink-0">New</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#94a3b8] py-2">No documents yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AssetPreviewModal
        open={Boolean(previewAssetId)}
        onOpenChange={(open) => {
          if (!open) setPreviewAssetId(null);
        }}
        assetId={previewAssetId}
      />

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultModule="resources"
        onUploaded={() => {
          // Refresh the resources
          fetchResources();
        }}
      />
    </div>
  );
}
