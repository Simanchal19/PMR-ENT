"use client";

import { useState, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  User,
  ShieldCheck,
} from "lucide-react";
import { AuditLog } from "@/lib/types";

interface Props {
  auditLogs: AuditLog[];
}

function getActionBadgeStyle(action: string): string {
  const upper = (action || "").toUpperCase();
  if (upper.includes("DELETE") || upper.includes("RESET") || upper.includes("WIPE") || upper.includes("VOID")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (upper.includes("CREATE") || upper.includes("ADD") || upper.includes("ALLOCAT")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (upper.includes("UPDATE") || upper.includes("EDIT") || upper.includes("PASSWORD") || upper.includes("STATUS")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (upper.includes("REVERSAL") || upper.includes("RETURN")) {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function extractYMD(timestamp: string): string {
  if (!timestamp) return "";
  const isoMatch = timestamp.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

export default function AuditTrailSection({ auditLogs }: Props) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    for (const log of auditLogs) {
      if (log.action) set.add(log.action);
    }
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;

      if (fromDate || toDate) {
        const ymd = extractYMD(log.timestamp);
        if (!ymd) return false;
        if (fromDate && ymd < fromDate) return false;
        if (toDate && ymd > toDate) return false;
      }

      if (q) {
        const hay = `${log.action} ${log.entity} ${log.notes} ${log.actor} ${log.timestamp}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [auditLogs, search, actionFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage, pageSize]);

  const hasActiveFilters = Boolean(search.trim() || actionFilter !== "ALL" || fromDate || toDate);

  const handleClearFilters = () => {
    setSearch("");
    setActionFilter("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                System Audit Trail
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Audit Enabled</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable ledger of user logins, profile updates, catalog changes &amp; financial adjustments
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
          Total Records: <strong className="text-slate-900 font-bold">{auditLogs.length}</strong>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/40 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs">
          {/* Search */}
          <div className="lg:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search entity, bill #, user, or notes..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Activity Type Filter */}
          <div className="lg:col-span-3 relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Activity Types ({uniqueActions.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="lg:col-span-2 relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden xl:block" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              title="From Date"
              aria-label="From Date"
              className="w-full px-2.5 xl:pl-8 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div className="lg:col-span-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              title="To Date"
              aria-label="To Date"
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>
            Showing{" "}
            <strong className="text-slate-800">
              {filteredLogs.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </strong>
            –
            <strong className="text-slate-800">
              {Math.min(safePage * pageSize, filteredLogs.length)}
            </strong>{" "}
            of <strong className="text-slate-800">{filteredLogs.length}</strong> matching events
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
            <label className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Desktop Readable Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
              <th className="py-3 px-3 whitespace-nowrap">Activity Type</th>
              <th className="py-3 px-3">Entity / Target</th>
              <th className="py-3 px-3">Description / Notes</th>
              <th className="py-3 px-4 whitespace-nowrap">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  No audit entries match your selected filters.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors align-top">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono border ${getActionBadgeStyle(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 min-w-[160px]">
                    {log.entity}
                  </td>
                  <td className="py-3 px-3 text-slate-600 leading-relaxed min-w-[220px]">
                    {log.notes}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{log.actor}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-slate-100 text-xs">
        {paginatedLogs.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 font-medium">
            No audit entries match your selected filters.
          </div>
        ) : (
          paginatedLogs.map((log) => (
            <div key={log.id} className="p-3.5 space-y-1.5 hover:bg-slate-50/70">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${getActionBadgeStyle(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
              </div>
              <div className="font-bold text-slate-900 text-xs">{log.entity}</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{log.notes}</p>
              <div className="text-[10px] text-blue-700 font-semibold pt-0.5">
                Actor: {log.actor}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            Page <strong className="text-slate-800">{safePage}</strong> of{" "}
            <strong className="text-slate-800">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
