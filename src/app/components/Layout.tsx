"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UploadModal } from "./UploadModal";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Image,
  GraduationCap,
  Search,
  Upload,
  Bell,
  Menu,
  X,
  Shield,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/portfolios", label: "Student Portfolios", icon: Users },
  { path: "/resources", label: "Staff Resources", icon: FolderOpen },
  { path: "/media", label: "Media Library", icon: Image },
  { path: "/tools", label: "Academic Tools", icon: GraduationCap },
  { path: "/admin", label: "Admin", icon: Shield, requiresAdmin: true },
];

export type LayoutShellProps = {
  children: React.ReactNode;
  /** User may open Admin when true (full admin persona). */
  canManageAdmin: boolean;
  baseRole: string;
  persona: "admin" | "teacher";
};

export function Layout({ children, canManageAdmin, baseRole, persona }: LayoutShellProps) {
  const { session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; module: string }[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const [personaSaving, setPersonaSaving] = useState(false);
  const [activePersona, setActivePersona] = useState<"admin" | "teacher">(persona);

  useEffect(() => {
    setActivePersona(persona);
  }, [persona]);

  const visibleNav = navItems.filter((item) => !item.requiresAdmin || canManageAdmin);

  const currentModule: "portfolio" | "resources" | "media" | "tools" =
    pathname === "/resources"
      ? "resources"
      : pathname === "/media"
      ? "media"
      : pathname === "/tools"
      ? "tools"
      : "portfolio";

  return (
    <div className="h-screen bg-[#f8f9fc] flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full bg-white border-r border-[#e3e6ef] transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } w-64 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#e3e6ef]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563eb] to-[#10b981] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[#1e293b]">School Cloud</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-[#64748b] hover:text-[#1e293b]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  pathname === item.path
                    ? "bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white shadow-sm"
                    : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1e293b]"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Info */}
        {/* <div className="p-4 border-t border-[#e3e6ef]">
          <div className="text-xs text-[#94a3b8] mb-1">Storage Used</div>
          <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full w-[68%] bg-gradient-to-r from-[#2563eb] to-[#10b981]"></div>
          </div>
          <div className="text-xs text-[#64748b] mt-1">6.8 GB of 10 GB</div>
        </div> */}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#e3e6ef] px-4 lg:px-6 flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden text-[#64748b] hover:text-[#1e293b]"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search files, students, resources..."
                value={searchQuery}
                onChange={async (event) => {
                  const value = event.target.value;
                  setSearchQuery(value);
                  if (!value.trim()) {
                    setSearchResults([]);
                    return;
                  }
                  const response = await fetch(
                    `/api/search?q=${encodeURIComponent(value)}&module=${encodeURIComponent(currentModule)}&limit=6`,
                  );
                  if (!response.ok) return;
                  const payload = (await response.json()) as {
                    data: { id: string; title: string; module: string }[];
                  };
                  setSearchResults(payload.data ?? []);
                }}
                className="w-full pl-10 pr-4 py-2 bg-[#f8f9fc] border border-[#e3e6ef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-[#e3e6ef] rounded-lg shadow-lg z-30 overflow-hidden">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/${item.module === "portfolio" ? "portfolios" : item.module}`)}
                      className="w-full text-left px-3 py-2 hover:bg-[#f8f9fc]"
                    >
                      <div className="text-sm text-[#1e293b]">{item.title}</div>
                      <div className="text-xs text-[#94a3b8]">{item.module}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {baseRole === "admin" && (
              <div className="hidden md:flex flex-col items-end gap-1 mr-1">
                <div className="flex rounded-lg border border-[#bfdbfe] overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    disabled={personaSaving}
                    onClick={async () => {
                      if (activePersona === "teacher") return;
                      try {
                        setPersonaSaving(true);
                        const res = await fetch("/api/auth/persona", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ persona: "teacher" }),
                        });
                        if (!res.ok) {
                          const j = (await res.json().catch(() => ({}))) as { error?: string };
                          throw new Error(j.error ?? "Could not switch view.");
                        }
                        setActivePersona("teacher");
                        toast.success("Switched to teacher view.");
                        await session?.reload();
                        router.push("/");
                        router.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not switch view.");
                      } finally {
                        setPersonaSaving(false);
                      }
                    }}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      activePersona === "teacher"
                        ? "bg-[#10b981] text-white"
                        : "text-[#2563eb] hover:bg-[#eff6ff]"
                    }`}
                  >
                    Teacher view
                  </button>
                  <button
                    type="button"
                    disabled={personaSaving}
                    onClick={async () => {
                      if (activePersona === "admin") return;
                      try {
                        setPersonaSaving(true);
                        const res = await fetch("/api/auth/persona", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ persona: "admin" }),
                        });
                        if (!res.ok) {
                          const j = (await res.json().catch(() => ({}))) as { error?: string };
                          throw new Error(j.error ?? "Could not switch view.");
                        }
                        setActivePersona("admin");
                        toast.success("Switched to admin view.");
                        await session?.reload();
                        router.push("/admin");
                        router.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not switch view.");
                      } finally {
                        setPersonaSaving(false);
                      }
                    }}
                    className={`px-3 py-1.5 font-medium border-l border-[#bfdbfe] transition-colors ${
                      activePersona === "admin"
                        ? "bg-[#10b981] text-white"
                        : "text-[#2563eb] hover:bg-[#eff6ff]"
                    }`}
                  >
                    Admin view
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#10b981] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>

            <button className="relative p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-lg transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full"></span>
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="px-3 py-2 text-sm font-medium text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-lg transition-all"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <UploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        defaultModule={currentModule}
        onUploaded={() => router.refresh()}
      />
    </div>
  );
}
