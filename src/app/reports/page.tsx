"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  Package,
  Users,
  Truck,
  TrendingUp,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Phone,
  ArrowUpRight,
  Loader2,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getBills,
  getPayments,
  getReturns,
  getCashTransactions,
  getCustomers,
  calculateCustomerOutstanding,
  calculatePurchaseMetrics,
  reconcileAllSuppliers,
  PurchaseSummaryMetrics,
  OutstandingSummary,
  CustomerOutstandingRow,
} from "@/lib/storage";
import { Supplier, BillCategory } from "@/lib/types";
import { formatCurrency, formatDate, BILL_CATEGORIES } from "@/lib/utils";
import {
  PeriodPreset,
  readPeriodFromLocation,
  resolvePeriod,
  isDateInRange,
  toYMD,
  ymdToDisplay,
} from "@/lib/period";
import PeriodSelector from "@/components/reports/PeriodSelector";
import { exportElementToPdf } from "@/lib/pdfExport";

type CustomerSortKey = "outstanding" | "name" | "invoiced";
type CustomerStatusFilter = "due_only" | "unpaid" | "partially_paid" | "all";
type SupplierSortKey = "due" | "name" | "purchases";

export default function ReportsPage() {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState(() =>
    toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(() => toYMD(new Date()));
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Raw ERP records
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [cashTxs, setCashTxs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseMetrics, setPurchaseMetrics] = useState<PurchaseSummaryMetrics | null>(null);
  const [outstandingData, setOutstandingData] = useState<OutstandingSummary | null>(null);

  // Customer Section Filters
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSort, setCustomerSort] = useState<CustomerSortKey>("outstanding");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<CustomerStatusFilter>("due_only");

  // Supplier Section Filters
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<"all" | BillCategory>("all");
  const [supplierSort, setSupplierSort] = useState<SupplierSortKey>("due");

  useEffect(() => {
    const p = readPeriodFromLocation("all");
    setPreset(p.preset);
    if (p.customStart) setCustomStart(p.customStart);
    if (p.customEnd) setCustomEnd(p.customEnd);
    setReady(true);
  }, []);

  const period = useMemo(
    () => resolvePeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  // Load all ERP records reactively
  useEffect(() => {
    if (!ready) return;
    const loadAll = () => {
      setBills(getBills());
      setPayments(getPayments());
      setReturns(getReturns());
      setCashTxs(getCashTransactions());
      setSuppliers(reconcileAllSuppliers());
      setPurchaseMetrics(calculatePurchaseMetrics({ start: period.start, end: period.end }));
      setOutstandingData(calculateCustomerOutstanding(period.asOfDate));
    };

    loadAll();
    window.addEventListener("tpm_data_updated", loadAll);
    return () => window.removeEventListener("tpm_data_updated", loadAll);
  }, [period, ready]);

  // 1. Profit & Loss: Revenue, Returns & Operating Calculations
  const grossSales = useMemo(() => {
    return bills
      .filter((b) => b.status === "posted" && isDateInRange(b.bill_date, period))
      .reduce((acc, b) => acc + (b.total_amount || 0), 0);
  }, [bills, period]);

  const approvedReturns = useMemo(() => {
    return returns
      .filter((r) => (r.status === "approved" || r.is_verified) && isDateInRange(r.return_date, period))
      .reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [returns, period]);

  const netSales = grossSales - approvedReturns;
  const netPurchases = purchaseMetrics?.net_purchases || 0;

  const verifiedExpenses = useMemo(() => {
    return cashTxs
      .filter(
        (c) =>
          c.is_categorized &&
          c.category !== "Godown Transfer" &&
          c.category !== "Supplier Payment" &&
          c.category !== "Uncategorized Outflow" &&
          isDateInRange(c.transaction_date, period)
      )
      .reduce((acc, c) => acc + (c.amount || 0), 0);
  }, [cashTxs, period]);

  const operatingSurplus = netSales - netPurchases - verifiedExpenses;

  // 2. Cement Brand Analysis
  const { brandStats, totalCementBags, totalCementRevenue, overallAvgRate } = useMemo(() => {
    const cementBills = bills.filter(
      (b) =>
        b.status === "posted" &&
        b.bill_category === "cement" &&
        (b.cement_details || (b.items && b.items.length > 0)) &&
        isDateInRange(b.bill_date, period)
    );
    const stats: Record<string, { bags: number; amount: number }> = {};
    let totalBags = 0;
    let totalRevenue = 0;

    for (const b of cementBills) {
      if (b.items && b.items.length > 0) {
        const cementItems = (b.items || []).filter((it: any) => it.item_category === "cement");
        if (cementItems.length > 0) {
          for (const it of cementItems) {
            const brand = it.item_name.replace(/\s*Cement$/i, "").trim().toUpperCase() || "OTHER";
            if (!stats[brand]) {
              stats[brand] = { bags: 0, amount: 0 };
            }
            const bags = it.quantity || 0;
            const amount = it.total_amount || 0;
            stats[brand].bags += bags;
            stats[brand].amount += amount;
            totalBags += bags;
            totalRevenue += amount;
          }
          continue;
        }
      }

      if (b.cement_details) {
        const brand = b.cement_details.cement_type || "OTHER";
        if (!stats[brand]) {
          stats[brand] = { bags: 0, amount: 0 };
        }
        const bags = b.cement_details.qty_bags || 0;
        const amount = b.cement_details.amount || 0;
        stats[brand].bags += bags;
        stats[brand].amount += amount;
        totalBags += bags;
        totalRevenue += amount;
      }
    }

    const avgRate = totalBags > 0 ? totalRevenue / totalBags : 0;
    return {
      brandStats: stats,
      totalCementBags: totalBags,
      totalCementRevenue: totalRevenue,
      overallAvgRate: avgRate,
    };
  }, [bills, period]);

  // 3. Top Outstanding Customers
  const filteredCustomers = useMemo(() => {
    if (!outstandingData) return [];
    let list = outstandingData.rows;

    if (customerSearch.trim()) {
      const q = customerSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q))
      );
    }

    if (customerStatusFilter === "due_only") {
      list = list.filter((c) => c.outstanding > 0);
    } else if (customerStatusFilter === "unpaid") {
      list = list.filter((c) => c.status === "unpaid");
    } else if (customerStatusFilter === "partially_paid") {
      list = list.filter((c) => c.status === "partially_paid");
    }

    const sorted = [...list];
    if (customerSort === "name") {
      sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    } else if (customerSort === "invoiced") {
      sorted.sort((a, b) => b.total_bills - a.total_bills);
    } else {
      sorted.sort((a, b) => b.outstanding - a.outstanding || b.total_bills - a.total_bills);
    }

    return sorted;
  }, [outstandingData, customerSearch, customerStatusFilter, customerSort]);

  // 4. Supplier Accounts Payable Ledger Summary
  const {
    filteredSuppliers,
    totalSuppliersCount,
    totalSupplierPurchases,
    totalSupplierPayments,
    totalSupplierPayablesDue,
  } = useMemo(() => {
    let list = suppliers;

    if (supplierSearch.trim()) {
      const q = supplierSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.code && s.code.toLowerCase().includes(q))
      );
    }

    if (supplierCategoryFilter !== "all") {
      list = list.filter(
        (s) => s.supply_category === supplierCategoryFilter || s.supply_category === "all"
      );
    }

    const sorted = [...list];
    if (supplierSort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (supplierSort === "purchases") {
      sorted.sort((a, b) => (b.total_purchases_amount || 0) - (a.total_purchases_amount || 0));
    } else {
      sorted.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
    }

    const totPurchases = suppliers.reduce((sum, s) => sum + (s.total_purchases_amount || 0), 0);
    const totPayments = suppliers.reduce((sum, s) => sum + (s.total_paid_amount || 0), 0);
    const totDue = suppliers.reduce((sum, s) => sum + Math.max(0, s.current_balance || 0), 0);

    return {
      filteredSuppliers: sorted,
      totalSuppliersCount: suppliers.length,
      totalSupplierPurchases: totPurchases,
      totalSupplierPayments: totPayments,
      totalSupplierPayablesDue: totDue,
    };
  }, [suppliers, supplierSearch, supplierCategoryFilter, supplierSort]);

  // Export to Excel Workbook (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Trading Performance P&L
    const plRows = [
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "THE PRAMOD MAHARAJ ENTERPRISES", "AMOUNT (₹)": "" },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": `Reporting Period: ${period.label}`, "AMOUNT (₹)": "" },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": `Generated: ${new Date().toLocaleString("en-IN")}`, "AMOUNT (₹)": "" },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "", "AMOUNT (₹)": "" },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "Gross Revenue (Sales Invoices Posted)", "AMOUNT (₹)": grossSales },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "Less: Verified Sales Returns", "AMOUNT (₹)": -approvedReturns },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "NET SALES REVENUE", "AMOUNT (₹)": netSales },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "Less: Net Stock Purchases (Cement, Steel & Electrical)", "AMOUNT (₹)": -netPurchases },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "Less: Verified Operating & Shop Expenses", "AMOUNT (₹)": -verifiedExpenses },
      { "STATEMENT OF TRADING & OPERATING PERFORMANCE": "OPERATING SURPLUS / NET TRADING MARGIN", "AMOUNT (₹)": operatingSurplus },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plRows), "P&L Statement");

    // Sheet 2: Cement Brands
    const brandRows = Object.entries(brandStats).map(([brand, stat]) => ({
      "Cement Brand": brand,
      "Bags Sold": stat.bags,
      "Total Revenue (₹)": stat.amount,
      "Average Realized Rate / Bag (₹)": Number((stat.amount / (stat.bags || 1)).toFixed(2)),
    }));
    brandRows.push({
      "Cement Brand": "TOTAL",
      "Bags Sold": totalCementBags,
      "Total Revenue (₹)": totalCementRevenue,
      "Average Realized Rate / Bag (₹)": Number(overallAvgRate.toFixed(2)),
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brandRows), "Cement Brand Distribution");

    // Sheet 3: Customer Receivables
    const custRows = filteredCustomers.map((c) => ({
      "Customer Code": c.code || "",
      "Customer Name": c.customer_name,
      Phone: c.phone || "",
      "Total Invoiced (₹)": c.total_bills,
      "Total Paid (₹)": c.payments_allocated,
      "Approved Returns (₹)": c.approved_returns,
      "Current Outstanding (₹)": c.outstanding,
      Status: c.status.toUpperCase(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custRows), "Customer Receivables");

    // Sheet 4: Supplier Payables
    const supRows = filteredSuppliers.map((s) => ({
      "Supplier Code": s.code || "",
      "Supplier Name": s.name,
      Category: s.supply_category.toUpperCase(),
      "Total Purchased (₹)": s.total_purchases_amount || 0,
      "Total Paid (₹)": s.total_paid_amount || 0,
      "Net Payable Due (₹)": s.current_balance || 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supRows), "Supplier Payables");

    const safeFileSuffix =
      period.preset === "custom"
        ? `${period.start || "start"}_to_${period.end || "end"}`
        : period.preset;
    XLSX.writeFile(wb, `TPM_Financial_Reports_${safeFileSuffix}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const safeFileSuffix =
        period.preset === "custom"
          ? `${period.start || "start"}_to_${period.end || "end"}`
          : period.preset;
      await exportElementToPdf({
        elementId: "financial-reports-statement",
        filename: `TPM_Financial_Audit_Report_${safeFileSuffix}.pdf`,
        widthPx: 1040,
        orientation: "portrait",
      });
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. PAGE HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Comprehensive Financial & Audit Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Financial statements, business performance and outstanding balances ·{" "}
            <strong className="text-slate-700 font-semibold">{period.label}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Period Selector */}
          <PeriodSelector
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setPreset}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              title="Print official financial statements"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              title="Download report as PDF document"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              title="Export all reports to multi-sheet Excel spreadsheet"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* WRAPPER FOR PDF & PRINT EXPORTS */}
      <div id="financial-reports-statement" className="space-y-5 sm:space-y-6">
        {/* Printable Official Letterhead (visible only in print / PDF) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">THE PRAMOD MAHARAJ ENTERPRISES</h2>
              <p className="text-xs text-slate-600 font-semibold">
                Wholesale & Retail: Cement, TMT Steel Rods, Electricals & Hardware
              </p>
              <p className="text-[10px] text-slate-500">
                Market Complex, G.T. Road, Bhubaneswar, Odisha • Mob: +91 94370 12345 • GSTIN: 21AAAAA1234A1Z5
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                Financial Audit Extract
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1">{period.label}</div>
              <div className="text-[10px] text-slate-500">Date: {formatDate(toYMD(new Date()))}</div>
            </div>
          </div>
        </div>

        {/* 2. PROFIT & LOSS STATEMENT (TRADING & OPERATING PERFORMANCE) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mb-1">
                Trading & Operating Statement
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Profit & Loss Statement ({period.shortLabel})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Basis: Realized Bills, Inward Purchases & Verified Operating Outflows
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Gross Revenue */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 transition-colors">
              <span className="text-slate-700 font-medium">Gross Revenue (Sales Invoices Posted)</span>
              <span className="font-bold text-slate-900 text-right">{formatCurrency(grossSales)}</span>
            </div>

            {/* Sales Returns */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 text-rose-600 transition-colors">
              <span className="font-medium">Less: Verified Sales Returns</span>
              <span className="font-semibold text-right">-{formatCurrency(approvedReturns)}</span>
            </div>

            {/* Net Sales Revenue */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50/70 border border-blue-100 font-bold text-blue-950 text-xs sm:text-sm">
              <span className="uppercase tracking-wide">Net Sales Revenue</span>
              <span className="text-blue-700 font-black text-right">{formatCurrency(netSales)}</span>
            </div>

            {/* Net Purchases */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 text-slate-700 transition-colors pt-2">
              <span className="font-medium">
                Less: Net Stock Purchases (Cement, TMT Rod & Electrical Inward)
              </span>
              <span className="font-semibold text-amber-800 text-right">-{formatCurrency(netPurchases)}</span>
            </div>

            {/* Operating Expenses */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 text-slate-700 transition-colors">
              <span className="font-medium">Less: Verified Operating & Shop Expenses</span>
              <span className="font-semibold text-slate-800 text-right">-{formatCurrency(verifiedExpenses)}</span>
            </div>

            {/* Accounting Footnote */}
            <div className="py-1 px-2 text-[11px] text-slate-400 italic">
              * Note: Godown transfers, supplier settlements & uncategorized cash are excluded from expenses. Net stock purchases are accounted on an inward basis before closing stock valuation adjustments.
            </div>

            {/* Operating Surplus / Net Trading Margin */}
            <div
              className={`flex items-center justify-between py-3 px-3.5 rounded-xl border-t-2 font-bold transition-all ${
                operatingSurplus >= 0
                  ? "bg-emerald-50/70 border-emerald-500 text-emerald-950"
                  : "bg-rose-50/70 border-rose-500 text-rose-950"
              }`}
            >
              <div className="space-y-0.5">
                <span className="block text-xs uppercase tracking-wider font-bold">
                  Operating Surplus / Net Trading Margin
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {operatingSurplus >= 0 ? "Trading Surplus for Period" : "Trading Deficit for Period"}
                </span>
              </div>
              <span
                className={`text-base sm:text-lg font-black text-right ${
                  operatingSurplus >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {operatingSurplus >= 0 ? "+" : ""}
                {formatCurrency(operatingSurplus)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CEMENT BRAND DISTRIBUTION & RATE REALIZATION */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Cement Brand Distribution & Rate Realization
              </h3>
              <p className="text-xs text-slate-500">
                Volume (Bags), Total Value (₹), and Average Realized Rate for {period.shortLabel}
              </p>
            </div>

            {/* Overall Brand KPI Summary Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 font-semibold text-blue-900">
                Total Sold: <strong className="font-bold">{totalCementBags} Bags</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 font-semibold text-emerald-900">
                Revenue: <strong className="font-bold">{formatCurrency(totalCementRevenue)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800">
                Avg: <strong className="font-bold">₹{overallAvgRate.toFixed(2)}/Bag</strong>
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto" data-pdf-show>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Cement Brand</th>
                  <th className="py-3 px-4 text-center">Bags Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Avg Realized Rate / Bag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {Object.keys(brandStats).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-6 h-6 text-slate-300" />
                        <span className="font-medium">No cement sales recorded for this period.</span>
                        <Link
                          href="/sales/new"
                          className="text-blue-600 hover:text-blue-800 font-bold text-[11px] mt-1"
                        >
                          + Create Cement Bill
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {Object.entries(brandStats).map(([brand, stat]) => (
                      <tr key={brand} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{brand}</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600">
                          {stat.bags} Bags
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(stat.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-mono font-semibold">
                          ₹{(stat.amount / (stat.bags || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                      <td className="py-3 px-4 uppercase text-[11px]">TOTAL SUMMARY</td>
                      <td className="py-3 px-4 text-center text-blue-700">{totalCementBags} Bags</td>
                      <td className="py-3 px-4 text-right text-slate-900 font-black">
                        {formatCurrency(totalCementRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        ₹{overallAvgRate.toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden p-3 space-y-2.5" data-pdf-hide>
            {Object.keys(brandStats).length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs space-y-1.5">
                <Package className="w-5 h-5 mx-auto text-slate-300" />
                <p className="font-medium">No cement sales recorded for this period.</p>
                <Link href="/sales/new" className="text-blue-600 font-bold text-[11px] block">
                  + Create Cement Bill
                </Link>
              </div>
            ) : (
              Object.entries(brandStats).map(([brand, stat]) => (
                <div
                  key={brand}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{brand}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {stat.bags} Bags
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Total Revenue
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(stat.amount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Avg Rate / Bag
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        ₹{(stat.amount / (stat.bags || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. TOP OUTSTANDING CUSTOMER BALANCES (AGING LEDGER) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Top Outstanding Customer Balances (Aging Ledger)
                </h3>
                <p className="text-xs text-slate-500">
                  Parties with pending balances requiring collection follow-up ({period.asOfLabel})
                </p>
              </div>
              <Link
                href="/customers"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>View Full Customer Directory</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customer name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value as CustomerStatusFilter)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                <option value="due_only">With Outstanding Due (&gt; ₹0)</option>
                <option value="unpaid">Unpaid Invoices</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="all">All Customers</option>
              </select>

              {/* Sort By */}
              <select
                value={customerSort}
                onChange={(e) => setCustomerSort(e.target.value as CustomerSortKey)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                <option value="outstanding">Sort: Highest Outstanding</option>
                <option value="invoiced">Sort: Highest Invoiced</option>
                <option value="name">Sort: Customer Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto" data-pdf-show>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Customer Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Users className="w-6 h-6 text-slate-300" />
                        <span className="font-medium">
                          No customer balances matching criteria for this period.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.slice(0, 15).map((cust) => (
                    <tr key={cust.customer_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {cust.customer_name}
                        {cust.code && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                            ({cust.code})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{cust.phone || "—"}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(cust.total_bills)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        {formatCurrency(cust.payments_allocated)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                        {formatCurrency(cust.outstanding)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cust.status === "unpaid"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : cust.status === "partially_paid"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : cust.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {cust.status === "partially_paid" ? "Partial" : cust.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/customers?search=${encodeURIComponent(cust.customer_name)}`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                          Ledger
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-3 space-y-2.5" data-pdf-hide>
            {filteredCustomers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs space-y-1">
                <Users className="w-5 h-5 mx-auto text-slate-300" />
                <p className="font-medium">No customer balances matching criteria.</p>
              </div>
            ) : (
              filteredCustomers.slice(0, 15).map((cust) => (
                <div
                  key={cust.customer_id}
                  className="p-3 rounded-lg border border-slate-200/90 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        {cust.customer_name}
                      </span>
                      {cust.phone && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cust.status === "unpaid"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : cust.status === "partially_paid"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {cust.status === "partially_paid" ? "Partial" : cust.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Invoiced
                      </span>
                      <span className="font-medium text-slate-700">{formatCurrency(cust.total_bills)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Paid
                      </span>
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(cust.payments_allocated)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-rose-500 font-bold block uppercase">
                        Due
                      </span>
                      <span className="font-black text-rose-600 text-xs">
                        {formatCurrency(cust.outstanding)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-50 flex items-center justify-end">
                    <Link
                      href={`/customers?search=${encodeURIComponent(cust.customer_name)}`}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>View Customer Ledger</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. SUPPLIER ACCOUNTS PAYABLE LEDGER SUMMARY */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Supplier Accounts Payable Ledger Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Vendor purchase totals, payments settled, and net payable obligations
                </p>
              </div>
              <Link
                href="/purchases"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>Go to Purchases & Suppliers</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Top Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Active Suppliers
                </span>
                <span className="text-base font-black text-slate-900">{totalSuppliersCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] text-blue-700 font-bold uppercase block">
                  Total Purchases
                </span>
                <span className="text-base font-black text-blue-950">
                  {formatCurrency(totalSupplierPurchases)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                  Settled Payments
                </span>
                <span className="text-base font-black text-emerald-800">
                  {formatCurrency(totalSupplierPayments)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
                <span className="text-[10px] text-rose-700 font-bold uppercase block">
                  Total Payable Due
                </span>
                <span className="text-base font-black text-rose-600">
                  {formatCurrency(totalSupplierPayablesDue)}
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search supplier name..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <select
                value={supplierCategoryFilter}
                onChange={(e) => setSupplierCategoryFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                <option value="all">All Categories</option>
                {BILL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} Suppliers
                  </option>
                ))}
              </select>

              <select
                value={supplierSort}
                onChange={(e) => setSupplierSort(e.target.value as SupplierSortKey)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                <option value="due">Sort: Highest Payable Due</option>
                <option value="purchases">Sort: Highest Purchased</option>
                <option value="name">Sort: Supplier Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto" data-pdf-show>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Total Purchased</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Net Payable Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Truck className="w-6 h-6 text-slate-300" />
                        <span className="font-medium">No suppliers matching filter criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sup.name}
                        {sup.code && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                            ({sup.code})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          {sup.supply_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatCurrency(sup.total_purchases_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        {formatCurrency(sup.total_paid_amount)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black text-sm ${
                          sup.current_balance > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(sup.current_balance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/purchases?search=${encodeURIComponent(sup.name)}`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                          Ledger
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-3 space-y-2.5" data-pdf-hide>
            {filteredSuppliers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs space-y-1">
                <Truck className="w-5 h-5 mx-auto text-slate-300" />
                <p className="font-medium">No suppliers matching filter criteria.</p>
              </div>
            ) : (
              filteredSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-3 rounded-lg border border-slate-200/90 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{sup.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {sup.supply_category}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Purchased
                      </span>
                      <span className="font-medium text-slate-800">
                        {formatCurrency(sup.total_purchases_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Paid
                      </span>
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(sup.total_paid_amount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-rose-500 font-bold block uppercase">
                        Due
                      </span>
                      <span
                        className={`font-black text-xs ${
                          sup.current_balance > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(sup.current_balance)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-50 flex items-center justify-end">
                    <Link
                      href={`/purchases?search=${encodeURIComponent(sup.name)}`}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>View Supplier Ledger</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Sign-off Block for Print / PDF */}
        <div className="hidden print:block pt-8 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-48 border-b border-slate-400 mb-1"></div>
              <span>Prepared By (Accounts Officer)</span>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-slate-400 mb-1"></div>
              <span>Verified By (Auditor / Proprietor)</span>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-400 mt-4">
            TPM Business ERP • System Generated Financial & Audit Extract • All balances reconciled
          </div>
        </div>
      </div>
    </div>
  );
}
