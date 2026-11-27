"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  reconcileAllSuppliers,
  createSupplier,
  getPurchaseBills,
  getSupplierPayments,
  getPurchaseReturns,
  recordSupplierPayment,
  createPurchaseReturn,
  getSupplierUnallocatedPayments,
  getSupplierOutstandingBills,
  allocateSupplierPaymentToBills,
  reverseSupplierPaymentAllocation,
  calculatePurchaseMetrics,
  calculateInventoryStock,
  getPaymentModes,
  getCementBrands,
  getRodSizes,
  getBusinessProfile,
  getStoredUserRole,
  updateSupplier,
} from "@/lib/storage";
import {
  Supplier,
  PurchaseBill,
  SupplierPayment,
  PurchaseReturn,
  BillCategory,
  PaymentMode,
  PaymentModeOption,
  CementBrand,
  RodSize,
  BusinessProfile,
  UserRole,
} from "@/lib/types";
import { formatCurrency, formatDate, getTodayDateString, BILL_CATEGORIES, getCategoryConfig } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/pdfExport";
import {
  Search,
  Plus,
  PlusCircle,
  Building2,
  Receipt,
  CreditCard,
  RotateCcw,
  Package,
  Printer,
  Download,
  FileSpreadsheet,
  Eye,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Layers,
  Truck,
  Phone,
  MapPin,
  Loader2,
  Edit2,
} from "lucide-react";

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<"bills" | "suppliers" | "payments" | "returns">("bills");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [rodSizes, setRodSizes] = useState<RodSize[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(getBusinessProfile());
  const [role, setRole] = useState<UserRole>("owner");

  // Search & filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BillCategory>("all");

  // Selected Purchase Bill Preview Modal
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);

  // Selected Supplier Ledger Modal
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [ledgerTab, setLedgerTab] = useState<"statement" | "allocations">("statement");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupGstin, setNewSupGstin] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");
  const [newSupCategory, setNewSupCategory] = useState<"cement" | "rod" | "daily" | "all">("all");
  const [newSupOpening, setNewSupOpening] = useState("0");

  // Edit Supplier Modal (Admin / Owner Full Control)
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editSupData, setEditSupData] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    gstin: string;
    category: "cement" | "rod" | "daily" | "all";
    opening_balance: string;
  }>({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    category: "all",
    opening_balance: "0",
  });
  const [editSupSuccess, setEditSupSuccess] = useState<string | null>(null);
  const [editSupError, setEditSupError] = useState<string | null>(null);

  // Record Supplier Payment Modal
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paySupplierId, setPaySupplierId] = useState("");
  const [payDate, setPayDate] = useState(getTodayDateString());
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("SBI");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payDirectBillId, setPayDirectBillId] = useState("");

  // Allocate Supplier Payment Modal
  const [allocModalPayment, setAllocModalPayment] = useState<SupplierPayment | null>(null);
  const [allocInputs, setAllocInputs] = useState<Record<string, string>>({});
  const [allocError, setAllocError] = useState<string | null>(null);
  const [reversingAllocId, setReversingAllocId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Issue Purchase Return (Debit Note) Modal
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);
  const [retSupplierId, setRetSupplierId] = useState("");
  const [retDate, setRetDate] = useState(getTodayDateString());
  const [retItemType, setRetItemType] = useState<"CEMENT" | "ROD" | "ELECTRIC">("CEMENT");
  const [retBrandOrSize, setRetBrandOrSize] = useState("LNT");
  const [retQty, setRetQty] = useState("");
  const [retAmount, setRetAmount] = useState("");
  const [retReason, setRetReason] = useState("");

  const loadData = () => {
    const sups = reconcileAllSuppliers();
    setSuppliers(sups);
    setPurchaseBills(getPurchaseBills());
    setSupplierPayments(getSupplierPayments());
    setPurchaseReturns(getPurchaseReturns());
    setPaymentModes(getPaymentModes());
    setCementBrands(getCementBrands());
    setRodSizes(getRodSizes());
    setBusinessProfile(getBusinessProfile());
    setRole(getStoredUserRole());

    if (selectedSupplier) {
      const updatedSup = sups.find((s) => s.id === selectedSupplier.id);
      if (updatedSup) setSelectedSupplier(updatedSup);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "bills" ||
        tabParam === "suppliers" ||
        tabParam === "payments" ||
        tabParam === "returns"
      ) {
        setActiveTab(tabParam);
      }
    }
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  const purchaseMetrics = useMemo(() => calculatePurchaseMetrics(), [
    purchaseBills,
    supplierPayments,
    purchaseReturns,
    suppliers,
  ]);
  const stockSummary = useMemo(() => calculateInventoryStock(), [
    purchaseBills,
    purchaseReturns,
    cementBrands,
    rodSizes,
  ]);

  // Filtered lists
  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchaseBills.filter((b) => {
      const matchesCat = categoryFilter === "all" || b.bill_category === categoryFilter;
      const matchesSearch =
        !q ||
        b.purchase_number.toLowerCase().includes(q) ||
        (b.supplier_invoice_number || "").toLowerCase().includes(q) ||
        b.supplier_name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [purchaseBills, categoryFilter, search]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q) ||
        (s.gstin || "").toLowerCase().includes(q) ||
        (s.phone || "").includes(q)
    );
  }, [suppliers, search]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supplierPayments;
    return supplierPayments.filter(
      (p) =>
        p.voucher_number.toLowerCase().includes(q) ||
        p.supplier_name.toLowerCase().includes(q) ||
        (p.reference_number || "").toLowerCase().includes(q)
    );
  }, [supplierPayments, search]);

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchaseReturns;
    return purchaseReturns.filter(
      (r) =>
        r.debit_note_number.toLowerCase().includes(q) ||
        r.supplier_name.toLowerCase().includes(q) ||
        (r.brand_or_size || "").toLowerCase().includes(q)
    );
  }, [purchaseReturns, search]);

  // Handlers
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    createSupplier({
      name: newSupName,
      phone: newSupPhone,
      gstin: newSupGstin,
      address: newSupAddress,
      supply_category: newSupCategory,
      opening_balance: parseFloat(newSupOpening) || 0,
    });
    setShowAddSupplierModal(false);
    setNewSupName("");
    setNewSupPhone("");
    setNewSupGstin("");
    setNewSupAddress("");
    setNewSupOpening("0");
    loadData();
  };

  const handleSaveSupplierEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const res = updateSupplier(
      selectedSupplier.id,
      {
        name: editSupData.name.trim().toUpperCase(),
        phone: editSupData.phone.trim(),
        email: editSupData.email.trim(),
        address: editSupData.address.trim(),
        gstin: editSupData.gstin.trim().toUpperCase(),
        category: editSupData.category,
        opening_balance: parseFloat(editSupData.opening_balance) || 0,
      },
      role === "admin" ? "System Administrator (Admin)" : "Pramod Maharaj (Owner)"
    );

    if (!res.success) {
      setEditSupError(res.error || "Failed to update supplier profile.");
      return;
    }

    setEditSupSuccess("Supplier details updated successfully!");
    loadData();
    if (res.supplier) {
      setSelectedSupplier(res.supplier);
    }
    setTimeout(() => {
      setShowEditSupplierModal(false);
      setEditSupSuccess(null);
    }, 1200);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === paySupplierId);
    if (!sup || !(parseFloat(payAmount) > 0)) return;

    recordSupplierPayment({
      supplier_id: sup.id,
      supplier_name: sup.name,
      payment_date: payDate,
      amount: parseFloat(payAmount),
      payment_mode: payMode,
      reference_number: payRef,
      notes: payNotes,
      direct_bill_id: payDirectBillId || undefined,
    });

    setShowAddPaymentModal(false);
    setPayAmount("");
    setPayRef("");
    setPayNotes("");
    setPayDirectBillId("");
    loadData();
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === retSupplierId);
    if (!sup || !(parseFloat(retAmount) > 0)) return;

    createPurchaseReturn({
      supplier_id: sup.id,
      supplier_name: sup.name,
      return_date: retDate,
      item_type: retItemType,
      brand_or_size: retBrandOrSize,
      qty: parseFloat(retQty) || 0,
      amount: parseFloat(retAmount),
      reason: retReason,
    });

    setShowAddReturnModal(false);
    setRetQty("");
    setRetAmount("");
    setRetReason("");
    loadData();
  };

  const openAllocationModal = (payment: SupplierPayment) => {
    setAllocModalPayment(payment);
    setAllocInputs({});
    setAllocError(null);
  };

  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocModalPayment) return;
    setAllocError(null);

    const allocations = Object.entries(allocInputs)
      .map(([billId, val]) => ({
        purchase_bill_id: billId,
        amount: parseFloat(val) || 0,
      }))
      .filter((a) => a.amount > 0);

    const res = allocateSupplierPaymentToBills({
      supplier_payment_id: allocModalPayment.id,
      allocations,
      actor_role: role,
    });

    if (!res.success) {
      setAllocError(res.error || "Allocation failed.");
      return;
    }

    setAllocModalPayment(null);
    setAllocInputs({});
    loadData();
  };

  const handleConfirmReversal = (paymentId: string, allocationId: string) => {
    const res = reverseSupplierPaymentAllocation({
      supplier_payment_id: paymentId,
      allocation_id: allocationId,
      reason: reversalReason || "Reversed by authorized user",
      actor_role: role,
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    setReversingAllocId(null);
    setReversalReason("");
    loadData();
  };

  // Selected Supplier Ledger computation
  const supplierLedgerEntries = useMemo(() => {
    if (!selectedSupplier) return [];
    const sId = selectedSupplier.id;
    const sName = selectedSupplier.name.toUpperCase();

    const sBills = purchaseBills.filter(
      (b) => b.status === "posted" && (b.supplier_id === sId || b.supplier_name.toUpperCase() === sName)
    );
    const sPays = supplierPayments.filter(
      (p) => p.status === "posted" && (p.supplier_id === sId || p.supplier_name.toUpperCase() === sName)
    );
    const sRets = purchaseReturns.filter(
      (r) => r.status === "approved" && (r.supplier_id === sId || r.supplier_name.toUpperCase() === sName)
    );

    interface RawLedgerEvent {
      id: string;
      date: string;
      voucherNo: string;
      supplierInvoiceNo?: string;
      referenceNo?: string;
      itemTitle: string;
      itemSubtitle?: string;
      description: string;
      category: "opening" | "cement" | "rod" | "daily" | "payment" | "return";
      categoryLabel: string;
      taxDetails?: {
        tax_type: "intra_state" | "inter_state";
        gst_rate: number;
        cgst_amount: number;
        sgst_amount: number;
        igst_amount: number;
        tax_amount: number;
        taxable_subtotal: number;
      };
      freight_amount?: number;
      notes?: string;
      creditPurchase: number; // Increases payable
      debitPaid: number;      // Reduces payable
    }

    const rawEvents: RawLedgerEvent[] = [];

    if ((selectedSupplier.opening_balance || 0) > 0) {
      rawEvents.push({
        id: "open-bal",
        date: "2026-10-01",
        voucherNo: "OB-001",
        itemTitle: "Opening Supplier Payable Balance",
        itemSubtitle: "Balance brought forward",
        description: "Opening Supplier Payable Balance B/F",
        category: "opening",
        categoryLabel: "OPENING",
        creditPurchase: selectedSupplier.opening_balance,
        debitPaid: 0,
      });
    }

    for (const b of sBills) {
      let itemTitle = "Wholesale Stock Purchase";
      let itemSubtitle = "";
      const catLabel = getCategoryConfig(b.bill_category).shortLabel.toUpperCase();

      if (b.bill_category === "cement" && b.cement_details) {
        itemTitle = `${b.cement_details.cement_type} Cement Inward`;
        itemSubtitle = `${b.cement_details.qty_bags} Bags @ ${formatCurrency(b.cement_details.unit_rate)}/bag`;
      } else if (b.bill_category === "rod" && b.rod_details) {
        itemTitle = `TMT Steel Rod (${b.rod_details.rod_size})`;
        itemSubtitle = `${b.rod_details.qty_kg} Kg @ ${formatCurrency(b.rod_details.rate_per_kg)}/kg`;
      } else if (b.items && b.items.length > 0) {
        itemTitle = b.items[0].item_name;
        const extraCount = b.items.length - 1;
        itemSubtitle = `${extraCount > 0 ? `+${extraCount} more item${extraCount > 1 ? "s" : ""} • ` : ""}Qty: ${b.items[0].quantity} ${b.items[0].unit || "Nos"}`;
      }

      let taxDetails: RawLedgerEvent["taxDetails"] = undefined;
      if (b.tax_amount > 0) {
        taxDetails = {
          tax_type: b.tax_type || "intra_state",
          gst_rate: b.gst_rate || ((b.cgst_rate || 0) + (b.sgst_rate || 0)) || 18,
          cgst_amount: b.cgst_amount || 0,
          sgst_amount: b.sgst_amount || 0,
          igst_amount: b.igst_amount || b.tax_amount || 0,
          tax_amount: b.tax_amount,
          taxable_subtotal: b.subtotal,
        };
      }

      rawEvents.push({
        id: b.id,
        date: b.purchase_date,
        voucherNo: b.purchase_number,
        supplierInvoiceNo: b.supplier_invoice_number,
        itemTitle,
        itemSubtitle,
        description: `${itemTitle} (${itemSubtitle})`,
        category: b.bill_category as any,
        categoryLabel: catLabel,
        taxDetails,
        freight_amount: b.freight_amount || 0,
        notes: b.vehicle_number ? `Vehicle: ${b.vehicle_number}` : b.notes,
        creditPurchase: b.total_amount,
        debitPaid: 0,
      });
    }

    for (const p of sPays) {
      rawEvents.push({
        id: p.id,
        date: p.payment_date,
        voucherNo: p.voucher_number,
        referenceNo: p.reference_number,
        itemTitle: `Payment Settled (${p.payment_mode})`,
        itemSubtitle: p.reference_number ? `Ref / UTR: ${p.reference_number}` : "Direct Payment",
        description: `Payment Settled (${p.payment_mode})`,
        category: "payment",
        categoryLabel: p.payment_mode,
        notes: p.notes,
        creditPurchase: 0,
        debitPaid: p.amount,
      });
    }

    for (const r of sRets) {
      rawEvents.push({
        id: r.id,
        date: r.return_date,
        voucherNo: r.debit_note_number,
        itemTitle: `Debit Note (${r.item_type}${r.brand_or_size ? ` - ${r.brand_or_size}` : ""})`,
        itemSubtitle: `${r.qty ? `Returned Qty: ${r.qty} • ` : ""}${r.reason || "Damaged/Excess return"}`,
        description: `Debit Note (${r.item_type}) - ${r.reason || ""}`,
        category: "return",
        categoryLabel: "DEBIT NOTE",
        notes: r.reason,
        creditPurchase: 0,
        debitPaid: r.amount,
      });
    }

    rawEvents.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    let running = 0;
    return rawEvents.map((ev) => {
      running = running + ev.creditPurchase - ev.debitPaid;
      return {
        ...ev,
        runningBalance: running,
      };
    });
  }, [selectedSupplier, purchaseBills, supplierPayments, purchaseReturns]);

  const handleDownloadSupplierPdf = async () => {
    if (!selectedSupplier) return;
    setIsGeneratingPDF(true);
    try {
      const safeName = selectedSupplier.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      await exportElementToPdf({
        elementId: "supplier-ledger-printable",
        filename: `${safeName}_Supplier_Statement.pdf`,
        widthPx: 980,
        orientation: "landscape",
      });
    } catch {
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportSupplierExcel = () => {
    if (!selectedSupplier) return;
    const rows = supplierLedgerEntries.map((e) => ({
      Date: e.date,
      "Voucher #": e.voucherNo,
      "Supplier Bill / Ref #": e.supplierInvoiceNo || e.referenceNo || "—",
      Particulars: e.itemTitle + (e.itemSubtitle ? ` (${e.itemSubtitle})` : ""),
      Category: e.categoryLabel,
      "GST Details": e.taxDetails
        ? `GST ${e.taxDetails.gst_rate}% (${e.taxDetails.tax_type === "intra_state" ? `CGST: ₹${e.taxDetails.cgst_amount} + SGST: ₹${e.taxDetails.sgst_amount}` : `IGST: ₹${e.taxDetails.igst_amount}`})`
        : "—",
      "Purchase / Billed (₹)": e.creditPurchase,
      "Paid / Return (₹)": e.debitPaid,
      "Payable Balance (₹)": e.runningBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Ledger");
    const safeName = selectedSupplier.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${safeName}_Supplier_Ledger.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Purchases, Suppliers & Payable Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Manage stock inward invoices, supplier accounts payable, payment allocations and debit notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (suppliers.length > 0 && !paySupplierId) setPaySupplierId(suppliers[0].id);
              setShowAddPaymentModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Supplier</span>
          </button>

          <Link
            href="/purchases/new"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Purchase Bill</span>
          </Link>
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Net Purchases (Inward)</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {formatCurrency(purchaseMetrics.net_purchases)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Gross: {formatCurrency(purchaseMetrics.gross_purchases)}</span>
            {purchaseMetrics.purchase_returns > 0 && (
              <span className="text-rose-600 font-semibold">
                -{formatCurrency(purchaseMetrics.purchase_returns)} returns
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Supplier Payments Made</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1.5">
            {formatCurrency(purchaseMetrics.supplier_payments_total)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {supplierPayments.length} payment vouchers recorded
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 uppercase">
            <span>Total Supplier Payable</span>
            <Building2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1.5">
            {formatCurrency(purchaseMetrics.total_supplier_payable)}
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            {purchaseMetrics.unpaid_purchase_bills_count} unpaid •{" "}
            {purchaseMetrics.partially_paid_purchase_bills_count} partial bills
          </div>
        </div>

        <Link
          href="/inventory"
          className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Available Godown Stock</span>
            <Package className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {formatCurrency(stockSummary.totalInventoryValue)}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {stockSummary.totalCementBagsAvailable} Bags Cement • {stockSummary.totalRodKgAvailable} Kg Rod →
          </div>
        </Link>
      </div>

      {/* Main Navigation Tabs & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "bills", label: `Purchase Bills (${purchaseBills.length})`, icon: Receipt },
            { id: "suppliers", label: `Suppliers & Ledger (${suppliers.length})`, icon: Building2 },
            { id: "payments", label: `Payments Made (${supplierPayments.length})`, icon: CreditCard },
            { id: "returns", label: `Debit Notes / Returns (${purchaseReturns.length})`, icon: RotateCcw },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === t.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "bills" && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            >
              <option value="all">All Categories</option>
              {BILL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search supplier, voucher or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: PURCHASE BILLS REGISTER                                        */}
      {/* ===================================================================== */}
      {activeTab === "bills" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Supplier Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Inward Specification</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2">
                      <div>No purchase bills recorded yet.</div>
                      <Link
                        href="/purchases/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Record First Purchase Bill</span>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {bill.purchase_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {bill.supplier_invoice_number || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDate(bill.purchase_date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{bill.supplier_name}</td>
                      <td className="py-3 px-4">
                        {(() => {
                          const conf = getCategoryConfig(bill.bill_category);
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${conf.badgeClass}`}>
                              {conf.shortLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {bill.bill_category === "cement" && bill.cement_details ? (
                          <span>
                            <strong>{bill.cement_details.cement_type}</strong>:{" "}
                            {bill.cement_details.qty_bags} Bags @{" "}
                            {formatCurrency(bill.cement_details.unit_rate)}
                          </span>
                        ) : bill.bill_category === "rod" && bill.rod_details ? (
                          <span>
                            <strong>{bill.rod_details.rod_size}</strong>: {bill.rod_details.qty_kg} Kg @{" "}
                            {formatCurrency(bill.rod_details.rate_per_kg)}/kg
                          </span>
                        ) : (
                          <span>{bill.items?.map((i) => i.item_name).join(", ") || `${getCategoryConfig(bill.bill_category).shortLabel} Stock`}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-slate-900">{formatCurrency(bill.total_amount)}</div>
                        {bill.tax_amount > 0 ? (
                          <div className="text-[10px] font-semibold text-slate-500">
                            {bill.tax_type === "intra_state" || (bill.cgst_amount && bill.sgst_amount) ? (
                              <span className="text-blue-700" title={`CGST: ${formatCurrency(bill.cgst_amount || 0)}, SGST: ${formatCurrency(bill.sgst_amount || 0)}`}>
                                CGST+SGST: {formatCurrency(bill.tax_amount)}
                              </span>
                            ) : (
                              <span className="text-purple-700">IGST: {formatCurrency(bill.tax_amount)}</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Exempt / Nil GST</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            bill.payment_status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : bill.payment_status === "partially_paid"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {bill.payment_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedBill(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-semibold text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SUPPLIERS & PAYABLE LEDGER                                     */}
      {/* ===================================================================== */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Supplier</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Supplier / Depot Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">GSTIN & Contact</th>
                    <th className="py-3 px-4 text-right">Opening Payable</th>
                    <th className="py-3 px-4 text-right">Total Purchased</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Net Payable Due</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{sup.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sup.name}</div>
                        <div className="text-[11px] text-slate-400">{sup.address}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {sup.supply_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sup.gstin && <div className="font-mono text-[11px] font-semibold">{sup.gstin}</div>}
                        {sup.phone && <div className="text-[11px] text-slate-500">{sup.phone}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatCurrency(sup.opening_balance)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(sup.total_purchases_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatCurrency(sup.total_paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                        {formatCurrency(sup.current_balance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {(role === "admin" || role === "owner") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(sup);
                                setEditSupData({
                                  name: sup.name,
                                  phone: sup.phone || "",
                                  email: sup.email || "",
                                  address: sup.address || "",
                                  gstin: sup.gstin || "",
                                  category: sup.supply_category,
                                  opening_balance: (sup.opening_balance || 0).toString(),
                                });
                                setEditSupError(null);
                                setEditSupSuccess(null);
                                setShowEditSupplierModal(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Supplier Profile (Admin / Owner)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(sup);
                              setLedgerTab("statement");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ledger</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaySupplierId(sup.id);
                              setShowAddPaymentModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px]"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SUPPLIER PAYMENTS OUTWARD                                      */}
      {/* ===================================================================== */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Reference / Notes</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Unallocated Credit</th>
                  <th className="py-3 px-4 text-center">Allocate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No supplier payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {pay.voucher_number}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(pay.payment_date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{pay.supplier_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {pay.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {pay.reference_number || pay.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700">
                        {formatCurrency(pay.unallocated_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pay.unallocated_amount > 0.01 ? (
                          <button
                            type="button"
                            onClick={() => openAllocationModal(pay)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Allocate</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            ✓ Fully Allocated
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: PURCHASE RETURNS (DEBIT NOTES)                                 */}
      {/* ===================================================================== */}
      {activeTab === "returns" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (suppliers.length > 0 && !retSupplierId) setRetSupplierId(suppliers[0].id);
                setShowAddReturnModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Debit Note (Purchase Return)</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Debit Note #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Category & Spec</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Debit Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No purchase returns (debit notes) issued yet.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-rose-600">
                          {ret.debit_note_number}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(ret.return_date)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{ret.supplier_name}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{ret.item_type}</span>
                          {ret.brand_or_size ? ` • ${ret.brand_or_size}` : ""}
                          {ret.qty ? ` (Qty: ${ret.qty})` : ""}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{ret.reason || "—"}</td>
                        <td className="py-3 px-4 text-right font-black text-rose-600">
                          {formatCurrency(ret.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: VIEW PURCHASE BILL VOUCHER                                   */}
      {/* ===================================================================== */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Purchase Inward Voucher Preview
                </h3>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 my-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-xs font-mono">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-base text-slate-900">{businessProfile.name}</div>
                <div className="text-slate-500 text-[11px]">
                  {businessProfile.address} • GSTIN: {businessProfile.gstin}
                </div>
                <div className="text-slate-700 font-bold text-[11px] mt-1 uppercase">
                  Goods Receipt & Purchase Voucher
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-slate-400">VOUCHER:</span>{" "}
                  <strong>{selectedBill.purchase_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400">DATE:</span>{" "}
                  <strong>{formatDate(selectedBill.purchase_date)}</strong>
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-slate-400">SUPPLIER BILL:</span>{" "}
                  <strong>{selectedBill.supplier_invoice_number || "—"}</strong>
                </div>
                {selectedBill.vehicle_number && (
                  <div>
                    <span className="text-slate-400">VEHICLE:</span>{" "}
                    <strong>{selectedBill.vehicle_number}</strong>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-slate-200 py-2">
                <span className="text-slate-400">SUPPLIER / VENDOR:</span>
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-900 text-sm">{selectedBill.supplier_name}</div>
                  {selectedBill.supplier_gstin && (
                    <div className="text-[11px] font-mono text-slate-600">
                      GSTIN: <span className="font-bold">{selectedBill.supplier_gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-1">Item / Specification</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedBill.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">{it.item_name}</td>
                      <td className="py-2 text-center">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="py-2 text-right font-bold">
                        {formatCurrency(it.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Goods Subtotal:</span>
                  <span className="font-bold">{formatCurrency(selectedBill.subtotal)}</span>
                </div>

                {selectedBill.tax_type === "intra_state" || (selectedBill.cgst_amount || selectedBill.sgst_amount) ? (
                  <>
                    <div className="flex justify-between text-blue-800">
                      <span>Central GST (CGST {selectedBill.cgst_rate || (selectedBill.gst_rate ? selectedBill.gst_rate / 2 : 0)}%):</span>
                      <span className="font-bold">{formatCurrency(selectedBill.cgst_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-800">
                      <span>State GST (SGST {selectedBill.sgst_rate || (selectedBill.gst_rate ? selectedBill.gst_rate / 2 : 0)}%):</span>
                      <span className="font-bold">{formatCurrency(selectedBill.sgst_amount || 0)}</span>
                    </div>
                  </>
                ) : selectedBill.tax_amount > 0 ? (
                  <div className="flex justify-between text-purple-800">
                    <span>Integrated GST (IGST {selectedBill.igst_rate || selectedBill.gst_rate}%):</span>
                    <span className="font-bold">{formatCurrency(selectedBill.igst_amount || selectedBill.tax_amount)}</span>
                  </div>
                ) : null}

                {selectedBill.freight_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Freight / Unloading Charges:</span>
                    <span className="font-bold">{formatCurrency(selectedBill.freight_amount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-sm font-black">
                <span>TOTAL PURCHASE VALUE</span>
                <span className="text-blue-700">{formatCurrency(selectedBill.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SUPPLIER ACCOUNT LEDGER STATEMENT & BILL ALLOCATIONS         */}
      {/* ===================================================================== */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            {/* Top Bar */}
            <div className="bg-[#14243A] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 font-black text-xs flex items-center justify-center">
                  TPM
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Supplier Account Payable Statement</h3>
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-blue-200 font-mono text-[10px]">
                      {selectedSupplier.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">Vendor: {selectedSupplier.name}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-800/90 p-1 rounded-lg flex items-center gap-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLedgerTab("statement")}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      ledgerTab === "statement"
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Official Statement
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerTab("allocations")}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      ledgerTab === "allocations"
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Bill Allocations
                  </button>
                </div>

                {(role === "admin" || role === "owner") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSupplier) return;
                      setEditSupData({
                        name: selectedSupplier.name,
                        phone: selectedSupplier.phone || "",
                        email: selectedSupplier.email || "",
                        address: selectedSupplier.address || "",
                        gstin: selectedSupplier.gstin || "",
                        category: selectedSupplier.supply_category,
                        opening_balance: (selectedSupplier.opening_balance || 0).toString(),
                      });
                      setEditSupError(null);
                      setEditSupSuccess(null);
                      setShowEditSupplierModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-blue-500/30 transition-colors"
                    title="Edit Supplier Details (Admin / Owner)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit Details</span>
                  </button>
                )}

                {ledgerTab === "statement" && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingPDF}
                      onClick={handleDownloadSupplierPdf}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      {isGeneratingPDF ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSupplierExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-600"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {ledgerTab === "statement" ? (
                <div
                  id="supplier-ledger-printable"
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs max-w-4xl mx-auto space-y-5 text-slate-900"
                >
                  {/* Letterhead */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#14243A] text-white font-black flex items-center justify-center text-base">
                        TPM
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-slate-950 uppercase">
                          {businessProfile.name}
                        </h1>
                        <p className="text-[11px] text-blue-900 font-bold uppercase">
                          Wholesale & Retail: Cement, TMT Steel Rods, Electricals & Hardware
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {businessProfile.address}{" "}
                          {businessProfile.phone ? `• Mob: ${businessProfile.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-[11px]">
                        GSTIN: {businessProfile.gstin}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Email: {businessProfile.email}
                      </div>
                    </div>
                  </div>

                  {/* Statement Banner */}
                  <div className="bg-[#14243A] text-white px-4 py-2 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold uppercase tracking-wider">
                        SUPPLIER ACCOUNT PAYABLE & STOCK INWARD LEDGER
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Chronological journal of purchase bills, payments made, and debit notes
                      </div>
                    </div>
                    <div className="font-mono text-[11px]">
                      Date: <strong>{formatDate(getTodayDateString())}</strong>
                    </div>
                  </div>

                  {/* Supplier Summary */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        SUPPLIER / VENDOR DETAILS
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {selectedSupplier.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        {selectedSupplier.gstin && (
                          <span className="font-mono font-semibold">
                            GSTIN: {selectedSupplier.gstin}
                          </span>
                        )}
                        {selectedSupplier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedSupplier.phone}
                          </span>
                        )}
                        {selectedSupplier.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {selectedSupplier.address}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          Total Purchased
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          {formatCurrency(selectedSupplier.total_purchases_amount)}
                        </div>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          Total Paid
                        </div>
                        <div className="text-sm font-black text-emerald-700">
                          {formatCurrency(selectedSupplier.total_paid_amount)}
                        </div>
                      </div>
                      <div className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-center">
                        <div className="text-[10px] text-rose-700 font-bold uppercase">
                          Net Payable Due
                        </div>
                        <div className="text-sm font-black text-rose-700">
                          {formatCurrency(selectedSupplier.current_balance)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ledger Journal Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-3.5">Date</th>
                          <th className="py-3 px-3.5">Voucher / Doc #</th>
                          <th className="py-3 px-3.5">Particulars & Stock Details</th>
                          <th className="py-3 px-3.5 text-center">Category</th>
                          <th className="py-3 px-3.5 text-right">Purchase / Billed (+)</th>
                          <th className="py-3 px-3.5 text-right">Paid / Return (-)</th>
                          <th className="py-3 px-3.5 text-right">Payable Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {supplierLedgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                              No transactions recorded for this supplier yet.
                            </td>
                          </tr>
                        ) : (
                          supplierLedgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-3 px-3.5 whitespace-nowrap align-top">
                                <div className="font-semibold text-slate-800 text-xs">{formatDate(entry.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{entry.date}</div>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap align-top">
                                <div className="font-mono font-bold text-blue-600 text-xs">
                                  {entry.voucherNo}
                                </div>
                                {entry.supplierInvoiceNo && entry.supplierInvoiceNo !== entry.voucherNo && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Inv: <span className="font-bold text-slate-700">{entry.supplierInvoiceNo}</span>
                                  </div>
                                )}
                                {entry.referenceNo && (
                                  <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                    UTR: {entry.referenceNo}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3.5 align-top">
                                <div className="font-bold text-slate-900 text-xs">
                                  {entry.itemTitle}
                                </div>
                                {entry.itemSubtitle && (
                                  <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                                    {entry.itemSubtitle}
                                  </div>
                                )}

                                {entry.taxDetails && entry.taxDetails.tax_amount > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                                      <span>GST {entry.taxDetails.gst_rate}%</span>
                                      {entry.taxDetails.tax_type === "intra_state" ? (
                                        <span className="font-normal text-blue-700">
                                          (CGST: {formatCurrency(entry.taxDetails.cgst_amount)} + SGST: {formatCurrency(entry.taxDetails.sgst_amount)})
                                        </span>
                                      ) : (
                                        <span className="font-normal text-blue-700">
                                          (IGST: {formatCurrency(entry.taxDetails.igst_amount)})
                                        </span>
                                      )}
                                    </span>

                                    {entry.freight_amount && entry.freight_amount > 0 ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-medium">
                                        Freight: {formatCurrency(entry.freight_amount)}
                                      </span>
                                    ) : null}
                                  </div>
                                )}

                                {entry.notes && (
                                  <div className="text-[10px] text-slate-400 italic mt-1">
                                    {entry.notes}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap align-top">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                                    entry.category === "cement"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : entry.category === "rod"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : entry.category === "daily"
                                      ? "bg-blue-50 text-blue-800 border-blue-200"
                                      : entry.category === "payment"
                                      ? "bg-teal-50 text-teal-800 border-teal-200"
                                      : entry.category === "return"
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {entry.categoryLabel}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 text-right whitespace-nowrap align-top">
                                {entry.creditPurchase > 0 ? (
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs">
                                      {formatCurrency(entry.creditPurchase)}
                                    </div>
                                    {entry.taxDetails && entry.taxDetails.tax_amount > 0 && (
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        Taxable: {formatCurrency(entry.taxDetails.taxable_subtotal)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              <td className="py-3 px-3.5 text-right whitespace-nowrap align-top">
                                {entry.debitPaid > 0 ? (
                                  <div className={`font-bold text-xs ${entry.category === "return" ? "text-rose-600" : "text-emerald-700"}`}>
                                    {formatCurrency(entry.debitPaid)}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              <td className="py-3 px-3.5 text-right whitespace-nowrap align-top">
                                <div className="inline-flex items-center gap-1 font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <span>{formatCurrency(entry.runningBalance)}</span>
                                  <span className="text-[9px] uppercase font-black text-rose-800">Cr</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                          <td colSpan={4} className="py-3 px-3.5 text-slate-800 uppercase text-[10px] tracking-wider font-extrabold">
                            Account Statement Totals
                          </td>
                          <td className="py-3 px-3.5 text-right font-black text-slate-900">
                            {formatCurrency(supplierLedgerEntries.reduce((s, e) => s + e.creditPurchase, 0))}
                          </td>
                          <td className="py-3 px-3.5 text-right font-black text-emerald-700">
                            {formatCurrency(supplierLedgerEntries.reduce((s, e) => s + e.debitPaid, 0))}
                          </td>
                          <td className="py-3 px-3.5 text-right font-black text-rose-700 font-mono">
                            {formatCurrency(selectedSupplier.current_balance)} Cr
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* Sub-Tab B: Supplier Payment Allocations */
                <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-4xl mx-auto space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      1. Unallocated Supplier Payments (Available to Link)
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Link supplier payments to specific unpaid purchase bills
                    </p>
                    {getSupplierUnallocatedPayments(selectedSupplier.id).length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        No unallocated payments for {selectedSupplier.name}.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                        {getSupplierUnallocatedPayments(selectedSupplier.id).map((p) => (
                          <div
                            key={p.id}
                            className="p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-emerald-700">
                                {p.voucher_number}
                              </span>{" "}
                              • {formatDate(p.payment_date)} •{" "}
                              <span className="font-semibold">{p.payment_mode}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">
                                Unallocated: {formatCurrency(p.unallocated_amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openAllocationModal(p)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                              >
                                Allocate to Bills
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      2. Outstanding Purchase Bills
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Unpaid and partially paid purchase invoices belonging to {selectedSupplier.name}
                    </p>
                    {getSupplierOutstandingBills(selectedSupplier.id).length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                        ✓ All purchase bills for this supplier are fully settled!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                        {getSupplierOutstandingBills(selectedSupplier.id).map((b) => (
                          <div
                            key={b.id}
                            className="p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-blue-700">
                                {b.purchase_number}
                              </span>{" "}
                              (Bill: {b.supplier_invoice_number}) • {formatDate(b.purchase_date)}
                              <div className="text-[11px] text-slate-500">
                                Total: {formatCurrency(b.total_amount)} • Paid:{" "}
                                {formatCurrency(b.settlement.allocated_payments)}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-rose-600">
                                Due: {formatCurrency(b.settlement.remaining_balance)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPaySupplierId(selectedSupplier.id);
                                  setPayDirectBillId(b.id);
                                  setPayAmount(String(b.settlement.remaining_balance));
                                  setShowAddPaymentModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                              >
                                Pay Bill
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allocation History & Reversal */}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      3. Payment Allocation History
                    </h4>
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl mt-2">
                      {supplierPayments
                        .filter((p) => p.supplier_id === selectedSupplier.id)
                        .flatMap((p) =>
                          (p.allocations || []).map((a) => ({ ...a, payment: p }))
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-emerald-700">
                                {item.payment.voucher_number}
                              </span>{" "}
                              ➔{" "}
                              <span className="font-mono font-bold text-blue-700">
                                {item.purchase_number}
                              </span>{" "}
                              • Allocated:{" "}
                              <strong>{formatCurrency(item.allocated_amount)}</strong>
                            </div>
                            {reversingAllocId === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Reason for reversal..."
                                  value={reversalReason}
                                  onChange={(e) => setReversalReason(e.target.value)}
                                  className="px-2 py-1 rounded border border-slate-300 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleConfirmReversal(item.payment.id, item.id)
                                  }
                                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReversingAllocId(null)}
                                  className="px-2 py-1 text-slate-500 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReversingAllocId(item.id)}
                                className="text-rose-600 hover:underline font-semibold text-[11px]"
                              >
                                Reverse Allocation
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: RECORD SUPPLIER PAYMENT                                      */}
      {/* ===================================================================== */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Payment to Supplier</h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Supplier *
                </label>
                <select
                  required
                  value={paySupplierId}
                  onChange={(e) => {
                    setPaySupplierId(e.target.value);
                    setPayDirectBillId("");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: {formatCurrency(s.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {paySupplierId && getSupplierOutstandingBills(paySupplierId).length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Link to Specific Purchase Bill (Optional)
                  </label>
                  <select
                    value={payDirectBillId}
                    onChange={(e) => setPayDirectBillId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">Leave Unallocated (Or Allocate Later)</option>
                    {getSupplierOutstandingBills(paySupplierId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.purchase_number} ({b.supplier_invoice_number}) — Due:{" "}
                        {formatCurrency(b.settlement.remaining_balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    {paymentModes
                      .filter((m) => m.isActive)
                      .map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.label} ({m.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. SBI NEFT Ref..."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Payment Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: ALLOCATE SUPPLIER PAYMENT TO PURCHASE BILLS                  */}
      {/* ===================================================================== */}
      {allocModalPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Allocate Supplier Payment #{allocModalPayment.voucher_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Supplier: <strong>{allocModalPayment.supplier_name}</strong> • Available Credit:{" "}
                  <strong className="text-emerald-700">
                    {formatCurrency(allocModalPayment.unallocated_amount)}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setAllocModalPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allocError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{allocError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAllocation} className="space-y-4 text-xs">
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {getSupplierOutstandingBills(allocModalPayment.supplier_id).length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No unpaid purchase bills found for this supplier.
                  </div>
                ) : (
                  getSupplierOutstandingBills(allocModalPayment.supplier_id).map((b) => (
                    <div key={b.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.purchase_number}{" "}
                          <span className="text-slate-500 font-normal">
                            ({formatDate(b.purchase_date)})
                          </span>
                        </div>
                        <div className="text-[11px] text-rose-600 font-semibold">
                          Remaining Due: {formatCurrency(b.settlement.remaining_balance)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAllocInputs({
                              ...allocInputs,
                              [b.id]: String(
                                Math.min(
                                  allocModalPayment.unallocated_amount,
                                  b.settlement.remaining_balance
                                )
                              ),
                            })
                          }
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-blue-600"
                        >
                          Full
                        </button>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={allocInputs[b.id] || ""}
                          onChange={(e) =>
                            setAllocInputs({ ...allocInputs, [b.id]: e.target.value })
                          }
                          className="w-28 px-2.5 py-1.5 rounded border border-slate-300 text-right font-bold"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAllocModalPayment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: ISSUE PURCHASE RETURN (DEBIT NOTE)                           */}
      {/* ===================================================================== */}
      {showAddReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Issue Debit Note (Purchase Return)
              </h3>
              <button
                onClick={() => setShowAddReturnModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                <select
                  required
                  value={retSupplierId}
                  onChange={(e) => setRetSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Return Date *</label>
                  <input
                    type="date"
                    required
                    value={retDate}
                    onChange={(e) => setRetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Category *</label>
                  <select
                    value={retItemType}
                    onChange={(e) => {
                      const val = e.target.value as "CEMENT" | "ROD" | "ELECTRIC";
                      setRetItemType(val);
                      if (val === "CEMENT" && cementBrands.length > 0)
                        setRetBrandOrSize(cementBrands[0].name);
                      else if (val === "ROD" && rodSizes.length > 0)
                        setRetBrandOrSize(rodSizes[0].size);
                      else setRetBrandOrSize("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="CEMENT">CEMENT</option>
                    <option value="ROD">ROD / STEEL</option>
                    <option value="ELECTRIC">ELECTRICAL / HARDWARE</option>
                  </select>
                </div>
              </div>

              {retItemType !== "ELECTRIC" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {retItemType === "CEMENT" ? "Cement Brand" : "Rod Size"}
                    </label>
                    <select
                      value={retBrandOrSize}
                      onChange={(e) => setRetBrandOrSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {retItemType === "CEMENT"
                        ? cementBrands.map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name}
                            </option>
                          ))
                        : rodSizes.map((s) => (
                            <option key={s.id} value={s.size}>
                              {s.size}
                            </option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Qty Returned ({retItemType === "CEMENT" ? "Bags" : "Kg"})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 10"
                      value={retQty}
                      onChange={(e) => setRetQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Debit Note Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={retAmount}
                  onChange={(e) => setRetAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damaged bags during transit"
                  value={retReason}
                  onChange={(e) => setRetReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReturnModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Issue Debit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: ADD NEW SUPPLIER                                             */}
      {/* ===================================================================== */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Supplier / Vendor</h3>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC CEMENT REGIONAL DEPOT"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94370 00000"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="21AAAAA0000A1Z5"
                    value={newSupGstin}
                    onChange={(e) => setNewSupGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supply Category</label>
                  <select
                    value={newSupCategory}
                    onChange={(e) => setNewSupCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="all">All Categories</option>
                    <option value="cement">Cement</option>
                    <option value="rod">Rod / Steel</option>
                    <option value="daily">Electrical & Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening Payable (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSupOpening}
                    onChange={(e) => setNewSupOpening(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Bhubaneswar / Cuttack"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal (Admin & Owner Full Control) */}
      {showEditSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Supplier Profile</h3>
                  <p className="text-[11px] text-slate-500">
                    Update profile, category, contact, & opening payable
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierEdit} className="p-5 space-y-4 text-xs">
              {editSupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editSupSuccess}</span>
                </div>
              )}
              {editSupError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editSupError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSupData.name}
                  onChange={(e) => setEditSupData({ ...editSupData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editSupData.phone}
                    onChange={(e) => setEditSupData({ ...editSupData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={editSupData.gstin}
                    onChange={(e) => setEditSupData({ ...editSupData, gstin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supply Category</label>
                  <select
                    value={editSupData.category}
                    onChange={(e) => setEditSupData({ ...editSupData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                  >
                    <option value="all">All Categories</option>
                    <option value="cement">Cement</option>
                    <option value="rod">Rod / Steel</option>
                    <option value="daily">Electrical & Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Opening Payable (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSupData.opening_balance}
                    onChange={(e) =>
                      setEditSupData({ ...editSupData, opening_balance: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  value={editSupData.address}
                  onChange={(e) => setEditSupData({ ...editSupData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

