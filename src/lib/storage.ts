import seedData from "../data/seedData.json";
import { getCategoryConfig } from "./utils";
import { 
  Customer, 
  Bill, 
  Payment, 
  SalesReturn, 
  CashTransaction, 
  DashboardMetrics,
  PaymentAllocation,
  UserRole,
  BillCategory,
  AuditLog,
  CementBrand,
  RodSize,
  HardwareItem,
  PaymentModeOption,
  ExpenseCategoryOption,
  BusinessProfile,
  Supplier,
  PurchaseBill,
  SupplierPayment,
  SupplierPaymentAllocation,
  PurchaseReturn,
  StockItemSummary,
  PaymentMode,
  EstimateItem,
  HouseEstimate,
  EnterpriseUserRecord
} from "./types";
import { DateRange, isDateInRange } from "./period";

const STORAGE_KEYS = {
  CUSTOMERS: "tpm_customers_v4",
  BILLS: "tpm_bills_v4",
  PAYMENTS: "tpm_payments_v4",
  RETURNS: "tpm_returns_v4",
  CASH_GIVEN: "tpm_cash_given_v4",
  USER_ROLE: "tpm_user_role_v1",
  AUDIT_LOGS: "tpm_audit_logs_v1",
  CEMENT_BRANDS: "tpm_cement_brands_v1",
  ROD_SIZES: "tpm_rod_sizes_v1",
  HARDWARE_ITEMS: "tpm_hardware_items_v1",
  PAYMENT_MODES: "tpm_payment_modes_v1",
  EXPENSE_CATEGORIES: "tpm_expense_categories_v1",
  BUSINESS_PROFILE: "tpm_business_profile_v1",
  SUPPLIERS: "tpm_suppliers_v1",
  PURCHASE_BILLS: "tpm_purchase_bills_v1",
  SUPPLIER_PAYMENTS: "tpm_supplier_payments_v1",
  PURCHASE_RETURNS: "tpm_purchase_returns_v1",
  ESTIMATES: "tpm_estimates_v1",
  USERS: "tpm_enterprise_users_v2",
};

// Safe browser local-storage check
function isClient(): boolean {
  return typeof window !== "undefined";
}

// Clean up old cached versions from browser localStorage
if (isClient()) {
  try {
    const oldKeys = [
      "tpm_customers_v1", "tpm_bills_v1", "tpm_payments_v1", "tpm_returns_v1", "tpm_cash_given_v1",
      "tpm_customers_v2", "tpm_bills_v2", "tpm_payments_v2", "tpm_returns_v2", "tpm_cash_given_v2",
      "tpm_customers_v3", "tpm_bills_v3", "tpm_payments_v3", "tpm_returns_v3", "tpm_cash_given_v3",
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore in server context
  }
}

export function getStoredUserRole(): UserRole {
  if (!isClient()) return "owner";
  return (localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole) || "owner";
}

export function setStoredUserRole(role: UserRole) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    action: "IMPORT",
    entity: "FINANCIAL 26 - 27 - OCT.xlsm",
    actor: "Pramod Maharaj (Owner)",
    timestamp: "2026-11-06 22:51:35",
    notes: "Imported 551 bills, 284 payments, 22 returns, 49 cash transactions. Sheet1 and Sheet3 excluded."
  },
  {
    id: "log-2",
    action: "INIT_SCHEMA",
    entity: "PostgreSQL Database",
    actor: "System Administrator",
    timestamp: "2026-11-06 23:04:45",
    notes: "Created 19 normalized tables with RLS policies and decimal precision constraints."
  },
  {
    id: "log-3",
    action: "VERIFICATION_GATE",
    entity: "Sales Returns & Cash Outflows",
    actor: "System Policy",
    timestamp: "2026-11-06 23:05:00",
    notes: "Flagged 12 returns with missing amounts and 23 outflows with missing dates for review."
  }
];

export function getAuditLogs(): AuditLog[] {
  if (!isClient()) return INITIAL_AUDIT_LOGS;
  const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveAuditLogs(logs: AuditLog[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addAuditLog(entry: {
  action: string;
  entity: string;
  actor?: string;
  notes: string;
}): AuditLog {
  const currentLogs = getAuditLogs();
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  
  const role = getStoredUserRole();
  const defaultActor = role === "owner" ? "Pramod Maharaj (Owner)" : role === "manager" ? "Manager" : role === "admin" ? "System Administrator (Admin Account)" : "Operator";

  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: entry.action,
    entity: entry.entity,
    actor: entry.actor || defaultActor,
    timestamp,
    notes: entry.notes,
  };

  const updated = [newLog, ...currentLogs];
  saveAuditLogs(updated);
  return newLog;
}

export function getCustomers(): Customer[] {
  if (!isClient()) return (seedData.customers || []) as Customer[];
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(seedData.customers || []));
    return (seedData.customers || []) as Customer[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return (seedData.customers || []) as Customer[];
  }
}

export function saveCustomers(customers: Customer[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function createCustomer(data: {
  name: string;
  phone?: string;
  address?: string;
  opening_balance?: number;
  is_unidentified?: boolean;
}): Customer {
  const customers = getCustomers();
  const opBal = data.opening_balance || 0;
  const newCust: Customer = {
    id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: data.name.trim().toUpperCase(),
    code: `CUST-${(customers.length + 1).toString().padStart(4, "0")}`,
    phone: data.phone?.trim() || "",
    address: data.address?.trim() || "Bhubaneswar / Khordha",
    is_unidentified: data.is_unidentified || false,
    is_active: true,
    opening_balance: opBal,
    current_balance: opBal,
    total_bills_amount: 0,
    total_paid_amount: 0,
    created_at: new Date().toISOString()
  };
  const updated = [newCust, ...customers];
  saveCustomers(updated);
  return newCust;
}

export function getBills(): Bill[] {
  if (!isClient()) return seedData.bills as unknown as Bill[];
  const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(seedData.bills));
    return seedData.bills as unknown as Bill[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.bills as unknown as Bill[];
  }
}

export function saveBills(bills: Bill[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getPayments(): Payment[] {
  if (!isClient()) return seedData.payments as unknown as Payment[];
  const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(seedData.payments));
    return seedData.payments as unknown as Payment[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.payments as unknown as Payment[];
  }
}

export function savePayments(payments: Payment[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getReturns(): SalesReturn[] {
  if (!isClient()) return seedData.returns as unknown as SalesReturn[];
  const raw = localStorage.getItem(STORAGE_KEYS.RETURNS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(seedData.returns));
    return seedData.returns as unknown as SalesReturn[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.returns as unknown as SalesReturn[];
  }
}

export function saveReturns(returns: SalesReturn[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getCashTransactions(): CashTransaction[] {
  if (!isClient()) return seedData.cash_given as unknown as CashTransaction[];
  const raw = localStorage.getItem(STORAGE_KEYS.CASH_GIVEN);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify(seedData.cash_given));
    return seedData.cash_given as unknown as CashTransaction[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.cash_given as unknown as CashTransaction[];
  }
}

export function saveCashTransactions(txs: CashTransaction[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify(txs));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function resetAllDataToSeed() {
  if (isClient()) {
    const keysToRemove = [
      "tpm_customers_v1", "tpm_bills_v1", "tpm_payments_v1", "tpm_returns_v1", "tpm_cash_given_v1",
      "tpm_customers_v2", "tpm_bills_v2", "tpm_payments_v2", "tpm_returns_v2", "tpm_cash_given_v2",
      "tpm_customers_v3", "tpm_bills_v3", "tpm_payments_v3", "tpm_returns_v3", "tpm_cash_given_v3",
      STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.BILLS, STORAGE_KEYS.PAYMENTS, STORAGE_KEYS.RETURNS, STORAGE_KEYS.CASH_GIVEN, STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.CEMENT_BRANDS, STORAGE_KEYS.ROD_SIZES, STORAGE_KEYS.PAYMENT_MODES, STORAGE_KEYS.EXPENSE_CATEGORIES,
      STORAGE_KEYS.BUSINESS_PROFILE,
      STORAGE_KEYS.SUPPLIERS, STORAGE_KEYS.PURCHASE_BILLS, STORAGE_KEYS.SUPPLIER_PAYMENTS, STORAGE_KEYS.PURCHASE_RETURNS
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function clearAllData() {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PURCHASE_BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PURCHASE_RETURNS, JSON.stringify([]));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

/* ------------------------------------------------------------------ */
/*  Shared accounting rules (single source of truth for all reports)  */
/* ------------------------------------------------------------------ */

const MONEY_EPSILON = 0.005;

/** A return reduces sales / customer balances only once approved or verified, and never if voided/rejected. */
export function isApprovedReturn(r: SalesReturn): boolean {
  if (r.status === "voided" || r.status === "rejected") return false;
  return r.status === "approved" || r.is_verified === true;
}

export type CollectionBucket = "cash" | "upi" | "bank" | "other";

/** Map stored payment modes to report buckets */
export function getCollectionBucket(mode: string | null | undefined): CollectionBucket {
  const m = (mode || "").toUpperCase().trim();
  if (m === "CASH") return "cash";
  if (m === "UPI" || m === "CC UPI" || m.includes("UPI")) return "upi";
  if (m === "SBI" || m === "BANK_TRANSFER" || m === "BANK" || m === "CHEQUE" || m === "NEFT" || m === "RTGS" || m === "IMPS") return "bank";
  return "other";
}

export interface SalesBreakdown {
  mix: number;
  cement: number;
  rod: number;
  daily: number;
  plumbing: number;
  hardware: number;
  paints: number;
  machinery: number;
  ceramic: number;
  mix_count: number;
  cement_count: number;
  rod_count: number;
  daily_count: number;
  plumbing_count: number;
  hardware_count: number;
  paints_count: number;
  machinery_count: number;
  ceramic_count: number;
  gross_sales: number;
  approved_returns: number;
  net_sales: number;
  bills: Bill[];
  returns: SalesReturn[];
}

/** Sales are filtered by bill date; approved returns by return date. Voided/draft bills are excluded. */
export function calculateSalesBreakdown(dateFilter?: DateRange): SalesBreakdown {
  const bills = getBills().filter(b => b.status === "posted" && isDateInRange(b.bill_date, dateFilter));
  const returns = getReturns().filter(r => isApprovedReturn(r) && isDateInRange(r.return_date, dateFilter));

  const sumCat = (cat: BillCategory) =>
    bills.filter(b => b.bill_category === cat).reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const countCat = (cat: BillCategory) => bills.filter(b => b.bill_category === cat).length;

  const mix = sumCat("mix");
  const cement = sumCat("cement");
  const rod = sumCat("rod");
  const daily = sumCat("daily");
  const plumbing = sumCat("plumbing");
  const hardware = sumCat("hardware");
  const paints = sumCat("paints");
  const machinery = sumCat("machinery");
  const ceramic = sumCat("ceramic");
  const gross_sales = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const approved_returns = returns.reduce((acc, r) => acc + (r.amount || 0), 0);

  return {
    mix,
    cement,
    rod,
    daily,
    plumbing,
    hardware,
    paints,
    machinery,
    ceramic,
    mix_count: countCat("mix"),
    cement_count: countCat("cement"),
    rod_count: countCat("rod"),
    daily_count: countCat("daily"),
    plumbing_count: countCat("plumbing"),
    hardware_count: countCat("hardware"),
    paints_count: countCat("paints"),
    machinery_count: countCat("machinery"),
    ceramic_count: countCat("ceramic"),
    gross_sales,
    approved_returns,
    net_sales: gross_sales - approved_returns,
    bills,
    returns,
  };
}

export interface CollectionsBreakdown {
  total: number;
  cash: number;
  upi: number;
  bank: number;
  other: number;
  count: number;
  payments: Payment[];
}

/**
 * Collections are independent of sales: filtered strictly by actual payment date,
 * regardless of which (possibly older) bill they settle. Each receipt is counted once.
 */
export function calculateCollectionsBreakdown(dateFilter?: DateRange): CollectionsBreakdown {
  const seen = new Set<string>();
  const payments: Payment[] = [];
  for (const p of getPayments()) {
    if (p.status !== "posted") continue;
    if (!isDateInRange(p.payment_date, dateFilter)) continue;
    const key = p.id || p.receipt_number;
    if (seen.has(key)) continue; // never count the same receipt twice
    seen.add(key);
    payments.push(p);
  }

  const result: CollectionsBreakdown = { total: 0, cash: 0, upi: 0, bank: 0, other: 0, count: payments.length, payments };
  for (const p of payments) {
    const amt = p.amount || 0;
    result.total += amt;
    result[getCollectionBucket(p.payment_mode)] += amt;
  }
  return result;
}

export type CustomerPaymentStatus = "unpaid" | "partially_paid" | "paid" | "advance" | "no_activity";

export interface CustomerOutstandingRow {
  customer_id: string;
  customer_name: string;
  code?: string;
  phone?: string;
  is_linked: boolean; // false when transactions reference a party missing from the customer master
  opening_balance: number;
  total_bills: number;
  bill_count: number;
  approved_returns: number;
  payments_allocated: number;
  unallocated_credits: number;
  total_payments: number;
  /** Opening + Bills - Approved Returns - Payments Allocated to Bills */
  bill_receivable: number;
  /** bill_receivable - unallocated credits (matches the customer running ledger) */
  net_balance: number;
  outstanding: number; // positive balance (receivable)
  advance: number; // negative balance shown separately as customer credit / advance
  open_bill_amount: number;
  unpaid_bills: number;
  partially_paid_bills: number;
  paid_bills: number;
  categories: BillCategory[];
  status: CustomerPaymentStatus;
  last_activity?: string;
}

export interface OutstandingSummary {
  as_of?: string;
  rows: CustomerOutstandingRow[];
  total_outstanding: number;
  total_advances: number;
  total_unallocated_credits: number;
  total_unpaid_amount: number;
  unpaid_bills_count: number;
  partially_paid_bills_count: number;
  paid_bills_count: number;
  customers_with_dues: number;
}

/**
 * Customer outstanding as of a given date (inclusive), using ALL historical transactions up to that date.
 *
 *   Bill Receivable = Opening Balance + Posted Bills - Approved Returns - Payments Allocated to Bills
 *   Net Balance     = Bill Receivable - Unallocated Payment Credits
 *
 * Unallocated payments are never auto-allocated to bills: bill-level unpaid amounts use only explicit
 * allocations, while the customer's net balance still recognises the money received (as on the ledger).
 * Positive net balances are receivables; negative ones are reported separately as customer advances.
 */
export function calculateCustomerOutstanding(asOfDate?: string): OutstandingSummary {
  const range: DateRange | undefined = asOfDate ? { end: asOfDate } : undefined;
  const customers = getCustomers();
  const bills = getBills().filter(b => b.status === "posted" && isDateInRange(b.bill_date, range));
  const payments = getPayments().filter(p => p.status === "posted" && isDateInRange(p.payment_date, range));
  const returns = getReturns().filter(r => isApprovedReturn(r) && isDateInRange(r.return_date, range));

  const rowsById = new Map<string, CustomerOutstandingRow>();
  const idByName = new Map<string, string>();

  const newRow = (id: string, name: string, linked: boolean, c?: Customer): CustomerOutstandingRow => ({
    customer_id: id,
    customer_name: name,
    code: c?.code,
    phone: c?.phone,
    is_linked: linked,
    opening_balance: c?.opening_balance || 0,
    total_bills: 0,
    bill_count: 0,
    approved_returns: 0,
    payments_allocated: 0,
    unallocated_credits: 0,
    total_payments: 0,
    bill_receivable: 0,
    net_balance: 0,
    outstanding: 0,
    advance: 0,
    open_bill_amount: 0,
    unpaid_bills: 0,
    partially_paid_bills: 0,
    paid_bills: 0,
    categories: [],
    status: "no_activity",
  });

  for (const c of customers) {
    if (rowsById.has(c.id)) continue;
    rowsById.set(c.id, newRow(c.id, c.name, true, c));
    if (!idByName.has(c.name)) idByName.set(c.name, c.id);
  }

  // Each transaction is assigned to exactly ONE customer (id match first, then name) so nothing is double counted.
  const rowFor = (customerId: string, customerName: string): CustomerOutstandingRow => {
    if (customerId && rowsById.has(customerId)) return rowsById.get(customerId)!;
    const byName = idByName.get(customerName);
    if (byName) return rowsById.get(byName)!;
    const key = `unlinked:${customerName || customerId || "UNKNOWN"}`;
    if (!rowsById.has(key)) {
      rowsById.set(key, newRow(key, customerName || "UNKNOWN PARTY", false));
    }
    return rowsById.get(key)!;
  };

  const touch = (row: CustomerOutstandingRow, date?: string | null) => {
    if (date && (!row.last_activity || date > row.last_activity)) row.last_activity = date;
  };

  // Per-bill settlement tracking (explicit allocations + returns linked to that bill)
  const billSettled = new Map<string, number>();

  for (const b of bills) {
    const row = rowFor(b.customer_id, b.customer_name);
    row.total_bills += b.total_amount || 0;
    row.bill_count += 1;
    if (!row.categories.includes(b.bill_category)) row.categories.push(b.bill_category);
    touch(row, b.bill_date);
    billSettled.set(b.id, 0);
  }

  for (const r of returns) {
    const row = rowFor(r.customer_id, r.customer_name);
    row.approved_returns += r.amount || 0;
    touch(row, r.return_date);
    if (r.original_bill_id && billSettled.has(r.original_bill_id)) {
      billSettled.set(r.original_bill_id, billSettled.get(r.original_bill_id)! + (r.amount || 0));
    }
  }

  const seenPayments = new Set<string>();
  for (const p of payments) {
    const key = p.id || p.receipt_number;
    if (seenPayments.has(key)) continue;
    seenPayments.add(key);

    const row = rowFor(p.customer_id, p.customer_name);
    const amount = p.amount || 0;
    const allocated = Math.min(
      amount,
      (p.allocations || []).reduce((acc, a) => acc + (a.allocated_amount || 0), 0)
    );
    row.total_payments += amount;
    row.payments_allocated += allocated;
    row.unallocated_credits += amount - allocated;
    touch(row, p.payment_date);

    for (const a of p.allocations || []) {
      if (billSettled.has(a.bill_id)) {
        billSettled.set(a.bill_id, billSettled.get(a.bill_id)! + (a.allocated_amount || 0));
      }
    }
  }

  const summary: OutstandingSummary = {
    as_of: asOfDate,
    rows: [],
    total_outstanding: 0,
    total_advances: 0,
    total_unallocated_credits: 0,
    total_unpaid_amount: 0,
    unpaid_bills_count: 0,
    partially_paid_bills_count: 0,
    paid_bills_count: 0,
    customers_with_dues: 0,
  };

  for (const b of bills) {
    const row = rowFor(b.customer_id, b.customer_name);
    const total = b.total_amount || 0;
    const settled = billSettled.get(b.id) || 0;
    const open = Math.max(0, total - settled);
    row.open_bill_amount += open;
    if (open <= MONEY_EPSILON) row.paid_bills += 1;
    else if (settled > MONEY_EPSILON) row.partially_paid_bills += 1;
    else row.unpaid_bills += 1;
  }

  rowsById.forEach((row) => {
    row.bill_receivable = row.opening_balance + row.total_bills - row.approved_returns - row.payments_allocated;
    row.net_balance = row.bill_receivable - row.unallocated_credits;
    row.outstanding = row.net_balance > MONEY_EPSILON ? row.net_balance : 0;
    row.advance = row.net_balance < -MONEY_EPSILON ? -row.net_balance : 0;

    const credits = row.approved_returns + row.total_payments;
    const hasActivity = row.bill_count > 0 || credits > 0 || Math.abs(row.opening_balance) > MONEY_EPSILON;
    if (!hasActivity) row.status = "no_activity";
    else if (row.advance > 0) row.status = "advance";
    else if (row.outstanding <= 0) row.status = "paid";
    else if (credits > MONEY_EPSILON) row.status = "partially_paid";
    else row.status = "unpaid";

    summary.rows.push(row);
    summary.total_outstanding += row.outstanding;
    summary.total_advances += row.advance;
    summary.total_unallocated_credits += row.unallocated_credits;
    summary.total_unpaid_amount += row.open_bill_amount;
    summary.unpaid_bills_count += row.unpaid_bills;
    summary.partially_paid_bills_count += row.partially_paid_bills;
    summary.paid_bills_count += row.paid_bills;
    if (row.outstanding > 0) summary.customers_with_dues += 1;
  });

  summary.rows.sort((a, b) => b.outstanding - a.outstanding || b.advance - a.advance);
  return summary;
}

/**
 * High-precision financial metrics calculation adhering strictly to project accounting rules:
 * - Gross Sales = Sum of valid posted bills.
 * - Net Sales = Gross Sales minus approved/verified returns.
 * - Customer Balance = Opening balance + posted bills - approved returns - payments.
 * - Cash Balance = Opening Cash + Cash Receipts - Cash Outflows.
 * - Profit = Net sales minus COGS & verified operating expenses (never sales minus cash given).
 */
export function calculateDashboardMetrics(dateFilter?: DateRange): DashboardMetrics {
  const bills = getBills().filter(b => b.status === "posted");
  const payments = getPayments().filter(p => p.status === "posted");
  const returns = getReturns();
  const cashTxs = getCashTransactions();

  // Sales (bill date) and collections (payment date) share the same rules as the reports
  const sales = calculateSalesBreakdown(dateFilter);
  const collections = calculateCollectionsBreakdown(dateFilter);

  const filteredCash = cashTxs.filter(c => isDateInRange(c.transaction_date, dateFilter));

  const gross_sales = sales.gross_sales;
  
  // Only APPROVED/VERIFIED returns reduce net sales!
  const approved_returns = sales.approved_returns;

  const net_sales = sales.net_sales;
  
  const total_collections = collections.total;
  
  // Customer receivables are a point-in-time balance as of the period end date
  // (opening balance + bills - approved returns - payments, aggregated per customer),
  // not "period sales minus period collections".
  const outstanding = calculateCustomerOutstanding(dateFilter?.end);
  const outstanding_receivables = outstanding.total_outstanding;
  
  const cash_outflows = filteredCash.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Cash collections only for drawer
  const cash_collections = collections.cash;
  const cash_in_drawer = cash_collections - cash_outflows;

  const unverified_returns_count = returns.filter(r => r.status === "pending_review").length;
  const unallocated_advances = outstanding.total_unallocated_credits;

  // Data quality issues: missing dates in payments/cash, missing amounts in daily/returns
  const missing_dates_count = payments.filter(p => !p.payment_date).length + cashTxs.filter(c => !c.transaction_date).length;
  const missing_amounts_count = bills.filter(b => b.total_amount === 0).length + returns.filter(r => r.amount === null).length;
  const data_quality_issues_count = missing_dates_count + missing_amounts_count;

  return {
    gross_sales,
    approved_returns,
    net_sales,
    total_collections,
    outstanding_receivables,
    cash_outflows,
    cash_in_drawer,
    unverified_returns_count,
    unallocated_advances,
    data_quality_issues_count
  };
}

/**
 * Add a new bill with atomic customer ledger balance adjustment
 */
export function createBill(newBill: Omit<Bill, "id" | "created_at">): Bill {
  const bills = getBills();
  const customers = getCustomers();

  const billId = `bill-${Date.now()}`;
  const bill: Bill = {
    ...newBill,
    id: billId,
    created_at: new Date().toISOString()
  };

  bills.unshift(bill);
  saveBills(bills);

  // Update customer balance
  const custIndex = customers.findIndex(c => c.id === bill.customer_id);
  if (custIndex >= 0) {
    customers[custIndex].total_bills_amount += bill.total_amount;
    customers[custIndex].current_balance += bill.total_amount;
    saveCustomers(customers);
  }

  return bill;
}

export function getBillById(billId: string): Bill | undefined {
  return getBills().find(b => b.id === billId);
}

/**
 * Update an existing bill with atomic customer ledger balance adjustment,
 * payment allocation safety check, and immutable audit logging.
 */
export function updateBill(
  billId: string,
  updatedFields: Omit<Bill, "id" | "created_at" | "bill_number" | "payment_status" | "status">,
  actor?: string
): { success: boolean; bill?: Bill; error?: string } {
  const bills = getBills();
  const idx = bills.findIndex(b => b.id === billId);
  if (idx === -1) {
    return { success: false, error: "Invoice not found." };
  }

  const existing = bills[idx];
  if (existing.status === "voided") {
    return { success: false, error: "Cannot edit a voided invoice." };
  }

  const allPayments = getPayments().filter(p => p.status === "posted");
  const allReturns = getReturns().filter(r => isApprovedReturn(r));
  const settlement = getBillSettlementInfo(billId, allPayments, allReturns);

  if (updatedFields.total_amount < settlement.allocated_payments_amount - MONEY_EPSILON) {
    return {
      success: false,
      error: `Cannot reduce invoice total (₹${updatedFields.total_amount}) below already-allocated payments (₹${settlement.allocated_payments_amount}). Reverse payment allocations first.`,
    };
  }

  if (
    existing.customer_id !== updatedFields.customer_id &&
    (settlement.allocations.length > 0 || settlement.approved_returns_amount > MONEY_EPSILON)
  ) {
    return {
      success: false,
      error: "Cannot change customer because payments or sales returns are already linked to this invoice.",
    };
  }

  let newPaymentStatus: Bill["payment_status"] = existing.payment_status;
  if (settlement.total_settled_amount > MONEY_EPSILON) {
    const remaining = Math.max(0, updatedFields.total_amount - settlement.total_settled_amount);
    newPaymentStatus = remaining <= MONEY_EPSILON ? "paid" : "partially_paid";
  } else if (
    existing.payment_status === "legacy_paid_yes" &&
    Math.abs(updatedFields.total_amount - existing.total_amount) <= MONEY_EPSILON
  ) {
    newPaymentStatus = "legacy_paid_yes";
  } else {
    newPaymentStatus = "unpaid";
  }

  const updatedBill: Bill = {
    ...existing,
    ...updatedFields,
    id: existing.id,
    bill_number: existing.bill_number,
    payment_status: newPaymentStatus,
    status: existing.status,
    created_at: existing.created_at,
  };

  bills[idx] = updatedBill;
  saveBills(bills);

  // Reconcile customer balance delta
  const customers = getCustomers();
  if (existing.customer_id === updatedBill.customer_id) {
    const diff = updatedBill.total_amount - existing.total_amount;
    const custIdx = customers.findIndex(c => c.id === updatedBill.customer_id);
    if (custIdx >= 0 && Math.abs(diff) > 0) {
      customers[custIdx].total_bills_amount = Math.max(0, (customers[custIdx].total_bills_amount || 0) + diff);
      customers[custIdx].current_balance = (customers[custIdx].current_balance || 0) + diff;
      saveCustomers(customers);
    }
  } else {
    const oldCustIdx = customers.findIndex(c => c.id === existing.customer_id);
    if (oldCustIdx >= 0) {
      customers[oldCustIdx].total_bills_amount = Math.max(0, (customers[oldCustIdx].total_bills_amount || 0) - existing.total_amount);
      customers[oldCustIdx].current_balance = (customers[oldCustIdx].current_balance || 0) - existing.total_amount;
    }
    const newCustIdx = customers.findIndex(c => c.id === updatedBill.customer_id);
    if (newCustIdx >= 0) {
      customers[newCustIdx].total_bills_amount = (customers[newCustIdx].total_bills_amount || 0) + updatedBill.total_amount;
      customers[newCustIdx].current_balance = (customers[newCustIdx].current_balance || 0) + updatedBill.total_amount;
    }
    saveCustomers(customers);
  }

  addAuditLog({
    action: "UPDATE_BILL",
    entity: `Bill #${updatedBill.bill_number} (${updatedBill.customer_name})`,
    actor: actor || "System User",
    notes: `Edited invoice #${updatedBill.bill_number}: Total ₹${existing.total_amount} -> ₹${updatedBill.total_amount}, Date: ${updatedBill.bill_date || "Not Specified"}`,
  });

  return { success: true, bill: updatedBill };
}

/**
 * Delete an existing invoice with atomic customer ledger balance reversal,
 * payment/return linkage safety check, and immutable audit logging.
 * Stock overview automatically excludes deleted invoices on recalculation.
 */
export function deleteBill(
  billId: string,
  actor?: string
): { success: boolean; bill?: Bill; error?: string } {
  const bills = getBills();
  const idx = bills.findIndex(b => b.id === billId);
  if (idx === -1) {
    return { success: false, error: "Invoice not found." };
  }

  const existing = bills[idx];
  const allPayments = getPayments().filter(p => p.status === "posted");
  const allReturns = getReturns().filter(r => isApprovedReturn(r));
  const settlement = getBillSettlementInfo(billId, allPayments, allReturns);

  if (
    settlement.allocations.length > 0 ||
    settlement.allocated_payments_amount > MONEY_EPSILON ||
    settlement.approved_returns_amount > MONEY_EPSILON
  ) {
    return {
      success: false,
      error: `Cannot delete invoice #${existing.bill_number} because payments (₹${settlement.allocated_payments_amount.toFixed(2)}) or sales returns (₹${settlement.approved_returns_amount.toFixed(2)}) are linked to it. Reverse those allocations/returns first.`,
    };
  }

  bills.splice(idx, 1);
  saveBills(bills);

  if (existing.status === "posted") {
    const customers = getCustomers();
    const custIdx = customers.findIndex(c => c.id === existing.customer_id);
    if (custIdx >= 0) {
      customers[custIdx].total_bills_amount = Math.max(
        0,
        (customers[custIdx].total_bills_amount || 0) - (existing.total_amount || 0)
      );
      customers[custIdx].current_balance =
        (customers[custIdx].current_balance || 0) - (existing.total_amount || 0);
      saveCustomers(customers);
    }
  }

  addAuditLog({
    action: "DELETE_BILL",
    entity: `Bill #${existing.bill_number} (${existing.customer_name})`,
    actor: actor || "System User",
    notes: `Deleted invoice #${existing.bill_number} dated ${existing.bill_date || "Not Specified"} for ₹${existing.total_amount}. Customer ledger and stock automatically reconciled.`,
  });

  return { success: true, bill: existing };
}

/**
 * Record a payment and optionally allocate to specific bills
 */
export function recordPayment(paymentData: {
  customer_id: string;
  customer_name: string;
  payment_date: string;
  amount: number;
  payment_mode: any;
  reference_number?: string;
  notes?: string;
  allocations?: { bill_id: string; bill_number: string; allocated_amount: number }[];
}): Payment {
  const payments = getPayments();
  const bills = getBills();
  const customers = getCustomers();

  const totalAllocated = (paymentData.allocations || []).reduce((acc, a) => acc + a.allocated_amount, 0);
  const unallocated = Math.max(0, paymentData.amount - totalAllocated);

  const paymentId = `pay-${Date.now()}`;
  const receiptNo = `RCP-${new Date().getFullYear()}-${(payments.length + 1).toString().padStart(4, "0")}`;

  const payment: Payment = {
    id: paymentId,
    receipt_number: receiptNo,
    payment_date: paymentData.payment_date,
    customer_id: paymentData.customer_id,
    customer_name: paymentData.customer_name,
    amount: paymentData.amount,
    payment_mode: paymentData.payment_mode,
    reference_number: paymentData.reference_number,
    notes: paymentData.notes,
    unallocated_amount: unallocated,
    status: "posted",
    is_imported: false,
    allocations: (paymentData.allocations || []).map(a => ({
      id: `alloc-${Date.now()}-${Math.random()}`,
      payment_id: paymentId,
      bill_id: a.bill_id,
      bill_number: a.bill_number,
      allocated_amount: a.allocated_amount,
      created_at: new Date().toISOString()
    })),
    created_at: new Date().toISOString()
  };

  payments.unshift(payment);
  savePayments(payments);

  // Update allocated bills status
  if (paymentData.allocations && paymentData.allocations.length > 0) {
    let updatedBills = false;
    const allReturns = getReturns().filter(r => isApprovedReturn(r));
    for (const alloc of paymentData.allocations) {
      const bIdx = bills.findIndex(b => b.id === alloc.bill_id);
      if (bIdx >= 0) {
        const settlement = getBillSettlementInfo(alloc.bill_id, payments, allReturns);
        bills[bIdx].payment_status = settlement.payment_status;
        updatedBills = true;
      }
    }
    if (updatedBills) {
      saveBills(bills);
    }
  }

  // Update customer balance
  const cIdx = customers.findIndex(c => c.id === paymentData.customer_id);
  if (cIdx >= 0) {
    customers[cIdx].total_paid_amount += paymentData.amount;
    customers[cIdx].current_balance -= paymentData.amount;
    saveCustomers(customers);
  }

  return payment;
}

/* ------------------------------------------------------------------ */
/*  Payment Allocation & Bill Settlement Management                   */
/* ------------------------------------------------------------------ */

export interface BillAllocationDetail {
  allocation_id: string;
  payment_id: string;
  payment_receipt_number: string;
  payment_date: string | null;
  payment_mode: string;
  allocated_amount: number;
  allocated_by?: string;
  allocated_at: string;
  notes?: string;
}

export interface BillSettlementInfo {
  bill_id: string;
  bill_number: string;
  total_amount: number;
  allocated_payments_amount: number;
  approved_returns_amount: number;
  total_settled_amount: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  allocations: BillAllocationDetail[];
}

/**
 * Calculate the exact settled amount and remaining balance for a given bill,
 * combining all posted payment allocations and approved sales returns.
 */
export function getBillSettlementInfo(
  billId: string,
  allPayments?: Payment[],
  allReturns?: SalesReturn[]
): BillSettlementInfo {
  const bills = getBills();
  const bill = bills.find(b => b.id === billId);
  const billNumber = bill?.bill_number || "";
  const totalAmount = bill?.total_amount || 0;

  const payments = allPayments || getPayments().filter(p => p.status === "posted");
  const returns = allReturns || getReturns().filter(r => isApprovedReturn(r));

  let allocatedPaymentsAmount = 0;
  const allocations: BillAllocationDetail[] = [];

  for (const p of payments) {
    if (p.status !== "posted") continue;
    for (const alloc of p.allocations || []) {
      if (alloc.bill_id === billId) {
        allocatedPaymentsAmount += alloc.allocated_amount || 0;
        allocations.push({
          allocation_id: alloc.id,
          payment_id: p.id,
          payment_receipt_number: p.receipt_number,
          payment_date: p.payment_date,
          payment_mode: p.payment_mode,
          allocated_amount: alloc.allocated_amount,
          allocated_by: alloc.allocated_by,
          allocated_at: alloc.created_at,
          notes: alloc.notes,
        });
      }
    }
  }

  let approvedReturnsAmount = 0;
  for (const r of returns) {
    if (r.original_bill_id === billId && isApprovedReturn(r)) {
      approvedReturnsAmount += r.amount || 0;
    }
  }

  const totalSettledAmount = allocatedPaymentsAmount + approvedReturnsAmount;
  const remainingBalance = Math.max(0, totalAmount - totalSettledAmount);

  let paymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
  if (remainingBalance <= MONEY_EPSILON) {
    paymentStatus = 'paid';
  } else if (totalSettledAmount > MONEY_EPSILON) {
    paymentStatus = 'partially_paid';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    bill_id: billId,
    bill_number: billNumber,
    total_amount: totalAmount,
    allocated_payments_amount: allocatedPaymentsAmount,
    approved_returns_amount: approvedReturnsAmount,
    total_settled_amount: totalSettledAmount,
    remaining_balance: remainingBalance,
    payment_status: paymentStatus,
    allocations,
  };
}

/**
 * Retrieve all posted payments for a customer that have unallocated credit remaining (> ₹0.01).
 */
export function getCustomerUnallocatedPayments(customerIdOrName: string): Payment[] {
  const payments = getPayments().filter(p => p.status === "posted");
  const target = (customerIdOrName || "").trim().toUpperCase();

  return payments.filter(p => {
    const matchId = p.customer_id === customerIdOrName;
    const matchName = (p.customer_name || "").trim().toUpperCase() === target;
    if (!matchId && !matchName) return false;

    const allocated = (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
    const unallocated = Math.max(0, (p.amount || 0) - allocated);
    return unallocated > MONEY_EPSILON;
  });
}

/**
 * Retrieve all posted bills for a customer that have an outstanding remaining balance (> ₹0.01).
 */
export function getCustomerOutstandingBills(
  customerIdOrName: string
): (Bill & BillSettlementInfo)[] {
  const bills = getBills().filter(b => b.status === "posted");
  const payments = getPayments().filter(p => p.status === "posted");
  const returns = getReturns().filter(r => isApprovedReturn(r));
  const target = (customerIdOrName || "").trim().toUpperCase();

  const custBills = bills.filter(b => {
    const matchId = b.customer_id === customerIdOrName;
    const matchName = (b.customer_name || "").trim().toUpperCase() === target;
    return matchId || matchName;
  });

  const list: (Bill & BillSettlementInfo)[] = [];
  for (const b of custBills) {
    const settlement = getBillSettlementInfo(b.id, payments, returns);
    if (settlement.remaining_balance > MONEY_EPSILON) {
      list.push({
        ...b,
        ...settlement,
      });
    }
  }

  list.sort((a, b) => (a.bill_date || "").localeCompare(b.bill_date || ""));
  return list;
}

export interface AllocationItemRequest {
  bill_id: string;
  allocated_amount: number;
  notes?: string;
}

export interface AllocationResult {
  success: boolean;
  error?: string;
  allocated_total?: number;
  payment?: Payment;
  audit_log?: AuditLog;
}

/**
 * Atomic Payment Allocation Transaction:
 * Links an existing customer payment to one or more outstanding bills.
 * - Enforces role authorization (Owner or Manager).
 * - Validates available unallocated credit on the payment.
 * - Validates remaining unpaid balance on each bill.
 * - Updates payment allocations and unallocated_amount.
 * - Automatically updates bill payment_status ('paid', 'partially_paid', 'unpaid').
 * - Writes immutable audit log entry.
 * - Never creates a duplicate payment.
 * - Never counts allocated payments twice in customer outstanding.
 */
export function allocatePaymentToBills(params: {
  payment_id: string;
  allocations: AllocationItemRequest[];
  notes?: string;
}): AllocationResult {
  const role = getStoredUserRole();
  if (role !== "owner" && role !== "manager" && role !== "admin") {
    return {
      success: false,
      error: "Authorization required: Only Owner, Manager or Admin can allocate payments."
    };
  }

  const payments = getPayments();
  const payIdx = payments.findIndex(p => p.id === params.payment_id);
  if (payIdx === -1) {
    return { success: false, error: "Payment receipt not found." };
  }
  const payment = payments[payIdx];
  if (payment.status !== "posted") {
    return { success: false, error: "Cannot allocate a voided payment." };
  }

  const currentAllocated = (payment.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
  const availableUnallocated = Math.max(0, payment.amount - currentAllocated);

  const validRequests = (params.allocations || []).filter(a => (a.allocated_amount || 0) > MONEY_EPSILON);
  if (validRequests.length === 0) {
    return { success: false, error: "Please enter an allocation amount greater than ₹0." };
  }

  const requestedTotal = validRequests.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  if (requestedTotal > availableUnallocated + MONEY_EPSILON) {
    return {
      success: false,
      error: `Requested allocation (₹${requestedTotal.toFixed(2)}) exceeds available payment unallocated credit (₹${availableUnallocated.toFixed(2)}).`
    };
  }

  const bills = getBills();
  const returns = getReturns().filter(r => isApprovedReturn(r));

  for (const req of validRequests) {
    const bill = bills.find(b => b.id === req.bill_id);
    if (!bill) {
      return { success: false, error: `Bill not found for ID: ${req.bill_id}` };
    }
    if (bill.status !== "posted") {
      return { success: false, error: `Cannot allocate to non-posted bill ${bill.bill_number}.` };
    }
    if (
      bill.customer_id !== payment.customer_id &&
      bill.customer_name.trim().toUpperCase() !== payment.customer_name.trim().toUpperCase()
    ) {
      return {
        success: false,
        error: `Bill ${bill.bill_number} belongs to a different customer (${bill.customer_name}).`
      };
    }

    const settlement = getBillSettlementInfo(bill.id, payments, returns);
    if (req.allocated_amount > settlement.remaining_balance + MONEY_EPSILON) {
      return {
        success: false,
        error: `Allocation of ₹${req.allocated_amount.toFixed(2)} exceeds remaining balance on Bill #${bill.bill_number} (₹${settlement.remaining_balance.toFixed(2)}).`
      };
    }
  }

  // Atomic Execution
  const actorName = role === "owner" ? "Pramod Maharaj (Owner)" : role === "admin" ? "System Administrator (Admin)" : "Manager";
  const nowIso = new Date().toISOString();
  if (!payment.allocations) payment.allocations = [];

  const allocationDescriptions: string[] = [];

  for (const req of validRequests) {
    const bill = bills.find(b => b.id === req.bill_id)!;
    const allocItem: PaymentAllocation = {
      id: `alloc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      payment_id: payment.id,
      payment_receipt_number: payment.receipt_number,
      payment_date: payment.payment_date,
      bill_id: bill.id,
      bill_number: bill.bill_number,
      bill_date: bill.bill_date || undefined,
      allocated_amount: req.allocated_amount,
      allocated_by: actorName,
      notes: req.notes || params.notes,
      created_at: nowIso,
    };
    payment.allocations.push(allocItem);
    allocationDescriptions.push(`₹${req.allocated_amount.toFixed(2)} to Bill #${bill.bill_number}`);
  }

  const newTotalAllocated = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, payment.amount - newTotalAllocated);
  payments[payIdx] = payment;
  savePayments(payments);

  // Update status for all affected bills
  for (const req of validRequests) {
    const bIdx = bills.findIndex(b => b.id === req.bill_id);
    if (bIdx >= 0) {
      const updatedSettlement = getBillSettlementInfo(bills[bIdx].id, payments, returns);
      bills[bIdx].payment_status = updatedSettlement.payment_status;
    }
  }
  saveBills(bills);

  // Audit Log
  const auditEntry = addAuditLog({
    action: "PAYMENT_ALLOCATION",
    entity: `Payment ${payment.receipt_number} (${payment.customer_name})`,
    actor: actorName,
    notes: `Allocated total ₹${requestedTotal.toFixed(2)}: ${allocationDescriptions.join("; ")}.${params.notes ? ` Notes: ${params.notes}` : ""}`
  });

  return {
    success: true,
    allocated_total: requestedTotal,
    payment,
    audit_log: auditEntry
  };
}

/**
 * Reverse an incorrect payment allocation:
 * - Enforces role authorization (Owner or Manager).
 * - Restores unallocated amount to the payment.
 * - Recalculates affected bill's payment_status ('unpaid', 'partially_paid', 'paid').
 * - Logs audit trail with reversal reason.
 */
export function reversePaymentAllocation(params: {
  payment_id: string;
  allocation_id: string;
  reason?: string;
}): { success: boolean; error?: string; audit_log?: AuditLog } {
  const role = getStoredUserRole();
  if (role !== "owner" && role !== "manager" && role !== "admin") {
    return {
      success: false,
      error: "Authorization required: Only Owner, Manager or Admin can reverse payment allocations."
    };
  }

  const payments = getPayments();
  const payIdx = payments.findIndex(p => p.id === params.payment_id);
  if (payIdx === -1) {
    return { success: false, error: "Payment not found." };
  }
  const payment = payments[payIdx];

  const allocIdx = (payment.allocations || []).findIndex(a => a.id === params.allocation_id);
  if (allocIdx === -1) {
    return { success: false, error: "Allocation record not found." };
  }

  const allocation = payment.allocations[allocIdx];
  const billId = allocation.bill_id;
  const billNumber = allocation.bill_number;
  const reversedAmount = allocation.allocated_amount;

  payment.allocations.splice(allocIdx, 1);
  const totalAllocatedNow = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, payment.amount - totalAllocatedNow);
  payments[payIdx] = payment;
  savePayments(payments);

  const bills = getBills();
  const returns = getReturns().filter(r => isApprovedReturn(r));
  const bIdx = bills.findIndex(b => b.id === billId);
  if (bIdx >= 0) {
    const updatedSettlement = getBillSettlementInfo(billId, payments, returns);
    bills[bIdx].payment_status = updatedSettlement.payment_status;
    saveBills(bills);
  }

  const actorName = role === "owner" ? "Pramod Maharaj (Owner)" : role === "admin" ? "System Administrator (Admin)" : "Manager";
  const auditEntry = addAuditLog({
    action: "ALLOCATION_REVERSAL",
    entity: `Payment ${payment.receipt_number} ➔ Bill #${billNumber}`,
    actor: actorName,
    notes: `Reversed allocation of ₹${reversedAmount.toFixed(2)} from Receipt #${payment.receipt_number} to Bill #${billNumber}.${params.reason ? ` Reason: ${params.reason}` : ""}`
  });

  return { success: true, audit_log: auditEntry };
}

/* ------------------------------------------------------------------ */
/*  Master Data Catalogs & Admin Configuration Management             */
/* ------------------------------------------------------------------ */

export const INITIAL_CEMENT_BRANDS: CementBrand[] = [
  { id: "cb-1", name: "LNT", defaultRate: 340, isActive: true, notes: "L&T UltraTech OPC / PPC" },
  { id: "cb-2", name: "SUPPER", defaultRate: 345, isActive: true, notes: "Supper Cement Bags" },
  { id: "cb-3", name: "SHREE", defaultRate: 330, isActive: true, notes: "Shree Jung Rodhak" },
  { id: "cb-4", name: "MARBAL", defaultRate: 335, isActive: true, notes: "Marble special blend" },
  { id: "cb-5", name: "ROOFON", defaultRate: 360, isActive: true, notes: "Roofon concrete ready" },
  { id: "cb-6", name: "PRIMIUM", defaultRate: 350, isActive: true, notes: "Premium grade bags" },
  { id: "cb-7", name: "DSP", defaultRate: 380, isActive: true, notes: "Dalmia DSP high strength" },
  { id: "cb-8", name: "CON. SPECIAL", defaultRate: 375, isActive: true, notes: "Construction special formula" },
];

export const INITIAL_ROD_SIZES: RodSize[] = [
  { id: "rs-1", size: "8mm", defaultRate: 71.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-2", size: "10mm", defaultRate: 70.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-3", size: "12mm", defaultRate: 68.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-4", size: "16mm", defaultRate: 68.0, isActive: true, notes: "Fe 550D Structural Rebar" },
  { id: "rs-5", size: "20mm", defaultRate: 69.0, isActive: true, notes: "Heavy Foundation Rod" },
  { id: "rs-6", size: "25mm", defaultRate: 70.0, isActive: true, notes: "Heavy Foundation Rod" },
  { id: "rs-7", size: "Binding Wire", defaultRate: 75.0, isActive: true, notes: "GI / Annealed Wire" },
];

export const INITIAL_HARDWARE_ITEMS: HardwareItem[] = [
  { id: "hw-1", name: "Polycab 2.5mm Wire 90m Coil", unit: "Coils", defaultRate: 2450, openingStock: 25, isActive: true, notes: "FR Flame Retardant 90m" },
  { id: "hw-2", name: "Finolex 1.5mm Wire 90m Coil", unit: "Coils", defaultRate: 1650, openingStock: 30, isActive: true, notes: "FR Multi-strand PVC" },
  { id: "hw-3", name: "Anchor 16A One-Way Switch", unit: "Pcs", defaultRate: 45, openingStock: 120, isActive: true, notes: "Modular Switch" },
  { id: "hw-4", name: "Anchor 6A One-Way Switch", unit: "Pcs", defaultRate: 28, openingStock: 150, isActive: true, notes: "Modular Switch" },
  { id: "hw-5", name: "Havells 16A Single Pole MCB", unit: "Pcs", defaultRate: 185, openingStock: 40, isActive: true, notes: "C-Curve Miniature Circuit Breaker" },
  { id: "hw-6", name: "Anchor Roma Modular 6M Plate", unit: "Pcs", defaultRate: 95, openingStock: 50, isActive: true, notes: "6 Module Cover Plate" },
  { id: "hw-7", name: "PVC Conduit Pipe 25mm (3m)", unit: "Pcs", defaultRate: 85, openingStock: 80, isActive: true, notes: "Heavy Duty Electrical Pipe" },
  { id: "hw-8", name: "Cello Tape / PVC Insulation Tape", unit: "Pcs", defaultRate: 15, openingStock: 200, isActive: true, notes: "Electrical Joint Tape" },
];

export const INITIAL_PAYMENT_MODES: PaymentModeOption[] = [
  { id: "pm-1", code: "CASH", label: "Cash Payment", isActive: true, isSystem: true },
  { id: "pm-2", code: "UPI", label: "UPI (PhonePe / GooglePay / QR)", isActive: true, isSystem: true },
  { id: "pm-3", code: "CC UPI", label: "Credit Card UPI", isActive: true, isSystem: false },
  { id: "pm-4", code: "SBI", label: "SBI Current Account", isActive: true, isSystem: false },
  { id: "pm-5", code: "BANK_TRANSFER", label: "Bank Transfer (NEFT / RTGS)", isActive: true, isSystem: true },
  { id: "pm-6", code: "CHEQUE", label: "Cheque Clearing", isActive: true, isSystem: false },
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { id: "ec-1", name: "Shop Expense", isActive: true },
  { id: "ec-2", name: "Godown Transfer", isActive: true },
  { id: "ec-3", name: "Supplier Payment", isActive: true },
  { id: "ec-4", name: "Staff Salary/Advance", isActive: true },
  { id: "ec-5", name: "Transport / Auto", isActive: true },
  { id: "ec-6", name: "Shop Rent", isActive: true },
  { id: "ec-7", name: "Electricity / Power", isActive: true },
  { id: "ec-8", name: "Uncategorized Outflow", isActive: true },
];

/* ---------------- CEMENT BRANDS CRUD ---------------- */

export function getCementBrands(): CementBrand[] {
  if (!isClient()) return INITIAL_CEMENT_BRANDS;
  const raw = localStorage.getItem(STORAGE_KEYS.CEMENT_BRANDS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(INITIAL_CEMENT_BRANDS));
    return INITIAL_CEMENT_BRANDS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CEMENT_BRANDS;
  } catch {
    return INITIAL_CEMENT_BRANDS;
  }
}

export function saveCementBrands(brands: CementBrand[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(brands));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addCementBrand(
  data: { name: string; defaultRate?: number; openingStock?: number; notes?: string },
  actor?: string
): { success: boolean; brand?: CementBrand; error?: string } {
  const name = (data.name || "").trim().toUpperCase();
  if (!name) {
    return { success: false, error: "Cement brand name is required." };
  }

  const brands = getCementBrands();
  if (brands.some(b => b.name.toUpperCase() === name)) {
    return { success: false, error: `Cement brand "${name}" already exists.` };
  }

  const newBrand: CementBrand = {
    id: `cb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    defaultRate: Number(data.defaultRate) || 0,
    openingStock: Number(data.openingStock) || 0,
    isActive: true,
    notes: data.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  brands.push(newBrand);
  saveCementBrands(brands);

  addAuditLog({
    action: "ADD_CEMENT_BRAND",
    entity: `Cement Brand: ${name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new cement brand "${name}" with default rate ₹${newBrand.defaultRate}/bag${newBrand.openingStock ? ` and opening stock ${newBrand.openingStock} bags` : ""}.`,
  });

  return { success: true, brand: newBrand };
}

export function updateCementBrand(
  id: string,
  updates: Partial<Pick<CementBrand, "name" | "defaultRate" | "openingStock" | "isActive" | "notes">>,
  actor?: string
): { success: boolean; brand?: CementBrand; error?: string } {
  const brands = getCementBrands();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) {
    return { success: false, error: "Cement brand not found." };
  }

  const oldBrand = brands[idx];
  const newName = updates.name ? updates.name.trim().toUpperCase() : oldBrand.name;

  if (updates.name && newName !== oldBrand.name && brands.some(b => b.id !== id && b.name.toUpperCase() === newName)) {
    return { success: false, error: `Another cement brand named "${newName}" already exists.` };
  }

  const updatedBrand: CementBrand = {
    ...oldBrand,
    name: newName,
    defaultRate: updates.defaultRate !== undefined ? Number(updates.defaultRate) : oldBrand.defaultRate,
    openingStock: updates.openingStock !== undefined ? Number(updates.openingStock) : (oldBrand.openingStock || 0),
    isActive: updates.isActive !== undefined ? updates.isActive : oldBrand.isActive,
    notes: updates.notes !== undefined ? updates.notes.trim() : oldBrand.notes,
    updatedAt: new Date().toISOString(),
  };

  brands[idx] = updatedBrand;
  saveCementBrands(brands);

  addAuditLog({
    action: "UPDATE_CEMENT_BRAND",
    entity: `Cement Brand: ${updatedBrand.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated brand "${oldBrand.name}"${newName !== oldBrand.name ? ` to "${newName}"` : ""}. Rate: ₹${updatedBrand.defaultRate}, Opening Stock: ${updatedBrand.openingStock || 0} Bags, Status: ${updatedBrand.isActive ? "Active" : "Inactive"}.`,
  });

  return { success: true, brand: updatedBrand };
}

export function deleteCementBrand(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const brands = getCementBrands();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) {
    return { success: false, error: "Cement brand not found." };
  }

  const brandToDelete = brands[idx];
  brands.splice(idx, 1);
  saveCementBrands(brands);

  addAuditLog({
    action: "REMOVE_CEMENT_BRAND",
    entity: `Cement Brand: ${brandToDelete.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed cement brand "${brandToDelete.name}" from active catalog.`,
  });

  return { success: true };
}

/* ---------------- ROD / STEEL SIZES CRUD ---------------- */

export function getRodSizes(): RodSize[] {
  if (!isClient()) return INITIAL_ROD_SIZES;
  const raw = localStorage.getItem(STORAGE_KEYS.ROD_SIZES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ROD_SIZES, JSON.stringify(INITIAL_ROD_SIZES));
    return INITIAL_ROD_SIZES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ROD_SIZES;
  } catch {
    return INITIAL_ROD_SIZES;
  }
}

export function saveRodSizes(sizes: RodSize[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.ROD_SIZES, JSON.stringify(sizes));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addRodSize(
  data: { size: string; defaultRate?: number; openingStock?: number; notes?: string },
  actor?: string
): { success: boolean; size?: RodSize; error?: string } {
  const size = (data.size || "").trim();
  if (!size) {
    return { success: false, error: "Rod size specification is required." };
  }

  const sizes = getRodSizes();
  if (sizes.some(s => s.size.toLowerCase() === size.toLowerCase())) {
    return { success: false, error: `Rod size "${size}" already exists.` };
  }

  const newSize: RodSize = {
    id: `rs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    size,
    defaultRate: Number(data.defaultRate) || 0,
    openingStock: Number(data.openingStock) || 0,
    isActive: true,
    notes: data.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  sizes.push(newSize);
  saveRodSizes(sizes);

  addAuditLog({
    action: "ADD_ROD_SIZE",
    entity: `Rod Size: ${size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Added rod specification "${size}" with default rate ₹${newSize.defaultRate}/Kg${newSize.openingStock ? ` and opening stock ${newSize.openingStock} Kg` : ""}.`,
  });

  return { success: true, size: newSize };
}

export function updateRodSize(
  id: string,
  updates: Partial<Pick<RodSize, "size" | "defaultRate" | "openingStock" | "isActive" | "notes">>,
  actor?: string
): { success: boolean; size?: RodSize; error?: string } {
  const sizes = getRodSizes();
  const idx = sizes.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, error: "Rod size not found." };
  }

  const old = sizes[idx];
  const newSizeName = updates.size ? updates.size.trim() : old.size;

  if (updates.size && newSizeName.toLowerCase() !== old.size.toLowerCase() && sizes.some(s => s.id !== id && s.size.toLowerCase() === newSizeName.toLowerCase())) {
    return { success: false, error: `Another rod specification named "${newSizeName}" already exists.` };
  }

  const updated: RodSize = {
    ...old,
    size: newSizeName,
    defaultRate: updates.defaultRate !== undefined ? Number(updates.defaultRate) : old.defaultRate,
    openingStock: updates.openingStock !== undefined ? Number(updates.openingStock) : (old.openingStock || 0),
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
    notes: updates.notes !== undefined ? updates.notes.trim() : old.notes,
    updatedAt: new Date().toISOString(),
  };

  sizes[idx] = updated;
  saveRodSizes(sizes);

  addAuditLog({
    action: "UPDATE_ROD_SIZE",
    entity: `Rod Size: ${updated.size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated rod size "${old.size}". Rate: ₹${updated.defaultRate}/Kg, Opening Stock: ${updated.openingStock || 0} Kg, Status: ${updated.isActive ? "Active" : "Inactive"}.`,
  });

  return { success: true, size: updated };
}

export function deleteRodSize(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const sizes = getRodSizes();
  const idx = sizes.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, error: "Rod size not found." };
  }

  const deleted = sizes[idx];
  sizes.splice(idx, 1);
  saveRodSizes(sizes);

  addAuditLog({
    action: "REMOVE_ROD_SIZE",
    entity: `Rod Size: ${deleted.size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed rod size "${deleted.size}" from catalog.`,
  });

  return { success: true };
}

/* ---------------- HARDWARE / ELECTRICAL ITEMS CRUD ---------------- */

export function getHardwareItems(): HardwareItem[] {
  if (!isClient()) return INITIAL_HARDWARE_ITEMS;
  const raw = localStorage.getItem(STORAGE_KEYS.HARDWARE_ITEMS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.HARDWARE_ITEMS, JSON.stringify(INITIAL_HARDWARE_ITEMS));
    return INITIAL_HARDWARE_ITEMS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HARDWARE_ITEMS;
  } catch {
    return INITIAL_HARDWARE_ITEMS;
  }
}

export function saveHardwareItems(items: HardwareItem[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.HARDWARE_ITEMS, JSON.stringify(items));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addHardwareItem(
  data: { name: string; unit?: string; defaultRate?: number; openingStock?: number; notes?: string },
  actor?: string
): { success: boolean; item?: HardwareItem; error?: string } {
  const name = (data.name || "").trim();
  if (!name) {
    return { success: false, error: "Hardware item name is required." };
  }

  const items = getHardwareItems();
  if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, error: `Hardware item "${name}" already exists.` };
  }

  const newItem: HardwareItem = {
    id: `hw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    unit: data.unit?.trim() || "Pcs",
    defaultRate: Number(data.defaultRate) || 0,
    openingStock: Number(data.openingStock) || 0,
    isActive: true,
    notes: data.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  items.push(newItem);
  saveHardwareItems(items);

  addAuditLog({
    action: "ADD_HARDWARE_ITEM",
    entity: `Hardware Item: ${name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Added electrical & hardware item "${name}" (${newItem.unit}) with default rate ₹${newItem.defaultRate}${newItem.openingStock ? ` and opening stock ${newItem.openingStock} ${newItem.unit}` : ""}.`,
  });

  return { success: true, item: newItem };
}

export function updateHardwareItem(
  id: string,
  updates: Partial<Pick<HardwareItem, "name" | "unit" | "defaultRate" | "openingStock" | "isActive" | "notes">>,
  actor?: string
): { success: boolean; item?: HardwareItem; error?: string } {
  const items = getHardwareItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) {
    return { success: false, error: "Hardware item not found." };
  }

  const old = items[idx];
  const newName = updates.name ? updates.name.trim() : old.name;

  if (updates.name && newName.toLowerCase() !== old.name.toLowerCase() && items.some(i => i.id !== id && i.name.toLowerCase() === newName.toLowerCase())) {
    return { success: false, error: `Another hardware item named "${newName}" already exists.` };
  }

  const updated: HardwareItem = {
    ...old,
    name: newName,
    unit: updates.unit !== undefined ? updates.unit.trim() : old.unit,
    defaultRate: updates.defaultRate !== undefined ? Number(updates.defaultRate) : old.defaultRate,
    openingStock: updates.openingStock !== undefined ? Number(updates.openingStock) : (old.openingStock || 0),
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
    notes: updates.notes !== undefined ? updates.notes.trim() : old.notes,
    updatedAt: new Date().toISOString(),
  };

  items[idx] = updated;
  saveHardwareItems(items);

  addAuditLog({
    action: "UPDATE_HARDWARE_ITEM",
    entity: `Hardware Item: ${updated.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated item "${old.name}". Rate: ₹${updated.defaultRate}, Opening Stock: ${updated.openingStock || 0} ${updated.unit}, Status: ${updated.isActive ? "Active" : "Inactive"}.`,
  });

  return { success: true, item: updated };
}

export function deleteHardwareItem(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const items = getHardwareItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) {
    return { success: false, error: "Hardware item not found." };
  }

  const deleted = items[idx];
  items.splice(idx, 1);
  saveHardwareItems(items);

  addAuditLog({
    action: "REMOVE_HARDWARE_ITEM",
    entity: `Hardware Item: ${deleted.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed hardware item "${deleted.name}" from catalog.`,
  });

  return { success: true };
}

/* ---------------- PAYMENT MODES CRUD ---------------- */

export function getPaymentModes(): PaymentModeOption[] {
  if (!isClient()) return INITIAL_PAYMENT_MODES;
  const raw = localStorage.getItem(STORAGE_KEYS.PAYMENT_MODES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_MODES, JSON.stringify(INITIAL_PAYMENT_MODES));
    return INITIAL_PAYMENT_MODES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENT_MODES;
  } catch {
    return INITIAL_PAYMENT_MODES;
  }
}

export function savePaymentModes(modes: PaymentModeOption[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_MODES, JSON.stringify(modes));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addPaymentMode(
  data: { code: string; label: string },
  actor?: string
): { success: boolean; mode?: PaymentModeOption; error?: string } {
  const code = (data.code || "").trim().toUpperCase();
  const label = (data.label || "").trim();
  if (!code || !label) {
    return { success: false, error: "Payment mode code and display label are required." };
  }

  const modes = getPaymentModes();
  if (modes.some(m => m.code === code)) {
    return { success: false, error: `Payment mode code "${code}" already exists.` };
  }

  const newMode: PaymentModeOption = {
    id: `pm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code,
    label,
    isActive: true,
    isSystem: false,
  };

  modes.push(newMode);
  savePaymentModes(modes);

  addAuditLog({
    action: "ADD_PAYMENT_MODE",
    entity: `Payment Mode: ${code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new payment channel "${label}" [${code}].`,
  });

  return { success: true, mode: newMode };
}

export function updatePaymentMode(
  id: string,
  updates: Partial<Pick<PaymentModeOption, "label" | "isActive">>,
  actor?: string
): { success: boolean; mode?: PaymentModeOption; error?: string } {
  const modes = getPaymentModes();
  const idx = modes.findIndex(m => m.id === id);
  if (idx === -1) {
    return { success: false, error: "Payment mode not found." };
  }

  const old = modes[idx];
  const updated: PaymentModeOption = {
    ...old,
    label: updates.label ? updates.label.trim() : old.label,
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
  };

  modes[idx] = updated;
  savePaymentModes(modes);

  addAuditLog({
    action: "UPDATE_PAYMENT_MODE",
    entity: `Payment Mode: ${updated.code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated payment channel "${updated.code}" (${updated.label}). Active: ${updated.isActive}.`,
  });

  return { success: true, mode: updated };
}

export function deletePaymentMode(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const modes = getPaymentModes();
  const idx = modes.findIndex(m => m.id === id);
  if (idx === -1) {
    return { success: false, error: "Payment mode not found." };
  }

  const deleted = modes[idx];
  if (deleted.isSystem) {
    return { success: false, error: `System payment mode "${deleted.code}" cannot be deleted. You can deactivate it instead.` };
  }

  modes.splice(idx, 1);
  savePaymentModes(modes);

  addAuditLog({
    action: "REMOVE_PAYMENT_MODE",
    entity: `Payment Mode: ${deleted.code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Removed custom payment channel "${deleted.code}".`,
  });

  return { success: true };
}

/* ---------------- EXPENSE CATEGORIES CRUD ---------------- */

export function getExpenseCategories(): ExpenseCategoryOption[] {
  if (!isClient()) return INITIAL_EXPENSE_CATEGORIES;
  const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(INITIAL_EXPENSE_CATEGORIES));
    return INITIAL_EXPENSE_CATEGORIES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSE_CATEGORIES;
  } catch {
    return INITIAL_EXPENSE_CATEGORIES;
  }
}

export function saveExpenseCategories(cats: ExpenseCategoryOption[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(cats));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addExpenseCategory(
  name: string,
  actor?: string
): { success: boolean; category?: ExpenseCategoryOption; error?: string } {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { success: false, error: "Category name is required." };
  }

  const cats = getExpenseCategories();
  if (cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: `Expense category "${trimmed}" already exists.` };
  }

  const newCat: ExpenseCategoryOption = {
    id: `ec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmed,
    isActive: true,
  };

  cats.push(newCat);
  saveExpenseCategories(cats);

  addAuditLog({
    action: "ADD_EXPENSE_CATEGORY",
    entity: `Category: ${trimmed}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new cash outflow category "${trimmed}".`,
  });

  return { success: true, category: newCat };
}

export function updateExpenseCategory(
  id: string,
  updates: Partial<Pick<ExpenseCategoryOption, "name" | "isActive">>,
  actor?: string
): { success: boolean; category?: ExpenseCategoryOption; error?: string } {
  const cats = getExpenseCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) {
    return { success: false, error: "Expense category not found." };
  }

  const old = cats[idx];
  const newName = updates.name ? updates.name.trim() : old.name;

  if (updates.name && newName.toLowerCase() !== old.name.toLowerCase() && cats.some(c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase())) {
    return { success: false, error: `Another expense category named "${newName}" already exists.` };
  }

  const updated: ExpenseCategoryOption = {
    ...old,
    name: newName,
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
  };

  cats[idx] = updated;
  saveExpenseCategories(cats);

  addAuditLog({
    action: "UPDATE_EXPENSE_CATEGORY",
    entity: `Category: ${updated.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated expense category "${old.name}" to "${updated.name}". Active: ${updated.isActive}.`,
  });

  return { success: true, category: updated };
}

export function deleteExpenseCategory(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const cats = getExpenseCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) {
    return { success: false, error: "Expense category not found." };
  }

  const deleted = cats[idx];
  cats.splice(idx, 1);
  saveExpenseCategories(cats);

  addAuditLog({
    action: "REMOVE_EXPENSE_CATEGORY",
    entity: `Category: ${deleted.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed expense category "${deleted.name}".`,
  });

  return { success: true };
}

/* ---------------- BUSINESS PROFILE CRUD ---------------- */

export function getBusinessProfile(): BusinessProfile {
  const fallback: BusinessProfile = {
    name: seedData.business.name,
    gstin: seedData.business.gstin,
    phone: seedData.business.phone,
    email: seedData.business.email,
    address: seedData.business.address,
  };

  if (!isClient()) return fallback;

  const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || fallback.name,
      gstin: parsed.gstin || fallback.gstin,
      phone: parsed.phone || fallback.phone,
      email: parsed.email || fallback.email,
      address: parsed.address || fallback.address,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return fallback;
  }
}

export function saveBusinessProfile(
  profile: Partial<BusinessProfile>,
  actor?: string
): BusinessProfile {
  const current = getBusinessProfile();
  const updated: BusinessProfile = {
    name: (profile.name !== undefined ? profile.name : current.name).trim(),
    gstin: (profile.gstin !== undefined ? profile.gstin : current.gstin).trim().toUpperCase(),
    phone: (profile.phone !== undefined ? profile.phone : current.phone).trim(),
    email: (profile.email !== undefined ? profile.email : current.email).trim(),
    address: (profile.address !== undefined ? profile.address : current.address).trim(),
    updatedAt: new Date().toISOString(),
  };

  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(updated));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }

  addAuditLog({
    action: "UPDATE_BUSINESS_PROFILE",
    entity: updated.name,
    actor: actor || "Owner / Administrator",
    notes: `Updated business profile: Phone: ${updated.phone}, Address: ${updated.address}, GSTIN: ${updated.gstin}, Email: ${updated.email}`,
  });

  return updated;
}

/* ================================================================== */
/*  PURCHASE, SUPPLIER LEDGER & LIVE INVENTORY STOCK ENGINE           */
/* ================================================================== */

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    code: "SUP-0001",
    name: "L&T / ULTRATECH CEMENT DEPOT",
    phone: "+91 94370 88100",
    email: "depot.odisha@ultratech.in",
    address: "Jagatpur Industrial Estate, Cuttack, Odisha",
    gstin: "21AAACU1234A1Z1",
    supply_category: "cement",
    is_active: true,
    opening_balance: 0,
    current_balance: 0,
    total_purchases_amount: 0,
    total_paid_amount: 0,
    created_at: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "sup-2",
    code: "SUP-0002",
    name: "SUPPER & DALMIA CEMENT DISTRIBUTORS",
    phone: "+91 98610 44200",
    email: "orders@dalmiadistributors.in",
    address: "Rasulgarh Industrial Area, Bhubaneswar, Odisha",
    gstin: "21AABCS5678B1Z5",
    supply_category: "cement",
    is_active: true,
    opening_balance: 0,
    current_balance: 0,
    total_purchases_amount: 0,
    total_paid_amount: 0,
    created_at: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "sup-3",
    code: "SUP-0003",
    name: "ODISHA TMT STEEL & REBAR STOCKIST",
    phone: "+91 94371 55300",
    email: "sales@odishasteelyard.in",
    address: "Mancheswar Industrial Estate, Bhubaneswar, Odisha",
    gstin: "21AAACO9012C1Z9",
    supply_category: "rod",
    is_active: true,
    opening_balance: 0,
    current_balance: 0,
    total_purchases_amount: 0,
    total_paid_amount: 0,
    created_at: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "sup-4",
    code: "SUP-0004",
    name: "KALINGA ELECTRICALS & HARDWARE WHOLESALE",
    phone: "+91 99370 66400",
    email: "kalingaelectricals@gmail.com",
    address: "Bapuji Nagar, Bhubaneswar, Odisha",
    gstin: "21AAACK3456D1Z2",
    supply_category: "daily",
    is_active: true,
    opening_balance: 0,
    current_balance: 0,
    total_purchases_amount: 0,
    total_paid_amount: 0,
    created_at: "2026-10-01T09:00:00.000Z",
  },
];

export function getSuppliers(): Supplier[] {
  if (!isClient()) return INITIAL_SUPPLIERS;
  const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
    return INITIAL_SUPPLIERS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SUPPLIERS;
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliers(suppliers: Supplier[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getPurchaseBills(): PurchaseBill[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.PURCHASE_BILLS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePurchaseBills(bills: PurchaseBill[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_BILLS, JSON.stringify(bills));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getSupplierPayments(): SupplierPayment[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIER_PAYMENTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSupplierPayments(payments: SupplierPayment[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_PAYMENTS, JSON.stringify(payments));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getPurchaseReturns(): PurchaseReturn[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.PURCHASE_RETURNS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePurchaseReturns(returns: PurchaseReturn[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_RETURNS, JSON.stringify(returns));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

/** Reconciles all supplier balances from opening_balance + posted purchase bills - posted payments - approved purchase returns */
export function reconcileAllSuppliers(): Supplier[] {
  const suppliers = getSuppliers();
  const pBills = getPurchaseBills().filter(b => b.status === "posted");
  const sPayments = getSupplierPayments().filter(p => p.status === "posted");
  const pReturns = getPurchaseReturns().filter(r => r.status === "approved");

  let changed = false;
  const updated = suppliers.map(s => {
    const totalPurchases = pBills
      .filter(b => b.supplier_id === s.id || b.supplier_name.toUpperCase() === s.name.toUpperCase())
      .reduce((acc, b) => acc + (b.total_amount || 0), 0);
    const totalPaid = sPayments
      .filter(p => p.supplier_id === s.id || p.supplier_name.toUpperCase() === s.name.toUpperCase())
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalReturns = pReturns
      .filter(r => r.supplier_id === s.id || r.supplier_name.toUpperCase() === s.name.toUpperCase())
      .reduce((acc, r) => acc + (r.amount || 0), 0);

    const netBal = (s.opening_balance || 0) + totalPurchases - totalPaid - totalReturns;
    if (
      Math.abs((s.total_purchases_amount || 0) - totalPurchases) > MONEY_EPSILON ||
      Math.abs((s.total_paid_amount || 0) - totalPaid) > MONEY_EPSILON ||
      Math.abs((s.current_balance || 0) - netBal) > MONEY_EPSILON
    ) {
      changed = true;
      return {
        ...s,
        total_purchases_amount: totalPurchases,
        total_paid_amount: totalPaid,
        current_balance: netBal,
      };
    }
    return s;
  });

  if (changed && isClient()) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updated));
  }
  return updated;
}

export function createSupplier(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  supply_category?: 'cement' | 'rod' | 'daily' | 'all';
  opening_balance?: number;
}): Supplier {
  const suppliers = getSuppliers();
  const cleanName = data.name.trim().toUpperCase();
  const existing = suppliers.find(s => s.name.toUpperCase() === cleanName);
  if (existing) return existing;

  const nextNum = suppliers.length + 1;
  const openBal = Number(data.opening_balance) || 0;

  const newSup: Supplier = {
    id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code: `SUP-${String(nextNum).padStart(4, "0")}`,
    name: cleanName,
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
    address: data.address?.trim() || "Bhubaneswar / Odisha",
    gstin: data.gstin?.trim().toUpperCase() || "",
    supply_category: data.supply_category || "all",
    is_active: true,
    opening_balance: openBal,
    current_balance: openBal,
    total_purchases_amount: 0,
    total_paid_amount: 0,
    created_at: new Date().toISOString(),
  };

  suppliers.push(newSup);
  saveSuppliers(suppliers);

  addAuditLog({
    action: "CREATE_SUPPLIER",
    entity: `${newSup.name} (${newSup.code})`,
    notes: `Created supplier account "${newSup.name}" with opening payable balance ₹${openBal.toFixed(2)}.`,
  });

  return newSup;
}

export interface PurchaseBillSettlementInfo {
  purchase_bill_id: string;
  purchase_number: string;
  bill_amount: number;
  allocated_payments: number;
  allocated_returns: number;
  total_settled: number;
  remaining_balance: number;
  payment_status: "unpaid" | "partially_paid" | "paid";
  allocations: SupplierPaymentAllocation[];
}

export function getPurchaseBillSettlementInfo(
  purchaseBillId: string,
  allPayments?: SupplierPayment[],
  allReturns?: PurchaseReturn[],
  allBills?: PurchaseBill[]
): PurchaseBillSettlementInfo {
  const bills = allBills || getPurchaseBills();
  const bill = bills.find(b => b.id === purchaseBillId);
  if (!bill) {
    return {
      purchase_bill_id: purchaseBillId,
      purchase_number: "",
      bill_amount: 0,
      allocated_payments: 0,
      allocated_returns: 0,
      total_settled: 0,
      remaining_balance: 0,
      payment_status: "unpaid",
      allocations: [],
    };
  }

  const payments = (allPayments || getSupplierPayments()).filter(p => p.status === "posted");
  const returns = (allReturns || getPurchaseReturns()).filter(r => r.status === "approved");

  const billAllocations: SupplierPaymentAllocation[] = [];
  for (const p of payments) {
    for (const alloc of p.allocations || []) {
      if (alloc.purchase_bill_id === bill.id || (alloc.purchase_number && alloc.purchase_number === bill.purchase_number)) {
        billAllocations.push({
          ...alloc,
          payment_voucher_number: alloc.payment_voucher_number || p.voucher_number,
          payment_date: alloc.payment_date || p.payment_date,
        });
      }
    }
  }

  const allocatedPayments = billAllocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  const allocatedReturns = returns
    .filter(r => r.purchase_bill_id === bill.id || (r.purchase_number && r.purchase_number === bill.purchase_number))
    .reduce((s, r) => s + (r.amount || 0), 0);

  const billAmount = bill.total_amount || 0;
  const totalSettled = allocatedPayments + allocatedReturns;
  const remaining = Math.max(0, billAmount - totalSettled);

  let status: "unpaid" | "partially_paid" | "paid" = "unpaid";
  if (billAmount > 0 && remaining <= MONEY_EPSILON) {
    status = "paid";
  } else if (totalSettled > MONEY_EPSILON) {
    status = "partially_paid";
  }

  return {
    purchase_bill_id: bill.id,
    purchase_number: bill.purchase_number,
    bill_amount: billAmount,
    allocated_payments: allocatedPayments,
    allocated_returns: allocatedReturns,
    total_settled: totalSettled,
    remaining_balance: remaining,
    payment_status: status,
    allocations: billAllocations,
  };
}

export function createPurchaseBill(data: {
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_number?: string;
  supplier_gstin?: string;
  bill_category: BillCategory;
  purchase_date: string;
  due_date?: string;
  vehicle_number?: string;
  subtotal: number;
  freight_amount?: number;
  tax_type?: 'intra_state' | 'inter_state';
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  items: PurchaseBill["items"];
  cement_details?: PurchaseBill["cement_details"];
  rod_details?: PurchaseBill["rod_details"];
  daily_details?: PurchaseBill["daily_details"];
  // Optional immediate payment at bill entry
  paid_amount?: number;
  payment_mode?: PaymentMode;
  payment_reference?: string;
}): PurchaseBill {
  const bills = getPurchaseBills();
  const nextSeq = bills.length + 1;
  const year = (data.purchase_date || "2026").slice(0, 4);
  const catPrefix = getCategoryConfig(data.bill_category).purchasePrefix || "PUR";
  const purchaseNumber = `${catPrefix}-${year}-${String(nextSeq).padStart(3, "0")}`;

  const billId = `pbill-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const subtotal = Number(data.subtotal) || 0;
  const freight = Number(data.freight_amount) || 0;

  const taxType = data.tax_type || "intra_state";
  let gstRate = Number(data.gst_rate) || 0;
  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;

  if (taxType === "intra_state") {
    cgstRate = data.cgst_rate !== undefined ? Number(data.cgst_rate) : Number((gstRate / 2).toFixed(2));
    sgstRate = data.sgst_rate !== undefined ? Number(data.sgst_rate) : Number((gstRate / 2).toFixed(2));
    cgstAmount = data.cgst_amount !== undefined ? Number(data.cgst_amount) : Number(((subtotal * cgstRate) / 100).toFixed(2));
    sgstAmount = data.sgst_amount !== undefined ? Number(data.sgst_amount) : Number(((subtotal * sgstRate) / 100).toFixed(2));
    totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
  } else {
    igstRate = data.igst_rate !== undefined ? Number(data.igst_rate) : gstRate;
    igstAmount = data.igst_amount !== undefined ? Number(data.igst_amount) : Number(((subtotal * igstRate) / 100).toFixed(2));
    totalTax = Number(igstAmount.toFixed(2));
  }

  // If explicit tax_amount was passed and higher, preserve it
  if (data.tax_amount !== undefined && totalTax === 0) {
    totalTax = Number(data.tax_amount) || 0;
  }

  const computedTotal = Number((subtotal + freight + totalTax).toFixed(2));
  const totalAmount = data.total_amount ? Number(data.total_amount) : computedTotal;
  const paidNow = Math.min(totalAmount, Math.max(0, Number(data.paid_amount) || 0));

  let initialStatus: "unpaid" | "partially_paid" | "paid" = "unpaid";
  if (totalAmount > 0 && Math.abs(paidNow - totalAmount) <= MONEY_EPSILON) {
    initialStatus = "paid";
  } else if (paidNow > MONEY_EPSILON) {
    initialStatus = "partially_paid";
  }

  const newBill: PurchaseBill = {
    id: billId,
    purchase_number: purchaseNumber,
    supplier_invoice_number: data.supplier_invoice_number?.trim() || purchaseNumber,
    bill_category: data.bill_category,
    purchase_date: data.purchase_date,
    due_date: data.due_date || null,
    supplier_id: data.supplier_id,
    supplier_name: data.supplier_name,
    supplier_gstin: data.supplier_gstin?.trim() || "",
    vehicle_number: data.vehicle_number?.trim().toUpperCase() || "",
    subtotal: subtotal || totalAmount,
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
    total_amount: totalAmount,
    payment_status: initialStatus,
    status: "posted",
    notes: data.notes?.trim() || "",
    items: (data.items || []).map(it => ({ ...it, bill_id: billId })),
    cement_details: data.cement_details,
    rod_details: data.rod_details,
    daily_details: data.daily_details,
    created_at: new Date().toISOString(),
  };

  bills.unshift(newBill);
  savePurchaseBills(bills);

  const gstNote =
    taxType === "intra_state" && totalTax > 0
      ? ` (Taxable: ₹${subtotal.toFixed(2)}, CGST ${cgstRate}%: ₹${cgstAmount.toFixed(2)}, SGST ${sgstRate}%: ₹${sgstAmount.toFixed(2)})`
      : totalTax > 0
      ? ` (Taxable: ₹${subtotal.toFixed(2)}, IGST ${igstRate}%: ₹${igstAmount.toFixed(2)})`
      : "";

  addAuditLog({
    action: "CREATE_PURCHASE_BILL",
    entity: `Purchase #${purchaseNumber} (${data.supplier_name})`,
    notes: `Recorded ${data.bill_category.toUpperCase()} purchase bill #${purchaseNumber} from ${data.supplier_name} for ₹${totalAmount.toFixed(2)}${gstNote}.`,
  });

  // If paid immediately (full or partial), record supplier payment and link allocation
  if (paidNow > MONEY_EPSILON) {
    recordSupplierPayment({
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      payment_date: data.purchase_date,
      amount: paidNow,
      payment_mode: data.payment_mode || "CASH",
      reference_number: data.payment_reference || `Settled with ${purchaseNumber}`,
      notes: `Immediate payment against Purchase Bill #${purchaseNumber}`,
      direct_bill_id: billId,
    });
  } else {
    reconcileAllSuppliers();
  }

  return newBill;
}

export function recordSupplierPayment(data: {
  supplier_id: string;
  supplier_name: string;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number?: string;
  notes?: string;
  direct_bill_id?: string;
}): SupplierPayment {
  const payments = getSupplierPayments();
  const nextSeq = payments.length + 1;
  const year = (data.payment_date || "2026").slice(0, 4);
  const voucherNo = `SPAY-${year}-${String(nextSeq).padStart(3, "0")}`;
  const payId = `spay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const payAmount = Number(data.amount) || 0;

  const allocations: SupplierPaymentAllocation[] = [];
  let unallocated = payAmount;

  const pBills = getPurchaseBills();
  const pReturns = getPurchaseReturns();

  if (data.direct_bill_id) {
    const targetBill = pBills.find(b => b.id === data.direct_bill_id);
    if (targetBill) {
      const settlement = getPurchaseBillSettlementInfo(targetBill.id, payments, pReturns, pBills);
      const allocAmt = Math.min(unallocated, settlement.remaining_balance);
      if (allocAmt > MONEY_EPSILON) {
        allocations.push({
          id: `spalloc-${Date.now()}-1`,
          supplier_payment_id: payId,
          payment_voucher_number: voucherNo,
          payment_date: data.payment_date,
          purchase_bill_id: targetBill.id,
          purchase_number: targetBill.purchase_number,
          supplier_invoice_number: targetBill.supplier_invoice_number,
          purchase_date: targetBill.purchase_date,
          allocated_amount: allocAmt,
          notes: data.notes || "Direct settlement at purchase entry",
          created_at: new Date().toISOString(),
        });
        unallocated = Math.max(0, payAmount - allocAmt);
      }
    }
  }

  const newPay: SupplierPayment = {
    id: payId,
    voucher_number: voucherNo,
    payment_date: data.payment_date,
    supplier_id: data.supplier_id,
    supplier_name: data.supplier_name,
    amount: payAmount,
    payment_mode: data.payment_mode,
    reference_number: data.reference_number?.trim() || "",
    notes: data.notes?.trim() || "",
    unallocated_amount: unallocated,
    status: "posted",
    allocations,
    created_at: new Date().toISOString(),
  };

  payments.unshift(newPay);
  saveSupplierPayments(payments);

  // Sync purchase bill status if allocated
  if (allocations.length > 0) {
    const updatedBills = pBills.map(b => {
      if (allocations.some(a => a.purchase_bill_id === b.id)) {
        const info = getPurchaseBillSettlementInfo(b.id, payments, pReturns, pBills);
        return { ...b, payment_status: info.payment_status };
      }
      return b;
    });
    savePurchaseBills(updatedBills);
  }

  // If paid in CASH, also record in Cash Outflows so Cash-in-Drawer remains accurate
  if (data.payment_mode === "CASH") {
    const cashTxs = getCashTransactions();
    cashTxs.unshift({
      id: `cash-spay-${payId}`,
      transaction_type: "cash_given",
      transaction_date: data.payment_date,
      recipient_name: data.supplier_name,
      category: "Supplier Payment",
      amount: payAmount,
      payment_mode: "CASH",
      reference_number: voucherNo,
      notes: `Supplier Cash Payment (${voucherNo})${data.notes ? ` - ${data.notes}` : ""}`,
      is_categorized: true,
      is_verified: true,
      is_imported: false,
      created_at: new Date().toISOString(),
    });
    saveCashTransactions(cashTxs);
  }

  reconcileAllSuppliers();

  addAuditLog({
    action: "SUPPLIER_PAYMENT",
    entity: `Voucher #${voucherNo} (${data.supplier_name})`,
    notes: `Paid ₹${payAmount.toFixed(2)} to supplier ${data.supplier_name} via ${data.payment_mode}.`,
  });

  return newPay;
}

export function getSupplierUnallocatedPayments(supplierId: string): SupplierPayment[] {
  const suppliers = getSuppliers();
  const sup = suppliers.find(s => s.id === supplierId);
  const payments = getSupplierPayments().filter(p => p.status === "posted");

  return payments
    .filter(p => p.supplier_id === supplierId || (sup && p.supplier_name.toUpperCase() === sup.name.toUpperCase()))
    .map(p => {
      const allocatedSum = (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
      const unallocated = Math.max(0, (p.amount || 0) - allocatedSum);
      return { ...p, unallocated_amount: unallocated };
    })
    .filter(p => p.unallocated_amount > MONEY_EPSILON);
}

export function getSupplierOutstandingBills(
  supplierId: string
): Array<PurchaseBill & { settlement: PurchaseBillSettlementInfo }> {
  const suppliers = getSuppliers();
  const sup = suppliers.find(s => s.id === supplierId);
  const bills = getPurchaseBills().filter(b => b.status === "posted");
  const payments = getSupplierPayments().filter(p => p.status === "posted");
  const returns = getPurchaseReturns().filter(r => r.status === "approved");

  return bills
    .filter(b => b.supplier_id === supplierId || (sup && b.supplier_name.toUpperCase() === sup.name.toUpperCase()))
    .map(b => {
      const settlement = getPurchaseBillSettlementInfo(b.id, payments, returns, bills);
      return {
        ...b,
        payment_status: settlement.payment_status,
        settlement,
      };
    })
    .filter(b => b.settlement.remaining_balance > MONEY_EPSILON)
    .sort((a, b) => (a.purchase_date || "").localeCompare(b.purchase_date || ""));
}

export function allocateSupplierPaymentToBills(params: {
  supplier_payment_id: string;
  allocations: { purchase_bill_id: string; amount: number }[];
  notes?: string;
  actor_role?: UserRole;
}): {
  success: boolean;
  error?: string;
  payment?: SupplierPayment;
  allocated_total?: number;
} {
  const role = params.actor_role || getStoredUserRole();
  if (role !== "owner" && role !== "manager" && role !== "admin") {
    return {
      success: false,
      error: "Unauthorized: Only Owner, Manager, or Admin can allocate supplier payments.",
    };
  }

  const payments = getSupplierPayments();
  const payIdx = payments.findIndex(p => p.id === params.supplier_payment_id);
  if (payIdx === -1) {
    return { success: false, error: "Supplier payment voucher not found." };
  }
  const payment = payments[payIdx];

  const existingAllocSum = (payment.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
  const availableCredit = Math.max(0, (payment.amount || 0) - existingAllocSum);

  const requestedAllocations = (params.allocations || []).filter(a => a.amount > MONEY_EPSILON);
  if (requestedAllocations.length === 0) {
    return { success: false, error: "Please enter an allocation amount for at least one purchase bill." };
  }

  const requestedTotal = requestedAllocations.reduce((s, a) => s + a.amount, 0);
  if (requestedTotal - availableCredit > MONEY_EPSILON) {
    return {
      success: false,
      error: `Allocation total (₹${requestedTotal.toFixed(2)}) exceeds available payment credit (₹${availableCredit.toFixed(2)}).`,
    };
  }

  const bills = getPurchaseBills();
  const returns = getPurchaseReturns().filter(r => r.status === "approved");
  const newAllocations: SupplierPaymentAllocation[] = [];

  for (const req of requestedAllocations) {
    const bill = bills.find(b => b.id === req.purchase_bill_id);
    if (!bill) {
      return { success: false, error: `Purchase bill ${req.purchase_bill_id} not found.` };
    }
    const settlement = getPurchaseBillSettlementInfo(bill.id, payments, returns, bills);
    if (req.amount - settlement.remaining_balance > MONEY_EPSILON) {
      return {
        success: false,
        error: `Allocation of ₹${req.amount.toFixed(2)} for Bill #${bill.purchase_number} exceeds remaining balance (₹${settlement.remaining_balance.toFixed(2)}).`,
      };
    }

    newAllocations.push({
      id: `spalloc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      supplier_payment_id: payment.id,
      payment_voucher_number: payment.voucher_number,
      payment_date: payment.payment_date,
      purchase_bill_id: bill.id,
      purchase_number: bill.purchase_number,
      supplier_invoice_number: bill.supplier_invoice_number,
      purchase_date: bill.purchase_date,
      allocated_amount: Number(req.amount.toFixed(2)),
      allocated_by: role,
      notes: params.notes || `Allocated from Voucher #${payment.voucher_number}`,
      created_at: new Date().toISOString(),
    });
  }

  payment.allocations = [...(payment.allocations || []), ...newAllocations];
  const updatedAllocSum = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, Number((payment.amount - updatedAllocSum).toFixed(2)));
  payments[payIdx] = payment;
  saveSupplierPayments(payments);

  for (const alloc of newAllocations) {
    const bIdx = bills.findIndex(b => b.id === alloc.purchase_bill_id);
    if (bIdx >= 0) {
      const updatedSettlement = getPurchaseBillSettlementInfo(alloc.purchase_bill_id, payments, returns, bills);
      bills[bIdx].payment_status = updatedSettlement.payment_status;
    }
  }
  savePurchaseBills(bills);
  reconcileAllSuppliers();

  const billSummary = newAllocations.map(a => `#${a.purchase_number} (₹${a.allocated_amount.toFixed(2)})`).join(", ");
  addAuditLog({
    action: "SUPPLIER_PAYMENT_ALLOCATION",
    entity: `Voucher ${payment.voucher_number} (${payment.supplier_name})`,
    notes: `Allocated ₹${requestedTotal.toFixed(2)} from Supplier Voucher #${payment.voucher_number} across: ${billSummary}.`,
  });

  return {
    success: true,
    payment,
    allocated_total: requestedTotal,
  };
}

export function reverseSupplierPaymentAllocation(params: {
  supplier_payment_id: string;
  allocation_id: string;
  reason?: string;
  actor_role?: UserRole;
}): {
  success: boolean;
  error?: string;
} {
  const role = params.actor_role || getStoredUserRole();
  if (role !== "owner" && role !== "manager" && role !== "admin") {
    return {
      success: false,
      error: "Unauthorized: Only Owner, Manager, or Admin can reverse supplier payment allocations.",
    };
  }

  const payments = getSupplierPayments();
  const payIdx = payments.findIndex(p => p.id === params.supplier_payment_id);
  if (payIdx === -1) return { success: false, error: "Supplier payment voucher not found." };

  const payment = payments[payIdx];
  const allocIdx = (payment.allocations || []).findIndex(a => a.id === params.allocation_id);
  if (allocIdx === -1) return { success: false, error: "Allocation record not found." };

  const removed = payment.allocations[allocIdx];
  payment.allocations.splice(allocIdx, 1);
  const totalAllocNow = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, payment.amount - totalAllocNow);
  payments[payIdx] = payment;
  saveSupplierPayments(payments);

  const bills = getPurchaseBills();
  const returns = getPurchaseReturns().filter(r => r.status === "approved");
  const bIdx = bills.findIndex(b => b.id === removed.purchase_bill_id);
  if (bIdx >= 0) {
    const info = getPurchaseBillSettlementInfo(removed.purchase_bill_id, payments, returns, bills);
    bills[bIdx].payment_status = info.payment_status;
    savePurchaseBills(bills);
  }
  reconcileAllSuppliers();

  addAuditLog({
    action: "SUPPLIER_ALLOCATION_REVERSAL",
    entity: `Voucher ${payment.voucher_number} ➔ Purchase #${removed.purchase_number}`,
    notes: `Reversed allocation of ₹${removed.allocated_amount.toFixed(2)} from Voucher #${payment.voucher_number} to Purchase Bill #${removed.purchase_number}.${params.reason ? ` Reason: ${params.reason}` : ""}`,
  });

  return { success: true };
}

export function createPurchaseReturn(data: {
  supplier_id: string;
  supplier_name: string;
  purchase_bill_id?: string;
  purchase_number?: string;
  return_date: string;
  item_type: "CEMENT" | "ROD" | "ELECTRIC";
  brand_or_size?: string;
  qty?: number;
  amount: number;
  reason?: string;
}): PurchaseReturn {
  const returns = getPurchaseReturns();
  const nextSeq = returns.length + 1;
  const year = (data.return_date || "2026").slice(0, 4);
  const dnNumber = `DN-${year}-${String(nextSeq).padStart(3, "0")}`;

  const newRet: PurchaseReturn = {
    id: `pret-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    debit_note_number: dnNumber,
    purchase_bill_id: data.purchase_bill_id,
    purchase_number: data.purchase_number,
    supplier_id: data.supplier_id,
    supplier_name: data.supplier_name,
    return_date: data.return_date,
    item_type: data.item_type,
    brand_or_size: data.brand_or_size?.trim() || "",
    qty: Number(data.qty) || 0,
    amount: Number(data.amount) || 0,
    reason: data.reason?.trim() || "Damaged / Excess stock returned to supplier",
    status: "approved",
    created_at: new Date().toISOString(),
  };

  returns.unshift(newRet);
  savePurchaseReturns(returns);
  reconcileAllSuppliers();

  addAuditLog({
    action: "PURCHASE_RETURN",
    entity: `Debit Note #${dnNumber} (${data.supplier_name})`,
    notes: `Issued Debit Note #${dnNumber} to ${data.supplier_name} for ₹${newRet.amount.toFixed(2)} (${data.item_type}${data.brand_or_size ? ` - ${data.brand_or_size}` : ""}).`,
  });

  return newRet;
}

export interface PurchaseSummaryMetrics {
  gross_purchases: number;
  purchase_returns: number;
  net_purchases: number;
  cement_purchases: number;
  cement_bags_purchased: number;
  rod_purchases: number;
  rod_kg_purchased: number;
  daily_purchases: number;
  category_totals: Record<BillCategory, number>;
  supplier_payments_total: number;
  total_supplier_payable: number;
  unpaid_purchase_bills_count: number;
  partially_paid_purchase_bills_count: number;
  unallocated_supplier_advances: number;
}

export function calculatePurchaseMetrics(range?: DateRange): PurchaseSummaryMetrics {
  const allBills = getPurchaseBills().filter(b => b.status === "posted");
  const allReturns = getPurchaseReturns().filter(r => r.status === "approved");
  const allPayments = getSupplierPayments().filter(p => p.status === "posted");
  const suppliers = reconcileAllSuppliers();

  const billsInPeriod = range
    ? allBills.filter(b => isDateInRange(b.purchase_date, range))
    : allBills;
  const returnsInPeriod = range
    ? allReturns.filter(r => isDateInRange(r.return_date, range))
    : allReturns;
  const paymentsInPeriod = range
    ? allPayments.filter(p => isDateInRange(p.payment_date, range))
    : allPayments;

  const categoryTotals: Record<BillCategory, number> = {
    mix: 0,
    cement: 0,
    rod: 0,
    daily: 0,
    plumbing: 0,
    hardware: 0,
    paints: 0,
    machinery: 0,
    ceramic: 0,
  };
  for (const b of billsInPeriod) {
    const cat = b.bill_category;
    if (cat && cat in categoryTotals) {
      categoryTotals[cat] += b.total_amount || 0;
    }
  }

  const cementBills = billsInPeriod.filter(b => b.bill_category === "cement");
  const rodBills = billsInPeriod.filter(b => b.bill_category === "rod");
  const dailyBills = billsInPeriod.filter(b => b.bill_category === "daily");

  const cementPurchases = cementBills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const cementBags = cementBills.reduce((s, b) => s + (b.cement_details?.qty_bags || 0), 0);
  const rodPurchases = rodBills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const rodKg = rodBills.reduce((s, b) => s + (b.rod_details?.qty_kg || 0), 0);
  const dailyPurchases = dailyBills.reduce((s, b) => s + (b.total_amount || 0), 0);

  const grossPurchases = billsInPeriod.reduce((s, b) => s + (b.total_amount || 0), 0);
  const purchaseReturns = returnsInPeriod.reduce((s, r) => s + (r.amount || 0), 0);
  const netPurchases = grossPurchases - purchaseReturns;
  const supplierPaymentsTotal = paymentsInPeriod.reduce((s, p) => s + (p.amount || 0), 0);

  let unpaidCount = 0;
  let partialCount = 0;
  for (const b of allBills) {
    const info = getPurchaseBillSettlementInfo(b.id, allPayments, allReturns, allBills);
    if (info.payment_status === "unpaid") unpaidCount++;
    else if (info.payment_status === "partially_paid") partialCount++;
  }

  const totalSupplierPayable = suppliers.reduce((s, sup) => s + Math.max(0, sup.current_balance || 0), 0);
  const unallocatedAdvances = allPayments.reduce((s, p) => s + (p.unallocated_amount || 0), 0);

  return {
    gross_purchases: grossPurchases,
    purchase_returns: purchaseReturns,
    net_purchases: netPurchases,
    cement_purchases: cementPurchases,
    cement_bags_purchased: cementBags,
    rod_purchases: rodPurchases,
    rod_kg_purchased: rodKg,
    daily_purchases: dailyPurchases,
    category_totals: categoryTotals,
    supplier_payments_total: supplierPaymentsTotal,
    total_supplier_payable: totalSupplierPayable,
    unpaid_purchase_bills_count: unpaidCount,
    partially_paid_purchase_bills_count: partialCount,
    unallocated_supplier_advances: unallocatedAdvances,
  };
}

/**
 * Real-Time Inventory & Godown Stock Calculation across Cement Brands (Bags), TMT Rod Sizes (Kg), and Electrical & Hardware (Units/Pcs/Coils)
 */
export function calculateInventoryStock(): {
  cementStock: StockItemSummary[];
  rodStock: StockItemSummary[];
  hardwareStock: StockItemSummary[];
  totalCementBagsAvailable: number;
  totalRodKgAvailable: number;
  totalHardwareUnitsAvailable: number;
  totalInventoryValue: number;
  lowStockCount: number;
} {
  const cementBrands = getCementBrands();
  const rodSizes = getRodSizes();
  const hardwareItems = getHardwareItems();

  const pBills = getPurchaseBills().filter(b => b.status === "posted");
  const pReturns = getPurchaseReturns().filter(r => r.status === "approved");
  const sBills = getBills().filter(b => b.status === "posted");
  const sReturns = getReturns().filter(r => isApprovedReturn(r));

  // 1. Cement Stock per Brand
  const cementStock: StockItemSummary[] = cementBrands.map(brand => {
    const bName = brand.name.toUpperCase();
    const opening = Number(brand.openingStock) || 0;

    const matchingPurchases = pBills.filter(
      b => b.bill_category === "cement" && b.cement_details?.cement_type?.toUpperCase() === bName
    );
    const purchasedQty = matchingPurchases.reduce((s, b) => s + (b.cement_details?.qty_bags || 0), 0);
    const purchasedValue = matchingPurchases.reduce((s, b) => s + (b.cement_details?.amount || b.total_amount || 0), 0);

    const purchaseReturnQty = pReturns
      .filter(r => r.item_type === "CEMENT" && r.brand_or_size?.toUpperCase() === bName)
      .reduce((s, r) => s + (r.qty || 0), 0);

    const soldQty = sBills.reduce((acc, b) => {
      if (b.bill_category !== "cement") return acc;
      if (b.items && b.items.length > 0) {
        const matching = b.items.filter(
          it => it.item_category === "cement" &&
          (it.item_name.toUpperCase().startsWith(bName) || it.item_name.toUpperCase().includes(bName))
        );
        if (matching.length > 0) {
          return acc + matching.reduce((sum, it) => sum + (it.quantity || 0), 0);
        }
      }
      if (b.cement_details?.cement_type?.toUpperCase() === bName) {
        return acc + (b.cement_details.qty_bags || 0);
      }
      return acc;
    }, 0);

    // Estimate returned bags from sales returns if reason/item mentions the brand
    const salesReturnQty = sReturns
      .filter(r => r.item_type === "CEMENT" && (r.reason || "").toUpperCase().includes(bName))
      .reduce((s, r) => {
        const rate = brand.defaultRate || 340;
        return s + (r.amount ? Math.round(r.amount / rate) : 0);
      }, 0);

    const available = opening + purchasedQty - purchaseReturnQty - soldQty + salesReturnQty;
    const avgPurchaseRate =
      purchasedQty > 0
        ? purchasedValue / purchasedQty
        : Math.round((brand.defaultRate || 340) * 0.88);

    const stockValue = Math.max(0, available) * avgPurchaseRate;

    return {
      id: brand.id,
      category: "cement",
      name: brand.name,
      unit: "Bags",
      opening_stock: opening,
      purchased_qty: purchasedQty,
      purchase_return_qty: purchaseReturnQty,
      sold_qty: soldQty,
      sales_return_qty: salesReturnQty,
      available_stock: Number(available.toFixed(2)),
      avg_purchase_rate: Number(avgPurchaseRate.toFixed(2)),
      default_selling_rate: brand.defaultRate || 0,
      stock_value: Number(stockValue.toFixed(2)),
    };
  });

  // 2. Rod Stock per Size
  const rodStock: StockItemSummary[] = rodSizes.map(rod => {
    const rName = rod.size.toLowerCase();
    const opening = Number(rod.openingStock) || 0;

    const matchingPurchases = pBills.filter(
      b => b.bill_category === "rod" && b.rod_details?.rod_size?.toLowerCase() === rName
    );
    const purchasedQty = matchingPurchases.reduce((s, b) => s + (b.rod_details?.qty_kg || 0), 0);
    const purchasedValue = matchingPurchases.reduce((s, b) => s + (b.rod_details?.amount || b.total_amount || 0), 0);

    const purchaseReturnQty = pReturns
      .filter(r => r.item_type === "ROD" && r.brand_or_size?.toLowerCase() === rName)
      .reduce((s, r) => s + (r.qty || 0), 0);

    const soldQty = sBills.reduce((acc, b) => {
      if (b.bill_category !== "rod") return acc;
      if (b.items && b.items.length > 0) {
        const matching = b.items.filter(
          it => it.item_category === "rod" &&
          it.item_name.toLowerCase().includes(rName)
        );
        if (matching.length > 0) {
          return acc + matching.reduce((sum, it) => sum + (it.quantity || 0), 0);
        }
      }
      if (b.rod_details?.rod_size?.toLowerCase() === rName) {
        return acc + (b.rod_details.qty_kg || 0);
      }
      return acc;
    }, 0);

    const salesReturnQty = sReturns
      .filter(r => r.item_type === "ROD" && (r.reason || "").toLowerCase().includes(rName))
      .reduce((s, r) => {
        const rate = rod.defaultRate || 68;
        return s + (r.amount ? Number((r.amount / rate).toFixed(2)) : 0);
      }, 0);

    const available = opening + purchasedQty - purchaseReturnQty - soldQty + salesReturnQty;
    const avgPurchaseRate =
      purchasedQty > 0
        ? purchasedValue / purchasedQty
        : Number(((rod.defaultRate || 68) * 0.88).toFixed(2));

    const stockValue = Math.max(0, available) * avgPurchaseRate;

    return {
      id: rod.id,
      category: "rod",
      name: rod.size,
      unit: "Kg",
      opening_stock: opening,
      purchased_qty: Number(purchasedQty.toFixed(2)),
      purchase_return_qty: Number(purchaseReturnQty.toFixed(2)),
      sold_qty: Number(soldQty.toFixed(2)),
      sales_return_qty: Number(salesReturnQty.toFixed(2)),
      available_stock: Number(available.toFixed(2)),
      avg_purchase_rate: Number(avgPurchaseRate.toFixed(2)),
      default_selling_rate: rod.defaultRate || 0,
      stock_value: Number(stockValue.toFixed(2)),
    };
  });

  // 3. Electrical & Hardware Stock
  const matchesHardwareName = (billItemName: string, catalogItemName: string): boolean => {
    const b = (billItemName || "").trim().toLowerCase();
    const c = (catalogItemName || "").trim().toLowerCase();
    if (!b || !c) return false;
    if (b === c) return true;
    if (b.replace(/\s+/g, " ") === c.replace(/\s+/g, " ")) return true;
    if (b.includes(c) || c.includes(b)) {
      const bTokens: string[] = b.match(/\b\d+(\.\d+)?[a-z]*\b/g) || [];
      const cTokens: string[] = c.match(/\b\d+(\.\d+)?[a-z]*\b/g) || [];
      const hasConflict = bTokens.some(bt =>
        cTokens.length > 0 && !cTokens.includes(bt) && cTokens.some(ct => ct.replace(/^\d+/, "") === bt.replace(/^\d+/, ""))
      );
      if (!hasConflict) return true;
    }
    return false;
  };

  const configuredStock: StockItemSummary[] = hardwareItems.map(hw => {
    const opening = Number(hw.openingStock) || 0;

    let purchasedQty = 0;
    let purchasedValue = 0;
    for (const b of pBills) {
      if (b.items && b.items.length > 0) {
        for (const it of b.items) {
          if (matchesHardwareName(it.item_name, hw.name)) {
            const qty = Number(it.quantity) || 0;
            purchasedQty += qty;
            purchasedValue += Number(it.total_amount) || (qty * (Number(it.unit_price) || 0));
          }
        }
      }
    }

    const purchaseReturnQty = pReturns
      .filter(r => r.item_type === "ELECTRIC" && (
        matchesHardwareName(r.brand_or_size || "", hw.name) ||
        matchesHardwareName(r.reason || "", hw.name)
      ))
      .reduce((s, r) => s + (r.qty || 0), 0);

    let soldQty = 0;
    for (const b of sBills) {
      if (b.items && b.items.length > 0) {
        for (const it of b.items) {
          if (matchesHardwareName(it.item_name, hw.name)) {
            soldQty += Number(it.quantity) || 0;
          }
        }
      }
    }

    const salesReturnQty = sReturns
      .filter(r => r.item_type === "ELECTRIC" && matchesHardwareName(r.reason || "", hw.name))
      .reduce((s, r) => {
        const rate = hw.defaultRate || 100;
        return s + (r.amount ? Math.round(r.amount / rate) : 0);
      }, 0);

    const available = opening + purchasedQty - purchaseReturnQty - soldQty + salesReturnQty;
    const avgPurchaseRate =
      purchasedQty > 0
        ? purchasedValue / purchasedQty
        : Number(((hw.defaultRate || 100) * 0.8).toFixed(2));

    const stockValue = Math.max(0, available) * avgPurchaseRate;

    return {
      id: hw.id,
      category: "daily",
      name: hw.name,
      unit: hw.unit || "Pcs",
      opening_stock: opening,
      purchased_qty: Number(purchasedQty.toFixed(2)),
      purchase_return_qty: Number(purchaseReturnQty.toFixed(2)),
      sold_qty: Number(soldQty.toFixed(2)),
      sales_return_qty: Number(salesReturnQty.toFixed(2)),
      available_stock: Number(available.toFixed(2)),
      avg_purchase_rate: Number(avgPurchaseRate.toFixed(2)),
      default_selling_rate: hw.defaultRate || 0,
      stock_value: Number(stockValue.toFixed(2)),
    };
  });

  // Check for any uncataloged electrical items in posted bills
  const uncatalogedMap = new Map<string, { purchasedQty: number; purchasedValue: number; soldQty: number }>();
  for (const b of pBills) {
    if (b.bill_category === "daily" && b.items) {
      for (const it of b.items) {
        const name = (it.item_name || "").trim();
        if (name && !hardwareItems.some(h => matchesHardwareName(name, h.name))) {
          const prev = uncatalogedMap.get(name) || { purchasedQty: 0, purchasedValue: 0, soldQty: 0 };
          const qty = Number(it.quantity) || 0;
          prev.purchasedQty += qty;
          prev.purchasedValue += Number(it.total_amount) || (qty * (Number(it.unit_price) || 0));
          uncatalogedMap.set(name, prev);
        }
      }
    }
  }
  for (const b of sBills) {
    if (b.bill_category === "daily" && b.items) {
      for (const it of b.items) {
        const name = (it.item_name || "").trim();
        if (name && !hardwareItems.some(h => matchesHardwareName(name, h.name))) {
          const prev = uncatalogedMap.get(name) || { purchasedQty: 0, purchasedValue: 0, soldQty: 0 };
          prev.soldQty += Number(it.quantity) || 0;
          uncatalogedMap.set(name, prev);
        }
      }
    }
  }

  const uncatalogedStock: StockItemSummary[] = Array.from(uncatalogedMap.entries()).map(([name, data], idx) => {
    const available = data.purchasedQty - data.soldQty;
    const avgPurchaseRate = data.purchasedQty > 0 ? data.purchasedValue / data.purchasedQty : 0;
    const stockValue = Math.max(0, available) * avgPurchaseRate;
    return {
      id: `hw-uncataloged-${idx}`,
      category: "daily",
      name,
      unit: "Pcs",
      opening_stock: 0,
      purchased_qty: Number(data.purchasedQty.toFixed(2)),
      purchase_return_qty: 0,
      sold_qty: Number(data.soldQty.toFixed(2)),
      sales_return_qty: 0,
      available_stock: Number(available.toFixed(2)),
      avg_purchase_rate: Number(avgPurchaseRate.toFixed(2)),
      default_selling_rate: Number((avgPurchaseRate * 1.25).toFixed(2)),
      stock_value: Number(stockValue.toFixed(2)),
    };
  });

  const hardwareStock = [...configuredStock, ...uncatalogedStock];

  const totalCementBagsAvailable = cementStock.reduce((s, i) => s + Math.max(0, i.available_stock), 0);
  const totalRodKgAvailable = rodStock.reduce((s, i) => s + Math.max(0, i.available_stock), 0);
  const totalHardwareUnitsAvailable = hardwareStock.reduce((s, i) => s + Math.max(0, i.available_stock), 0);

  const totalInventoryValue =
    cementStock.reduce((s, i) => s + i.stock_value, 0) +
    rodStock.reduce((s, i) => s + i.stock_value, 0) +
    hardwareStock.reduce((s, i) => s + i.stock_value, 0);

  const lowStockCount =
    cementStock.filter(c => c.available_stock <= 20).length +
    rodStock.filter(r => r.available_stock <= 100).length +
    hardwareStock.filter(h => h.available_stock <= 10).length;

  return {
    cementStock,
    rodStock,
    hardwareStock,
    totalCementBagsAvailable: Number(totalCementBagsAvailable.toFixed(2)),
    totalRodKgAvailable: Number(totalRodKgAvailable.toFixed(2)),
    totalHardwareUnitsAvailable: Number(totalHardwareUnitsAvailable.toFixed(2)),
    totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
    lowStockCount,
  };
}

/* ---------------- HOUSE CONSTRUCTION ESTIMATES CRUD ---------------- */

export function getEstimates(): HouseEstimate[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.ESTIMATES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEstimates(estimates: HouseEstimate[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.ESTIMATES, JSON.stringify(estimates));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function generateEstimateNumber(): string {
  const estimates = getEstimates();
  const year = new Date().getFullYear();
  const nextSeq = estimates.length + 1;
  return `EST-${year}-${String(nextSeq).padStart(3, "0")}`;
}

export function createEstimate(
  data: Omit<HouseEstimate, "id" | "estimate_number" | "created_at">,
  actor?: string
): HouseEstimate {
  const estimates = getEstimates();
  const estimateNumber = generateEstimateNumber();

  const newEst: HouseEstimate = {
    ...data,
    id: `est-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    estimate_number: estimateNumber,
    created_at: new Date().toISOString(),
  };

  estimates.unshift(newEst);
  saveEstimates(estimates);

  addAuditLog({
    action: "CREATE_ESTIMATE",
    entity: `Estimate #${estimateNumber} (${newEst.customer_name || "Walk-in"})`,
    actor: actor || "System User",
    notes: `Generated House Cost Estimate #${estimateNumber} for ₹${newEst.grand_total.toFixed(2)} with ${newEst.total_items} items.`,
  });

  return newEst;
}

export function deleteEstimate(id: string, actor?: string): boolean {
  const estimates = getEstimates();
  const idx = estimates.findIndex(e => e.id === id);
  if (idx === -1) return false;

  const removed = estimates[idx];
  estimates.splice(idx, 1);
  saveEstimates(estimates);

  addAuditLog({
    action: "DELETE_ESTIMATE",
    entity: `Estimate #${removed.estimate_number}`,
    actor: actor || "System User",
    notes: `Deleted House Estimate #${removed.estimate_number} (${removed.customer_name}).`,
  });

  return true;
}

/* ---------------- CUSTOMER & SUPPLIER UPDATE FUNCTIONS (ADMIN / OWNER) ---------------- */

export function updateCustomer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    opening_balance?: number;
  },
  actor?: string
): { success: boolean; customer?: Customer; error?: string } {
  const customers = getCustomers();
  const idx = customers.findIndex(c => c.id === id);
  if (idx === -1) {
    return { success: false, error: "Customer not found." };
  }

  const existing = customers[idx];
  const oldOpening = existing.opening_balance || 0;
  const newOpening = data.opening_balance !== undefined ? Number(data.opening_balance) : oldOpening;
  const diffOpening = newOpening - oldOpening;

  const updated: Customer = {
    ...existing,
    name: data.name !== undefined ? data.name.trim().toUpperCase() : existing.name,
    phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
    email: data.email !== undefined ? data.email.trim() : existing.email,
    address: data.address !== undefined ? data.address.trim() : existing.address,
    gstin: data.gstin !== undefined ? data.gstin.trim().toUpperCase() : existing.gstin,
    opening_balance: newOpening,
    current_balance: existing.current_balance + diffOpening,
  };

  customers[idx] = updated;
  saveCustomers(customers);

  addAuditLog({
    action: "UPDATE_CUSTOMER",
    entity: `Customer #${updated.code || updated.id} (${updated.name})`,
    actor: actor || "System Administrator",
    notes: `Updated customer details.${diffOpening !== 0 ? ` Opening balance adjusted from ₹${oldOpening} to ₹${newOpening}.` : ""}`,
  });

  return { success: true, customer: updated };
}

export function updateSupplier(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    category?: "cement" | "rod" | "daily" | "all";
    opening_balance?: number;
  },
  actor?: string
): { success: boolean; supplier?: Supplier; error?: string } {
  const suppliers = getSuppliers();
  const idx = suppliers.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, error: "Supplier not found." };
  }

  const existing = suppliers[idx];
  const oldOpening = existing.opening_balance || 0;
  const newOpening = data.opening_balance !== undefined ? Number(data.opening_balance) : oldOpening;
  const diffOpening = newOpening - oldOpening;

  const updated: Supplier = {
    ...existing,
    name: data.name !== undefined ? data.name.trim().toUpperCase() : existing.name,
    phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
    email: data.email !== undefined ? data.email.trim() : existing.email,
    address: data.address !== undefined ? data.address.trim() : existing.address,
    gstin: data.gstin !== undefined ? data.gstin.trim().toUpperCase() : existing.gstin,
    supply_category: data.category !== undefined ? data.category : existing.supply_category,
    opening_balance: newOpening,
    current_balance: existing.current_balance + diffOpening,
  };

  suppliers[idx] = updated;
  saveSuppliers(suppliers);

  addAuditLog({
    action: "UPDATE_SUPPLIER",
    entity: `Supplier #${updated.code || updated.id} (${updated.name})`,
    actor: actor || "System Administrator",
    notes: `Updated supplier details.${diffOpening !== 0 ? ` Opening balance adjusted from ₹${oldOpening} to ₹${newOpening}.` : ""}`,
  });

  return { success: true, supplier: updated };
}

/* ---------------- ENTERPRISE USERS & LOGIN MANAGEMENT CRUD (ADMIN CONSOLE) ---------------- */

export const DEFAULT_ENTERPRISE_USERS: EnterpriseUserRecord[] = [
  {
    id: "usr-owner-001",
    email: "owner@pramodmaharaj.in",
    username: "owner",
    allowedUsernames: ["owner", "pramod.maharaj", "pramod"],
    passwordHash: "Password@123",
    fullName: "Pramod Maharaj",
    role: "owner",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-manager-002",
    email: "manager@pramodmaharaj.in",
    username: "manager",
    allowedUsernames: ["manager", "rajesh.patnaik", "rajesh"],
    passwordHash: "Password@123",
    fullName: "Rajesh Patnaik (Store Manager)",
    role: "manager",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-admin-003",
    email: "admin@pramodmaharaj.in",
    username: "admin",
    allowedUsernames: ["admin", "tpm.admin", "sysadmin"],
    passwordHash: "Password@123",
    fullName: "System Administrator (IT & Audit)",
    role: "admin",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export function getEnterpriseUsers(): EnterpriseUserRecord[] {
  if (!isClient()) return DEFAULT_ENTERPRISE_USERS;
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_ENTERPRISE_USERS));
    return DEFAULT_ENTERPRISE_USERS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_ENTERPRISE_USERS));
    return DEFAULT_ENTERPRISE_USERS;
  } catch {
    return DEFAULT_ENTERPRISE_USERS;
  }
}

export function saveEnterpriseUsers(users: EnterpriseUserRecord[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    window.dispatchEvent(new Event("tpm_data_updated"));
    window.dispatchEvent(new Event("tpm_users_updated"));
  }
}

export function createEnterpriseUser(
  data: {
    fullName: string;
    username: string;
    email: string;
    role: UserRole;
    password: string;
    businessName?: string;
  },
  actor?: string
): { success: boolean; user?: EnterpriseUserRecord; error?: string } {
  const users = getEnterpriseUsers();
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanEmail = data.email.trim().toLowerCase();

  if (!cleanUsername || !data.password || !data.fullName.trim()) {
    return { success: false, error: "Please enter Full Name, Username, and Password." };
  }

  // Check unique username and email
  if (users.some(u => u.username.toLowerCase() === cleanUsername || (u.allowedUsernames && u.allowedUsernames.includes(cleanUsername)))) {
    return { success: false, error: `Username "${cleanUsername}" is already taken.` };
  }
  if (cleanEmail && users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: `Email "${cleanEmail}" is already registered.` };
  }

  const newUser: EnterpriseUserRecord = {
    id: `usr-${data.role}-${Date.now()}`,
    fullName: data.fullName.trim(),
    username: cleanUsername,
    allowedUsernames: [cleanUsername],
    email: cleanEmail || `${cleanUsername}@pramodmaharaj.in`,
    role: data.role,
    passwordHash: data.password,
    businessName: data.businessName || "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveEnterpriseUsers(users);

  addAuditLog({
    action: "CREATE_USER",
    entity: `User @${newUser.username} (${newUser.role.toUpperCase()})`,
    actor: actor || "System Administrator",
    notes: `Created new ${newUser.role.toUpperCase()} account for "${newUser.fullName}".`,
  });

  return { success: true, user: newUser };
}

export function updateEnterpriseUser(
  id: string,
  data: {
    fullName?: string;
    username?: string;
    email?: string;
    role?: UserRole;
    businessName?: string;
  },
  actor?: string
): { success: boolean; user?: EnterpriseUserRecord; error?: string } {
  const users = getEnterpriseUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, error: "User account not found." };

  const existing = users[idx];
  const cleanUsername = data.username ? data.username.trim().toLowerCase() : existing.username;
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : existing.email;

  if (cleanUsername !== existing.username) {
    if (users.some(u => u.id !== id && (u.username.toLowerCase() === cleanUsername || (u.allowedUsernames && u.allowedUsernames.includes(cleanUsername))))) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }
  }

  if (cleanEmail !== existing.email) {
    if (users.some(u => u.id !== id && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `Email "${cleanEmail}" is already registered.` };
    }
  }

  const updated: EnterpriseUserRecord = {
    ...existing,
    fullName: data.fullName !== undefined ? data.fullName.trim() : existing.fullName,
    username: cleanUsername,
    allowedUsernames: Array.from(new Set([cleanUsername, ...(existing.allowedUsernames || [])])),
    email: cleanEmail,
    role: data.role !== undefined ? data.role : existing.role,
    businessName: data.businessName !== undefined ? data.businessName : existing.businessName,
    updatedAt: new Date().toISOString(),
  };

  users[idx] = updated;
  saveEnterpriseUsers(users);

  addAuditLog({
    action: "UPDATE_USER",
    entity: `User @${updated.username} (${updated.role.toUpperCase()})`,
    actor: actor || "System Administrator",
    notes: `Updated user profile details for "${updated.fullName}".`,
  });

  return { success: true, user: updated };
}

export function updateUserPassword(
  id: string,
  newPassword: string,
  actor?: string
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "Password must be at least 4 characters long." };
  }

  const users = getEnterpriseUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, error: "User account not found." };

  const user = users[idx];
  user.passwordHash = newPassword;
  user.updatedAt = new Date().toISOString();
  users[idx] = user;
  saveEnterpriseUsers(users);

  addAuditLog({
    action: "RESET_USER_PASSWORD",
    entity: `User @${user.username} (${user.role.toUpperCase()})`,
    actor: actor || "System Administrator",
    notes: `Administrator updated password credentials for "${user.fullName}".`,
  });

  return { success: true };
}

export function toggleUserStatus(
  id: string,
  isActive: boolean,
  actor?: string
): { success: boolean; error?: string } {
  const users = getEnterpriseUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, error: "User account not found." };

  const user = users[idx];
  if (!isActive && user.role === "admin") {
    const activeAdmins = users.filter(u => u.role === "admin" && u.isActive && u.id !== id);
    if (activeAdmins.length === 0) {
      return { success: false, error: "Cannot deactivate the only active Administrator account." };
    }
  }

  user.isActive = isActive;
  user.updatedAt = new Date().toISOString();
  users[idx] = user;
  saveEnterpriseUsers(users);

  addAuditLog({
    action: "TOGGLE_USER_STATUS",
    entity: `User @${user.username}`,
    actor: actor || "System Administrator",
    notes: `Account ${isActive ? "activated" : "deactivated"} for "${user.fullName}".`,
  });

  return { success: true };
}

export function deleteEnterpriseUser(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const users = getEnterpriseUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, error: "User account not found." };

  const user = users[idx];
  if (user.role === "admin") {
    const remainingAdmins = users.filter(u => u.role === "admin" && u.id !== id);
    if (remainingAdmins.length === 0) {
      return { success: false, error: "Cannot delete the last remaining Administrator account." };
    }
  }

  users.splice(idx, 1);
  saveEnterpriseUsers(users);

  addAuditLog({
    action: "DELETE_USER",
    entity: `User @${user.username}`,
    actor: actor || "System Administrator",
    notes: `Permanently deleted account for "${user.fullName}" (${user.role.toUpperCase()}).`,
  });

  return { success: true };
}




