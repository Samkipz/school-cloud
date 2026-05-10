"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

export type GradeOption = { id: string; name: string };

type EditingStudent = {
  id: string;
  admissionNumber: string;
  fullName: string;
  gradeId: string;
  className: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grades: GradeOption[];
  editing: EditingStudent | null;
  onSaved: () => void;
};

export function StudentUpsertDialog({ open, onOpenChange, grades, editing, onSaved }: Props) {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [className, setClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedGrades = useMemo(() => [...grades].sort((a, b) => a.name.localeCompare(b.name)), [grades]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAdmissionNumber(editing.admissionNumber);
      setFullName(editing.fullName);
      setGradeId(editing.gradeId);
      setClassName(editing.className ?? "");
    } else {
      setAdmissionNumber("");
      setFullName("");
      setGradeId(sortedGrades[0]?.id ?? "");
      setClassName("");
    }
  }, [open, editing, sortedGrades]);

  const submit = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!gradeId) {
      toast.error("Add at least one grade under Admin → Grades, then pick it here.");
      return;
    }
    if (!editing && !admissionNumber.trim()) {
      toast.error("Admission number is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const response = await fetch(`/api/students/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            gradeId,
            className: className.trim() || undefined,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          toast.error(payload.error ?? "Could not update student.");
          return;
        }
        toast.success("Student updated.");
      } else {
        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admissionNumber: admissionNumber.trim(),
            fullName: fullName.trim(),
            gradeId,
            className: className.trim() || undefined,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          toast.error(payload.error ?? "Could not create student.");
          return;
        }
        toast.success("Student created.");
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>Every student must belong to a grade from Admin → Grades.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Admission number</label>
            <Input
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              disabled={Boolean(editing)}
              placeholder="e.g. ADM-2045"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Student name" />
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Grade</label>
            {sortedGrades.length === 0 ? (
              <p className="text-sm text-[#94a3b8] py-2">No grades in the catalog. Create them under Admin → Grades first.</p>
            ) : (
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e3e6ef] rounded-lg bg-white text-[#1e293b]"
              >
                {sortedGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Class (optional)</label>
            <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. East" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 rounded-lg border border-[#e3e6ef] text-[#64748b]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || sortedGrades.length === 0}
            onClick={() => void submit()}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : editing ? "Save changes" : "Create student"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
