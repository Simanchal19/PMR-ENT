"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Shield,
  History,
  Check,
  Save,
  AlertTriangle,
  RotateCcw,
  Database,
  LogOut,
  Lock,
  CheckCircle2,
  Users,
  Settings2,
  ShieldCheck,
  Globe,
  ChevronRight,
} from "lucide-react";
import {
  getStoredUserRole,
  resetAllDataToSeed,
  getAuditLogs,
  getBusinessProfile,
  saveBusinessProfile,
  getEnterpriseUsers,
} from "@/lib/storage";
import { UserRole, AuditLog, AuthUser } from "@/lib/types";
import { getClientSession, signOutUser } from "@/lib/auth";
import MasterCatalogSettingsSection from "@/components/admin/MasterCatalogSettingsSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import AuditTrailSection from "@/components/admin/AuditTrailSection";

type SettingsSectionId =
  | "business"
  | "users"
  | "master"
  | "audit"
  | "security"
  | "data";

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  shortLabel: string;
  desc: string;
  icon: any;
  accent?: "danger";
}[] = [
  {
    id: "business",
    label: "Business Profile",
    shortLabel: "Business",
    desc: "Trade name, GSTIN & address",
    icon: Building2,
  },
  {
    id: "users",
    label: "User & Login Management",
    shortLabel: "Users",
    desc: "Portal accounts & roles",
    icon: Users,
  },
  {
    id: "master",
    label: "Master Data & Configuration",
    shortLabel: "Master Data",
    desc: "Brands, rods, banks & outflows",
    icon: Settings2,
  },
  {
    id: "audit",
    label: "System Audit Trail",
    shortLabel: "Audit Trail",
    desc: "Traceable activity & logs",
    icon: History,
  },
  {
    id: "security",
    label: "Admin Profile & Security",
    shortLabel: "Security",
    desc: "Active session & RBAC policy",
    icon: Shield,
  },
  {
    id: "data",
    label: "Data Management",
    shortLabel: "Data & Reset",
    desc: "Restricted ledger reset tools",
    icon: Database,
    accent: "danger",
  },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("business");

  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [role, setRole] = useState<UserRole>("owner");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    const profile = getBusinessProfile();
    setBusinessName(profile.name);
    setGstin(profile.gstin);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAddress(profile.address);

    setRole(getStoredUserRole());
    setAuditLogs(getAuditLogs());
    setUserCount(getEnterpriseUsers().length);

    const session = getClientSession();
    if (session?.user) {
      setCurrentUser(session.user);
      if (session.user.role) setRole(session.user.role);
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const secParam = (params.get("section") || params.get("tab")) as SettingsSectionId | null;
      if (secParam && SETTINGS_SECTIONS.some((s) => s.id === secParam)) {
        setActiveSection(secParam);
      }
    }

    const onDataUpdate = () => {
      setAuditLogs(getAuditLogs());
      setUserCount(getEnterpriseUsers().length);
      const p = getBusinessProfile();
      setBusinessName(p.name);
      setGstin(p.gstin);
      setPhone(p.phone);
      setEmail(p.email);
      setAddress(p.address);
    };
    window.addEventListener("tpm_data_updated", onDataUpdate);
    window.addEventListener("tpm_users_updated", onDataUpdate);
    return () => {
      window.removeEventListener("tpm_data_updated", onDataUpdate);
      window.removeEventListener("tpm_users_updated", onDataUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOutUser();
      window.location.href = "/login";
    }
  };

  const handleConfirmReset = () => {
    if (role !== "owner" && role !== "admin") return;
    if (confirmText.trim().toUpperCase() !== "RESET") return;
    resetAllDataToSeed();
    window.location.href = "/";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const actor = currentUser?.fullName
      ? `${currentUser.fullName} (${role.toUpperCase()})`
      : role === "owner"
      ? "Pramod Maharaj (Owner)"
      : "System Administrator (Admin)";

    saveBusinessProfile(
      {
        name: businessName,
        gstin: gstin,
        phone: phone,
        email: email,
        address: address,
      },
      actor
    );

    setSaved(true);
    setSaveSuccessMsg("Business profile updated and saved successfully!");
    setTimeout(() => {
      setSaved(false);
      setSaveSuccessMsg(null);
    }, 4000);
  };

  const activeSectionMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Page Header */}
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Business Settings &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Enterprise configuration, user governance, master catalogs &amp; immutable audit logs
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[10px]">
            {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
          </div>
          <span className="font-semibold text-slate-700 truncate max-w-[140px]">
            {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : "Administrator")}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              role === "owner"
                ? "bg-amber-100 text-amber-800"
                : role === "manager"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Mobile Compact Horizontal Navigation (< lg) */}
      <div className="lg:hidden bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {SETTINGS_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            const isDanger = sec.accent === "danger";
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? isDanger
                      ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-2xs"
                      : "bg-blue-600 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{sec.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enterprise Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Desktop Settings Navigation Sidebar (lg+) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-4">
          <nav
            aria-label="Settings sections"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-2 space-y-1"
          >
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Administration Menu
            </div>
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              const isDanger = sec.accent === "danger";
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? isDanger
                        ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs"
                        : "bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? isDanger
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-600 text-white"
                          : isDanger
                          ? "bg-rose-50 text-rose-500"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">
                        {sec.label}
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive
                            ? isDanger
                              ? "text-rose-600"
                              : "text-blue-600"
                            : "text-slate-400"
                        }`}
                      >
                        {sec.desc}
                      </div>
                    </div>
                  </div>

                  {sec.id === "users" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                      {userCount}
                    </span>
                  )}
                  {sec.id === "audit" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Regional Context Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Environment Defaults</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>Timezone</span>
                <strong className="text-slate-800">Asia/Kolkata (IST)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Currency</span>
                <strong className="text-slate-800">INR (₹)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Mode</span>
                <strong className="text-emerald-700">Immutable Active</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area: Displays only the selected settings section */}
        <main className="lg:col-span-9 min-w-0 space-y-5">
          {/* Active Section Breadcrumb Strip (subtle orientation on mobile & desktop) */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 lg:hidden">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>Settings</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-700">{activeSectionMeta.label}</span>
            </span>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* SECTION 1: BUSINESS PROFILE                                     */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "business" && (
            <form
              onSubmit={handleSave}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                      Business Entity Profile
                    </h2>
                    <p className="text-xs text-slate-500">
                      Legal trade identity, GSTIN &amp; contact details printed on invoices &amp; statements
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold self-start sm:self-auto">
                  Invoice Letterhead
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{saveSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Company / Legal Trade Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white uppercase font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Shop &amp; Godown Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Timezone: <strong className="text-slate-800">Asia/Kolkata (IST)</strong> • Currency:{" "}
                    <strong className="text-slate-800">INR (₹)</strong>
                  </span>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
                  >
                    {saved ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Saved Changes</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 2: USER & LOGIN MANAGEMENT                              */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "users" && (
            <UserManagementSection role={role} currentUser={currentUser} />
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 3: MASTER DATA & BUSINESS CONFIGURATION                 */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "master" && (
            <MasterCatalogSettingsSection role={role} />
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 4: SYSTEM AUDIT TRAIL                                   */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "audit" && (
            <AuditTrailSection auditLogs={auditLogs} />
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 5: ADMIN PROFILE & SECURITY                             */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "security" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                      Admin Profile &amp; Session Security
                    </h2>
                    <p className="text-xs text-slate-500">
                      Verified portal identity, role privileges &amp; session control
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                  Active Session
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                      {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : `${role.toUpperCase()} User`)}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            role === "owner"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : role === "manager"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-purple-100 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {role} Portal
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {currentUser?.email || `${role}@pramodmaharaj.in`}
                        {currentUser?.username ? ` • @${currentUser.username}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shadow-2xs self-start sm:self-auto"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Session</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Authorization Scope
                    </div>
                    <div className="font-bold text-slate-900">
                      {role === "admin"
                        ? "Full System Control & User Administration"
                        : role === "owner"
                        ? "Executive Financial & Operations Control"
                        : "Operations, Billing & Customer Desk"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Audit Accountability
                    </div>
                    <div className="font-bold text-slate-900">
                      All configuration edits tagged to active session
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Role-Based Access Governance:</strong> Account roles are securely managed via Supabase RLS policies and database profiles. Active sessions cannot self-elevate permissions. Contact an Administrator to adjust permissions.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 6: DATA MANAGEMENT (DANGER ZONE)                        */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "data" && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden">
              <div className="p-5 bg-rose-50/70 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                      Data Management · Restricted Area
                    </div>
                    <h2 className="font-bold text-rose-950 text-sm sm:text-base">
                      Danger Zone — Wipe / Reset All Data
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 self-start sm:self-auto">
                  Admin &amp; Owner Only
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-5 text-xs">
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-xs">Warning: Irreversible Operation</div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Resetting local ERP storage permanently removes all invoices, receipts, purchase bills, sales returns, cash outflows, and party ledger modifications, restoring initial baseline records.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      Reset Local ERP Ledger &amp; Transactions
                    </div>
                    <p className="text-slate-500 leading-relaxed max-w-xl">
                      Permanently deletes all locally created bills, payment receipts, sales returns, cash outflows, and customer accounts, restoring the clean baseline state. This action cannot be undone.
                    </p>
                  </div>

                  {role === "owner" || role === "admin" ? (
                    !showResetConfirm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetConfirm(true);
                          setConfirmText("");
                        }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs transition-colors shrink-0"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Wipe / Reset Data</span>
                      </button>
                    )
                  ) : (
                    <div className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-500 font-semibold border border-slate-200 shrink-0">
                      Restricted to Admin &amp; Owner roles
                    </div>
                  )}
                </div>

                {showResetConfirm && (role === "owner" || role === "admin") && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                    <div className="flex items-start gap-2.5 text-rose-900">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-xs">
                          Explicit Confirmation Required
                        </div>
                        <p className="text-[11px] text-rose-700">
                          Type{" "}
                          <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200">
                            RESET
                          </strong>{" "}
                          below to confirm wiping all ERP data and customer ledgers.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type RESET to confirm..."
                        className="flex-1 px-3 py-2 rounded-lg border border-rose-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetConfirm(false);
                            setConfirmText("");
                          }}
                          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={confirmText.trim().toUpperCase() !== "RESET"}
                          onClick={handleConfirmReset}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold transition-colors"
                        >
                          Confirm Permanent Wipe
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
