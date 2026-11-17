"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  calculateInventoryStock,
  updateCementBrand,
  updateRodSize,
  getStoredUserRole,
} from "@/lib/storage";
import { StockItemSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import {
  Package,
  Hammer,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Check,
  X,
  TrendingUp,
  Layers,
} from "lucide-react";

export default function InventoryPage() {
  const [cementStock, setCementStock] = useState<StockItemSummary[]>([]);
  const [rodStock, setRodStock] = useState<StockItemSummary[]>([]);
  const [totalCementBags, setTotalCementBags] = useState(0);
  const [totalRodKg, setTotalRodKg] = useState(0);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Inline opening stock editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOpeningVal, setEditingOpeningVal] = useState("");

  const loadStock = () => {
    const res = calculateInventoryStock();
    setCementStock(res.cementStock);
    setRodStock(res.rodStock);
    setTotalCementBags(res.totalCementBagsAvailable);
    setTotalRodKg(res.totalRodKgAvailable);
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
    } else {
      updateRodSize(item.id, { openingStock: val });
    }
    setEditingItemId(null);
    loadStock();
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Estimated Stock Value</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1.5">
            {formatCurrency(totalStockValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Valued at weighted average purchase cost
          </div>
        </div>

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
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-3 py-1.5 rounded-lg"
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
            className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-3 py-1.5 rounded-lg"
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
    </div>
  );
}

