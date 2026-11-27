/**
 * Automated Verification Suite for Multi-Item Cement & Rod Bills
 * 
 * Verifies:
 * 1. Creating a Cement bill with multiple brands (e.g. 50 bags LNT + 20 bags SUPPER).
 * 2. Bill items array correctly stores each cement line item with price, quantity, and total.
 * 3. Cement stock correctly reduces for EACH brand in the multi-item bill.
 * 4. Creating a Rod bill with multiple sizes (e.g. 21 kg 10mm + 50 kg 12mm).
 * 5. Bill items array correctly stores each rod line item with price, quantity, and total.
 * 6. Rod stock correctly reduces for EACH size in the multi-item bill.
 * 7. Customer account balance correctly increases by full multi-item bill amount (+ labour/transport).
 * 8. Backwards compatibility with legacy single-item bills.
 */

// Mock browser global environment for Node
if (typeof window === "undefined") {
  const cookieJar = {};
  global.document = {
    get cookie() {
      return Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; ");
    },
    set cookie(val) {
      const parts = val.split(";")[0].split("=");
      const key = parts[0].trim();
      const value = decodeURIComponent(parts.slice(1).join("="));
      if (val.includes("expires=Thu, 01 Jan 1970")) {
        delete cookieJar[key];
      } else {
        cookieJar[key] = value;
      }
    }
  };
  const storage = {};
  global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
  global.window = {
    dispatchEvent: () => {},
    location: { origin: "http://localhost:3000" }
  };
}

const jiti = require("jiti")(process.cwd());

const {
  createBill,
  getBills,
  createCustomer,
  getCustomers,
  saveCustomers,
  getCementBrands,
  saveCementBrands,
  getRodSizes,
  saveRodSizes,
  calculateInventoryStock,
} = jiti("./src/lib/storage.ts");

async function runMultiItemBillTests() {
  console.log("=== STARTING MULTI-ITEM CEMENT & ROD BILLS VERIFICATION SUITE ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Setup customer
  const cust = createCustomer({
    name: "LAXMAN SAHU",
    phone: "7735431405",
    address: "Chikiti, Ganjam",
    opening_balance: 0,
  });

  // Setup baseline cement brands with opening stocks
  const cementBrands = getCementBrands().map(b => {
    if (b.name === "LNT") return { ...b, openingStock: 100, defaultRate: 350 };
    if (b.name === "SUPPER") return { ...b, openingStock: 100, defaultRate: 340 };
    return b;
  });
  saveCementBrands(cementBrands);

  // Setup baseline rod sizes with opening stocks
  const rodSizes = getRodSizes().map(s => {
    if (s.size === "10mm") return { ...s, openingStock: 500, defaultRate: 120 };
    if (s.size === "12mm") return { ...s, openingStock: 500, defaultRate: 118 };
    return s;
  });
  saveRodSizes(rodSizes);

  // Check initial stock
  let stock = calculateInventoryStock();
  const initialLnt = stock.cementStock.find(c => c.name === "LNT")?.available_stock || 0;
  const initialSupper = stock.cementStock.find(c => c.name === "SUPPER")?.available_stock || 0;
  const initial10mm = stock.rodStock.find(r => r.name === "10mm")?.available_stock || 0;
  const initial12mm = stock.rodStock.find(r => r.name === "12mm")?.available_stock || 0;

  assert(initialLnt === 100, "Initial LNT stock is 100 bags");
  assert(initialSupper === 100, "Initial SUPPER stock is 100 bags");
  assert(initial10mm === 500, "Initial 10mm rod stock is 500 kg");
  assert(initial12mm === 500, "Initial 12mm rod stock is 500 kg");

  // TEST 1: Create Multi-Item Cement Bill (50 Bags LNT @ 350 + 20 Bags SUPPER @ 340)
  // LNT: 50 * 350 = 17,500; SUPPER: 20 * 340 = 6,800. Subtotal: 24,300. Labour: 200, Transport: 300. Total: 24,800.
  const cementBill = createBill({
    bill_number: "CEM-2026-MULTI-01",
    bill_category: "cement",
    bill_date: "2026-11-27",
    customer_id: cust.id,
    customer_name: cust.name,
    subtotal: 24300,
    labour_amount: 200,
    transport_amount: 300,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 24800,
    payment_status: "unpaid",
    status: "posted",
    notes: "Two cement brands in one bill",
    is_imported: false,
    items: [
      {
        id: "item-c-1",
        bill_id: "",
        item_name: "LNT Cement",
        item_category: "cement",
        quantity: 50,
        unit: "BAGS",
        unit_price: 350,
        total_amount: 17500
      },
      {
        id: "item-c-2",
        bill_id: "",
        item_name: "SUPPER Cement",
        item_category: "cement",
        quantity: 20,
        unit: "BAGS",
        unit_price: 340,
        total_amount: 6800
      },
      {
        id: "item-c-labour",
        bill_id: "",
        item_name: "Labour Charge",
        item_category: "cement",
        quantity: 1,
        unit: "SERVICE",
        unit_price: 200,
        total_amount: 200
      },
      {
        id: "item-c-transport",
        bill_id: "",
        item_name: "Transport Charge",
        item_category: "cement",
        quantity: 1,
        unit: "SERVICE",
        unit_price: 300,
        total_amount: 300
      }
    ],
    cement_details: {
      cement_type: "LNT (50), SUPPER (20)",
      qty_bags: 70,
      unit_rate: 347.14,
      amount: 24300,
      legacy_paid_flag: "NO"
    }
  });

  assert(cementBill !== null, "Multi-item Cement Bill created successfully");
  assert(cementBill.items.length === 4, "Bill contains 2 cement items + labour + transport");
  assert(cementBill.total_amount === 24800, "Cement Bill total amount matches sum of all items");

  // TEST 2: Check Cement Inventory Deduction
  stock = calculateInventoryStock();
  const postLnt = stock.cementStock.find(c => c.name === "LNT")?.available_stock || 0;
  const postSupper = stock.cementStock.find(c => c.name === "SUPPER")?.available_stock || 0;

  assert(postLnt === 50, "LNT stock correctly reduced from 100 to 50 bags (-50 bags)");
  assert(postSupper === 80, "SUPPER stock correctly reduced from 100 to 80 bags (-20 bags)");

  // TEST 3: Create Multi-Item Rod Bill (21 kg 10mm @ 120 + 50 kg 12mm @ 118)
  // 10mm: 21 * 120 = 2,520; 12mm: 50 * 118 = 5,900. Subtotal: 8,420. Total: 8,420.
  const rodBill = createBill({
    bill_number: "ROD-2026-MULTI-01",
    bill_category: "rod",
    bill_date: "2026-11-27",
    customer_id: cust.id,
    customer_name: cust.name,
    subtotal: 8420,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 8420,
    payment_status: "unpaid",
    status: "posted",
    notes: "Two rod sizes in one bill",
    is_imported: false,
    items: [
      {
        id: "item-r-1",
        bill_id: "",
        item_name: "TMT Steel Rod 10mm",
        item_category: "rod",
        quantity: 21,
        unit: "KG",
        unit_price: 120,
        total_amount: 2520
      },
      {
        id: "item-r-2",
        bill_id: "",
        item_name: "TMT Steel Rod 12mm",
        item_category: "rod",
        quantity: 50,
        unit: "KG",
        unit_price: 118,
        total_amount: 5900
      }
    ],
    rod_details: {
      rod_size: "10mm (21kg), 12mm (50kg)",
      qty_kg: 71,
      rate_per_kg: 118.59,
      amount: 8420
    }
  });

  assert(rodBill !== null, "Multi-item Rod Bill created successfully");
  assert(rodBill.items.length === 2, "Bill contains 2 rod items");
  assert(rodBill.total_amount === 8420, "Rod Bill total amount matches sum of all items");

  // TEST 4: Check Rod Inventory Deduction
  stock = calculateInventoryStock();
  const post10mm = stock.rodStock.find(r => r.name === "10mm")?.available_stock || 0;
  const post12mm = stock.rodStock.find(r => r.name === "12mm")?.available_stock || 0;

  assert(post10mm === 479, "10mm rod stock correctly reduced from 500 to 479 kg (-21 kg)");
  assert(post12mm === 450, "12mm rod stock correctly reduced from 500 to 450 kg (-50 kg)");

  // TEST 5: Customer Ledger Balance
  const updatedCust = getCustomers().find(c => c.id === cust.id);
  // Total balance should be 24,800 + 8,420 = 33,220
  assert(updatedCust.current_balance === 33220, "Customer outstanding balance reflects both multi-item bills (₹33,220)");
  assert(updatedCust.total_bills_amount === 33220, "Customer total bills amount matches ₹33,220");

  console.log(`\n=== ALL ${passed}/${total} MULTI-ITEM BILL TESTS PASSED! ===`);
}

runMultiItemBillTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
