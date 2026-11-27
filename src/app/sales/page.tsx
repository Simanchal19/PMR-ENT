"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBills, getBusinessProfile } from "@/lib/storage";
import { Bill, BillCategory, BusinessProfile } from "@/lib/types";
import { formatCurrency, formatDate, BILL_CATEGORIES, getCategoryConfig } from "@/lib/utils";
import { Search, PlusCircle, Printer, Eye, Edit2, Filter, X, Receipt } from "lucide-react";

export default function SalesPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(getBusinessProfile());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BillCategory>("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const loadData = () => {
    setBills(getBills());
    setBusinessProfile(getBusinessProfile());
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      if (catParam && BILL_CATEGORIES.some((c) => c.id === catParam)) {
        setCategoryFilter(catParam as BillCategory);
      }
    }
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  const filtered = bills.filter(b => {
    const matchesCat = categoryFilter === "all" || b.bill_category === categoryFilter;
    const matchesSearch = b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Billing Register
          </h1>
          <p className="text-sm text-slate-500">
            {bills.length} total bills across all 9 categories
          </p>
        </div>

        <Link
          href="/sales/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${categoryFilter === "all" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All Bills
          </button>
          {BILL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-all ${categoryFilter === cat.id ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill no, customer..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Items / Details</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No sales invoices found. Click &quot;New Invoice&quot; to create your first bill.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {bill.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {formatDate(bill.bill_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {bill.customer_name}
                    </td>
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
                      {(() => {
                        const goodsItems = (bill.items || []).filter(
                          (it) =>
                            it.unit !== "SERVICE" &&
                            !(it.item_name || "").toLowerCase().includes("labour") &&
                            !(it.item_name || "").toLowerCase().includes("transport")
                        );
                        if (bill.bill_category === "cement") {
                          const cItems = goodsItems.filter((it) => it.item_category === "cement");
                          if (cItems.length > 1) {
                            return (
                              <span>
                                {cItems.map((it) => `${it.quantity} Bags ${it.item_name}`).join(" • ")}
                              </span>
                            );
                          }
                          if (bill.cement_details) {
                            return (
                              <span>
                                {bill.cement_details.qty_bags} Bags • {bill.cement_details.cement_type} (₹{bill.cement_details.unit_rate}/bag)
                              </span>
                            );
                          }
                          return <span>Cement Supply</span>;
                        }
                        if (bill.bill_category === "rod") {
                          const rItems = goodsItems.filter((it) => it.item_category === "rod");
                          if (rItems.length > 1) {
                            return (
                              <span>
                                {rItems.map((it) => `${it.quantity} Kg ${it.item_name}`).join(" • ")}
                              </span>
                            );
                          }
                          if (bill.rod_details) {
                            return (
                              <span>
                                {bill.rod_details.qty_kg} Kg • {bill.rod_details.rod_size} (₹{bill.rod_details.rate_per_kg}/kg)
                              </span>
                            );
                          }
                          return <span>Rod / Steel Supply</span>;
                        }
                        if (goodsItems.length > 0) {
                          return (
                            <span>
                              {goodsItems.length === 1
                                ? `${goodsItems[0].quantity} ${goodsItems[0].unit} • ${goodsItems[0].item_name}${goodsItems[0].brand ? ` (${goodsItems[0].brand})` : ""}`
                                : goodsItems.slice(0, 2).map((it) => `${it.item_name}${it.brand ? ` (${it.brand})` : ""}`).join(", ") +
                                  (goodsItems.length > 2 ? ` +${goodsItems.length - 2} more` : "")}
                            </span>
                          );
                        }
                        return <span>{getCategoryConfig(bill.bill_category).shortLabel} Items</span>;
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(bill.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${bill.payment_status === "legacy_paid_yes" || bill.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                        {bill.payment_status === "legacy_paid_yes"
                          ? "Legacy Paid"
                          : bill.payment_status === "paid"
                            ? "Paid"
                            : "Unpaid / Credit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {bill.status !== "voided" && (
                          <Link
                            href={`/sales/new?edit=${bill.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tax Invoice / Bill Preview</h3>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Card */}
            <div className="p-4 my-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 text-xs font-mono">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-base text-slate-900">{businessProfile.name}</div>
                <div className="text-slate-500 text-[11px]">{businessProfile.address} • GSTIN: {businessProfile.gstin}</div>
                <div className="text-slate-500 text-[11px]">Ph: {businessProfile.phone}</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-slate-400">INVOICE NO:</span> <strong className="text-slate-900 font-bold">{selectedBill.bill_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400">DATE:</span> <strong className="text-slate-900 font-bold">{formatDate(selectedBill.bill_date)}</strong>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2">
                <span className="text-slate-400">CUSTOMER / PARTY:</span>
                <div className="font-bold text-slate-900 text-sm">{selectedBill.customer_name}</div>
              </div>

              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1">Description</th>
                    <th className="py-1">Brand</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBill.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-sans">{item.item_name}</td>
                      <td className="py-1.5 font-sans text-slate-600">{item.brand || (item.item_category === "cement" && item.unit !== "SERVICE" ? item.item_name.replace(/\s*Cement$/i, "") : "-")}</td>
                      <td className="py-1.5 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-1.5 text-right font-sans">{formatCurrency(item.unit_price, false)}</td>
                      <td className="py-1.5 text-right font-sans font-bold">{formatCurrency(item.total_amount, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(Boolean(selectedBill.labour_amount) || Boolean(selectedBill.transport_amount)) && (
                <div className="border-t border-slate-200/80 pt-2 space-y-1 text-xs font-sans text-slate-600">
                  <div className="flex justify-between">
                    <span>Goods Subtotal:</span>
                    <span>{formatCurrency(selectedBill.subtotal || (selectedBill.total_amount - (selectedBill.labour_amount || 0) - (selectedBill.transport_amount || 0)))}</span>
                  </div>
                  {Boolean(selectedBill.labour_amount) && (
                    <div className="flex justify-between">
                      <span>Labour Charge:</span>
                      <span className="font-semibold text-slate-800">+{formatCurrency(selectedBill.labour_amount || 0)}</span>
                    </div>
                  )}
                  {Boolean(selectedBill.transport_amount) && (
                    <div className="flex justify-between">
                      <span>Transport Charge:</span>
                      <span className="font-semibold text-slate-800">+{formatCurrency(selectedBill.transport_amount || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900 font-sans">
                <span>TOTAL AMOUNT:</span>
                <span className="text-blue-700">{formatCurrency(selectedBill.total_amount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Close
              </button>
              {selectedBill.status !== "voided" && (
                <Link
                  href={`/sales/new?edit=${selectedBill.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Invoice</span>
                </Link>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
