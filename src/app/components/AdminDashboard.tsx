"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AssetPreviewModal } from "./AssetPreviewModal";
import { StudentUpsertDialog, type GradeOption } from "./StudentUpsertDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type AdminOverview = {
  totalUsers: number;
  totalFiles: number;
  storageBytes: number;
  uploadsLast7Days: number;
};

type UserRole = "admin" | "teacher" | "marketing" | "student";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  department: string | null;
};

type UploadRow = {
  id: string;
  title: string;
  description: string | null;
  module: string;
  approvalStatus: string;
  createdAt: string;
};

type GradeRow = GradeOption;
type LearningAreaRow = {
  id: string;
  name: string;
  gradeId: string | null;
  gradeName?: string | null;
};

type StudentRow = {
  id: string;
  admissionNumber: string;
  fullName: string;
  gradeId: string;
  grade: string;
  className: string | null;
};

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningAreaRow[]>([]);
  const [activeTab, setActiveTab] = useState<
    "users" | "grades" | "learningAreas" | "students" | "files" | "assignments"
  >("users");
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    role: "teacher" as UserRole,
  });
  const [addUserOpen, setAddUserOpen] = useState(false);

  const [newGradeName, setNewGradeName] = useState("");
  const [newLearningAreaName, setNewLearningAreaName] = useState("");
  const [newLearningAreaGradeId, setNewLearningAreaGradeId] = useState("");
  const [fileQuery, setFileQuery] = useState("");

  const [userEditOpen, setUserEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userForm, setUserForm] = useState({ fullName: "", email: "", phone: "", department: "" });

  const [gradeEditOpen, setGradeEditOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeRow | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: "" });
  const [learningAreaEditOpen, setLearningAreaEditOpen] = useState(false);
  const [editingLearningArea, setEditingLearningArea] = useState<LearningAreaRow | null>(null);
  const [learningAreaForm, setLearningAreaForm] = useState({ name: "", gradeId: "" });

  const [fileEditOpen, setFileEditOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadRow | null>(null);
  const [fileForm, setFileForm] = useState({ title: "", description: "" });

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentUser, setAssignmentUser] = useState<UserRow | null>(null);
  const [assignmentLaIds, setAssignmentLaIds] = useState<string[]>([]);
  const [assignmentClasses, setAssignmentClasses] = useState<{ gradeId: string; className: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, usersRes, uploadsRes, gradesRes, learningAreasRes, studentsRes] = await Promise.all([
          fetch("/api/admin/overview"),
          fetch("/api/admin/users"),
          fetch("/api/admin/uploads"),
          fetch("/api/admin/grades"),
          fetch("/api/admin/learning-areas"),
          fetch("/api/students"),
        ]);

        if (!overviewRes.ok || !usersRes.ok || !uploadsRes.ok || !gradesRes.ok || !learningAreasRes.ok || !studentsRes.ok) {
          throw new Error("Could not load admin data.");
        }

        const overviewPayload = (await overviewRes.json()) as { data: AdminOverview };
        const usersPayload = (await usersRes.json()) as { data: UserRow[] };
        const uploadsPayload = (await uploadsRes.json()) as { data: UploadRow[] };
        const gradesPayload = (await gradesRes.json()) as { data: GradeRow[] };
        const learningAreasPayload = (await learningAreasRes.json()) as { data: LearningAreaRow[] };
        const studentsPayload = (await studentsRes.json()) as { data: StudentRow[] };
        setOverview(overviewPayload.data);
        setUsers(usersPayload.data);
        setUploads(uploadsPayload.data);
        setGrades(gradesPayload.data);
        setLearningAreas(learningAreasPayload.data);
        setStudentRows(studentsPayload.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load admin data.");
      }
    };

    load();
  }, []);

  const filteredUploads = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) => u.title.toLowerCase().includes(q) || u.module.toLowerCase().includes(q));
  }, [fileQuery, uploads]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1e293b]">Admin Dashboard</h1>
        <p className="text-[#64748b]">Manage users, monitor uploads, and review system health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-4">
          <p className="text-sm text-[#64748b]">Total Users</p>
          <p className="text-2xl font-semibold text-[#1e293b]">{overview?.totalUsers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-4">
          <p className="text-sm text-[#64748b]">Total Files</p>
          <p className="text-2xl font-semibold text-[#1e293b]">{overview?.totalFiles ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e3e6ef] p-4">
          <p className="text-sm text-[#64748b]">Uploads (7 days)</p>
          <p className="text-2xl font-semibold text-[#1e293b]">{overview?.uploadsLast7Days ?? 0}</p>
        </div>
        {/* <div className="bg-white rounded-xl border border-[#e3e6ef] p-4">
          <p className="text-sm text-[#64748b]">Storage (bytes)</p>
          <p className="text-2xl font-semibold text-[#1e293b]">{overview?.storageBytes ?? 0}</p>
        </div> */}
      </div>

      <div className="bg-white rounded-xl border border-[#e3e6ef] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e3e6ef] flex items-center gap-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "users" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "grades" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Grades
          </button>
          <button
            onClick={() => setActiveTab("learningAreas")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "learningAreas" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Learning Areas
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "students" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "files" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "assignments" ? "bg-[#1e293b] text-white" : "bg-[#f8f9fc] text-[#64748b]"}`}
          >
            Assignments
          </button>
        </div>

        {activeTab === "users" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-[#64748b] max-w-2xl">
                Create admin or teacher accounts here. Student accounts should be created in the Students tab.
              </p>
              <button
                type="button"
                onClick={() => setAddUserOpen(true)}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white text-sm"
              >
                Add user
              </button>
            </div>

            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {users.map((user) => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e293b] truncate">{user.fullName}</p>
                    <p className="text-xs text-[#64748b] truncate">
                      {user.phone ?? ""}{user.phone && user.email ? " • " : ""}{user.email ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.role === "admin" || user.role === "teacher" ? (
                      <select
                        value={user.role}
                        onChange={async (event) => {
                          const role = event.target.value as UserRow["role"];
                          const response = await fetch(`/api/admin/users/${user.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ role }),
                          });
                          const body = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) {
                            toast.error(body.error ?? "Could not update user role.");
                            return;
                          }
                          setUsers((prev) => prev.map((entry) => (entry.id === user.id ? { ...entry, role } : entry)));
                          toast.success("User role updated.");
                        }}
                        className="px-3 py-1.5 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg"
                      >
                        <option value="admin">admin</option>
                        <option value="teacher">teacher</option>
                      </select>
                    ) : (
                      <div className="px-3 py-1.5 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg text-sm text-[#64748b]">
                        {user.role}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(user);
                        setUserForm({
                          fullName: user.fullName,
                          email: user.email ?? "",
                          phone: user.phone ?? "",
                          department: user.department ?? "",
                        });
                        setUserEditOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(`Delete user "${user.fullName}"? This removes them from the app and Clerk.`);
                        if (!ok) return;
                        const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
                        const body = (await response.json().catch(() => ({}))) as { error?: string };
                        if (!response.ok) {
                          toast.error(body.error ?? "Could not delete user.");
                          return;
                        }
                        setUsers((prev) => prev.filter((u) => u.id !== user.id));
                        toast.success("User deleted.");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#ef4444] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="px-4 py-6 text-sm text-[#94a3b8]">No users found.</div>}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <p className="text-sm text-[#64748b]">Students use grades from the Grades tab.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setStudentDialogOpen(true);
                }}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white text-sm"
              >
                Add student
              </button>
            </div>

            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {studentRows.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e293b] truncate">{s.fullName}</p>
                    <p className="text-xs text-[#64748b] truncate">
                      {s.admissionNumber} • {s.grade}
                      {s.className ? ` • ${s.className}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(s);
                        setStudentDialogOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(
                          `Delete student "${s.fullName}"? Portfolio links to this student will be removed; files stay in the library.`,
                        );
                        if (!ok) return;
                        const response = await fetch(`/api/students/${s.id}`, { method: "DELETE" });
                        const body = (await response.json().catch(() => ({}))) as { error?: string };
                        if (!response.ok) {
                          toast.error(body.error ?? "Could not delete student.");
                          return;
                        }
                        setStudentRows((prev) => prev.filter((row) => row.id !== s.id));
                        toast.success("Student deleted.");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#ef4444] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {studentRows.length === 0 && (
                <div className="px-4 py-6 text-sm text-[#94a3b8]">No students yet.</div>
              )}
            </div>

            <StudentUpsertDialog
              open={studentDialogOpen}
              onOpenChange={(open) => {
                setStudentDialogOpen(open);
                if (!open) setEditingStudent(null);
              }}
              grades={grades}
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
              onSaved={async () => {
                const response = await fetch("/api/students");
                if (response.ok) {
                  const payload = (await response.json()) as { data: StudentRow[] };
                  setStudentRows(payload.data);
                }
              }}
            />
          </div>
        )}

        {activeTab === "grades" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="Grade name (e.g. Grade 10)"
                className="flex-1 px-3 py-2 border border-[#e3e6ef] rounded-lg"
              />
              <button
                onClick={async () => {
                  const response = await fetch("/api/admin/grades", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newGradeName }),
                  });
                  if (!response.ok) {
                    toast.error("Could not create grade.");
                    return;
                  }
                  const payload = (await response.json()) as { data: GradeRow };
                  setGrades((prev) => {
                    const next = prev.filter((g) => g.id !== payload.data.id);
                    return [...next, payload.data].sort((a, b) => a.name.localeCompare(b.name));
                  });
                  setNewGradeName("");
                  toast.success("Grade saved.");
                }}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
              >
                Add grade
              </button>
            </div>

            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {grades.map((grade) => (
                <div key={grade.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e293b] truncate">{grade.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGrade(grade);
                        setGradeForm({ name: grade.name });
                        setGradeEditOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(`Delete grade \"${grade.name}\"?`);
                        if (!ok) return;
                        const response = await fetch(`/api/admin/grades/${grade.id}`, { method: "DELETE" });
                        const body = (await response.json().catch(() => ({}))) as { error?: string };
                        if (!response.ok) {
                          toast.error(body.error ?? "Could not delete grade.");
                          return;
                        }
                        setGrades((prev) => prev.filter((g) => g.id !== grade.id));
                        toast.success("Grade deleted.");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#ef4444] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {grades.length === 0 && <div className="px-4 py-6 text-sm text-[#94a3b8]">No grades yet.</div>}
            </div>
          </div>
        )}

        {activeTab === "learningAreas" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={newLearningAreaName}
                onChange={(e) => setNewLearningAreaName(e.target.value)}
                placeholder="Learning area name (e.g. Biology)"
                className="flex-1 px-3 py-2 border border-[#e3e6ef] rounded-lg"
              />
              <select
                value={newLearningAreaGradeId}
                onChange={(e) => setNewLearningAreaGradeId(e.target.value)}
                className="w-56 px-3 py-2 border border-[#e3e6ef] rounded-lg bg-white"
              >
                <option value="">Select grade</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (!newLearningAreaGradeId) {
                    toast.error("Select a grade first.");
                    return;
                  }
                  const response = await fetch("/api/admin/learning-areas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newLearningAreaName, gradeId: newLearningAreaGradeId }),
                  });
                  const body = (await response.json().catch(() => ({}))) as { data?: LearningAreaRow; error?: string };
                  if (!response.ok) {
                    toast.error(body.error ?? "Could not create learning area.");
                    return;
                  }
                  if (body.data) {
                    const gradeName = grades.find((g) => g.id === body.data!.gradeId)?.name ?? null;
                    setLearningAreas((prev) => {
                      const next = prev.filter((g) => g.id !== body.data!.id);
                      return [...next, { ...body.data!, gradeName }].sort((a, b) => a.name.localeCompare(b.name));
                    });
                  }
                  setNewLearningAreaName("");
                  setNewLearningAreaGradeId("");
                  toast.success("Learning area saved.");
                }}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
              >
                Add learning area
              </button>
            </div>

            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {learningAreas.map((area) => (
                <div key={area.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e293b] truncate">{area.name}</p>
                    <p className="text-xs text-[#64748b]">{area.gradeName ?? "No grade assigned"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLearningArea(area);
                        setLearningAreaForm({ name: area.name, gradeId: area.gradeId ?? "" });
                        setLearningAreaEditOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(`Delete learning area "${area.name}"?`);
                        if (!ok) return;
                        const response = await fetch(`/api/admin/learning-areas/${area.id}`, { method: "DELETE" });
                        const body = (await response.json().catch(() => ({}))) as { error?: string };
                        if (!response.ok) {
                          toast.error(body.error ?? "Could not delete learning area.");
                          return;
                        }
                        setLearningAreas((prev) => prev.filter((entry) => entry.id !== area.id));
                        toast.success("Learning area deleted.");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#ef4444] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {learningAreas.length === 0 && (
                <div className="px-4 py-6 text-sm text-[#94a3b8]">No learning areas yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={fileQuery}
                onChange={(e) => setFileQuery(e.target.value)}
                placeholder="Search files by title or module..."
                className="flex-1 px-3 py-2 border border-[#e3e6ef] rounded-lg"
              />
            </div>

            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {filteredUploads.map((upload) => (
                <div key={upload.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e293b] truncate">{upload.title}</p>
                    <p className="text-xs text-[#64748b]">
                      {upload.module} • {new Date(upload.createdAt).toLocaleString()} • {upload.approvalStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewAssetId(upload.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFile(upload);
                        setFileForm({
                          title: upload.title,
                          description: upload.description ?? "",
                        });
                        setFileEditOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#2563eb] text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm("Delete this file?");
                        if (!ok) return;
                        const response = await fetch(`/api/assets/${upload.id}`, { method: "DELETE" });
                        if (!response.ok) {
                          toast.error("Could not delete file.");
                          return;
                        }
                        setUploads((prev) => prev.filter((u) => u.id !== upload.id));
                        toast.success("File deleted.");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#fee2e2] text-[#ef4444] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredUploads.length === 0 && <div className="px-4 py-6 text-sm text-[#94a3b8]">No files found.</div>}
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-[#64748b]">
              Assign one or more learning areas to teachers or students. Class cohorts are available for teachers/admins.
            </p>
            <div className="divide-y divide-[#e3e6ef] border border-[#e3e6ef] rounded-lg overflow-hidden">
              {users
                .filter((u) => u.role === "teacher" || u.role === "admin" || u.role === "student")
                .map((user) => (
                  <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-[#1e293b]">{user.fullName}</p>
                      <p className="text-xs text-[#64748b]">{user.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setAssignmentUser(user);
                        try {
                          const res = await fetch(`/api/admin/users/${user.id}/assignments`);
                          const body = (await res.json().catch(() => ({}))) as {
                            data?: { learningAreaIds: string[]; classes: { gradeId: string; className: string }[] };
                          };
                          if (!res.ok) {
                            toast.error("Could not load assignments.");
                            return;
                          }
                          setAssignmentLaIds(body.data?.learningAreaIds ?? []);
                          const canSetClasses = user.role === "teacher" || user.role === "admin";
                          setAssignmentClasses(
                            canSetClasses && body.data?.classes?.length ? body.data.classes : [{ gradeId: "", className: "" }],
                          );
                          setAssignmentDialogOpen(true);
                        } catch {
                          toast.error("Could not load assignments.");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1e293b] text-white text-sm"
                    >
                      Edit scope
                    </button>
                  </div>
                ))}
              {users.filter((u) => u.role === "teacher" || u.role === "admin" || u.role === "student").length === 0 && (
                <div className="px-4 py-6 text-sm text-[#94a3b8]">No teachers or students to configure.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={assignmentDialogOpen}
        onOpenChange={(open) => {
          setAssignmentDialogOpen(open);
          if (!open) setAssignmentUser(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Learning area assignment — {assignmentUser?.fullName}</DialogTitle>
            <DialogDescription>
              Learning areas define what portfolios this user can work with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Learning areas</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border border-[#e3e6ef] rounded-lg p-2">
                {learningAreas.map((la) => (
                  <label key={la.id} className="flex items-center gap-2 text-sm text-[#1e293b]">
                    <input
                      type="checkbox"
                      checked={assignmentLaIds.includes(la.id)}
                      onChange={(e) => {
                        setAssignmentLaIds((prev) =>
                          e.target.checked ? [...prev, la.id] : prev.filter((id) => id !== la.id),
                        );
                      }}
                    />
                    {la.name}
                    {la.gradeName ? <span className="text-xs text-[#94a3b8]">({la.gradeName})</span> : null}
                  </label>
                ))}
                {learningAreas.length === 0 && <p className="text-xs text-[#94a3b8]">Define learning areas first.</p>}
              </div>
            </div>
            {(assignmentUser?.role === "teacher" || assignmentUser?.role === "admin") && (
              <div>
              <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Class teacher cohorts</p>
              <div className="space-y-2">
                {assignmentClasses.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={row.gradeId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssignmentClasses((prev) => prev.map((r, i) => (i === idx ? { ...r, gradeId: v } : r)));
                      }}
                      className="flex-1 px-2 py-1.5 border border-[#e3e6ef] rounded-lg text-sm"
                    >
                      <option value="">Grade…</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={row.className}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssignmentClasses((prev) => prev.map((r, i) => (i === idx ? { ...r, className: v } : r)));
                      }}
                      placeholder="Class e.g. Red"
                      className="flex-1 px-2 py-1.5 border border-[#e3e6ef] rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setAssignmentClasses((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-[#ef4444] px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAssignmentClasses((prev) => [...prev, { gradeId: "", className: "" }])}
                  className="text-sm text-[#2563eb]"
                >
                  + Add class row
                </button>
              </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setAssignmentDialogOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!assignmentUser) return;
                const classes =
                  assignmentUser.role === "teacher" || assignmentUser.role === "admin"
                    ? assignmentClasses
                        .filter((c) => c.gradeId && c.className.trim())
                        .map((c) => ({ gradeId: c.gradeId, className: c.className.trim() }))
                    : [];
                const res = await fetch(`/api/admin/users/${assignmentUser.id}/assignments`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ learningAreaIds: assignmentLaIds, classes }),
                });
                if (!res.ok) {
                  const j = (await res.json().catch(() => ({}))) as { error?: string };
                  toast.error(j.error ?? "Could not save.");
                  return;
                }
                toast.success("Assignments saved.");
                setAssignmentDialogOpen(false);
              }}
              className="px-3 py-2 rounded-lg bg-[#1e293b] text-white"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create a new admin or teacher account with system-generated credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">First name</label>
              <Input
                value={newUser.firstName}
                onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Last name</label>
              <Input
                value={newUser.lastName}
                onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 border border-[#e3e6ef] rounded-lg bg-white text-sm text-[#1e293b]"
              >
                <option value="admin">admin</option>
                <option value="teacher">teacher</option>
              </select>
            </div>
            <p className="text-xs text-[#64748b]">Username and password are generated automatically. The initial password can be changed later.</p>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setAddUserOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const response = await fetch("/api/admin/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    firstName: newUser.firstName.trim(),
                    lastName: newUser.lastName.trim(),
                    role: newUser.role,
                  }),
                });
                const body = (await response.json().catch(() => ({}))) as {
                  data?: UserRow;
                  initialPassword?: string;
                  error?: string;
                };
                if (!response.ok) {
                  toast.error(body.error ?? "Could not create user.");
                  return;
                }
                const createdUser = body.data;
                if (!createdUser) {
                  toast.error("Could not create user.");
                  return;
                }
                setUsers((prev) => [...prev, createdUser]);
                setNewUser({ firstName: "", lastName: "", role: "teacher" });
                setAddUserOpen(false);
                toast.success(
                  `Created ${createdUser.username}${body.initialPassword ? ` with password ${body.initialPassword}` : ""}`,
                );
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Create user
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userEditOpen} onOpenChange={setUserEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile fields. Email can be cleared (empty) for phone-only accounts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Full name</label>
              <Input value={userForm.fullName} onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Email</label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Phone (E.164 digits)</label>
              <Input value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Department</label>
              <Input value={userForm.department} onChange={(e) => setUserForm((p) => ({ ...p, department: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setUserEditOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingUser) return;
                const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fullName: userForm.fullName.trim(),
                    email: userForm.email.trim() === "" ? null : userForm.email.trim(),
                    phone: userForm.phone.trim() === "" ? null : userForm.phone.trim(),
                    department: userForm.department.trim() === "" ? null : userForm.department.trim(),
                  }),
                });
                const body = (await response.json().catch(() => ({}))) as { data?: UserRow; error?: string };
                if (!response.ok) {
                  toast.error(body.error ?? "Could not update user.");
                  return;
                }
                if (body.data) {
                  setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? body.data! : u)));
                }
                toast.success("User updated.");
                setUserEditOpen(false);
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gradeEditOpen} onOpenChange={setGradeEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit grade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Name</label>
              <Input value={gradeForm.name} onChange={(e) => setGradeForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setGradeEditOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingGrade) return;
                const response = await fetch(`/api/admin/grades/${editingGrade.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: gradeForm.name.trim() }),
                });
                const body = (await response.json().catch(() => ({}))) as { data?: GradeRow; error?: string };
                if (!response.ok) {
                  toast.error(body.error ?? "Could not update grade.");
                  return;
                }
                if (body.data) {
                  setGrades((prev) =>
                    [...prev.filter((g) => g.id !== body.data!.id), body.data!].sort((a, b) => a.name.localeCompare(b.name)),
                  );
                }
                toast.success("Grade updated.");
                setGradeEditOpen(false);
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={learningAreaEditOpen} onOpenChange={setLearningAreaEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit learning area</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Name</label>
              <Input value={learningAreaForm.name} onChange={(e) => setLearningAreaForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Grade</label>
              <select
                value={learningAreaForm.gradeId}
                onChange={(e) => setLearningAreaForm((p) => ({ ...p, gradeId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e3e6ef] rounded-lg bg-white"
              >
                <option value="">Select grade</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setLearningAreaEditOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingLearningArea) return;
                const response = await fetch(`/api/admin/learning-areas/${editingLearningArea.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: learningAreaForm.name.trim(), gradeId: learningAreaForm.gradeId }),
                });
                const body = (await response.json().catch(() => ({}))) as { data?: LearningAreaRow; error?: string };
                if (!response.ok) {
                  toast.error(body.error ?? "Could not update learning area.");
                  return;
                }
                if (body.data) {
                  const gradeName = grades.find((g) => g.id === body.data!.gradeId)?.name ?? null;
                  setLearningAreas((prev) =>
                    [...prev.filter((entry) => entry.id !== body.data!.id), { ...body.data!, gradeName }].sort((a, b) =>
                      a.name.localeCompare(b.name),
                    ),
                  );
                }
                toast.success("Learning area updated.");
                setLearningAreaEditOpen(false);
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fileEditOpen} onOpenChange={setFileEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit file metadata</DialogTitle>
            <DialogDescription>Title and description only; the file binary is unchanged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Title</label>
              <Input value={fileForm.title} onChange={(e) => setFileForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">Description</label>
              <Textarea value={fileForm.description} onChange={(e) => setFileForm((p) => ({ ...p, description: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setFileEditOpen(false)} className="px-3 py-2 rounded-lg border border-[#e3e6ef]">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingFile) return;
                const response = await fetch(`/api/assets/${editingFile.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: fileForm.title.trim(),
                    description: fileForm.description.trim() || null,
                  }),
                });
                const body = (await response.json().catch(() => ({}))) as { data?: { id: string; title: string }; error?: string };
                if (!response.ok) {
                  toast.error(body.error ?? "Could not update file.");
                  return;
                }
                if (body.data) {
                  setUploads((prev) =>
                    prev.map((u) =>
                      u.id === editingFile.id
                        ? { ...u, title: body.data!.title, description: fileForm.description.trim() || null }
                        : u,
                    ),
                  );
                }
                toast.success("File updated.");
                setFileEditOpen(false);
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
