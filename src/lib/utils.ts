import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupee standard format (e.g., ₹1,23,456.00 or ₹50,000)
 */
export function formatCurrency(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with standard Indian Rupee commas (2,2,3 grouping)
  const parts = absAmount.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  const result = `${formattedInt}.${decimalPart}`;

  return `${isNegative ? "-" : ""}${includeSymbol ? "₹" : ""}${result}`;
}

/**
 * Format date strictly as DD-MM-YYYY in Asia/Kolkata timezone
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") {
    return "Not Specified";
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's already in DD-MM-YYYY or text
      return dateStr;
    }
    
    // Using Asia/Kolkata format
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get current date string formatted as YYYY-MM-DD for form date inputs in Asia/Kolkata
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { BillCategory } from "./types";

export interface CategoryConfig {
  id: BillCategory;
  label: string;
  shortLabel: string;
  desc: string;
  prefix: string;
  purchasePrefix: string;
  color: string;
  badgeClass: string;
}

export const BILL_CATEGORIES: CategoryConfig[] = [
  {
    id: "mix",
    label: "Mix & Miscellaneous",
    shortLabel: "Mix & Misc",
    desc: "Combined items & general billing",
    prefix: "MX",
    purchasePrefix: "PMIX",
    color: "#6366F1",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    id: "cement",
    label: "Cement Sales",
    shortLabel: "Cement",
    desc: "Bags & Brand rates",
    prefix: "CE",
    purchasePrefix: "PCEM",
    color: "#16A34A",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    id: "rod",
    label: "Rod / Steel Sales",
    shortLabel: "Rod / Steel",
    desc: "Kg decimals & rates",
    prefix: "RD",
    purchasePrefix: "PROD",
    color: "#D97706",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: "daily",
    label: "Electrical / Daily",
    shortLabel: "Electrical / Daily",
    desc: "Line items & electricals",
    prefix: "EL",
    purchasePrefix: "PELEC",
    color: "#2563EB",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "plumbing",
    label: "Plumbing Bill",
    shortLabel: "Plumbing",
    desc: "Pipes, fittings & valves",
    prefix: "PL",
    purchasePrefix: "PPLM",
    color: "#0891B2",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    id: "hardware",
    label: "Hardware Accessories",
    shortLabel: "Hardware",
    desc: "Tools, fasteners & wire",
    prefix: "HW",
    purchasePrefix: "PHRD",
    color: "#475569",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    id: "paints",
    label: "Putty & Paints",
    shortLabel: "Putty & Paints",
    desc: "Wall putty, primers & colors",
    prefix: "PT",
    purchasePrefix: "PPNT",
    color: "#C026D3",
    badgeClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  },
  {
    id: "machinery",
    label: "Motor & Machinery",
    shortLabel: "Motor & Machinery",
    desc: "Motors, pumps & equipment",
    prefix: "MM",
    purchasePrefix: "PMCH",
    color: "#EA580C",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    id: "ceramic",
    label: "CP & Ceramic Items",
    shortLabel: "CP & Ceramic",
    desc: "Sanitaryware, CP fittings & tiles",
    prefix: "CP",
    purchasePrefix: "PCRM",
    color: "#0D9488",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
  },
];

export function getCategoryConfig(id: string): CategoryConfig {
  const found = BILL_CATEGORIES.find((c) => c.id === id);
  if (found) return found;
  return {
    id: id as BillCategory,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    shortLabel: id.charAt(0).toUpperCase() + id.slice(1),
    desc: "Line items & billing",
    prefix: "B",
    purchasePrefix: "PUR",
    color: "#64748B",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  };
}

/**
 * Generate collision-safe category-specific invoice numbers
 * e.g., MIX: MX001, CEMENT: CE001, ROD: RD001, ELECTRICAL: EL001, PLUMBING: PL001, etc.
 */
export function generateBillNumber(
  category: BillCategory,
  existingCount: number,
  existingBillNumbers?: string[]
): string {
  const conf = getCategoryConfig(category);
  const prefix = conf.prefix;
  const numbers = existingBillNumbers || [];
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}(\\d+)$`, "i");
  const existingSet = new Set(numbers.map((n) => n.toUpperCase()));

  let maxSeq = 0;
  for (const numStr of numbers) {
    const match = numStr.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  }

  let nextSeq = existingBillNumbers !== undefined ? maxSeq + 1 : existingCount + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(3, "0")}`;
  while (existingSet.has(candidate.toUpperCase())) {
    nextSeq += 1;
    candidate = `${prefix}${String(nextSeq).padStart(3, "0")}`;
  }
  return candidate;
}
