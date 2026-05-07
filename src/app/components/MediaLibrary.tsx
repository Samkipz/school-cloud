"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Grid, List, Filter, Download, Share2, Heart, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { PdfThumbnail } from "./PdfThumbnail";

const mediaItems = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1643216755260-cb0bc30473c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Science Lab Session",
    tags: ["Events", "Grade 10", "Science"],
    date: "Apr 28, 2026",
    type: "image",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1573894997713-de07a124df43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Meditation Class",
    tags: ["Events", "Wellness", "Marketing Approved"],
    date: "Apr 27, 2026",
    type: "image",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "English Literature Class",
    tags: ["Events", "Grade 11", "Marketing Approved"],
    date: "Apr 26, 2026",
    type: "image",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1573894999291-f440466112cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Student Reading",
    tags: ["Events", "Library", "Marketing Approved"],
    date: "Apr 25, 2026",
    type: "image",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1631885661110-aa12f8b42b25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Modern Classroom",
    tags: ["Facilities", "Marketing Approved"],
    date: "Apr 24, 2026",
    type: "image",
  },
  {
    id: 6,
    url: "https://images.unsplash.com/photo-1563394867331-e687a36112fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Group Discussion",
    tags: ["Events", "Grade 12", "Social"],
    date: "Apr 23, 2026",
    type: "image",
  },
  {
    id: 7,
    url: "https://images.unsplash.com/photo-1643216710579-a7500b9f2407?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw3fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Group Photo Day",
    tags: ["Events", "Marketing Approved"],
    date: "Apr 22, 2026",
    type: "image",
  },
  {
    id: 8,
    url: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Teacher Student Interaction",
    tags: ["Events", "Teaching", "Marketing Approved"],
    date: "Apr 21, 2026",
    type: "image",
  },
  {
    id: 9,
    url: "https://images.unsplash.com/photo-1654366698665-e6d611a9aaa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw5fHxzY2hvb2wlMjBzdHVkZW50cyUyMGNsYXNzcm9vbXxlbnwxfHx8fDE3Nzc1Nzg2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Computer Lab",
    tags: ["Facilities", "Technology"],
    date: "Apr 20, 2026",
    type: "image",
  },
  {
    id: 10,
    url: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxMHx8c2Nob29sJTIwc3R1ZGVudHMlMjBjbGFzc3Jvb218ZW58MXx8fHwxNzc3NTc4Njg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Outdoor Learning",
    tags: ["Events", "Sports", "Marketing Approved"],
    date: "Apr 19, 2026",
    type: "image",
  },
  {
    id: 11,
    url: "https://images.unsplash.com/photo-1581726707445-75cbe4efc586?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxMXx8c2Nob29sJTIwc3R1ZGVudHMlMjBjbGFzc3Jvb218ZW58MXx8fHwxNzc3NTc4Njg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Focused Study Time",
    tags: ["Events", "Grade 9", "Library"],
    date: "Apr 18, 2026",
    type: "image",
  },
  {
    id: 12,
    url: "https://images.unsplash.com/photo-1643386581833-6ca5e552255c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxMnx8c2Nob29sJTIwc3R1ZGVudHMlMjBjbGFzc3Jvb218ZW58MXx8fHwxNzc3NTc4Njg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Empty Classroom Setup",
    tags: ["Facilities", "Marketing Approved"],
    date: "Apr 17, 2026",
    type: "image",
  },
];

type MediaApiRow = {
  id: string;
  title: string;
  mimeType: string;
  createdAt: string;
  approvalStatus: "raw" | "approved" | "rejected";
  description: string | null;
  publicUrl: string | null;
  tags?: string[];
};

export function MediaLibrary() {
  const [selectedTag, setSelectedTag] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<"all" | "raw" | "approved" | "rejected">("all");
  const [apiMediaItems, setApiMediaItems] = useState<MediaApiRow[]>([]);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch("/api/media");
        if (!response.ok) {
          throw new Error("Could not load media library.");
        }
        const payload = (await response.json()) as { data?: MediaApiRow[] };
        setApiMediaItems(payload.data ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load media library.";
        setApiMediaItems([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, []);

  useEffect(() => {
    // If media items aren't publicly readable, we still want real previews.
    // Fetch signed URLs for the first N thumbnails to avoid a large request fan-out.
    const hydrateThumbs = async () => {
      const first = apiMediaItems.slice(0, 24);
      const next: Record<string, string> = {};
      for (const item of first) {
        if (item.publicUrl) continue;
        try {
          const response = await fetch(`/api/assets/${item.id}/preview`);
          if (!response.ok) continue;
          const payload = (await response.json()) as { url: string };
          next[item.id] = payload.url;
        } catch {
          // ignore
        }
      }
      if (Object.keys(next).length > 0) {
        setThumbUrls((prev) => ({ ...prev, ...next }));
      }
    };

    if (apiMediaItems.length > 0) hydrateThumbs();
  }, [apiMediaItems]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const runtimeMediaItems = useMemo(() => {
    return apiMediaItems.map((item, index) => ({
      id: item.id,
      url: item.publicUrl ?? thumbUrls[item.id] ?? `https://picsum.photos/seed/${item.id}/1080/720`,
      title: item.title,
      tags: item.tags && item.tags.length > 0 ? item.tags : [],
      description: item.description,
      approvalStatus: item.approvalStatus,
      date: new Date(item.createdAt).toLocaleDateString(),
      type: item.mimeType.includes("video") ? "video" : "image",
      mimeType: item.mimeType,
    }));
  }, [apiMediaItems, thumbUrls]);

  const runtimeTags = useMemo(() => {
    const dynamicTags = new Set<string>(["All"]);
    for (const item of runtimeMediaItems) {
      for (const tag of item.tags) dynamicTags.add(tag);
      if (item.approvalStatus === "approved") dynamicTags.add("Marketing Approved");
    }
    return Array.from(dynamicTags);
  }, [runtimeMediaItems]);

  const filteredMedia = runtimeMediaItems.filter((item) => {
    const matchesTag = selectedTag === "All" ? true : item.tags.includes(selectedTag);
    const matchesApproval = selectedApproval === "all" ? true : item.approvalStatus === selectedApproval;
    return matchesTag && matchesApproval;
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b] mb-1">Media Library</h1>
        <p className="text-[#64748b]">Browse and manage your school's photo and video collection</p>
        {isLoading && <p className="text-xs text-[#94a3b8] mt-2">Loading media library...</p>}
        {loadError && <p className="text-xs text-[#ef4444] mt-2">{loadError}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <div className="text-sm text-[#64748b] mb-1">Total Media</div>
          <div className="text-2xl font-semibold text-[#1e293b]">{runtimeMediaItems.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <div className="text-sm text-[#64748b] mb-1">Marketing Approved</div>
          <div className="text-2xl font-semibold text-[#1e293b]">
            {runtimeMediaItems.filter((m) => m.tags.includes("Marketing Approved")).length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <div className="text-sm text-[#64748b] mb-1">Favorites</div>
          <div className="text-2xl font-semibold text-[#1e293b]">{favorites.length}</div>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="bg-white rounded-xl border border-[#e3e6ef] p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#64748b]" />
          <span className="text-sm font-medium text-[#64748b]">Filter by tag:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {runtimeTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTag === tag
                  ? "bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white shadow-sm"
                  : "bg-[#f8f9fc] text-[#64748b] hover:bg-[#e3e6ef] hover:text-[#1e293b]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {(["all", "raw", "approved", "rejected"] as const).map((approval) => (
            <button
              key={approval}
              onClick={() => setSelectedApproval(approval)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                selectedApproval === approval ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"
              }`}
            >
              {approval === "all" ? "All approvals" : approval}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMedia.map((item, index) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-[#e3e6ef] overflow-hidden hover:shadow-lg hover:border-[#2563eb]/20 transition-all group"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-[#f8f9fc] overflow-hidden">
              {item.mimeType === "application/pdf" ? (
                <PdfThumbnail assetId={item.id} enabled={index < 8} className="w-full h-full" scale={0.55} />
              ) : (
                <ImageWithFallback
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2">
                  <button
                    onClick={() => setPreviewAssetId(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white text-[#1e293b] rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View</span>
                  </button>
                  <button
                    onClick={async () => {
                      const response = await fetch(`/api/assets/${item.id}/download`);
                      if (!response.ok) {
                        toast.error("Could not generate download link.");
                        return;
                      }
                      const payload = (await response.json()) as { url: string };
                      window.open(payload.url, "_blank", "noopener,noreferrer");
                    }}
                    className="p-2 bg-white/90 hover:bg-white text-[#1e293b] rounded-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/90 hover:bg-white text-[#1e293b] rounded-lg transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Favorite Button */}
              <button
                onClick={() => toggleFavorite(item.id)}
                className="absolute top-3 right-3 p-2 bg-white/90 rounded-lg hover:bg-white transition-all"
              >
                <Heart
                  className={`w-4 h-4 ${
                    favorites.includes(item.id)
                      ? "fill-[#ef4444] text-[#ef4444]"
                      : "text-[#64748b]"
                  }`}
                />
              </button>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-medium text-[#1e293b] mb-2 truncate">{item.title}</h3>

              <div className="flex flex-wrap gap-1 mb-3">
                {(item.approvalStatus === "approved"
                  ? ["Marketing Approved", ...item.tags]
                  : item.tags
                ).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-2 py-1 rounded ${
                      tag === "Marketing Approved"
                        ? "bg-[#d1fae5] text-[#10b981]"
                        : tag === "Events"
                        ? "bg-[#dbeafe] text-[#2563eb]"
                        : tag === "Sports"
                        ? "bg-[#fef3c7] text-[#f59e0b]"
                        : "bg-[#f1f5f9] text-[#64748b]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
                {(item.approvalStatus === "approved" ? item.tags.length + 1 : item.tags.length) > 3 && (
                  <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2 py-1 rounded">
                    +{(item.approvalStatus === "approved" ? item.tags.length + 1 : item.tags.length) - 3}
                  </span>
                )}
              </div>

              {item.description && (
                <div className="text-xs text-[#64748b] mb-2 line-clamp-2">{item.description}</div>
              )}
              <div className="text-xs text-[#94a3b8]">{item.date}</div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    const response = await fetch(`/api/assets/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ approvalStatus: "approved" }),
                    });
                    if (!response.ok) {
                      toast.error("Could not approve media.");
                      return;
                    }
                    setApiMediaItems((prev) =>
                      prev.map((row) => (row.id === item.id ? { ...row, approvalStatus: "approved" } : row)),
                    );
                    toast.success("Media approved for marketing.");
                  }}
                  className="text-xs px-2 py-1 rounded bg-[#d1fae5] text-[#10b981]"
                >
                  Approve
                </button>
                <button
                  onClick={async () => {
                    const response = await fetch(`/api/assets/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ approvalStatus: "rejected" }),
                    });
                    if (!response.ok) {
                      toast.error("Could not reject media.");
                      return;
                    }
                    setApiMediaItems((prev) =>
                      prev.map((row) => (row.id === item.id ? { ...row, approvalStatus: "rejected" } : row)),
                    );
                    toast.success("Media marked as rejected.");
                  }}
                  className="text-xs px-2 py-1 rounded bg-[#fee2e2] text-[#ef4444]"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AssetPreviewModal
        open={Boolean(previewAssetId)}
        onOpenChange={(open) => {
          if (!open) setPreviewAssetId(null);
        }}
        assetId={previewAssetId}
      />

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-12 text-center">
          <div className="w-16 h-16 bg-[#f8f9fc] rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <h3 className="font-semibold text-[#1e293b] mb-2">No media found</h3>
          <p className="text-[#64748b]">Try selecting a different tag filter</p>
        </div>
      )}
    </div>
  );
}
