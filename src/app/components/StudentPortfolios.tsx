"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Grid,
  List,
  Filter,
  FileText,
  Video,
  FileImage,
  File,
  ChevronRight,
  Pencil,
  Eye,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { StudentUpsertDialog, type GradeOption } from "./StudentUpsertDialog";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { AssetThumbnail } from "./AssetThumbnail";

const avatarColors = [
  "from-[#2563eb] to-[#3b82f6]",
  "from-[#10b981] to-[#34d399]",
  "from-[#8b5cf6] to-[#a78bfa]",
  "from-[#f59e0b] to-[#fbbf24]",
  "from-[#ec4899] to-[#f472b6]",
  "from-[#06b6d4] to-[#22d3ee]",
];

type StudentPortfolioRow = {
  id: string;
  fullName: string;
  gradeId: string;
  grade: string;
  className: string | null;
  admissionNumber: string;
  createdAt: string;
  fileCount: number;
};

type PortfoliosResponse = {
  data: StudentPortfolioRow[];
  stats: { totalPortfolioFiles: number };
};

type PortfolioFile = {
  id: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  uploadedByName: string;
  tags: string[];
};

type PortfolioDetail = {
  student: {
    fullName: string;
    grade: string;
    admissionNumber: string;
    className: string | null;
  };
  files: PortfolioFile[];
};

type Props = {
  canManageStudents?: boolean;
};

function evidenceKind(mime: string): "Video" | "Image" | "PDF" | "Document" {
  if (mime.includes("video")) return "Video";
  if (mime.includes("image")) return "Image";
  if (mime.includes("pdf")) return "PDF";
  return "Document";
}

function fileIconMeta(kind: string) {
  switch (kind) {
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
}

export function StudentPortfolios({ canManageStudents = false }: Props) {
  const [directoryView, setDirectoryView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [apiStudents, setApiStudents] = useState<StudentPortfolioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioDetail, setPortfolioDetail] = useState<PortfolioDetail | null>(null);
  const [portfolioSubject, setPortfolioSubject] = useState("All");
  const [portfolioType, setPortfolioType] = useState("All");
  const [portfolioFileView, setPortfolioFileView] = useState<"grid" | "list">("grid");
  const [portfolioSearchQuery, setPortfolioSearchQuery] = useState("");
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);

  const [catalogGrades, setCatalogGrades] = useState<GradeOption[]>([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentPortfolioRow | null>(null);

  const reloadPortfolios = async () => {
    const response = await fetch("/api/students/portfolios");
    if (!response.ok) throw new Error("Could not load student portfolios.");
    const payload = (await response.json()) as PortfoliosResponse;
    setApiStudents(payload.data ?? []);
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [portfoliosRes, gradesRes] = await Promise.all([
          fetch("/api/students/portfolios"),
          fetch("/api/grades"),
        ]);
        if (!portfoliosRes.ok) throw new Error("Could not load student portfolios.");
        const payload = (await portfoliosRes.json()) as PortfoliosResponse;
        setApiStudents(payload.data ?? []);
        if (gradesRes.ok) {
          const gradesPayload = (await gradesRes.json()) as { data: GradeOption[] };
          setCatalogGrades(gradesPayload.data ?? []);
        } else {
          setCatalogGrades([]);
          toast.message("Grade catalog unavailable — add/edit still works if grades exist in Admin.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load student portfolios.";
        setApiStudents([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const runtimeStudents = useMemo(
    () =>
      apiStudents.map((student) => ({
        id: student.id,
        name: student.fullName,
        grade: student.grade,
        fileCount: student.fileCount,
        classLabel: student.className,
        avatar: student.fullName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join(""),
      })),
    [apiStudents],
  );

  const filteredStudents = runtimeStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGrade === "All Grades" || student.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const gradeFilterOptions = useMemo(() => {
    const fromCatalog = [...catalogGrades].sort((a, b) => a.name.localeCompare(b.name));
    const names = new Set(fromCatalog.map((g) => g.name));
    for (const s of apiStudents) {
      if (s.grade && !names.has(s.grade)) names.add(s.grade);
    }
    return ["All Grades", ...[...names].sort((a, b) => a.localeCompare(b))];
  }, [apiStudents, catalogGrades]);

  const openPortfolio = async (studentId: string) => {
    setPortfolioLoading(true);
    setPortfolioDetail(null);
    setPortfolioSubject("All");
    setPortfolioType("All");
    setPortfolioSearchQuery("");
    setPortfolioFileView("grid");
    try {
      const response = await fetch(`/api/students/${studentId}/portfolio`);
      if (!response.ok) {
        toast.error("Could not load student portfolio.");
        return;
      }
      const payload = (await response.json()) as { data: PortfolioDetail };
      setPortfolioDetail(payload.data);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const closePortfolio = () => {
    setPortfolioDetail(null);
    setPreviewAssetId(null);
    setPortfolioSubject("All");
    setPortfolioType("All");
    setPortfolioSearchQuery("");
    setPortfolioFileView("grid");
    setPortfolioLoading(false);
  };

  const subjectOptions = useMemo(() => {
    if (!portfolioDetail?.files.length) return ["All"];
    const set = new Set<string>();
    for (const f of portfolioDetail.files) {
      for (const t of f.tags) set.add(t);
    }
    const opts = ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
    if (portfolioDetail.files.some((f) => f.tags.length === 0)) opts.push("Untagged");
    return opts;
  }, [portfolioDetail]);

  const filteredPortfolioFiles = useMemo(() => {
    if (!portfolioDetail) return [];
    return portfolioDetail.files.filter((f) => {
      const kind = evidenceKind(f.mimeType);
      const typeOk =
        portfolioType === "All" ||
        (portfolioType === "PDF" && kind === "PDF") ||
        (portfolioType === "Video" && kind === "Video") ||
        (portfolioType === "Image" && kind === "Image") ||
        (portfolioType === "Document" && kind === "Document");
      const subjectOk =
        portfolioSubject === "All" ||
        (portfolioSubject === "Untagged" ? f.tags.length === 0 : f.tags.includes(portfolioSubject));
      const query = portfolioSearchQuery.trim().toLowerCase();
      const searchOk =
        query.length === 0 ||
        f.title.toLowerCase().includes(query) ||
        f.uploadedByName.toLowerCase().includes(query) ||
        f.tags.some((t) => t.toLowerCase().includes(query));
      return typeOk && subjectOk && searchOk;
    });
  }, [portfolioDetail, portfolioSearchQuery, portfolioSubject, portfolioType]);

  const isPortfolioOpen = portfolioLoading || Boolean(portfolioDetail);
  const learnerInitials = useMemo(() => {
    if (!portfolioDetail?.student.fullName) return "LP";
    return portfolioDetail.student.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [portfolioDetail]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <StudentUpsertDialog
        open={studentDialogOpen}
        onOpenChange={(open) => {
          setStudentDialogOpen(open);
          if (!open) setEditingStudent(null);
        }}
        grades={catalogGrades}
        editing={
          editingStudent
            ? {
                id: editingStudent.id,
                admissionNumber: editingStudent.admissionNumber,
                fullName: editingStudent.fullName,
                gradeId: editingStudent.gradeId,
                className: editingStudent.className,
              }
            : null
        }
        onSaved={() => void reloadPortfolios().catch(() => toast.error("Could not refresh students."))}
      />

      <AssetPreviewModal
        open={Boolean(previewAssetId)}
        onOpenChange={(open) => {
          if (!open) setPreviewAssetId(null);
        }}
        assetId={previewAssetId}
      />

      {!isPortfolioOpen && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1e293b] mb-1">Student Portfolios</h1>
          <p className="text-[#64748b]">
            Structured file evidence per learner.
          </p>
          {isLoading && <p className="text-xs text-[#94a3b8] mt-2">Loading students…</p>}
          {loadError && <p className="text-xs text-[#ef4444] mt-2">{loadError}</p>}
        </div>
      )}

      {!isPortfolioOpen && (
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search learners by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-2 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm text-[#1e293b] shrink-0"
              >
                {gradeFilterOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {canManageStudents && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentDialogOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white text-sm whitespace-nowrap shrink-0"
                >
                  Add student
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 bg-[#f8f9fc] p-1 rounded-lg border border-[#e3e6ef] self-end lg:self-center">
              <button
                type="button"
                onClick={() => setDirectoryView("grid")}
                className={`p-2 rounded-md transition-all ${directoryView === "grid" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b]"}`}
                aria-label="Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDirectoryView("list")}
                className={`p-2 rounded-md transition-all ${directoryView === "list" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b]"}`}
                aria-label="List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isPortfolioOpen ? (
        <div className="bg-white rounded-2xl border border-[#dbe5f0] shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] overflow-hidden">
          <div className="border-b border-[#e6edf5] bg-[radial-gradient(circle_at_15%_15%,#eff6ff_0%,#f8fafc_42%,#ecfdf5_100%)] px-5 py-5 sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
              <button
                type="button"
                onClick={closePortfolio}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8]"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to learners
              </button>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#10b981] text-white flex items-center justify-center font-semibold shadow-sm">
                  {learnerInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#64748b] mb-1">Learner file</p>
                  <h2 className="text-[1.7rem] leading-tight font-semibold text-[#0f172a] pr-2 truncate">
                    {portfolioLoading ? "Loading portfolio…" : portfolioDetail?.student.fullName ?? "Portfolio"}
                  </h2>
                  <p className="text-[#64748b] text-sm mt-1.5">
                    {portfolioDetail && (
                      <>
                        <span className="font-medium text-[#334155]">{portfolioDetail.student.grade}</span>
                        {portfolioDetail.student.className ? (
                          <span className="text-[#94a3b8]"> · {portfolioDetail.student.className}</span>
                        ) : null}
                        <span className="text-[#94a3b8]"> · Adm {portfolioDetail.student.admissionNumber}</span>
                      </>
                    )}
                    {!portfolioLoading && portfolioDetail && (
                      <span className="block mt-1.5 text-xs text-[#94a3b8]">
                        Curated learning evidence.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 py-2 text-right">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#94a3b8]">Academic year</p>
                  <p className="text-sm font-semibold text-[#1e293b]">2026</p>
                </div>
              </div>
            </div>
          </div>

          {portfolioDetail && !portfolioLoading && (
            <div className="px-5 pt-4 sm:px-7">
              <div className="bg-[#f8fafc] border border-[#e3e6ef] rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="text"
                      placeholder="Search evidence title, tag, or uploader…"
                      value={portfolioSearchQuery}
                      onChange={(e) => setPortfolioSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#e3e6ef] rounded-xl text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    />
                  </div>
                  <select
                    value={portfolioSubject}
                    onChange={(e) => setPortfolioSubject(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-[#e3e6ef] rounded-xl text-sm text-[#1e293b]"
                  >
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {s === "All" ? "All areas" : s === "Untagged" ? "Untagged (no tags)" : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-[#64748b] ml-1" />
                  <select
                    value={portfolioType}
                    onChange={(e) => setPortfolioType(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-[#e3e6ef] rounded-xl text-sm text-[#1e293b]"
                  >
                    <option>All</option>
                    <option>PDF</option>
                    <option>Video</option>
                    <option>Image</option>
                    <option>Document</option>
                  </select>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#e3e6ef] ml-1">
                    <button
                      type="button"
                      onClick={() => setPortfolioFileView("grid")}
                      className={`p-1.5 rounded ${portfolioFileView === "grid" ? "bg-[#f1f5f9] text-[#2563eb] shadow-sm" : "text-[#64748b]"}`}
                      aria-label="Grid view"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPortfolioFileView("list")}
                      className={`p-1.5 rounded ${portfolioFileView === "list" ? "bg-[#f1f5f9] text-[#2563eb] shadow-sm" : "text-[#64748b]"}`}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7 bg-white">
            {portfolioLoading && <p className="text-sm text-[#94a3b8]">Loading evidence…</p>}
            {!portfolioLoading && portfolioDetail && portfolioDetail.files.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center py-14 px-6">
                <p className="text-sm text-[#64748b]">No portfolio files linked yet for this learner.</p>
                <p className="text-xs text-[#94a3b8] mt-1">Upload evidence from Student Portfolio and assign this learner.</p>
              </div>
            )}
            {!portfolioLoading && portfolioDetail && filteredPortfolioFiles.length === 0 && portfolioDetail.files.length > 0 && (
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] text-center py-10 px-6">
                <p className="text-sm font-medium text-[#475569]">No files match your current filters.</p>
                <p className="text-xs text-[#94a3b8] mt-1">Try clearing keyword search, learning area, or file type.</p>
              </div>
            )}

            {!portfolioLoading && portfolioDetail && portfolioFileView === "grid" && filteredPortfolioFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredPortfolioFiles.map((file, index) => {
                  const kind = evidenceKind(file.mimeType);
                  const { bg } = fileIconMeta(kind);
                  return (
                    <div
                      key={file.id}
                      className="group bg-white rounded-2xl border border-[#e3e6ef] p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] hover:shadow-[0_20px_48px_-28px_rgba(15,23,42,0.45)] hover:border-[#c7d2fe] transition-all"
                    >
                      <div className={`w-full aspect-[4/3] ${bg} rounded-xl flex items-center justify-center overflow-hidden mb-3`}>
                        <AssetThumbnail
                          assetId={file.id}
                          mimeType={file.mimeType}
                          enabled={index < 12}
                          className="w-full h-full object-cover"
                          scale={0.5}
                        />
                      </div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-[#1e293b] text-sm line-clamp-2">{file.title}</h3>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-[#f1f5f9] text-[#64748b] shrink-0">
                          {kind}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {file.tags.length === 0 ? (
                          <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2 py-0.5 rounded-full">No tags</span>
                        ) : (
                          file.tags.slice(0, 4).map((t) => (
                            <span key={t} className="text-xs bg-[#eef2ff] text-[#3730a3] px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-[#94a3b8] mb-2">
                        {new Date(file.createdAt).toLocaleDateString()} · {file.uploadedByName}
                      </p>
                      <div className="flex gap-2 pt-2 border-t border-[#e3e6ef]">
                        <button
                          type="button"
                          onClick={() => setPreviewAssetId(file.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-sm text-[#2563eb] hover:bg-[#eff6ff] rounded-xl py-2 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const response = await fetch(`/api/assets/${file.id}/download`);
                            if (!response.ok) {
                              toast.error("Could not generate download link.");
                              return;
                            }
                            const payload = (await response.json()) as { url: string };
                            window.open(payload.url, "_blank", "noopener,noreferrer");
                          }}
                          className="px-3 text-[#64748b] hover:text-[#10b981] hover:bg-[#ecfdf5] rounded-xl"
                          aria-label="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!portfolioLoading && portfolioDetail && portfolioFileView === "list" && filteredPortfolioFiles.length > 0 && (
              <div className="rounded-2xl border border-[#e3e6ef] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8fafc] text-left text-xs text-[#64748b] uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 font-medium">Evidence</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Learning areas</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                      <th className="px-4 py-3 font-medium hidden lg:table-cell">Uploaded</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e6ef]">
                    {filteredPortfolioFiles.map((file) => {
                      const kind = evidenceKind(file.mimeType);
                      const { icon: Icon, bg, color } = fileIconMeta(kind);
                      return (
                        <tr key={file.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-5 h-5 ${color}`} />
                              </div>
                              <div>
                                <div className="font-medium text-[#1e293b]">{file.title}</div>
                                <div className="text-xs text-[#94a3b8]">{file.uploadedByName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#64748b] hidden md:table-cell">
                            {file.tags.length ? file.tags.join(", ") : "—"}
                          </td>
                          <td className="px-4 py-3 text-[#64748b] hidden sm:table-cell">{kind}</td>
                          <td className="px-4 py-3 text-[#64748b] hidden lg:table-cell">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewAssetId(file.id)}
                                className="p-1.5 rounded-lg text-[#2563eb] hover:bg-[#eff6ff]"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const response = await fetch(`/api/assets/${file.id}/download`);
                                  if (!response.ok) {
                                    toast.error("Could not generate download link.");
                                    return;
                                  }
                                  const payload = (await response.json()) as { url: string };
                                  window.open(payload.url, "_blank", "noopener,noreferrer");
                                }}
                                className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : directoryView === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className="bg-white rounded-xl border border-[#e3e6ef] p-5 hover:shadow-md hover:border-[#2563eb]/20 transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${avatarColors[index % avatarColors.length]} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
                >
                  {student.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#1e293b] truncate">{student.name}</h3>
                  <p className="text-sm text-[#64748b]">{student.grade}</p>
                  {student.classLabel ? (
                    <p className="text-xs text-[#94a3b8] mt-0.5 truncate">{student.classLabel}</p>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-[#64748b] mb-4">
                <span className="font-medium text-[#475569]">{student.fileCount}</span> evidence file
                {student.fileCount === 1 ? "" : "s"}
              </p>
              <div
                className={`grid gap-2 ${canManageStudents ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {canManageStudents && (
                  <button
                    type="button"
                    onClick={() => {
                      const row = apiStudents.find((s) => s.id === student.id);
                      if (row) {
                        setEditingStudent(row);
                        setStudentDialogOpen(true);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] px-3 border border-[#e3e6ef] text-[#64748b] rounded-lg text-sm font-medium hover:bg-[#f8fafc] w-full"
                  >
                    <Pencil className="w-4 h-4 shrink-0" />
                    <span className="truncate">Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void openPortfolio(student.id)}
                  aria-label="Open learner portfolio"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] px-3 border border-[#2563eb] text-[#2563eb] bg-transparent text-sm rounded-lg font-medium hover:bg-gradient-to-r hover:from-[#2563eb] hover:to-[#10b981] hover:text-white hover:border-0 transition-all duration-300 w-full whitespace-nowrap"
                >
                  <span>Open</span>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e3e6ef] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc] text-left text-xs text-[#64748b] uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 font-medium">Learner</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Grade</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Group</th>
                <th className="px-5 py-3 font-medium">Evidence</th>
                <th className="px-5 py-3 font-medium text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e6ef]">
              {filteredStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-[#f8fafc]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 bg-gradient-to-br ${avatarColors[index % avatarColors.length]} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                      >
                        {student.avatar}
                      </div>
                      <span className="font-medium text-[#1e293b]">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#64748b] hidden md:table-cell">{student.grade}</td>
                  <td className="px-5 py-4 text-[#64748b] hidden lg:table-cell">{student.classLabel ?? "—"}</td>
                  <td className="px-5 py-4 text-[#64748b]">{student.fileCount}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {canManageStudents && (
                        <button
                          type="button"
                          onClick={() => {
                            const row = apiStudents.find((s) => s.id === student.id);
                            if (row) {
                              setEditingStudent(row);
                              setStudentDialogOpen(true);
                            }
                          }}
                          className="p-2 text-[#64748b] hover:text-[#2563eb] rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void openPortfolio(student.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1e293b] text-white rounded-lg text-xs font-medium hover:bg-[#334155]"
                      >
                        Open
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#94a3b8]">
                    No learners match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {directoryView === "grid" && filteredStudents.length === 0 && (
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-12 text-center">
          <Search className="w-10 h-10 text-[#cbd5e1] mx-auto mb-3" />
          <h3 className="font-semibold text-[#1e293b] mb-1">No learners found</h3>
          <p className="text-sm text-[#64748b]">Try another name or grade filter.</p>
        </div>
      )}
    </div>
  );
}
