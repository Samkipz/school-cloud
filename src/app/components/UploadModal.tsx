"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";
import { predefinedStaffResourceFolders } from "@/lib/staff-resource-folders";

type AppModule = "portfolio" | "resources" | "media" | "tools";

type StudentRow = {
  id: string;
  fullName: string;
  admissionNumber: string;
  gradeId?: string;
  grade?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultModule: AppModule;
  onUploaded?: () => void;
};
type LearningAreaRow = {
  id: string;
  name: string;
  gradeId: string | null;
};

function moduleLabel(moduleName: AppModule) {
  switch (moduleName) {
    case "portfolio":
      return "Student Portfolio";
    case "resources":
      return "Staff Resource";
    case "media":
      return "Media (Marketing)";
    case "tools":
      return "Academic Tools";
  }
}

export function UploadModal({ open, onOpenChange, defaultModule, onUploaded }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moduleName, setModuleName] = useState<AppModule>(defaultModule);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learningArea, setLearningArea] = useState("");
  const [folderName, setFolderName] = useState("");
  const [customFolder, setCustomFolder] = useState("");
  const [useCustomFolder, setUseCustomFolder] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<"raw" | "approved">("raw");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningAreaRow[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const studentPickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Reset state each time modal opens, but preserve default module.
    setModuleName(defaultModule);
    setFile(null);
    setTitle("");
    setDescription("");
    setLearningArea("");
    setFolderName("");
    setCustomFolder("");
    setUseCustomFolder(false);
    setTagInput("");
    setTags([]);
    setApprovalStatus("raw");
    setStudents([]);
    setLearningAreas([]);
    setStudentId("");
    setStudentPickerOpen(false);
    setStudentSearch("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [defaultModule, open]);

  useEffect(() => {
    if (!open) return;
    if (moduleName !== "portfolio") return;

    const loadDependencies = async () => {
      try {
        const [studentsRes, learningAreasRes] = await Promise.all([
          fetch("/api/students/portfolios"),
          fetch("/api/learning-areas"),
        ]);
        if (!studentsRes.ok) throw new Error("Could not load students.");
        if (!learningAreasRes.ok) throw new Error("Could not load learning areas.");
        const studentsPayload = (await studentsRes.json()) as { data: StudentRow[] };
        const learningAreasPayload = (await learningAreasRes.json()) as { data: LearningAreaRow[] };
        setStudents(studentsPayload.data ?? []);
        setLearningAreas([...(learningAreasPayload.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load upload dependencies.");
      }
    };

    loadDependencies();
  }, [moduleName, open]);

  useEffect(() => {
    if (moduleName !== "resources") {
      setFolderName("");
      setCustomFolder("");
      setUseCustomFolder(false);
    }
  }, [moduleName]);

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId) ?? null, [students, studentId]);
  const selectedFolder = useMemo(() => {
    if (useCustomFolder) return customFolder.trim();
    return folderName;
  }, [customFolder, folderName, useCustomFolder]);
  const scopedLearningAreas = useMemo(() => {
    if (!selectedStudent?.gradeId) return learningAreas;
    return learningAreas.filter((area) => area.gradeId === selectedStudent.gradeId);
  }, [learningAreas, selectedStudent?.gradeId]);
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students.slice(0, 100);
    return students
      .filter((s) => {
        const name = s.fullName.toLowerCase();
        const admission = s.admissionNumber.toLowerCase();
        const grade = (s.grade ?? "").toLowerCase();
        return name.includes(query) || admission.includes(query) || grade.includes(query);
      })
      .slice(0, 100);
  }, [studentSearch, students]);

  useEffect(() => {
    if (!studentPickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = studentPickerRef.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        setStudentPickerOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [studentPickerOpen]);

  const addTag = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) return;
    setTags((prev) => [...prev, next]);
  };

  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t !== name));
  };

  const onPickFile = (picked: File | null) => {
    setFile(picked);
    if (picked && !title.trim()) {
      setTitle(picked.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const submit = async () => {
    if (!file) {
      toast.error("Please choose a file.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
      if (moduleName === "resources" && !selectedFolder) {
        toast.error("Please choose or create a folder for staff resources.");
        return;
      }

    setIsSubmitting(true);
    toast.info(`Uploading ${file.name}...`);
    try {
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          module: moduleName,
        }),
      });
      if (!signResponse.ok) {
        const text = await signResponse.text().catch(() => "");
        throw new Error(text || "Failed to get upload URL");
      }

      const signPayload = (await signResponse.json()) as { uploadUrl: string; key: string };

      const uploadResponse = await fetch(signPayload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const finalTags = Array.from(
        new Set(
          [
            ...(moduleName === "portfolio" && learningArea ? [learningArea] : []),
            ...(moduleName === "resources" && selectedFolder ? [`folder:${selectedFolder}`] : []),
            ...tags,
          ]
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      );

      const saveResponse = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleName,
          title: title.trim(),
          description: description.trim() || undefined,
          storageKey: signPayload.key,
          mimeType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
          tags: finalTags,
          folder: moduleName === "resources" ? selectedFolder : undefined,
          studentId: moduleName === "portfolio" ? studentId : undefined,
          approvalStatus: moduleName === "media" ? approvalStatus : undefined,
        }),
      });
      if (!saveResponse.ok) {
        const text = await saveResponse.text().catch(() => "");
        throw new Error(text || "Failed to save metadata");
      }

      toast.success("Upload completed successfully.");
      onOpenChange(false);
      onUploaded?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.5rem)] max-w-2xl max-h-[min(90dvh,880px)] flex flex-col overflow-hidden gap-0 p-0",
          "sm:max-h-[min(88dvh,900px)]",
        )}
      >
        <div className="px-5 pt-5 pb-2 pr-12 shrink-0 border-b border-border/60">
          <DialogHeader className="text-left space-y-1.5 p-0">
            <DialogTitle>Upload file</DialogTitle>
            <DialogDescription>Choose where the file belongs and add required metadata.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium text-[#1e293b]">Category</div>
            <Select value={moduleName} onValueChange={(value) => setModuleName(value as AppModule)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">{moduleLabel("portfolio")}</SelectItem>
                <SelectItem value="resources">{moduleLabel("resources")}</SelectItem>
                <SelectItem value="media">{moduleLabel("media")}</SelectItem>
                <SelectItem value="tools">{moduleLabel("tools")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {moduleName === "resources" && (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">Folder</div>
              <Select
                value={useCustomFolder ? "__new__" : folderName}
                onValueChange={(value) => {
                  if (value === "__new__") {
                    setUseCustomFolder(true);
                    setFolderName("");
                    return;
                  }
                  setUseCustomFolder(false);
                  setFolderName(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedStaffResourceFolders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">Create new folder</SelectItem>
                </SelectContent>
              </Select>
              {useCustomFolder && (
                <Input
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  placeholder="New folder name"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">File</div>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                disabled={isSubmitting}
              />
              {file && (
                <div className="text-xs text-[#64748b]">
                  {file.name} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          {moduleName === "portfolio" && (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">Learning area (required)</div>
              <Select value={learningArea} onValueChange={setLearningArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose subject / learning area" />
                </SelectTrigger>
                <SelectContent>
                  {scopedLearningAreas.map((area) => (
                    <SelectItem key={area.id} value={area.name}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scopedLearningAreas.length === 0 && (
                <div className="text-xs text-[#94a3b8]">
                  No learning areas configured for this learner's grade. Add them in Admin first.
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <div className="text-sm font-medium text-[#1e293b]">Additional tags (optional)</div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput.replace(/,$/, ""));
                    setTagInput("");
                  }
                }}
                placeholder="Optional: project, experiment, revision..."
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => {
                  addTag(tagInput);
                  setTagInput("");
                }}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-md bg-[#1e293b] text-white text-sm disabled:opacity-60"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-xs px-2 py-1 rounded bg-[#f1f5f9] text-[#1e293b] hover:bg-[#e3e6ef]"
                >
                  {t} ×
                </button>
              ))}
              {tags.length === 0 && (
                <div className="text-xs text-[#94a3b8]">
                  {moduleName === "portfolio"
                    ? "Learning area already acts as the primary tag."
                    : "Tags are optional for this module."}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium text-[#1e293b]">Description (optional)</div>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="resize-y min-h-[4.5rem] max-h-40"
            />
          </div>

          {moduleName === "portfolio" && (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">Learner (required)</div>
              <div ref={studentPickerRef} className="relative">
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={studentPickerOpen}
                  onClick={() => setStudentPickerOpen((v) => !v)}
                  disabled={isSubmitting}
                  className="h-auto min-h-10 w-full flex items-center justify-between rounded-md border border-[#e3e6ef] bg-white px-3 py-2 text-left text-sm font-normal text-[#1e293b] hover:bg-[#f8fafc] disabled:opacity-60"
                >
                  <span className="line-clamp-2 pr-2">
                    {selectedStudent ? (
                      <>
                        <span className="font-medium">{selectedStudent.fullName}</span>
                        <span className="text-[#64748b] text-sm block sm:inline sm:ml-1">
                          · {selectedStudent.admissionNumber}
                          {selectedStudent.grade ? ` · ${selectedStudent.grade}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#94a3b8]">Select learner or search by admission #…</span>
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>

                {studentPickerOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] rounded-md border border-[#e3e6ef] bg-white shadow-lg">
                    <div className="p-2 border-b border-[#e3e6ef]">
                      <Input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search name or admission number..."
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStudentId(s.id);
                            setStudentPickerOpen(false);
                          }}
                          className="w-full text-left px-2 py-2 rounded-sm hover:bg-[#f8fafc] text-sm"
                        >
                          <div className="flex items-start gap-2">
                            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${studentId === s.id ? "opacity-100" : "opacity-0"}`} />
                            <div className="min-w-0">
                              <div className="font-medium text-[#1e293b] truncate">{s.fullName}</div>
                              <div className="text-xs text-[#64748b] truncate">
                                {s.admissionNumber}
                                {s.grade ? ` · ${s.grade}` : ""}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="px-2 py-3 text-sm text-[#94a3b8]">No learner matches.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {moduleName === "media" && (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-[#1e293b]">Approval status</div>
              <Select value={approvalStatus} onValueChange={(value) => setApprovalStatus(value as "raw" | "approved")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">raw</SelectItem>
                  <SelectItem value="approved">approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-[#fafafa] px-5 py-4">
          <DialogFooter className="gap-2 sm:gap-2 flex-row justify-end p-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-md border border-[#e3e6ef] text-[#1e293b] bg-white hover:bg-[#f8fafc] disabled:opacity-60 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white disabled:opacity-60 text-sm font-medium"
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

