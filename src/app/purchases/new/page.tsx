"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  getSuppliers,
  createSupplier,
  createPurchaseBill,
  getCementBrands,
  getRodSizes,
  getPaymentModes,
  calculateInventoryStock,
  getStoredUserRole,
} from "@/lib/storage";
import {
  Supplier,
  BillCategory,
  PurchaseBill,
  CementBrand,
  RodSize,
  PaymentMode,
  PaymentModeOption,
  StockItemSummary,
} from "@/lib/types";
import { formatCurrency, getTodayDateString } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
  Settings2,
  Truck,
  Package,
  Hammer,
  Zap,
  Building2,
  CreditCard,
  Receipt,
  Percent,
} from "lucide-react";
import {
  CementBrandManagerModal,
  RodSizeManagerModal,
  PaymentModeManagerModal,
} from "@/components/admin/MasterCatalogModals";

export default function CreatePurchaseBillPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupGstin, setNewSupGstin] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");
  const [newSupCategory, setNewSupCategory] = useState<"cement" | "rod" | "daily" | "all">("all");
  const [newSupOpening, setNewSupOpening] = useState("0");

  // Purchase Voucher Fields
  const [category, setCategory] = useState<BillCategory>("cement");
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString());
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [successBill, setSuccessBill] = useState<PurchaseBill | null>(null);

  // GST Tax States (Odisha Intra-State split: 50% CGST + 50% SGST)
  const [taxType, setTaxType] = useState<"intra_state" | "inter_state">("intra_state");
  const [gstRate, setGstRate] = useState<number>(28); // Default 28% for Cement (14% CGST + 14% SGST)

  // Cement Fields
  const [cementType, setCementType] = useState("LNT");
  const [cementBags, setCementBags] = useState("");
  const [cementPurchaseRate, setCementPurchaseRate] = useState("");

  // Rod Fields
  const [rodSize, setRodSize] = useState("10mm");
  const [rodKg, setRodKg] = useState("");
  const [rodPurchaseRate, setRodPurchaseRate] = useState("");

  // Electrical / Hardware Items
  const [dailyItems, setDailyItems] = useState([
    { name: "", qty: "" as any, rate: "" as any, amount: 0 },
  ]);

  // Immediate Payment Option at Purchase Entry
  const [settlementType, setSettlementType] = useState<"credit" | "full" | "partial">("credit");
  const [partialPaidAmount, setPartialPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("SBI");
  const [paymentRef, setPaymentRef] = useState("");

  // Master Catalogs & Stock
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [rodSizes, setRodSizes] = useState<RodSize[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [cementStockMap, setCementStockMap] = useState<Record<string, StockItemSummary>>({});
  const [rodStockMap, setRodStockMap] = useState<Record<string, StockItemSummary>>({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [showCementModal, setShowCementModal] = useState(false);
  const [showRodModal, setShowRodModal] = useState(false);
  const [showPayModesModal, setShowPayModesModal] = useState(false);

  const handleCategorySelect = (newCat: BillCategory) => {
    setCategory(newCat);
    if (newCat === "cement") {
      setGstRate(28); // Standard Cement GST: 28% (14% CGST + 14% SGST)
    } else if (newCat === "rod") {
      setGstRate(18); // Standard TMT Rods GST: 18% (9% CGST + 9% SGST)
    } else {
      setGstRate(18); // Standard Electrical GST: 18% (9% CGST + 9% SGST)
    }
  };

  const loadAll = () => {
    setSuppliers(getSuppliers());
    const bList = getCementBrands();
    const sList = getRodSizes();
    const pModes = getPaymentModes();
    setCementBrands(bList);
    setRodSizes(sList);
    setPaymentModes(pModes);

    const stock = calculateInventoryStock();
    const cMap: Record<string, StockItemSummary> = {};
    stock.cementStock.forEach((s) => {
      cMap[s.name.toUpperCase()] = s;
    });
    setCementStockMap(cMap);

    const rMap: Record<string, StockItemSummary> = {};
    stock.rodStock.forEach((s) => {
      rMap[s.name.toLowerCase()] = s;
    });
    setRodStockMap(rMap);

    const activeB = bList.filter((b) => b.isActive);
    if (activeB.length > 0 && !activeB.some((b) => b.name === cementType)) {
      setCementType(activeB[0].name);
    }

    const activeS = sList.filter((s) => s.isActive);
    if (activeS.length > 0 && !activeS.some((s) => s.size === rodSize)) {
      setRodSize(activeS[0].size);
    }

    const session = getClientSession();
    const role = session?.user?.role || getStoredUserRole();
    setIsAdmin(role === "admin" || role === "owner");
  };

  useEffect(() => {
    loadAll();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      if (catParam === "cement" || catParam === "rod" || catParam === "daily") {
        setCategory(catParam);
        if (catParam === "cement") setGstRate(28);
        else setGstRate(18);
      }
    }
    window.addEventListener("tpm_data_updated", loadAll);
    return () => window.removeEventListener("tpm_data_updated", loadAll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Totals & GST calculation
  const cementSubtotal = (parseFloat(cementBags) || 0) * (parseFloat(cementPurchaseRate) || 0);
  const rodSubtotal = (parseFloat(rodKg) || 0) * (parseFloat(rodPurchaseRate) || 0);
  const dailySubtotal = dailyItems.reduce((acc, it) => acc + (it.amount || 0), 0);

  const itemsSubtotal =
    category === "cement" ? cementSubtotal : category === "rod" ? rodSubtotal : dailySubtotal;
  const freight = parseFloat(freightAmount) || 0;

  // Split into CGST & SGST (50% each for Intra-State) or IGST (100% for Inter-State)
  const cgstRate = taxType === "intra_state" ? Number((gstRate / 2).toFixed(2)) : 0;
  const sgstRate = taxType === "intra_state" ? Number((gstRate / 2).toFixed(2)) : 0;
  const igstRate = taxType === "inter_state" ? gstRate : 0;

  const cgstAmount =
    taxType === "intra_state" ? Number(((itemsSubtotal * cgstRate) / 100).toFixed(2)) : 0;
  const sgstAmount =
    taxType === "intra_state" ? Number(((itemsSubtotal * sgstRate) / 100).toFixed(2)) : 0;
  const igstAmount =
    taxType === "inter_state" ? Number(((itemsSubtotal * igstRate) / 100).toFixed(2)) : 0;
  const totalTax =
    taxType === "intra_state"
      ? Number((cgstAmount + sgstAmount).toFixed(2))
      : Number(igstAmount.toFixed(2));

  const currentTotal = Number((itemsSubtotal + freight + totalTax).toFixed(2));

  const matchingSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone || "").includes(q) ||
        (s.gstin || "").toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q)
    );
  }, [suppliers, supplierSearch]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierId(s.id);
    setSupplierSearch(s.name);
    setIsDropdownOpen(false);
    // If supplier GSTIN is present and outside Odisha (state code != 21), default to inter-state IGST
    if (s.gstin && s.gstin.trim().length >= 2 && !s.gstin.trim().startsWith("21")) {
      setTaxType("inter_state");
    } else {
      setTaxType("intra_state");
    }
  };

  const handleQuickCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    const created = createSupplier({
      name: newSupName,
      phone: newSupPhone,
      gstin: newSupGstin,
      address: newSupAddress,
      supply_category: newSupCategory,
      opening_balance: parseFloat(newSupOpening) || 0,
    });
    loadAll();
    handleSelectSupplier(created);
    setShowAddSupplierModal(false);
    setNewSupName("");
    setNewSupPhone("");
    setNewSupGstin("");
    setNewSupAddress("");
    setNewSupOpening("0");
  };

  const handleAddDailyItem = () => {
    setDailyItems([...dailyItems, { name: "", qty: "" as any, rate: "" as any, amount: 0 }]);
  };

  const handleDailyItemChange = (index: number, field: string, val: any) => {
    const updated = [...dailyItems];
    updated[index] = { ...updated[index], [field]: val };
    if (field === "qty" || field === "rate") {
      const q = parseFloat(field === "qty" ? val : updated[index].qty) || 0;
      const r = parseFloat(field === "rate" ? val : updated[index].rate) || 0;
      updated[index].amount = q * r;
    }
    setDailyItems(updated);
  };

  const handleRemoveDailyItem = (index: number) => {
    if (dailyItems.length <= 1) return;
    setDailyItems(dailyItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || currentTotal <= 0) return;

    const paidNow =
      settlementType === "full"
        ? currentTotal
        : settlementType === "partial"
        ? Math.min(currentTotal, parseFloat(partialPaidAmount) || 0)
        : 0;

    const billPayload: Parameters<typeof createPurchaseBill>[0] = {
      supplier_id: selectedSupplier.id,
      supplier_name: selectedSupplier.name,
      supplier_invoice_number: supplierInvoiceNo,
      supplier_gstin: selectedSupplier.gstin,
      bill_category: category,
      purchase_date: purchaseDate,
      vehicle_number: vehicleNumber,
      subtotal: itemsSubtotal,
      freight_amount: freight,
      tax_type: taxType,
      gst_rate: gstRate,
      cgst_rate: cgstRate,
      sgst_rate: sgstRate,
      igst_rate: igstRate,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      tax_amount: totalTax,
      total_amount: currentTotal,
      notes,
      items: [],
      paid_amount: paidNow,
      payment_mode: paymentMode,
      payment_reference: paymentRef,
    };

    if (category === "cement") {
      const bags = parseFloat(cementBags) || 0;
      const rate = parseFloat(cementPurchaseRate) || 0;
      billPayload.cement_details = {
        cement_type: cementType,
        qty_bags: bags,
        unit_rate: rate,
        amount: cementSubtotal,
      };
      billPayload.items = [
        {
          id: "pitem-1",
          bill_id: "",
          item_name: `Cement Purchase - ${cementType}`,
          item_category: "CEMENT",
          quantity: bags,
          unit: "BAGS",
          unit_price: rate,
          total_amount: cementSubtotal,
        },
      ];
    } else if (category === "rod") {
      const kg = parseFloat(rodKg) || 0;
      const rate = parseFloat(rodPurchaseRate) || 0;
      billPayload.rod_details = {
        rod_size: rodSize,
        qty_kg: kg,
        rate_per_kg: rate,
        amount: rodSubtotal,
      };
      billPayload.items = [
        {
          id: "pitem-1",
          bill_id: "",
          item_name: `TMT Steel Rod Purchase - ${rodSize}`,
          item_category: "ROD",
          quantity: kg,
          unit: "KG",
          unit_price: rate,
          total_amount: rodSubtotal,
        },
      ];
    } else {
      billPayload.daily_details = {
        item_type: "ELECTRIC",
        amount: dailySubtotal,
      };
      billPayload.items = dailyItems.map((it, idx) => ({
        id: `pitem-${idx}`,
        bill_id: "",
        item_name: it.name || "Electrical / Hardware Stock",
        item_category: "DAILY",
        quantity: parseFloat(it.qty) || 1,
        unit: "NOS",
        unit_price: parseFloat(it.rate) || 0,
        total_amount: it.amount || 0,
      }));
    }

    const created = createPurchaseBill(billPayload);
    setSuccessBill(created);
    loadAll();
  };

  const resetFormForNext = () => {
    setSuccessBill(null);
    setSupplierInvoiceNo("");
    setVehicleNumber("");
    setFreightAmount("");
    setCementBags("");
    setCementPurchaseRate("");
    setRodKg("");
    setRodPurchaseRate("");
    setDailyItems([{ name: "", qty: "" as any, rate: "" as any, amount: 0 }]);
    setSettlementType("credit");
    setPartialPaidAmount("");
    setPaymentRef("");
    setNotes("");
    setTaxType("intra_state");
    setGstRate(category === "cement" ? 28 : 18);
  };

  const activeCementStock = cementStockMap[cementType.toUpperCase()];
  const activeRodStock = rodStockMap[rodSize.toLowerCase()];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Record Purchase Bill & Stock Inward
            </h1>
            <p className="text-sm text-slate-500">
              Enter supplier invoices to automatically update godown inventory and supplier payable ledgers
            </p>
          </div>
        </div>

        <Link
          href="/inventory"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>View Godown Stock</span>
        </Link>
      </div>

      {successBill ? (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-5 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Stock Inward & Payable Posted
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Purchase Voucher #{successBill.purchase_number} Recorded Successfully!
              </h2>
              <p className="text-xs text-slate-500">
                Supplier: <strong className="text-slate-800">{successBill.supplier_name}</strong> •
                Supplier Invoice: <strong className="font-mono">{successBill.supplier_invoice_number}</strong>
                {successBill.supplier_gstin && (
                  <span>
                    {" "}• GSTIN: <strong className="font-mono">{successBill.supplier_gstin}</strong>
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Total Purchase Value</div>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(successBill.total_amount)}
              </div>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  successBill.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : successBill.payment_status === "partially_paid"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {successBill.payment_status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Tax Breakdown Details Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxable Subtotal</span>
              <span className="font-bold text-slate-800">{formatCurrency(successBill.subtotal)}</span>
            </div>
            {successBill.tax_type === "intra_state" ? (
              <>
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase block">
                    CGST ({successBill.cgst_rate}%)
                  </span>
                  <span className="font-bold text-blue-900">{formatCurrency(successBill.cgst_amount || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase block">
                    SGST ({successBill.sgst_rate}%)
                  </span>
                  <span className="font-bold text-indigo-900">{formatCurrency(successBill.sgst_amount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <span className="text-[10px] text-purple-600 font-bold uppercase block">
                  IGST ({successBill.igst_rate}%)
                </span>
                <span className="font-bold text-purple-900">{formatCurrency(successBill.igst_amount || 0)}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Freight Charges</span>
              <span className="font-bold text-slate-800">{formatCurrency(successBill.freight_amount)}</span>
            </div>
          </div>

          {successBill.cement_details && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950">
                  +{successBill.cement_details.qty_bags} Bags of {successBill.cement_details.cement_type}
                </span>{" "}
                <span className="text-emerald-700">added to Godown Stock</span>
              </div>
              <span className="font-bold text-emerald-900">
                Updated Stock:{" "}
                {cementStockMap[successBill.cement_details.cement_type.toUpperCase()]?.available_stock ??
                  successBill.cement_details.qty_bags}{" "}
                Bags
              </span>
            </div>
          )}

          {successBill.rod_details && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950">
                  +{successBill.rod_details.qty_kg} Kg of {successBill.rod_details.rod_size} TMT Rod
                </span>{" "}
                <span className="text-amber-700">added to Godown Stock</span>
              </div>
              <span className="font-bold text-amber-900">
                Updated Stock:{" "}
                {rodStockMap[successBill.rod_details.rod_size.toLowerCase()]?.available_stock ??
                  successBill.rod_details.qty_kg}{" "}
                Kg
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Link
              href="/inventory"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              View Live Inventory
            </Link>
            <Link
              href="/purchases"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              Go to Purchases & Suppliers
            </Link>
            <button
              type="button"
              onClick={resetFormForNext}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
            >
              + Record Another Purchase
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Purchase Stock Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "cement",
                    label: "Cement Stock Inward",
                    desc: "Bags & Brand purchase rates",
                    icon: Package,
                  },
                  {
                    id: "rod",
                    label: "Rod / Steel Stock Inward",
                    desc: "Kg weight & Rebar rates",
                    icon: Hammer,
                  },
                  {
                    id: "daily",
                    label: "Electrical & Hardware",
                    desc: "Wholesale items & supplies",
                    icon: Zap,
                  },
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id as BillCategory)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        category === cat.id
                          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          category === cat.id
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div
                          className={`font-bold text-xs ${
                            category === cat.id ? "text-blue-700" : "text-slate-800"
                          }`}
                        >
                          {cat.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Supplier & Invoice Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              {/* Supplier Searchable Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Supplier / Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Supplier</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Select or search supplier (e.g. L&T, Dalmia, Odisha Steel...)"
                    value={supplierSearch}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setSelectedSupplierId("");
                      setIsDropdownOpen(true);
                    }}
                    className={`w-full pl-9 pr-14 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all font-medium ${
                      selectedSupplier
                        ? "border-emerald-500 bg-emerald-50/20 text-slate-900 font-bold focus:ring-emerald-500/20"
                        : "border-slate-200 bg-white text-slate-800 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSupplierId("");
                          setSupplierSearch("");
                          setIsDropdownOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-40 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {matchingSuppliers.length === 0 ? (
                      <div className="p-3 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          No supplier matching &ldquo;{supplierSearch}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSupName(supplierSearch.toUpperCase());
                            setShowAddSupplierModal(true);
                            setIsDropdownOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          + Create Supplier &ldquo;{supplierSearch.toUpperCase()}&rdquo;
                        </button>
                      </div>
                    ) : (
                      matchingSuppliers.map((sup) => (
                        <button
                          type="button"
                          key={sup.id}
                          onClick={() => handleSelectSupplier(sup)}
                          className={`w-full px-3.5 py-2.5 text-left text-xs hover:bg-blue-50/80 flex items-center justify-between transition-colors ${
                            selectedSupplierId === sup.id ? "bg-blue-50 font-bold" : ""
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">{sup.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {sup.code} {sup.gstin ? `• GSTIN: ${sup.gstin}` : ""}{" "}
                              {sup.phone ? `• ${sup.phone}` : ""}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Payable Due</span>
                            <span
                              className={`font-bold text-xs ${
                                sup.current_balance > 0 ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(sup.current_balance)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedSupplier && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-950">{selectedSupplier.name}</div>
                        <div className="text-[10px] text-emerald-700">
                          {selectedSupplier.gstin
                            ? `GSTIN: ${selectedSupplier.gstin}`
                            : selectedSupplier.phone || "Verified Supplier"}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-900 text-xs">
                      Payable Due: {formatCurrency(selectedSupplier.current_balance)}
                    </span>
                  </div>
                )}
              </div>

              {/* Invoice No, Date & Truck No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier Bill / Challan #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-8841"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Truck / Vehicle No.
                  </label>
                  <div className="relative">
                    <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="OD-02-..."
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border border-slate-200 uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Form Details */}
            {category === "cement" && (
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Cement Stock Inward Details
                  </div>
                  {activeCementStock && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 text-[11px] font-bold text-emerald-800">
                      Current {cementType} Stock: {activeCementStock.available_stock} Bags
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Cement Brand <span className="text-rose-500">*</span>
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowCementModal(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={cementType}
                      onChange={(e) => setCementType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {cementBrands
                        .filter((b) => b.isActive || b.name === cementType)
                        .map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity Purchased (Bags) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 200"
                      value={cementBags}
                      onChange={(e) => setCementBags(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Purchase Cost per Bag (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      placeholder="e.g. 305"
                      value={cementPurchaseRate}
                      onChange={(e) => setCementPurchaseRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Freight / Unloading (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0.00"
                      value={freightAmount}
                      onChange={(e) => setFreightAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "rod" && (
              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    TMT Steel Rod Stock Inward Details
                  </div>
                  {activeRodStock && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-amber-800">
                      Current {rodSize} Stock: {activeRodStock.available_stock} Kg
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Rod Size <span className="text-rose-500">*</span>
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowRodModal(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-2 py-0.5 rounded"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={rodSize}
                      onChange={(e) => setRodSize(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {rodSizes
                        .filter((s) => s.isActive || s.size === rodSize)
                        .map((s) => (
                          <option key={s.id} value={s.size}>
                            {s.size}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity Purchased (Kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.1"
                      required
                      placeholder="e.g. 2000"
                      value={rodKg}
                      onChange={(e) => setRodKg(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Purchase Rate per Kg (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      placeholder="e.g. 61.50"
                      value={rodPurchaseRate}
                      onChange={(e) => setRodPurchaseRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Freight / Transport (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0.00"
                      value={freightAmount}
                      onChange={(e) => setFreightAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "daily" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Electrical & Hardware Wholesale Items</span>
                  <button
                    type="button"
                    onClick={handleAddDailyItem}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {dailyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Item Description (e.g. Polycab 2.5mm Coils / Havells MCB Box)"
                          value={item.name}
                          onChange={(e) => handleDailyItemChange(idx, "name", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleDailyItemChange(idx, "qty", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white text-center"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          placeholder="Cost (₹)"
                          value={item.rate}
                          onChange={(e) => handleDailyItemChange(idx, "rate", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white text-right"
                        />
                      </div>
                      <div className="w-28 text-right font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </div>
                      {dailyItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDailyItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-3 pt-2">
                  <label className="text-xs font-semibold text-slate-700">Freight / Transport Charges (₹):</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0.00"
                    value={freightAmount}
                    onChange={(e) => setFreightAmount(e.target.value)}
                    className="w-36 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold"
                  />
                </div>
              </div>
            )}

            {/* 2. GST Tax Breakdown (SGST & CGST) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>2. GST Tax Breakdown (SGST & CGST)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Odisha Intra-State purchases split equally into Central (CGST) & State (SGST)
                  </p>
                </div>

                {/* Intra-State vs Inter-State toggle */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTaxType("intra_state")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      taxType === "intra_state"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Intra-State (CGST + SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType("inter_state")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      taxType === "inter_state"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Inter-State (IGST)
                  </button>
                </div>
              </div>

              {/* Rate Presets & Custom */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-700">GST Slab:</span>
                {[
                  { rate: 28, label: "28% (Cement)" },
                  { rate: 18, label: "18% (Steel/Rod)" },
                  { rate: 12, label: "12% (Hardware)" },
                  { rate: 5, label: "5%" },
                  { rate: 0, label: "0% (Exempt)" },
                ].map((slab) => (
                  <button
                    type="button"
                    key={slab.rate}
                    onClick={() => setGstRate(slab.rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      gstRate === slab.rate
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {slab.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-slate-500 font-medium">Custom GST %:</span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={gstRate}
                      onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                      className="w-20 pl-2 pr-6 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold text-center"
                    />
                    <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Live Tax Computation Display Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxable Subtotal</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(itemsSubtotal)}</span>
                </div>

                {taxType === "intra_state" ? (
                  <>
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-700 font-bold uppercase">CGST ({cgstRate}%)</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">Central Tax</span>
                      </div>
                      <span className="text-sm font-black text-blue-900">{formatCurrency(cgstAmount)}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-indigo-700 font-bold uppercase">SGST ({sgstRate}%)</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold">State Tax</span>
                      </div>
                      <span className="text-sm font-black text-indigo-900">{formatCurrency(sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 p-2.5 rounded-lg bg-purple-50/70 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-purple-700 font-bold uppercase">IGST ({igstRate}%)</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold">Inter-State Integrated Tax</span>
                    </div>
                    <span className="text-sm font-black text-purple-900">{formatCurrency(igstAmount)}</span>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total GST Tax</span>
                  <span className="text-sm font-black text-emerald-900">{formatCurrency(totalTax)}</span>
                </div>
              </div>
            </div>

            {/* 3. Payment Settlement Option at Purchase Entry */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>3. Payment Settlement Status</span>
                </label>

                <div className="flex items-center gap-2">
                  {[
                    { id: "credit", label: "On Credit (Unpaid)" },
                    { id: "full", label: "Paid in Full" },
                    { id: "partial", label: "Partial Payment" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSettlementType(opt.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        settlementType === opt.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {settlementType !== "credit" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                  {settlementType === "partial" && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Amount Paid Now (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        max={currentTotal}
                        placeholder="0.00"
                        value={partialPaidAmount}
                        onChange={(e) => setPartialPaidAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-emerald-700"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Payment Mode *</label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowPayModesModal(true)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      {paymentModes
                        .filter((m) => m.isActive || m.code === paymentMode)
                        .map((m) => (
                          <option key={m.id} value={m.code}>
                            {m.label} ({m.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank / UTR / Cheque Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NEFT / Cheque No."
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Remarks / Godown Unloading Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Unloaded at Godown #1, verified 200 bags intact..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
              />
            </div>

            {/* Footer Total & Submit */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Total Purchase Bill Value (Incl. GST)
                </span>
                <div className="text-2xl font-black text-emerald-400">
                  {formatCurrency(currentTotal)}
                </div>
                <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-2">
                  <span>Taxable: <strong className="text-white">{formatCurrency(itemsSubtotal)}</strong></span>
                  {freight > 0 && <span>• Freight: <strong className="text-white">{formatCurrency(freight)}</strong></span>}
                  {taxType === "intra_state" ? (
                    <span>
                      • CGST ({cgstRate}%): <strong className="text-blue-300">{formatCurrency(cgstAmount)}</strong>
                      {" "}• SGST ({sgstRate}%): <strong className="text-indigo-300">{formatCurrency(sgstAmount)}</strong>
                    </span>
                  ) : (
                    <span>
                      • IGST ({igstRate}%): <strong className="text-purple-300">{formatCurrency(igstAmount)}</strong>
                    </span>
                  )}
                </div>
                {!selectedSupplierId && (
                  <span className="text-[11px] text-amber-300 font-medium block">
                    ⚠️ Select a supplier to post purchase bill
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/purchases"
                  className="px-4 py-2.5 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={!selectedSupplierId || currentTotal <= 0}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Post Purchase & Add Stock</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Quick Create Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Add New Supplier / Vendor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHREE CEMENT AUTHORISED DEPOT"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 94370 00000"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
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
                    <option value="cement">Cement Supplier</option>
                    <option value="rod">TMT Steel / Rod Supplier</option>
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
                <label className="block font-semibold text-slate-700 mb-1">Depot / Office Address</label>
                <input
                  type="text"
                  placeholder="e.g. Cuttack / Bhubaneswar Industrial Area"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Catalog Modals */}
      <CementBrandManagerModal
        isOpen={showCementModal}
        onClose={() => setShowCementModal(false)}
        onBrandCreated={(b) => setCementType(b.name)}
      />
      <RodSizeManagerModal
        isOpen={showRodModal}
        onClose={() => setShowRodModal(false)}
        onSizeCreated={(s) => setRodSize(s.size)}
      />
      <PaymentModeManagerModal
        isOpen={showPayModesModal}
        onClose={() => setShowPayModesModal(false)}
        onModeCreated={(m) => setPaymentMode(m.code as PaymentMode)}
      />
    </div>
  );
}

