"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, FileText, Video, FileImage, Download, Share2, Star, Eye } from "lucide-react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { AssetThumbnail } from "./AssetThumbnail";

type ResourceApiRow = {
  id: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  description: string | null;
};

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

export function StaffResources() {
  const [apiResources, setApiResources] = useState<ResourceApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("All");
  const [query, setQuery] = useState("");
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);

  useEffect(() => {
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

    fetchResources();
  }, []);

  const runtimeResources = useMemo(() => {
    return apiResources.map((item) => ({
      id: item.id,
      name: item.title,
      type: item.mimeType.includes("video")
        ? "Video"
        : item.mimeType.includes("image")
        ? "Image"
        : "Document",
      mimeType: item.mimeType,
      size: `${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      category: item.description ?? "Resources",
      lastModified: new Date(item.createdAt).toLocaleDateString(),
      downloads: 0,
    }));
  }, [apiResources]);

  const runtimeCategories = useMemo(() => {
    const grouped = runtimeResources.reduce<Record<string, number>>((acc, resource) => {
      acc[resource.category] = (acc[resource.category] ?? 0) + 1;
      return acc;
    }, {});

    const colors = [
      "from-[#2563eb] to-[#3b82f6]",
      "from-[#10b981] to-[#34d399]",
      "from-[#8b5cf6] to-[#a78bfa]",
      "from-[#f59e0b] to-[#fbbf24]",
    ];

    return Object.entries(grouped).map(([name, count], index) => ({
      name,
      count,
      color: colors[index % colors.length],
    }));
  }, [apiResources, runtimeResources]);

  const filteredResources = useMemo(() => {
    return runtimeResources.filter((resource) => {
      const matchesType = selectedType === "All" ? true : resource.type === selectedType;
      const matchesQuery = query.trim().length === 0 ? true : resource.name.toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [query, runtimeResources, selectedType]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b] mb-1">Staff Resources</h1>
        <p className="text-[#64748b]">Access teaching materials, templates, and training resources</p>
        {isLoading && <p className="text-xs text-[#94a3b8] mt-2">Loading resources...</p>}
        {loadError && <p className="text-xs text-[#ef4444] mt-2">{loadError}</p>}
      </div>

      {/* Categories Grid */}
      <div className="bg-white rounded-xl border border-[#e3e6ef] p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resources..."
          className="flex-1 px-3 py-2 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg"
        />
        <select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
          className="px-3 py-2 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg"
        >
          <option>All</option>
          <option>Document</option>
          <option>Video</option>
          <option>Image</option>
        </select>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {runtimeCategories.map((category) => (
          <button
            key={category.name}
            className="bg-white rounded-xl border border-[#e3e6ef] p-5 hover:shadow-lg hover:border-[#2563eb]/20 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center`}>
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-[#94a3b8] bg-[#f8f9fc] px-2 py-1 rounded-full">
                {category.count} files
              </span>
            </div>
            <h3 className="font-semibold text-[#1e293b] group-hover:text-[#2563eb] transition-colors">
              {category.name}
            </h3>
          </button>
        ))}
        {runtimeCategories.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-4 bg-white rounded-xl border border-[#e3e6ef] p-5 text-sm text-[#94a3b8]">
            No categories yet. Categories are generated from resource descriptions.
          </div>
        )}
      </div>

      {/* Popular Resources */}
      <div className="bg-white rounded-xl border border-[#e3e6ef] overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#e3e6ef] flex items-center justify-between">
          <h2 className="font-semibold text-[#1e293b]">Popular Resources</h2>
          <button className="text-sm text-[#2563eb] hover:underline">View All</button>
        </div>

        <div className="divide-y divide-[#e3e6ef]">
          {filteredResources.map((resource, index) => {
            const { icon: Icon, bg, color } = getFileIcon(resource.type);
            const isPdf = resource.mimeType === "application/pdf";
            return (
              <div
                key={resource.id}
                className="px-5 py-4 hover:bg-[#f8f9fc] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${bg} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                    <AssetThumbnail
                      assetId={resource.id}
                      mimeType={resource.mimeType}
                      enabled={index < 6}
                      className="w-full h-full"
                      scale={0.45}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#1e293b] mb-1 truncate group-hover:text-[#2563eb] transition-colors">
                      {resource.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#94a3b8]">
                      <span className="flex items-center gap-1">
                        <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2 py-0.5 rounded">
                          {resource.category}
                        </span>
                      </span>
                      <span>{resource.size}</span>
                      <span>{resource.downloads} downloads</span>
                      <span className="hidden sm:inline">{resource.lastModified}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] rounded-lg transition-all">
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewAssetId(resource.id)}
                      className="p-2 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/assets/${resource.id}/download`);
                        if (!response.ok) {
                          toast.error("Could not generate download link.");
                          return;
                        }
                        const payload = (await response.json()) as { url: string };
                        window.open(payload.url, "_blank", "noopener,noreferrer");
                      }}
                      className="p-2 text-[#64748b] hover:text-[#10b981] hover:bg-[#f1f5f9] rounded-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-[#64748b] hover:text-[#8b5cf6] hover:bg-[#f1f5f9] rounded-lg transition-all">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredResources.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">
              No staff resources yet. Upload files in this module to populate this section.
            </div>
          )}
        </div>
      </div>

      <AssetPreviewModal
        open={Boolean(previewAssetId)}
        onOpenChange={(open) => {
          if (!open) setPreviewAssetId(null);
        }}
        assetId={previewAssetId}
      />

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <h3 className="font-semibold text-[#1e293b] mb-4">Quick Links</h3>
          <div className="space-y-2">
            <a
              href="#"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f8f9fc] transition-all group"
            >
              <span className="text-[#64748b] group-hover:text-[#2563eb]">IT Support Portal</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f8f9fc] transition-all group"
            >
              <span className="text-[#64748b] group-hover:text-[#2563eb]">HR Resources</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f8f9fc] transition-all group"
            >
              <span className="text-[#64748b] group-hover:text-[#2563eb]">Staff Directory</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f8f9fc] transition-all group"
            >
              <span className="text-[#64748b] group-hover:text-[#2563eb]">Calendar & Events</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e3e6ef] p-5">
          <h3 className="font-semibold text-[#1e293b] mb-4">Recent Updates</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-[#2563eb] rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-[#1e293b] mb-1">New curriculum guidelines published</p>
                <p className="text-xs text-[#94a3b8]">2 days ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-[#10b981] rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-[#1e293b] mb-1">Updated lesson plan templates available</p>
                <p className="text-xs text-[#94a3b8]">5 days ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-[#f59e0b] rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-[#1e293b] mb-1">Professional development workshop materials added</p>
                <p className="text-xs text-[#94a3b8]">1 week ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
