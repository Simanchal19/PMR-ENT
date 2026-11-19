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

console.log("=== STARTING ELECTRICAL & HARDWARE INVENTORY STOCK ENGINE TESTS ===");

storage.setStoredUserRole("owner");

// Test 1: Get Seed Hardware Items
const seedItems = storage.getHardwareItems();
assert(Array.isArray(seedItems) && seedItems.length >= 8, `Expected at least 8 seed items, got ${seedItems.length}`);
console.log(`✓ [PASS] Loaded ${seedItems.length} default Electrical & Hardware catalog items`);

// Test 2: Add New Hardware Item
const addRes = storage.addHardwareItem({
  name: "Havells 32A DP Isolator",
  unit: "Pcs",
  defaultRate: 340,
  openingStock: 50,
  notes: "Double Pole Main Switch",
});
assert(addRes.success === true, "Failed to add hardware item");
assert(addRes.item.name === "Havells 32A DP Isolator", "Item name mismatch");
console.log(`✓ [PASS] Added new hardware item: "${addRes.item.name}" with opening stock 50 Pcs`);

// Test 3: Update Opening Stock
const updateRes = storage.updateHardwareItem(addRes.item.id, { openingStock: 65 });
assert(updateRes.success === true, "Failed to update hardware item");
assert(updateRes.item.openingStock === 65, "Opening stock mismatch");
console.log(`✓ [PASS] Updated opening stock to 65 Pcs`);

// Test 4: Record Daily/Hardware Inward Purchase Bill
const supplier = storage.createSupplier({
  name: "KALINGA ELECTRICAL DISTRIBUTORS",
  supply_category: "daily",
  opening_balance: 0,
});

const purchaseBill = storage.createPurchaseBill({
  bill_category: "daily",
  purchase_date: "2026-11-19",
  supplier_id: supplier.id,
  supplier_name: supplier.name,
  subtotal: 10000,
  freight_amount: 0,
  tax_type: "intra_state",
  gst_rate: 18,
  cgst_rate: 9,
  sgst_rate: 9,
  cgst_amount: 900,
  sgst_amount: 900,
  tax_amount: 1800,
  total_amount: 11800,
  payment_status: "unpaid",
  status: "posted",
  items: [
    {
      id: "pitem-1",
      bill_id: "",
      item_name: "Havells 32A DP Isolator",
      item_category: "DAILY",
      quantity: 35,
      unit: "Pcs",
      unit_price: 250,
      total_amount: 8750,
    },
    {
      id: "pitem-2",
      bill_id: "",
      item_name: "Polycab 2.5mm Wire 90m Coil",
      item_category: "DAILY",
      quantity: 10,
      unit: "Coils",
      unit_price: 2000,
      total_amount: 20000,
    }
  ]
});
console.log(`✓ [PASS] Recorded Electrical Inward Purchase Bill #${purchaseBill.purchase_number}`);

// Test 5: Post Sales Bill Outward
const customer = storage.createCustomer({
  name: "RABINDRA SAHU CONTRACTOR",
  phone: "9876543210",
  opening_balance: 0,
});

const salesBill = storage.createBill({
  bill_number: "BILL-2026-TEST-01",
  bill_category: "daily",
  bill_date: "2026-11-19",
  customer_id: customer.id,
  customer_name: customer.name,
  subtotal: 5100,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 5100,
  payment_status: "unpaid",
  status: "posted",
  items: [
    {
      id: "sitem-1",
      bill_id: "",
      item_name: "Havells 32A DP Isolator",
      item_category: "DAILY",
      quantity: 15,
      unit: "Pcs",
      unit_price: 340,
      total_amount: 5100,
    }
  ]
});
console.log(`✓ [PASS] Posted Sales Bill #${salesBill.bill_number} for 15 Pcs Havells 32A DP Isolator`);

// Test 6: Calculate Stock Reconciliation
const stock = storage.calculateInventoryStock();
const isolatorStock = stock.hardwareStock.find(h => h.name === "Havells 32A DP Isolator");
assert(isolatorStock, "Isolator stock not found in hardwareStock");

console.log(`Isolator Stock Breakdown: Opening: ${isolatorStock.opening_stock}, Purchased: ${isolatorStock.purchased_qty}, Sold: ${isolatorStock.sold_qty}, Available: ${isolatorStock.available_stock}`);
assert(isolatorStock.opening_stock === 65, "Expected opening stock 65");
assert(isolatorStock.purchased_qty === 35, "Expected purchased qty 35");
assert(isolatorStock.sold_qty === 15, "Expected sold qty 15");
assert(isolatorStock.available_stock === 85, `Expected available stock 85, got ${isolatorStock.available_stock}`);
assert(isolatorStock.avg_purchase_rate === 250, `Expected avg buy rate 250, got ${isolatorStock.avg_purchase_rate}`);
assert(isolatorStock.stock_value === 85 * 250, `Expected stock value 21250, got ${isolatorStock.stock_value}`);
console.log(`✓ [PASS] Reconciled stock for "Havells 32A DP Isolator": 65 + 35 - 15 = 85 Pcs (Valued at ₹${isolatorStock.stock_value})`);

// Test 7: Verify Total Hardware Units and Total Stock Value
assert(stock.totalHardwareUnitsAvailable > 0, "Expected positive total hardware units");
assert(stock.totalInventoryValue > 0, "Expected positive total inventory value");
console.log(`✓ [PASS] Total Hardware Units Available: ${stock.totalHardwareUnitsAvailable}`);
console.log(`✓ [PASS] Total Estimated Godown Stock Value (Cement + Rod + Hardware): ₹${stock.totalInventoryValue}`);

console.log("\n=== ALL 7/7 ELECTRICAL & HARDWARE INVENTORY STOCK TESTS PASSED! ===");
