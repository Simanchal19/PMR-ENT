"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  PlusCircle, 
  CreditCard, 
  Undo2, 
  Banknote, 
  BarChart3, 
  FileSpreadsheet, 
  Settings,
  X,
  ShieldCheck,
  LogOut,
  Truck,
  Package,
  Calculator,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { getReturns, getStoredUserRole } from "@/lib/storage";
import { UserRole, AuthUser } from "@/lib/types";
import { getClientSession, signOutUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<UserRole>("owner");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const updateCounts = () => {
      const returns = getReturns();
      setUnverifiedCount(returns.filter(r => r.status === "pending_review").length);
      setRole(getStoredUserRole());
      const session = getClientSession();
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.user.role) setRole(session.user.role);
      }
    };
    updateCounts();
    window.addEventListener("tpm_data_updated", updateCounts);
    return () => window.removeEventListener("tpm_data_updated", updateCounts);
  }, []);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out of TPM ERP?")) {
      await signOutUser();
      window.location.href = "/login";
    }
  };

  // Listen for mobile menu toggle event from Header
  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener("tpm_toggle_mobile_menu", handleToggle);
    window.addEventListener("tpm_close_mobile_menu", handleClose);
    return () => {
      window.removeEventListener("tpm_toggle_mobile_menu", handleToggle);
      window.removeEventListener("tpm_close_mobile_menu", handleClose);
    };
  }, []);

  // Close drawer automatically on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scrolling while mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  interface NavItem {
    href: string;
    label: string;
    icon: any;
    highlight?: boolean;
    badge?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Estimate",
      items: [
        { href: "/estimate", label: "House Cost Estimate", icon: Calculator, highlight: true },
      ],
    },
    {
      title: "Sales & Billing",
      items: [
        { href: "/sales/new", label: "Create Bill", icon: PlusCircle, highlight: true },
        { href: "/sales", label: "Sales & Invoices", icon: Receipt },
        { href: "/customers", label: "Customers & Ledger", icon: Users },
        { href: "/payments", label: "Payments Received", icon: CreditCard },
        { 
          href: "/returns", 
          label: "Sales Returns", 
          icon: Undo2, 
          badge: unverifiedCount > 0 ? `${unverifiedCount}` : undefined 
        },
      ],
    },
    {
      title: "Purchases & Stock",
      items: [
        { href: "/purchases/new", label: "Record Purchase", icon: PlusCircle, highlight: true },
        { href: "/purchases", label: "Purchases & Suppliers", icon: Truck },
        { href: "/inventory", label: "Stock & Inventory", icon: Package },
      ],
    },
    {
      title: "Finance & Admin",
      items: [
        { href: "/cash-flow", label: "Cash Outflows", icon: Banknote },
        { href: "/reports", label: "Financial Reports", icon: BarChart3 },
        { href: "/import", label: "Excel Migration", icon: FileSpreadsheet, badge: "Admin" },
        { href: "/settings", label: "Settings & Audit", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (1024px and above) */}
      <aside
        className={`hidden lg:flex bg-[#14243A] text-white flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-[#0F1A2A] shadow-xl no-print transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Header + Collapse Toggle */}
        <div
          className={`border-b border-slate-700/60 bg-[#0F1A2A]/80 flex items-center ${
            collapsed ? "flex-col gap-2 py-3 px-2" : "justify-between p-4"
          }`}
        >
          <div className={`flex items-center gap-3 min-w-0 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-md text-lg tracking-wider shrink-0">
              TPM
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <h1 className="font-bold text-sm tracking-tight text-white uppercase truncate">
                  THE PRAMOD MAHARAJ
                </h1>
                <p className="text-[11px] font-medium text-blue-300 truncate">
                  Enterprises ERP System
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar to 64px Rail"}
            aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Menu Grouped into Clear Modules */}
        <nav className={`flex-1 py-2 space-y-3.5 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>
          {navSections.map((section, sIdx) => (
            <div key={section.title} className={sIdx > 0 ? "pt-2.5 border-t border-slate-800/80" : ""}>
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={link.label}
                      className={`flex items-center ${
                        collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
                      } rounded-lg text-xs font-medium transition-colors relative ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm font-semibold"
                          : link.highlight
                          ? "text-blue-300 hover:bg-slate-800 hover:text-white"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : link.highlight ? "text-blue-400" : "text-slate-400"}`} />
                        {!collapsed && <span className="truncate">{link.label}</span>}
                      </div>
                      {!collapsed && link.badge && (
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                          link.badge === "Admin" 
                            ? "bg-slate-700 text-slate-200"
                            : "bg-amber-500 text-slate-900"
                        }`}>
                          {link.badge}
                        </span>
                      )}
                      {collapsed && link.badge && link.badge !== "Admin" && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Desktop Sidebar User Profile & Logout Footer */}
        <div className={`border-t border-slate-700/60 bg-[#0F1A2A]/80 text-xs space-y-3 ${collapsed ? "p-2.5" : "p-4"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/settings"
                title={currentUser?.fullName || `${role} Account`}
                className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
              >
                {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out of TPM ERP"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/30 shrink-0">
                    {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : `${role.toUpperCase()} User`)}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      <span>{role} Account</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out of TPM ERP"
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Book: FY 2026-27</span>
                <Link
                  href="/settings"
                  className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                >
                  Settings
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile & Tablet Slide-in Drawer (Below 1024px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print" role="dialog" aria-modal="true">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in Navigation Panel */}
          <div className="relative w-72 max-w-[82vw] bg-[#14243A] text-white flex flex-col min-h-full shadow-2xl border-r border-[#0F1A2A] z-10">
            {/* Drawer Brand Header */}
            <div className="p-4 border-b border-slate-700/60 bg-[#0F1A2A]/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-md text-sm tracking-wider shrink-0">
                  TPM
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-xs tracking-tight text-white uppercase">
                    PRAMOD MAHARAJ
                  </div>
                  <div className="text-[10px] font-medium text-blue-300">
                    Enterprises ERP
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-3.5 overflow-y-auto">
              {navSections.map((section, sIdx) => (
                <div key={section.title} className={sIdx > 0 ? "pt-2.5 border-t border-slate-800/80" : ""}>
                  <div className="px-3 pb-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((link) => {
                      const isActive = pathname === link.href;
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm font-semibold"
                              : link.highlight
                              ? "text-blue-300 hover:bg-slate-800 hover:text-white"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : link.highlight ? "text-blue-400" : "text-slate-400"}`} />
                            <span className="truncate">{link.label}</span>
                          </div>
                          {link.badge && (
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold shrink-0 ${
                              link.badge === "Admin" 
                                ? "bg-slate-700 text-slate-200"
                                : "bg-amber-500 text-slate-900"
                            }`}>
                              {link.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Drawer User Profile & Account Footer */}
            <div className="p-3.5 border-t border-slate-700/60 bg-[#0F1A2A]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/30 shrink-0">
                    {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-semibold text-white">
                      {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : `${role.toUpperCase()} User`)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 capitalize">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      <span>{role} Account</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Book: FY 2026-27</span>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                >
                  Settings & Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
