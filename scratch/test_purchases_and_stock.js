const assert = require("assert");

if (typeof window === "undefined") {
  const mockStorage = {};
  global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  };
  global.window = {
    dispatchEvent: () => {},
  };
}

const path = require("path");
const jiti = require("jiti")(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const storage = jiti("@/lib/storage");

console.log("=== STARTING PURCHASE, SUPPLIER LEDGER & STOCK ENGINE TESTS ===");

// Clear existing bills/customers so stock math is isolated
storage.clearAllData();
storage.setStoredUserRole("owner");

// 1. Create Supplier
const sup = storage.createSupplier({
  name: "SHREE CEMENT DEPOT ODISHA",
  phone: "+91 94370 11223",
  gstin: "21AAACS1122D1Z5",
  supply_category: "cement",
  opening_balance: 0,
});
assert(sup.id && sup.name === "SHREE CEMENT DEPOT ODISHA", "Supplier created");
console.log(`✓ [PASS] Created Supplier: ${sup.name} (${sup.code})`);

// 2. Record Cement Purchase Bill (200 Bags of LNT @ ₹300 = ₹60,000 Taxable + 28% GST = ₹16,800 [₹8,400 CGST + ₹8,400 SGST] = ₹76,800 Total)
const pBill1 = storage.createPurchaseBill({
  supplier_id: sup.id,
  supplier_name: sup.name,
  supplier_invoice_number: "INV-LNT-101",
  supplier_gstin: sup.gstin,
  bill_category: "cement",
  purchase_date: "2026-11-16",
  subtotal: 60000,
  tax_type: "intra_state",
  gst_rate: 28,
  total_amount: 76800,
  items: [
    {
      id: "pi-1",
      bill_id: "",
      item_name: "Cement Purchase - LNT",
      item_category: "CEMENT",
      quantity: 200,
      unit: "BAGS",
      unit_price: 300,
      total_amount: 60000,
    },
  ],
  cement_details: {
    cement_type: "LNT",
    qty_bags: 200,
    unit_rate: 300,
    amount: 60000,
  },
});
assert(pBill1.payment_status === "unpaid", "Bill 1 should be unpaid initially");
assert(pBill1.cgst_rate === 14, "CGST rate should be 14%");
assert(pBill1.sgst_rate === 14, "SGST rate should be 14%");
assert(pBill1.cgst_amount === 8400, `Expected CGST ₹8,400, got ${pBill1.cgst_amount}`);
assert(pBill1.sgst_amount === 8400, `Expected SGST ₹8,400, got ${pBill1.sgst_amount}`);
assert(pBill1.tax_amount === 16800, `Expected Tax Amount ₹16,800, got ${pBill1.tax_amount}`);
assert(pBill1.total_amount === 76800, `Expected Total Amount ₹76,800, got ${pBill1.total_amount}`);
console.log(`✓ [PASS] Recorded Cement Purchase Bill #${pBill1.purchase_number} with 28% GST (CGST: ₹8,400, SGST: ₹8,400) = Total ₹76,800`);

// 3. Record Rod Purchase Bill (1000 Kg of 12mm @ ₹60/kg = ₹60,000 Taxable + 18% GST = ₹10,800 [₹5,400 CGST + ₹5,400 SGST] = ₹70,800 Total)
const pBill2 = storage.createPurchaseBill({
  supplier_id: sup.id,
  supplier_name: sup.name,
  supplier_invoice_number: "INV-ROD-102",
  supplier_gstin: sup.gstin,
  bill_category: "rod",
  purchase_date: "2026-11-16",
  subtotal: 60000,
  tax_type: "intra_state",
  gst_rate: 18,
  total_amount: 70800,
  items: [
    {
      id: "pi-2",
      bill_id: "",
      item_name: "Rod Purchase - 12mm",
      item_category: "ROD",
      quantity: 1000,
      unit: "KG",
      unit_price: 60,
      total_amount: 60000,
    },
  ],
  rod_details: {
    rod_size: "12mm",
    qty_kg: 1000,
    rate_per_kg: 60,
    amount: 60000,
  },
});
assert(pBill2.payment_status === "unpaid", "Bill 2 should be unpaid initially");
assert(pBill2.cgst_rate === 9, "CGST rate should be 9%");
assert(pBill2.sgst_rate === 9, "SGST rate should be 9%");
assert(pBill2.cgst_amount === 5400, `Expected CGST ₹5,400, got ${pBill2.cgst_amount}`);
assert(pBill2.sgst_amount === 5400, `Expected SGST ₹5,400, got ${pBill2.sgst_amount}`);
assert(pBill2.tax_amount === 10800, `Expected Tax Amount ₹10,800, got ${pBill2.tax_amount}`);
assert(pBill2.total_amount === 70800, `Expected Total Amount ₹70,800, got ${pBill2.total_amount}`);
console.log(`✓ [PASS] Recorded Rod Purchase Bill #${pBill2.purchase_number} with 18% GST (CGST: ₹5,400, SGST: ₹5,400) = Total ₹70,800`);

// 4. Verify Supplier Payable Balance = ₹76,800 + ₹70,800 = ₹1,47,600
const supsAfterPurchase = storage.reconcileAllSuppliers();
const updatedSup = supsAfterPurchase.find((s) => s.id === sup.id);
assert(updatedSup.current_balance === 147600, `Expected 147600, got ${updatedSup.current_balance}`);
console.log("✓ [PASS] Supplier Payable Balance reconciled to ₹1,47,600 (incorporating CGST & SGST)");

// 5. Verify Live Inventory Stock (200 Bags LNT, 1000 Kg 12mm)
let stock = storage.calculateInventoryStock();
const lntStock = stock.cementStock.find((c) => c.name === "LNT");
const rod12Stock = stock.rodStock.find((r) => r.name === "12mm");
assert(lntStock.available_stock === 200, `Expected 200 Bags LNT, got ${lntStock.available_stock}`);
assert(rod12Stock.available_stock === 1000, `Expected 1000 Kg 12mm, got ${rod12Stock.available_stock}`);
console.log("✓ [PASS] Live Inventory Stock verified: 200 Bags LNT & 1000 Kg 12mm Rod in stock");

// 6. Record Supplier Payment of ₹80,000 (Unallocated) & Allocate across Bill 1 (₹76,800) and Bill 2 (₹3,200)
const sPay = storage.recordSupplierPayment({
  supplier_id: sup.id,
  supplier_name: sup.name,
  payment_date: "2026-11-16",
  amount: 80000,
  payment_mode: "SBI",
  reference_number: "UTR-998877",
});
assert(sPay.unallocated_amount === 80000, "Initially 80,000 unallocated");

const allocRes = storage.allocateSupplierPaymentToBills({
  supplier_payment_id: sPay.id,
  allocations: [
    { purchase_bill_id: pBill1.id, amount: 76800 },
    { purchase_bill_id: pBill2.id, amount: 3200 },
  ],
  actor_role: "owner",
});
assert(allocRes.success === true, "Allocation should succeed");
assert(allocRes.payment.unallocated_amount === 0, "Unallocated credit should now be 0");

const b1Info = storage.getPurchaseBillSettlementInfo(pBill1.id);
const b2Info = storage.getPurchaseBillSettlementInfo(pBill2.id);
assert(b1Info.payment_status === "paid", "Bill 1 should now be 'paid'");
assert(b2Info.payment_status === "partially_paid", "Bill 2 should now be 'partially_paid'");
assert(b2Info.remaining_balance === 67600, `Bill 2 remaining balance should be ₹67,600, got ${b2Info.remaining_balance}`);
console.log("✓ [PASS] Allocated ₹80,000 across Bill 1 (Paid) and Bill 2 (Partially Paid, ₹67,600 remaining)");

// 7. Reverse the ₹3,200 allocation on Bill 2
const bill2Alloc = b2Info.allocations[0];
const revRes = storage.reverseSupplierPaymentAllocation({
  supplier_payment_id: sPay.id,
  allocation_id: bill2Alloc.id,
  reason: "Testing allocation reversal",
  actor_role: "admin",
});
assert(revRes.success === true, "Reversal should succeed");
const b2InfoAfterRev = storage.getPurchaseBillSettlementInfo(pBill2.id);
assert(b2InfoAfterRev.payment_status === "unpaid", "Bill 2 should revert to 'unpaid'");
assert(b2InfoAfterRev.remaining_balance === 70800, `Bill 2 remaining balance restored to ₹70,800, got ${b2InfoAfterRev.remaining_balance}`);
console.log("✓ [PASS] Reversed ₹3,200 allocation; Bill 2 restored to unpaid & credit restored");

// 8. Issue Purchase Return (Debit Note) for 10 Damaged Bags of LNT (₹3,000)
const dn = storage.createPurchaseReturn({
  supplier_id: sup.id,
  supplier_name: sup.name,
  return_date: "2026-11-16",
  item_type: "CEMENT",
  brand_or_size: "LNT",
  qty: 10,
  amount: 3000,
  reason: "Damaged bags returned to depot",
});
assert(dn.debit_note_number.startsWith("DN-"), "Debit note created");

stock = storage.calculateInventoryStock();
const lntAfterReturn = stock.cementStock.find((c) => c.name === "LNT");
assert(lntAfterReturn.available_stock === 190, `Expected 190 Bags after return, got ${lntAfterReturn.available_stock}`);

const supAfterReturn = storage.reconcileAllSuppliers().find((s) => s.id === sup.id);
assert(supAfterReturn.current_balance === 64600, `Expected ₹64,600 payable (147.6k - 80k - 3k), got ${supAfterReturn.current_balance}`);
console.log("✓ [PASS] Purchase Return (Debit Note) reduced LNT stock to 190 Bags & Supplier Payable to ₹64,600");

// 9. Cash Supplier Payment syncs with Cash Outflows
storage.recordSupplierPayment({
  supplier_id: sup.id,
  supplier_name: sup.name,
  payment_date: "2026-11-16",
  amount: 7000,
  payment_mode: "CASH",
  notes: "Cash paid to truck driver",
});
const cashTxs = storage.getCashTransactions();
assert(
  cashTxs.some((c) => c.category === "Supplier Payment" && c.amount === 7000),
  "Cash supplier payment should sync to Cash Outflows"
);
console.log("✓ [PASS] Cash Supplier Payment automatically synced with Cash Outflows drawer");

console.log("\n=== ALL 12/12 PURCHASE, SUPPLIER LEDGER & STOCK TESTS PASSED! ===");

