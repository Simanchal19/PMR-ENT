"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getCementBrands,
  getRodSizes,
  getHardwareItems,
  getCustomers,
  getBusinessProfile,
  createEstimate,
  getEstimates,
  deleteEstimate,
} from "@/lib/storage";
import { EstimateItem, HouseEstimate, Customer } from "@/lib/types";
import { formatCurrency, getTodayDateString } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/pdfExport";
import {
  Calculator,
  Plus,
  Trash2,
  Printer,
  FileDown,
  Save,
  RotateCcw,
  Sparkles,
  Building2,
  Phone,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  FolderOpen,
  X,
  MapPin,
  ArrowRight,
  Info,
} from "lucide-react";

// Standard construction materials presets for quick 1-click house estimation
const HOUSE_CONSTRUCTION_PRESETS: Array<{
  product_name: string;
  quantity: number;
  unit: string;
  rate: number;
}> = [
  { product_name: "LNT UltraTech Cement (Foundation & RCC)", quantity: 250, unit: "Bags", rate: 340 },
  { product_name: "16mm TMT Steel Rebar (Pillars & Footings)", quantity: 800, unit: "Kg", rate: 68 },
  { product_name: "12mm TMT Steel Rebar (Roof Slab & Beams)", quantity: 1500, unit: "Kg", rate: 68 },
  { product_name: "10mm TMT Steel Rebar (Slab Distribution)", quantity: 1200, unit: "Kg", rate: 70 },
  { product_name: "8mm TMT Steel Rebar (Stirrups / Rings)", quantity: 600, unit: "Kg", rate: 71 },
  { product_name: "Binding Wire (GI Annealed)", quantity: 50, unit: "Kg", rate: 75 },
  { product_name: "Red Bricks (Super Grade Walls)", quantity: 8000, unit: "Pcs", rate: 8.5 },
  { product_name: "River Sand (Concrete & Plastering)", quantity: 6, unit: "Trips", rate: 3200 },
  { product_name: "Stone Chips / Aggregates (20mm Gitti)", quantity: 4, unit: "Trips", rate: 4500 },
  { product_name: "Electrical PVC Conduit Pipes (25mm Heavy)", quantity: 40, unit: "Pcs", rate: 85 },
  { product_name: "Polycab 2.5mm Wire (90m Coil)", quantity: 6, unit: "Coils", rate: 2450 },
  { product_name: "Polycab 1.5mm Wire (90m Coil)", quantity: 6, unit: "Coils", rate: 1650 },
  { product_name: "Anchor Modular 6M Switch Plates & Switches", quantity: 15, unit: "Sets", rate: 450 },
  { product_name: "Havells 16A Single Pole MCB & Distribution Box", quantity: 1, unit: "Set", rate: 2850 },
  { product_name: "Plumbing PVC Water & Drainage Pipes (Supreme)", quantity: 20, unit: "Pcs", rate: 420 },
];

export default function EstimatePage() {
  const [estimateDate, setEstimateDate] = useState<string>(getTodayDateString());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [projectTitle, setProjectTitle] = useState("Residential House Construction");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("Rates valid for 15 days. Subject to market steel & cement price updates.");

  // Line items state - contains Automatic Sl. No, Product Name, Quantity, Unit, Rate, Total Amount
  const [items, setItems] = useState<EstimateItem[]>([
    { id: "item-1", serial_no: 1, product_name: "LNT Cement", quantity: 100, unit: "Bags", rate: 340, total_amount: 34000 },
    { id: "item-2", serial_no: 2, product_name: "12mm TMT Steel Rebar", quantity: 500, unit: "Kg", rate: 68, total_amount: 34000 },
    { id: "item-3", serial_no: 3, product_name: "10mm TMT Steel Rebar", quantity: 400, unit: "Kg", rate: 70, total_amount: 28000 },
    { id: "item-4", serial_no: 4, product_name: "8mm TMT Steel Rebar", quantity: 200, unit: "Kg", rate: 71, total_amount: 14200 },
    { id: "item-5", serial_no: 5, product_name: "", quantity: 0, unit: "Pcs", rate: 0, total_amount: 0 },
  ]);

  // Master Catalogs for quick autocomplete
  const [catalogSuggestions, setCatalogSuggestions] = useState<string[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>({
    name: "THE PRAMOD MAHARAJ ENTERPRISES",
    address: "Market Complex, G.T. Road, Bhubaneswar, Odisha 751001",
    phone: "+91 94370 12345",
    gstin: "21AAAAA1234A1Z5",
    email: "info@pramodmaharaj.in",
  });

  // Saved Estimates Drawer
  const [savedEstimates, setSavedEstimates] = useState<HouseEstimate[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const productInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load catalogs on mount
  useEffect(() => {
    try {
      const cBrands = getCementBrands().map((b) => `${b.name} Cement`);
      const rSizes = getRodSizes().map((s) => `TMT Steel Rod ${s.size}`);
      const hItems = getHardwareItems().map((h) => h.name);
      const commonBuilding = [
        "Red Bricks (First Class)",
        "Fly Ash Bricks",
        "River Sand (M-Sand)",
        "Plastering Sand",
        "Stone Chips 20mm (Gitti)",
        "Stone Chips 40mm",
        "Binding Wire (GI)",
        "Cover Blocks (20mm/25mm)",
        "Plumbing PVC Pipes (Supreme)",
        "CPVC Water Pipes",
        "Electrical Conduit Pipes (25mm)",
        "Polycab 2.5mm Wire (90m Coil)",
        "Polycab 1.5mm Wire (90m Coil)",
        "Polycab 4.0mm Wire (90m Coil)",
        "Anchor 16A Modular Switch",
        "Anchor 6A Modular Switch",
        "Havells MCB Distribution Board",
        "Wall Putty (JK / Birla)",
        "White Cement",
        "Waterproofing Chemical (Dr. Fixit)",
      ];

      const combined = Array.from(new Set([...cBrands, ...rSizes, ...hItems, ...commonBuilding]));
      setCatalogSuggestions(combined);

      setExistingCustomers(getCustomers());
      setSavedEstimates(getEstimates());

      const profile = getBusinessProfile();
      if (profile && profile.name) {
        setBusinessProfile(profile);
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Recalculate automatic serial numbers and totals
  const updateItemsAndRenumber = (newItems: EstimateItem[]) => {
    const renumbered = newItems.map((it, idx) => ({
      ...it,
      serial_no: idx + 1,
      total_amount: Math.round((Number(it.quantity) || 0) * (Number(it.rate) || 0) * 100) / 100,
    }));
    setItems(renumbered);
  };

  const handleItemChange = (index: number, field: keyof EstimateItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Auto-compute total amount
    if (field === "quantity" || field === "rate") {
      const q = parseFloat(field === "quantity" ? value : item.quantity) || 0;
      const r = parseFloat(field === "rate" ? value : item.rate) || 0;
      item.total_amount = Math.round(q * r * 100) / 100;
    }

    updated[index] = item;
    updateItemsAndRenumber(updated);
  };

  const handleAddRow = () => {
    const nextSl = items.length + 1;
    const newItem: EstimateItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serial_no: nextSl,
      product_name: "",
      quantity: 0,
      unit: "Pcs",
      rate: 0,
      total_amount: 0,
    };
    const updated = [...items, newItem];
    updateItemsAndRenumber(updated);

    setTimeout(() => {
      if (productInputRefs.current[newItem.id]) {
        productInputRefs.current[newItem.id]?.focus();
      }
    }, 50);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      // Clear instead of removing last row
      updateItemsAndRenumber([
        { id: `item-${Date.now()}`, serial_no: 1, product_name: "", quantity: 0, unit: "Pcs", rate: 0, total_amount: 0 },
      ]);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    updateItemsAndRenumber(updated);
  };

  // 1-Click Load Full House Construction Checklist
  const handleLoadHousePresets = () => {
    if (items.some((it) => it.product_name.trim().length > 0)) {
      if (!confirm("This will replace current items with the standard full-house building checklist. Continue?")) {
        return;
      }
    }
    const presetItems: EstimateItem[] = HOUSE_CONSTRUCTION_PRESETS.map((p, idx) => ({
      id: `preset-${Date.now()}-${idx}`,
      serial_no: idx + 1,
      product_name: p.product_name,
      quantity: p.quantity,
      unit: p.unit,
      rate: p.rate,
      total_amount: p.quantity * p.rate,
    }));
    updateItemsAndRenumber(presetItems);
  };

  const handleReset = () => {
    if (confirm("Reset current estimate and start fresh?")) {
      setCustomerName("");
      setCustomerPhone("");
      setSiteAddress("");
      setProjectTitle("Residential House Construction");
      updateItemsAndRenumber([
        { id: "item-1", serial_no: 1, product_name: "", quantity: 0, unit: "Pcs", rate: 0, total_amount: 0 },
      ]);
    }
  };

  // Grand Total Calculation
  const grandTotal = items.reduce((sum, it) => sum + (it.total_amount || 0), 0);
  const totalItemCount = items.filter((it) => it.product_name.trim().length > 0).length;

  // Save Estimate to LocalStorage
  const handleSaveEstimate = () => {
    if (!customerName.trim()) {
      alert("Please enter customer / person name before saving.");
      return;
    }
    if (grandTotal <= 0) {
      alert("Please enter at least one material with quantity and rate.");
      return;
    }

    const saved = createEstimate({
      date: estimateDate,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      project_title: projectTitle.trim(),
      site_address: siteAddress.trim(),
      notes: notes.trim(),
      items: items.filter((it) => it.product_name.trim().length > 0),
      total_items: totalItemCount,
      grand_total: grandTotal,
    });

    setSavedEstimates(getEstimates());
    setSaveSuccessMsg(`Estimate #${saved.estimate_number} saved successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleLoadEstimate = (est: HouseEstimate) => {
    setCustomerName(est.customer_name);
    setCustomerPhone(est.customer_phone || "");
    setProjectTitle(est.project_title || "Residential House Construction");
    setSiteAddress(est.site_address || "");
    setEstimateDate(est.date);
    setNotes(est.notes || "");
    updateItemsAndRenumber(est.items);
    setShowSavedModal(false);
  };

  const handleDeleteSavedEstimate = (id: string) => {
    if (confirm("Are you sure you want to delete this saved estimate?")) {
      deleteEstimate(id);
      setSavedEstimates(getEstimates());
    }
  };

  // Print Handler
  const handlePrint = () => {
    document.body.classList.add("printing-estimate");
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("printing-estimate");
      },
      { once: true }
    );
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const safeName = (customerName || "House_Estimate").replace(/[^a-zA-Z0-9_-]/g, "_");
      await exportElementToPdf({
        elementId: "printable-estimate-doc",
        filename: `${safeName}_House_Cost_Estimate.pdf`,
        widthPx: 740,
        orientation: "portrait",
      });
    } catch {
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              House Construction Cost Estimator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Calculate a person&apos;s total materials &amp; equipment cost to build a house from start to end.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadHousePresets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-2xs transition-colors"
            title="Load standard house building checklist from foundation to roof"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>⚡ Load House Checklist</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Saved ({savedEstimates.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveEstimate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Estimate</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Estimate</span>
          </button>

          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDownloadingPdf ? "Exporting..." : "PDF"}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Customer & Construction Site Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span>Customer &amp; Project Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Customer / Person Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="existing-customers-list"
                required
                placeholder="e.g. Laxman Sahu"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  const matched = existingCustomers.find(
                    (c) => c.name.toLowerCase() === e.target.value.toLowerCase()
                  );
                  if (matched && matched.phone && !customerPhone) {
                    setCustomerPhone(matched.phone);
                  }
                  if (matched && matched.address && !siteAddress) {
                    setSiteAddress(matched.address);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <datalist id="existing-customers-list">
                {existingCustomers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="e.g. 94370 12345"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              House Project / Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. 2BHK House (Start to Finish)"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Estimate Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Estimate Date
            </label>
            <input
              type="date"
              value={estimateDate}
              onChange={(e) => setEstimateDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Site Address */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Site Location / Address (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Chikiti Pentho, Ganesh Nagar, Ganjam, Odisha"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 3. Materials & Equipment Estimate Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Subheader */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Equipment &amp; Materials Cost Sheet
              </h2>
              <p className="text-[11px] text-slate-500">
                Automatic Serial No • Product Name • Quantity &amp; Unit • Rate • Total Amount
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
              title="Reset table"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Datalist for autocomplete */}
        <datalist id="estimate-materials-catalog">
          {catalogSuggestions.map((name, i) => (
            <option key={i} value={name} />
          ))}
        </datalist>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-14">Sl. No.</th>
                <th className="py-2.5 px-3 min-w-[240px]">Product / Equipment Name</th>
                <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                <th className="py-2.5 px-2 text-center w-24">Unit</th>
                <th className="py-2.5 px-3 text-right w-28">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right w-36">Total Amount (₹)</th>
                <th className="py-2.5 px-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-800">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  {/* 1. Automatic Serial Number */}
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50/60">
                    {item.serial_no}
                  </td>

                  {/* 2. Product Name */}
                  <td className="py-2 px-3">
                    <input
                      ref={(el) => {
                        productInputRefs.current[item.id] = el;
                      }}
                      type="text"
                      list="estimate-materials-catalog"
                      placeholder="Type product name (e.g. LNT Cement, 12mm Rod, Bricks...)"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(idx, "product_name", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </td>

                  {/* 3. Quantity */}
                  <td className="py-2 px-3 text-center">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={item.quantity === 0 ? "" : item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </td>

                  {/* 4. Unit */}
                  <td className="py-2 px-2 text-center">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Bags">Bags</option>
                      <option value="Kg">Kg</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Brass">Brass</option>
                      <option value="Trips">Trips</option>
                      <option value="Coils">Coils</option>
                      <option value="Mtrs">Mtrs</option>
                      <option value="Sq.Ft">Sq.Ft</option>
                      <option value="Sets">Sets</option>
                      <option value="Unit">Unit</option>
                      <option value="Ton">Ton</option>
                      <option value="Buckets">Buckets</option>
                    </select>
                  </td>

                  {/* 5. Rate (₹) */}
                  <td className="py-2 px-3 text-right">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={item.rate === 0 ? "" : item.rate}
                        onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddRow();
                          }
                        }}
                        className="w-full pl-5 pr-2 py-1.5 text-xs text-right rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </td>

                  {/* 6. Total Amount (₹) - Auto calculated */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-xs bg-slate-50/40">
                    {formatCurrency(item.total_amount)}
                  </td>

                  {/* Action: Delete */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Footer: Total */}
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td colSpan={4} className="py-3 px-3 text-left">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Next Item (Press Enter)</span>
                  </button>
                </td>
                <td className="py-3 px-3 text-right uppercase text-[11px] tracking-wider text-slate-600">
                  Grand Total:
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-sm text-blue-700 whitespace-nowrap">
                  {formatCurrency(grandTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Grand Total Summary Card */}
      <div className="bg-gradient-to-r from-[#14243A] to-[#1E3A8A] text-white rounded-xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
            Total Estimated Construction Cost
          </span>
          <div className="text-3xl font-black text-white mt-1">
            {formatCurrency(grandTotal)}
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Across <strong className="text-white">{totalItemCount}</strong> materials &amp; equipment items listed for building.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveEstimate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save &amp; Record Estimate</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-800" />
            <span>Print Official Quotation</span>
          </button>
        </div>
      </div>

      {/* 5. Printable A4 Estimate Quotation (Rendered during Print / PDF Export) */}
      <div className="hidden">
        <div id="printable-estimate-doc" className="p-8 bg-white text-slate-900 space-y-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-[#14243A] text-white flex items-center justify-center font-black text-base">
                  TPM
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                    {businessProfile.name}
                  </h1>
                  <p className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">
                    Wholesale &amp; Retail: Cement, TMT Steel Rods, Electricals &amp; Hardware
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {businessProfile.address} • Mob: {businessProfile.phone}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-[10px]">
                GSTIN: {businessProfile.gstin}
              </span>
              <p className="text-[9px] text-slate-500 mt-0.5">Email: {businessProfile.email}</p>
            </div>
          </div>

          {/* Title Bar */}
          <div className="bg-[#14243A] text-white px-4 py-2 rounded-lg flex items-center justify-between">
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-blue-200">
                HOUSE CONSTRUCTION MATERIALS &amp; EQUIPMENT ESTIMATE
              </h2>
              <p className="text-[9px] text-slate-300">
                Official building material quotation: {projectTitle || "House Construction"}
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 text-[10px]">Date: </span>
              <span className="font-bold text-white text-[11px]">{estimateDate}</span>
            </div>
          </div>

          {/* Customer / Site Details */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Customer Details:</span>
              <div className="font-black text-slate-900 uppercase mt-0.5 text-sm">
                {customerName || "Walk-in Customer"}
              </div>
              {customerPhone && <div className="text-slate-600 mt-0.5">📞 {customerPhone}</div>}
              {siteAddress && (
                <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{siteAddress}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Project:</span>
              <div className="font-bold text-slate-800 mt-0.5">{projectTitle}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Total Materials: <strong>{totalItemCount} items</strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px] uppercase">
              <tr>
                <th className="py-2 px-2 text-center w-12 border-r border-slate-300">Sl.</th>
                <th className="py-2 px-3 border-r border-slate-300">Product / Material Specification</th>
                <th className="py-2 px-2 text-center w-24 border-r border-slate-300">Qty</th>
                <th className="py-2 px-2 text-right w-24 border-r border-slate-300">Rate (₹)</th>
                <th className="py-2 px-3 text-right w-32">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {items
                .filter((it) => it.product_name.trim().length > 0)
                .map((it) => (
                  <tr key={it.id}>
                    <td className="py-1.5 px-2 text-center font-mono text-[10px] border-r border-slate-200">
                      {it.serial_no}
                    </td>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-200">
                      {it.product_name}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold border-r border-slate-200 whitespace-nowrap">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200 whitespace-nowrap">
                      {formatCurrency(it.rate)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {formatCurrency(it.total_amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold">
              <tr>
                <td colSpan={4} className="py-2 px-3 text-right uppercase text-[10px] tracking-wider border-r border-slate-300">
                  Total Estimated Amount:
                </td>
                <td className="py-2 px-3 text-right font-mono font-black text-sm text-slate-900 whitespace-nowrap">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-[9px] text-slate-500">
            <div>
              <span className="font-bold uppercase text-slate-700 block mb-1">Terms &amp; Conditions:</span>
              <p>1. Rates quoted are current wholesale/retail market prices and valid for 15 days.</p>
              <p>2. Steel &amp; Cement prices are subject to company price updates at actual delivery.</p>
              <p>3. Loading, freight, or unloading charges to site are additional if applicable.</p>
              <div className="pt-6">
                <div className="border-t border-slate-300 w-44 pt-1 font-semibold text-slate-700">
                  Customer Signature / Acceptance
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between items-end text-right">
              <div>
                <div className="font-black text-slate-900 text-[10px] uppercase">
                  FOR THE PRAMOD MAHARAJ ENTERPRISES
                </div>
                <div className="text-[9px] text-slate-500 font-medium">
                  Authorized Accounts / Sales Desk
                </div>
              </div>
              <div className="border-t border-slate-300 w-44 pt-1 text-center">
                <span className="text-[9px] text-slate-400">[ Signature &amp; Stamp ]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Saved Estimates Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Saved House Cost Estimates</h3>
                  <p className="text-[11px] text-slate-500">
                    Review and load past customer estimates ({savedEstimates.length})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-slate-100">
              {savedEstimates.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Calculator className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No saved estimates yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click &ldquo;Save Estimate&rdquo; on any estimate to store it here.
                  </p>
                </div>
              ) : (
                savedEstimates.map((est) => (
                  <div key={est.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 uppercase truncate">
                          {est.customer_name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          {est.estimate_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {est.project_title || "House Construction"} • {est.items.length} items • Date: {est.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(est.grand_total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLoadEstimate(est)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        <span>Load</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedEstimate(est.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete estimate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
