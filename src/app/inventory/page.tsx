"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  calculateInventoryStock,
  updateCementBrand,
  updateRodSize,
  updateHardwareItem,
  addHardwareItem,
  deleteHardwareItem,
  getStoredUserRole,
} from "@/lib/storage";
import { StockItemSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import {
  Package,
  Hammer,
  Zap,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Check,
  X,
  TrendingUp,
  Layers,
  Plus,
  Trash2,
  Search,
  ArrowRight,
} from "lucide-react";

export default function InventoryPage() {
  const [cementStock, setCementStock] = useState<StockItemSummary[]>([]);
  const [rodStock, setRodStock] = useState<StockItemSummary[]>([]);
  const [hardwareStock, setHardwareStock] = useState<StockItemSummary[]>([]);
  const [totalCementBags, setTotalCementBags] = useState(0);
  const [totalRodKg, setTotalRodKg] = useState(0);
  const [totalHardwareUnits, setTotalHardwareUnits] = useState(0);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Inline opening stock editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOpeningVal, setEditingOpeningVal] = useState("");

  // Add Hardware Item Modal
  const [showAddHardwareModal, setShowAddHardwareModal] = useState(false);
  const [newHwName, setNewHwName] = useState("");
  const [newHwUnit, setNewHwUnit] = useState("Pcs");
  const [newHwRate, setNewHwRate] = useState("");
  const [newHwOpening, setNewHwOpening] = useState("");
  const [newHwNotes, setNewHwNotes] = useState("");
  const [hwFormError, setHwFormError] = useState<string | null>(null);

  // Search filter for hardware items
  const [hwSearch, setHwSearch] = useState("");

  const loadStock = () => {
    const res = calculateInventoryStock();
    setCementStock(res.cementStock);
    setRodStock(res.rodStock);
    setHardwareStock(res.hardwareStock || []);
    setTotalCementBags(res.totalCementBagsAvailable);
    setTotalRodKg(res.totalRodKgAvailable);
    setTotalHardwareUnits(res.totalHardwareUnitsAvailable || 0);
    setTotalStockValue(res.totalInventoryValue);
    setLowStockCount(res.lowStockCount);

    const session = getClientSession();
    const role = session?.user?.role || getStoredUserRole();
    setIsAdmin(role === "admin" || role === "owner");
  };

  useEffect(() => {
    loadStock();
    window.addEventListener("tpm_data_updated", loadStock);
    return () => window.removeEventListener("tpm_data_updated", loadStock);
  }, []);

  const handleSaveOpeningStock = (item: StockItemSummary) => {
    const val = parseFloat(editingOpeningVal) || 0;
    if (item.category === "cement") {
      updateCementBrand(item.id, { openingStock: val });
    } else if (item.category === "rod") {
      updateRodSize(item.id, { openingStock: val });
    } else {
      updateHardwareItem(item.id, { openingStock: val });
    }
    setEditingItemId(null);
    loadStock();
  };

  const handleCreateHardwareItem = (e: React.FormEvent) => {
    e.preventDefault();
    setHwFormError(null);
    if (!newHwName.trim()) {
      setHwFormError("Please enter the hardware / electrical item name.");
      return;
    }
    const res = addHardwareItem({
      name: newHwName.trim(),
      unit: newHwUnit.trim() || "Pcs",
      defaultRate: parseFloat(newHwRate) || 0,
      openingStock: parseFloat(newHwOpening) || 0,
      notes: newHwNotes.trim(),
    });
    if (!res.success) {
      setHwFormError(res.error || "Failed to add hardware item.");
      return;
    }
    setShowAddHardwareModal(false);
    setNewHwName("");
    setNewHwUnit("Pcs");
    setNewHwRate("");
    setNewHwOpening("");
    setNewHwNotes("");
    loadStock();
  };

  const handleDeleteHardwareItem = (item: StockItemSummary) => {
    if (confirm(`Are you sure you want to remove "${item.name}" from the inventory register?`)) {
      deleteHardwareItem(item.id);
      loadStock();
    }
  };

  const filteredHardwareStock = useMemo(() => {
    const q = hwSearch.trim().toLowerCase();
    if (!q) return hardwareStock;
    return hardwareStock.filter(
      (h) => h.name.toLowerCase().includes(q) || h.unit.toLowerCase().includes(q)
    );
  }, [hardwareStock, hwSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Godown & Shop Live Inventory Register
          </h1>
          <p className="text-sm text-slate-500">
            Real-time stock reconciliation: Opening Stock + Purchases Inward − Sales Outward ± Returns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/purchases/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Purchase (Stock In)</span>
          </Link>
          <Link
            href="/sales/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Sale (Stock Out)</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cement Stock Card */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase">
            <span>Available Cement Stock</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {totalCementBags} <span className="text-sm font-bold text-slate-500">Bags</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {cementStock.length} configured cement brands
          </div>
        </div>

        {/* Rod Stock Card */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase">
            <span>Available TMT Rod Stock</span>
            <Hammer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {totalRodKg} <span className="text-sm font-bold text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ({(totalRodKg / 1000).toFixed(2)} Metric Tons across {rodStock.length} sizes)
          </div>
        </div>

        {/* Electrical & Hardware Stock Card */}
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase">
            <span>Available Electrical & HW</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {totalHardwareUnits} <span className="text-sm font-bold text-slate-500">Units</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {hardwareStock.length} configured hardware items
          </div>
        </div>

        {/* Estimated Stock Value Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Estimated Stock Value</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1.5">
            {formatCurrency(totalStockValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cement + Rods + Electrical inventory
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Reorder / Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {lowStockCount} <span className="text-sm font-bold text-slate-500">Items</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isAdmin ? "Click Edit on Opening Stock to set baseline" : "Monitored automatically"}
          </div>
        </div>
      </div>

      {/* 1. Cement Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Cement Brands Stock Register (in Bags)
              </h3>
              <p className="text-xs text-slate-500">
                Live bag balance per brand with purchase cost vs. selling price comparison
              </p>
            </div>
          </div>

          <Link
            href="/purchases/new?category=cement"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Cement Stock
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Cement Brand</th>
                <th className="py-3 px-4 text-center">Opening Stock</th>
                <th className="py-3 px-4 text-center">Purchased (+)</th>
                <th className="py-3 px-4 text-center">Sold (−)</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Avg Buy Rate</th>
                <th className="py-3 px-4 text-right">Sell Rate</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cementStock.map((item) => {
                const isEditing = editingItemId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            value={editingOpeningVal}
                            onChange={(e) => setEditingOpeningVal(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveOpeningStock(item)}
                            className="p-1 rounded bg-emerald-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1 rounded bg-slate-200 text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-700">
                            {item.opening_stock} Bags
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingOpeningVal(String(item.opening_stock));
                              }}
                              className="text-slate-400 hover:text-blue-600"
                              title="Set Opening Godown Stock"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">
                      +{item.purchased_qty - item.purchase_return_qty} Bags
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      −{item.sold_qty - item.sales_return_qty} Bags
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-black text-sm ${
                          item.available_stock > 0
                            ? "text-slate-900"
                            : item.available_stock === 0
                            ? "text-slate-400"
                            : "text-rose-600"
                        }`}
                      >
                        {item.available_stock} Bags
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(item.avg_purchase_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(item.default_selling_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(item.stock_value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.available_stock > 50 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          In Stock
                        </span>
                      ) : item.available_stock > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          Record Inward
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. TMT Steel Rod Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                TMT Steel Rod & Wire Stock Register (in Kg)
              </h3>
              <p className="text-xs text-slate-500">
                Live weight balance per rod size specification
              </p>
            </div>
          </div>

          <Link
            href="/purchases/new?category=rod"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Rod Stock
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Rod Size</th>
                <th className="py-3 px-4 text-center">Opening Stock</th>
                <th className="py-3 px-4 text-center">Purchased (+)</th>
                <th className="py-3 px-4 text-center">Sold (−)</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Avg Buy Rate/Kg</th>
                <th className="py-3 px-4 text-right">Sell Rate/Kg</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rodStock.map((item) => {
                const isEditing = editingItemId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editingOpeningVal}
                            onChange={(e) => setEditingOpeningVal(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveOpeningStock(item)}
                            className="p-1 rounded bg-amber-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1 rounded bg-slate-200 text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-700">
                            {item.opening_stock} Kg
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingOpeningVal(String(item.opening_stock));
                              }}
                              className="text-slate-400 hover:text-blue-600"
                              title="Set Opening Godown Stock"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">
                      +{(item.purchased_qty - item.purchase_return_qty).toFixed(2)} Kg
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      −{(item.sold_qty - item.sales_return_qty).toFixed(2)} Kg
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-black text-sm ${
                          item.available_stock > 0
                            ? "text-slate-900"
                            : item.available_stock === 0
                            ? "text-slate-400"
                            : "text-rose-600"
                        }`}
                      >
                        {item.available_stock} Kg
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(item.avg_purchase_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(item.default_selling_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(item.stock_value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.available_stock > 200 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          In Stock
                        </span>
                      ) : item.available_stock > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          Record Inward
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Electrical & Hardware Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Electrical & Hardware Stock Register (Units / Pcs / Coils / Mtrs)
              </h3>
              <p className="text-xs text-slate-500">
                Live unit balance per electrical product with wholesale buy rate vs. selling price comparison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHwFormError(null);
                setShowAddHardwareModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Hardware Item</span>
            </button>
            <Link
              href="/purchases/new?category=daily"
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Inward Purchase
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter electrical / hardware items..."
              value={hwSearch}
              onChange={(e) => setHwSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            Showing {filteredHardwareStock.length} of {hardwareStock.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Product / Item Name</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-4 text-center">Opening Stock</th>
                <th className="py-3 px-4 text-center">Purchased (+)</th>
                <th className="py-3 px-4 text-center">Sold (−)</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Avg Buy Rate</th>
                <th className="py-3 px-4 text-right">Sell Rate</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredHardwareStock.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10} className="py-8 text-center text-slate-400">
                    <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No electrical & hardware stock found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hwSearch ? `No matches for "${hwSearch}"` : "Click '+ Add Hardware Item' to register your products."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHardwareStock.map((item) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.id.startsWith("hw-uncataloged") && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Billed Item
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-600">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              value={editingOpeningVal}
                              onChange={(e) => setEditingOpeningVal(e.target.value)}
                              className="w-20 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveOpeningStock(item)}
                              className="p-1 rounded bg-blue-600 text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-700">
                              {item.opening_stock} {item.unit}
                            </span>
                            {isAdmin && !item.id.startsWith("hw-uncataloged") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingOpeningVal(String(item.opening_stock));
                                }}
                                className="text-slate-400 hover:text-blue-600"
                                title="Set Opening Godown Stock"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        +{item.purchased_qty - item.purchase_return_qty} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">
                        −{item.sold_qty - item.sales_return_qty} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-sm ${
                            item.available_stock > 0
                              ? "text-slate-900"
                              : item.available_stock === 0
                              ? "text-slate-400"
                              : "text-rose-600"
                          }`}
                        >
                          {item.available_stock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(item.avg_purchase_rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(item.default_selling_rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.stock_value)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.available_stock > 25 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            In Stock
                          </span>
                        ) : item.available_stock > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Record Inward
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          {!item.id.startsWith("hw-uncataloged") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHardwareItem(item)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup: Add New Electrical / Hardware Item */}
      {showAddHardwareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Electrical & Hardware Item</h3>
                  <p className="text-[11px] text-slate-500">Register new item in live godown inventory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddHardwareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHardwareItem} className="p-5 space-y-4">
              {hwFormError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{hwFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product / Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Polycab 4.0mm Wire 90m Coil / Havells 32A DP MCB"
                  value={newHwName}
                  onChange={(e) => setNewHwName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newHwUnit}
                    onChange={(e) => setNewHwUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Coils">Coils (Bundle / 90m)</option>
                    <option value="Mtrs">Mtrs (Meters)</option>
                    <option value="Box">Box</option>
                    <option value="Set">Set</option>
                    <option value="Unit">Unit / NOS</option>
                    <option value="Pack">Pack</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Sell Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.00"
                    value={newHwRate}
                    onChange={(e) => setNewHwRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opening Stock ({newHwUnit})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={newHwOpening}
                    onChange={(e) => setNewHwOpening(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Baseline stock on hand</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FR Flame Retardant"
                    value={newHwNotes}
                    onChange={(e) => setNewHwNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHardwareModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Save Item & Add to Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
