"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  getCustomers, 
  getBills, 
  getBillById,
  createBill, 
  updateBill,
  createCustomer,
  getCementBrands,
  getRodSizes,
  getHardwareItems,
  getStoredUserRole
} from "@/lib/storage";
import { Customer, BillCategory, Bill, BillItem, CementBrand, RodSize, HardwareItem } from "@/lib/types";
import { formatCurrency, getTodayDateString, generateBillNumber, BILL_CATEGORIES, getCategoryConfig } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Zap, 
  X, 
  ChevronDown,
  Settings2,
  Truck,
  UserPlus,
  Phone,
  MapPin,
  Edit2,
  Layers,
  Package,
  Hammer,
  Droplet,
  Wrench,
  Paintbrush,
  Cog,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { CementBrandManagerModal, RodSizeManagerModal } from "@/components/admin/MasterCatalogModals";

const CATEGORY_ICONS: Record<BillCategory, any> = {
  mix: Layers,
  cement: Package,
  rod: Hammer,
  daily: Zap,
  plumbing: Droplet,
  hardware: Wrench,
  paints: Paintbrush,
  machinery: Cog,
  ceramic: Sparkles,
};

export default function CreateBillPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cementFirstRefs = useRef<(HTMLSelectElement | null)[]>([]);
  const rodFirstRefs = useRef<(HTMLSelectElement | null)[]>([]);
  const dailyFirstRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [category, setCategory] = useState<BillCategory>("mix");
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState("");
  const [successBill, setSuccessBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  // Cement Line Item Interface
  interface CementItemInput {
    id: string;
    brand: string;
    bags: string;
    rate: string;
    amount: number;
  }

  // Rod Line Item Interface
  interface RodItemInput {
    id: string;
    size: string;
    brand: string;
    kg: string;
    rate: string;
    amount: number;
  }

  // Cement Fields - Multi-item list
  const [cementItems, setCementItems] = useState<CementItemInput[]>([
    { id: "c-1", brand: "LNT", bags: "", rate: "", amount: 0 }
  ]);

  // Rod Fields - Multi-item list
  const [rodItems, setRodItems] = useState<RodItemInput[]>([
    { id: "r-1", size: "10mm", brand: "", kg: "", rate: "", amount: 0 }
  ]);

  // Dynamic Master Catalogs (Admin Configurable)
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [rodSizes, setRodSizes] = useState<RodSize[]>([]);
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCementModal, setShowCementModal] = useState(false);
  const [showRodModal, setShowRodModal] = useState(false);

  // Line Items (Mix, Electrical, Plumbing, Hardware, Paints, Machinery, Ceramic)
  const [dailyItems, setDailyItems] = useState([
    { name: "", brand: "", qty: "" as any, rate: "" as any, amount: 0 }
  ]);

  // Additional Charges: Labour & Transport Costs (Optional)
  const [labourCost, setLabourCost] = useState("");
  const [transportCost, setTransportCost] = useState("");

  // Responsive breakpoint detection (< 768px) to render mobile stacked item cards cleanly
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const syncBreakpoint = () => setIsMobile(mq.matches);
    syncBreakpoint();
    mq.addEventListener("change", syncBreakpoint);
    return () => mq.removeEventListener("change", syncBreakpoint);
  }, []);

  // Quick Add Customer Modal Popup
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerOpeningBalance, setNewCustomerOpeningBalance] = useState("");

  const populateFormForEdit = (
    bill: Bill,
    custList: Customer[],
    bList: CementBrand[],
    sList: RodSize[]
  ) => {
    setEditingBill(bill);
    setSuccessBill(null);
    setCategory(bill.bill_category);
    setBillDate(bill.bill_date || getTodayDateString());
    setSelectedCustomerId(bill.customer_id);
    const custObj = custList.find((c) => c.id === bill.customer_id);
    setCustomerSearch(custObj ? custObj.name : bill.customer_name);
    setNotes(bill.notes || "");

    const allItems = bill.items || [];
    const isServiceItem = (it: any) =>
      it.unit === "SERVICE" ||
      (it.item_name || "").toLowerCase().includes("labour") ||
      (it.item_name || "").toLowerCase().includes("transport");
    const goodsItems = allItems.filter((it) => !isServiceItem(it));
    const labourItem = allItems.find((it) => (it.item_name || "").toLowerCase().includes("labour"));
    const transportItem = allItems.find((it) => (it.item_name || "").toLowerCase().includes("transport"));

    const lCost = bill.labour_amount ?? labourItem?.total_amount ?? 0;
    const tCost = bill.transport_amount ?? transportItem?.total_amount ?? 0;
    setLabourCost(lCost > 0 ? String(lCost) : "");
    setTransportCost(tCost > 0 ? String(tCost) : "");

    if (bill.bill_category === "cement") {
      if (goodsItems.length > 0) {
        setCementItems(
          goodsItems.map((it, idx) => {
            const rawBrand = (it.item_name || "").replace(/\s*Cement$/i, "").trim();
            const matchedBrand =
              bList.find((b) => b.name.toUpperCase() === rawBrand.toUpperCase())?.name ||
              rawBrand ||
              "LNT";
            return {
              id: it.id || `c-edit-${idx + 1}`,
              brand: matchedBrand,
              bags: String(it.quantity || ""),
              rate: String(it.unit_price || ""),
              amount: it.total_amount || 0,
            };
          })
        );
      } else if (bill.cement_details) {
        setCementItems([
          {
            id: "c-edit-1",
            brand: bill.cement_details.cement_type || "LNT",
            bags: String(bill.cement_details.qty_bags || ""),
            rate: String(bill.cement_details.unit_rate || ""),
            amount: bill.cement_details.amount || 0,
          },
        ]);
      }
    } else if (bill.bill_category === "rod") {
      if (goodsItems.length > 0) {
        setRodItems(
          goodsItems.map((it, idx) => {
            const rawSize = (it.item_name || "").replace(/^TMT\s*Steel\s*Rod\s*/i, "").trim();
            const matchedSize =
              sList.find((s) => s.size.toLowerCase() === rawSize.toLowerCase())?.size ||
              rawSize ||
              "10mm";
            return {
              id: it.id || `r-edit-${idx + 1}`,
              size: matchedSize,
              brand: it.brand || "",
              kg: String(it.quantity || ""),
              rate: String(it.unit_price || ""),
              amount: it.total_amount || 0,
            };
          })
        );
      } else if (bill.rod_details) {
        setRodItems([
          {
            id: "r-edit-1",
            size: bill.rod_details.rod_size || "10mm",
            brand: "",
            kg: String(bill.rod_details.qty_kg || ""),
            rate: String(bill.rod_details.rate_per_kg || ""),
            amount: bill.rod_details.amount || 0,
          },
        ]);
      }
    } else {
      if (goodsItems.length > 0) {
        setDailyItems(
          goodsItems.map((it) => ({
            name: it.item_name || "",
            brand: it.brand || "",
            qty: it.quantity ?? "",
            rate: it.unit_price ?? "",
            amount: it.total_amount || 0,
          }))
        );
      } else {
        setDailyItems([{ name: "", brand: "", qty: "" as any, rate: "" as any, amount: 0 }]);
      }
    }
  };

  useEffect(() => {
    const list = getCustomers();
    setCustomers(list);

    const bList = getCementBrands();
    const sList = getRodSizes();
    const hList = getHardwareItems();
    setCementBrands(bList);
    setRodSizes(sList);
    setHardwareItems(hList);

    let editIdParam: string | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      editIdParam = params.get("edit");
      const catParam = params.get("category");
      if (!editIdParam && catParam && BILL_CATEGORIES.some((c) => c.id === catParam)) {
        setCategory(catParam as BillCategory);
      }
    }

    if (editIdParam) {
      const targetBill = getBillById(editIdParam);
      if (targetBill) {
        populateFormForEdit(targetBill, list, bList, sList);
      }
    }

    const loadCatalogs = () => {
      const latestB = getCementBrands();
      const latestS = getRodSizes();
      const latestH = getHardwareItems();
      setCementBrands(latestB);
      setRodSizes(latestS);
      setHardwareItems(latestH);

      if (!editIdParam) {
        const activeB = latestB.filter(b => b.isActive);
        if (activeB.length > 0) {
          setCementItems(prev => {
            if (prev.length === 1 && !prev[0].bags && !prev[0].rate) {
              return [{
                ...prev[0],
                brand: activeB[0].name,
                rate: activeB[0].defaultRate ? String(activeB[0].defaultRate) : ""
              }];
            }
            return prev;
          });
        }

        const activeS = latestS.filter(s => s.isActive);
        if (activeS.length > 0) {
          setRodItems(prev => {
            if (prev.length === 1 && !prev[0].kg && !prev[0].rate) {
              return [{
                ...prev[0],
                size: activeS[0].size,
                rate: activeS[0].defaultRate ? String(activeS[0].defaultRate) : ""
              }];
            }
            return prev;
          });
        }
      }

      const session = getClientSession();
      const role = session?.user?.role || getStoredUserRole();
      setIsAdmin(role === "admin" || role === "owner");
    };

    loadCatalogs();
    window.addEventListener("tpm_data_updated", loadCatalogs);

    return () => window.removeEventListener("tpm_data_updated", loadCatalogs);
  }, []);

  const handleCementItemChange = (index: number, field: "brand" | "bags" | "rate", value: string) => {
    const updated = [...cementItems];
    const item = { ...updated[index], [field]: value };

    if (field === "brand") {
      const brand = cementBrands.find(b => b.name === value);
      if (brand && brand.defaultRate) {
        const currentRate = parseFloat(item.rate);
        if (!item.rate || currentRate === 0 || cementBrands.some(b => b.defaultRate === currentRate)) {
          item.rate = String(brand.defaultRate);
        }
      }
    }

    const bags = parseFloat(field === "bags" ? value : item.bags) || 0;
    const rate = parseFloat(field === "rate" ? value : item.rate) || 0;
    item.amount = bags * rate;
    updated[index] = item;
    setCementItems(updated);
  };

  const handleAddCementItem = () => {
    const activeB = cementBrands.filter(b => b.isActive);
    const defaultBrand = activeB[0]?.name || "LNT";
    const defaultRate = activeB[0]?.defaultRate ? String(activeB[0].defaultRate) : "";
    setCementItems(prev => [
      ...prev,
      {
        id: `c-${Date.now()}-${prev.length + 1}`,
        brand: defaultBrand,
        bags: "",
        rate: defaultRate,
        amount: 0
      }
    ]);
  };

  const handleRemoveCementItem = (index: number) => {
    if (cementItems.length > 1) {
      setCementItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRodItemChange = (index: number, field: "size" | "brand" | "kg" | "rate", value: string) => {
    const updated = [...rodItems];
    const item = { ...updated[index], [field]: value };

    if (field === "size") {
      const s = rodSizes.find(r => r.size === value);
      if (s && s.defaultRate) {
        const currentRate = parseFloat(item.rate);
        if (!item.rate || currentRate === 0 || rodSizes.some(r => r.defaultRate === currentRate)) {
          item.rate = String(s.defaultRate);
        }
      }
    }

    const kg = parseFloat(field === "kg" ? value : item.kg) || 0;
    const rate = parseFloat(field === "rate" ? value : item.rate) || 0;
    item.amount = kg * rate;
    updated[index] = item;
    setRodItems(updated);
  };

  const handleAddRodItem = () => {
    const activeS = rodSizes.filter(s => s.isActive);
    const defaultSize = activeS[0]?.size || "10mm";
    const defaultRate = activeS[0]?.defaultRate ? String(activeS[0].defaultRate) : "";
    setRodItems(prev => [
      ...prev,
      {
        id: `r-${Date.now()}-${prev.length + 1}`,
        size: defaultSize,
        brand: "",
        kg: "",
        rate: defaultRate,
        amount: 0
      }
    ]);
  };

  const handleRemoveRodItem = (index: number) => {
    if (rodItems.length > 1) {
      setRodItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute Totals dynamically from user input
  const cementTotal = cementItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const totalCementBags = cementItems.reduce((acc, it) => acc + (parseFloat(it.bags) || 0), 0);

  const rodTotal = rodItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const totalRodKg = rodItems.reduce((acc, it) => acc + (parseFloat(it.kg) || 0), 0);

  const dailyTotal = dailyItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const totalDailyQty = dailyItems.reduce((acc, it) => acc + (parseFloat(it.qty as any) || 0), 0);

  const goodsSubtotal = category === "cement" ? cementTotal : category === "rod" ? rodTotal : dailyTotal;
  const labourVal = parseFloat(labourCost) || 0;
  const transportVal = parseFloat(transportCost) || 0;
  const currentTotal = goodsSubtotal + labourVal + transportVal;

  // Dynamic party search: if user types "S", all names starting with "S" appear first, then names containing "S"
  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      return customers.slice(0, 30);
    }

    const startsWith: Customer[] = [];
    const contains: Customer[] = [];

    for (const c of customers) {
      const name = c.name.toLowerCase();
      const phone = c.phone || "";
      const code = (c.code || "").toLowerCase();

      if (name.startsWith(q)) {
        startsWith.push(c);
      } else if (name.includes(q) || phone.includes(q) || code.includes(q)) {
        contains.push(c);
      }
    }

    return [...startsWith, ...contains].slice(0, 60);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.name);
    setIsDropdownOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(true);
  };

  const handleSelectUnknownCustomer = () => {
    let unknownCust = customers.find(c => c.is_unidentified || c.name.toUpperCase().includes("UNKNOWN"));
    if (!unknownCust) {
      unknownCust = createCustomer({
        name: "UNKNOWN (RETAIL CASH)",
        is_unidentified: true,
        address: "Over-the-Counter",
        phone: "+91 98610 10000"
      });
      setCustomers(getCustomers());
    }
    handleSelectCustomer(unknownCust);
  };

  const handleOpenAddCustomerModal = (initialName?: string) => {
    const raw = initialName || customerSearch || "";
    setNewCustomerName(raw.trim().toUpperCase());
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setNewCustomerOpeningBalance("");
    setIsDropdownOpen(false);
    setShowAddCustomerModal(true);
  };

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert("Please enter customer / party name.");
      return;
    }

    const opBal = parseFloat(newCustomerOpeningBalance) || 0;
    const newCust = createCustomer({
      name: newCustomerName.trim().toUpperCase(),
      phone: newCustomerPhone.trim(),
      address: newCustomerAddress.trim() || "Bhubaneswar / Khordha",
      opening_balance: opBal,
    });

    setCustomers(getCustomers());
    handleSelectCustomer(newCust);
    setShowAddCustomerModal(false);
  };

  const handleCreateNewParty = (partyName: string) => {
    handleOpenAddCustomerModal(partyName);
  };

  const handleAddDailyItem = () => {
    setDailyItems([...dailyItems, { name: "", brand: "", qty: "" as any, rate: "" as any, amount: 0 }]);
  };

  const handleDailyItemChange = (index: number, field: string, value: any) => {
    const updated = [...dailyItems];
    (updated[index] as any)[field] = value;
    if (field === "name") {
      const match = hardwareItems.find(
        (h) => h.name.toLowerCase() === String(value).toLowerCase()
      );
      if (match && (!updated[index].rate || updated[index].rate === "0")) {
        const defaultRate = match.defaultRate || 0;
        if (defaultRate > 0) {
          updated[index].rate = defaultRate as any;
          if (!updated[index].qty) updated[index].qty = "1" as any;
          const q = parseFloat(updated[index].qty as any) || 1;
          updated[index].amount = q * defaultRate;
        }
      }
    }
    if (field === "qty" || field === "rate") {
      const q = parseFloat(updated[index].qty as any) || 0;
      const r = parseFloat(updated[index].rate as any) || 0;
      updated[index].amount = q * r;
    }
    setDailyItems(updated);
  };

  const handleRemoveDailyItem = (index: number) => {
    if (dailyItems.length > 1) {
      setDailyItems(dailyItems.filter((_, i) => i !== index));
    }
  };

  const handleResetForm = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(false);
    setEditingBill(null);
    setIsUpdateSuccess(false);
    const activeB = cementBrands.filter(b => b.isActive);
    setCementItems([{
      id: "c-1",
      brand: activeB[0]?.name || "LNT",
      bags: "",
      rate: activeB[0]?.defaultRate ? String(activeB[0].defaultRate) : "",
      amount: 0
    }]);
    const activeS = rodSizes.filter(s => s.isActive);
    setRodItems([{
      id: "r-1",
      size: activeS[0]?.size || "10mm",
      brand: "",
      kg: "",
      rate: activeS[0]?.defaultRate ? String(activeS[0].defaultRate) : "",
      amount: 0
    }]);
    setDailyItems([{ name: "", brand: "", qty: "" as any, rate: "" as any, amount: 0 }]);
    setLabourCost("");
    setTransportCost("");
    setNotes("");
    setSuccessBill(null);
    router.replace("/sales/new");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer / party name from the dropdown list.");
      return;
    }
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    if (goodsSubtotal <= 0 && currentTotal <= 0) {
      alert("Invoice total must be greater than zero. Please enter valid quantity and rate.");
      return;
    }

    const existingBills = getBills().filter(b => b.bill_category === category);
    const billNumber = generateBillNumber(category, existingBills.length);

    let items: BillItem[] = [];
    let cement_details = undefined;
    let rod_details = undefined;
    let daily_details = undefined;

    if (category === "cement") {
      const validCementItems = cementItems.filter(it => (parseFloat(it.bags) || 0) > 0 || (it.amount || 0) > 0);
      if (validCementItems.length === 0) {
        alert("Please enter quantity and rate for at least one cement item.");
        return;
      }

      for (let idx = 0; idx < validCementItems.length; idx++) {
        const it = validCementItems[idx];
        const bags = parseFloat(it.bags) || 0;
        const rate = parseFloat(it.rate) || 0;
        const amt = bags * rate;
        items.push({
          id: `item-${Date.now()}-${idx + 1}`,
          bill_id: "",
          item_name: `${it.brand} Cement`,
          brand: it.brand,
          item_category: "cement",
          quantity: bags,
          unit: "BAGS",
          unit_price: rate,
          total_amount: amt
        });
      }

      const totalBags = validCementItems.reduce((acc, it) => acc + (parseFloat(it.bags) || 0), 0);
      const totalAmt = validCementItems.reduce((acc, it) => acc + (it.amount || 0), 0);
      const avgRate = totalBags > 0 ? Number((totalAmt / totalBags).toFixed(2)) : 0;

      cement_details = {
        cement_type: validCementItems.length === 1 
          ? validCementItems[0].brand 
          : validCementItems.map(it => `${it.brand} (${it.bags})`).join(", "),
        qty_bags: totalBags,
        unit_rate: avgRate,
        amount: totalAmt,
        legacy_paid_flag: "NO" as const
      };
    } else if (category === "rod") {
      const validRodItems = rodItems.filter(it => (parseFloat(it.kg) || 0) > 0 || (it.amount || 0) > 0);
      if (validRodItems.length === 0) {
        alert("Please enter quantity and rate for at least one rod item.");
        return;
      }

      for (let idx = 0; idx < validRodItems.length; idx++) {
        const it = validRodItems[idx];
        const kg = parseFloat(it.kg) || 0;
        const rate = parseFloat(it.rate) || 0;
        const amt = kg * rate;
        items.push({
          id: `item-${Date.now()}-${idx + 1}`,
          bill_id: "",
          item_name: `TMT Steel Rod ${it.size}`,
          brand: (it.brand || "").trim() || undefined,
          item_category: "rod",
          quantity: kg,
          unit: "KG",
          unit_price: rate,
          total_amount: amt
        });
      }

      const totalKg = validRodItems.reduce((acc, it) => acc + (parseFloat(it.kg) || 0), 0);
      const totalAmt = validRodItems.reduce((acc, it) => acc + (it.amount || 0), 0);
      const avgRate = totalKg > 0 ? Number((totalAmt / totalKg).toFixed(2)) : 0;

      rod_details = {
        rod_size: validRodItems.length === 1 
          ? validRodItems[0].size 
          : validRodItems.map(it => `${it.size} (${it.kg}kg)`).join(", "),
        qty_kg: totalKg,
        rate_per_kg: avgRate,
        amount: totalAmt
      };
    } else {
      const validItems = dailyItems.filter(it => it.name.trim() || it.amount > 0);
      items = validItems.map((it, idx) => ({
        id: `item-${Date.now()}-${idx+1}`,
        bill_id: "",
        item_name: it.name || `${getCategoryConfig(category).shortLabel} Item`,
        brand: (it.brand || "").trim() || undefined,
        item_category: category,
        quantity: parseFloat(it.qty as any) || 1,
        unit: "UNIT",
        unit_price: parseFloat(it.rate as any) || 0,
        total_amount: it.amount
      }));
      daily_details = {
        item_type: category.toUpperCase(),
        amount: dailyTotal
      };
    }

    // Add Labour Charges item if entered
    if (labourVal > 0) {
      items.push({
        id: `item-${Date.now()}-labour`,
        bill_id: "",
        item_name: "Labour Charge",
        item_category: category,
        quantity: 1,
        unit: "SERVICE",
        unit_price: labourVal,
        total_amount: labourVal
      });
    }

    // Add Transport Charges item if entered
    if (transportVal > 0) {
      items.push({
        id: `item-${Date.now()}-transport`,
        bill_id: "",
        item_name: "Transport Charge",
        item_category: category,
        quantity: 1,
        unit: "SERVICE",
        unit_price: transportVal,
        total_amount: transportVal
      });
    }

    if (editingBill) {
      const session = getClientSession();
      const actor = session?.user?.fullName || session?.user?.username || "System User";
      const res = updateBill(
        editingBill.id,
        {
          bill_category: category,
          bill_date: billDate,
          customer_id: cust.id,
          customer_name: cust.name,
          subtotal: goodsSubtotal,
          labour_amount: labourVal,
          transport_amount: transportVal,
          discount_amount: editingBill.discount_amount || 0,
          tax_amount: editingBill.tax_amount || 0,
          total_amount: currentTotal,
          notes: notes.trim(),
          is_imported: editingBill.is_imported ?? false,
          items,
          cement_details,
          rod_details,
          daily_details
        },
        actor
      );
      if (!res.success || !res.bill) {
        alert(res.error || "Failed to update invoice.");
        return;
      }
      setIsUpdateSuccess(true);
      setSuccessBill(res.bill);
      return;
    }

    const created = createBill({
      bill_number: billNumber,
      bill_category: category,
      bill_date: billDate,
      customer_id: cust.id,
      customer_name: cust.name,
      subtotal: goodsSubtotal,
      labour_amount: labourVal,
      transport_amount: transportVal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: currentTotal,
      payment_status: "unpaid",
      status: "posted",
      notes: notes.trim(),
      is_imported: false,
      items,
      cement_details,
      rod_details,
      daily_details
    });

    setIsUpdateSuccess(false);
    setSuccessBill(created);
  };

  return (
    <div className="w-full mx-auto space-y-5 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {editingBill ? `Edit Sales Bill #${editingBill.bill_number}` : "Create New Sales Bill"}
            </h1>
            <p className="text-xs text-slate-500">
              {editingBill
                ? "Modify invoice details — customer ledger and stock will reconcile automatically"
                : "Manual entry for customer invoice posting to financial ledger"}
            </p>
          </div>
        </div>
        {editingBill && !successBill && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
            Editing #{editingBill.bill_number}
          </span>
        )}
      </div>

      {successBill ? (
        <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Bill #{successBill.bill_number} {isUpdateSuccess ? "Updated" : "Created"} Successfully!
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Total amount of {formatCurrency(successBill.total_amount)} has been {isUpdateSuccess ? "reconciled for" : "billed to"} {successBill.customer_name} and updated in their customer ledger.
          </p>
          <div className="max-w-md mx-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2">
            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span>Billed Items ({successBill.items.length})</span>
              <span>Amount</span>
            </div>
            {successBill.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-700">
                <span className="font-medium">
                  {it.item_name}
                  {it.brand ? <span className="text-blue-700 font-semibold"> ({it.brand})</span> : null}{" "}
                  <span className="text-slate-400 font-normal">({it.quantity} {it.unit} @ {formatCurrency(it.unit_price)})</span>
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(it.total_amount)}</span>
              </div>
            ))}
          </div>

          {(successBill.labour_amount || successBill.transport_amount) ? (
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 font-medium pt-1">
              <span>Goods: <strong className="text-slate-800">{formatCurrency(successBill.subtotal)}</strong></span>
              {successBill.labour_amount ? (
                <span>• Labour Charge: <strong className="text-slate-800">+{formatCurrency(successBill.labour_amount)}</strong></span>
              ) : null}
              {successBill.transport_amount ? (
                <span>• Transport Charge: <strong className="text-slate-800">+{formatCurrency(successBill.transport_amount)}</strong></span>
              ) : null}
            </div>
          ) : null}
          <div className="pt-4 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => populateFormForEdit(successBill, getCustomers(), cementBrands, rodSizes)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-bold text-amber-800 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit This Bill</span>
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create Another Bill
            </button>
            <Link
              href="/sales"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              View Sales Register
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Billing Form (Full Width) */}
          <div className="w-full space-y-4">
            {/* Top Bar Card: Customer / Party Name + Quick Pills + Bill Date */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:gap-4 items-start">
                {/* Customer Search + Pill Actions (col-span-8 on md+) */}
                <div className="md:col-span-8 min-w-0 space-y-1.5 relative" ref={dropdownRef}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Customer / Party Name <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectUnknownCustomer}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-[11px] font-bold whitespace-nowrap transition-colors shrink-0"
                      title="Select Walk-in / Cash Counter Retail Party"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Retail (UNKNOWN)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:flex md:items-center md:gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={customerSearch}
                        onFocus={() => setIsDropdownOpen(true)}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setSelectedCustomerId("");
                          setIsDropdownOpen(true);
                        }}
                        placeholder="e.g. Sahu, Shree, Saroj..."
                        className={`w-full pl-9 pr-8 py-2 text-xs rounded-lg border font-semibold bg-white transition-all focus:outline-none focus:ring-2 ${
                          selectedCustomerId
                            ? "border-emerald-400 ring-2 ring-emerald-500/20 text-slate-900"
                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800"
                        }`}
                      />

                      {customerSearch ? (
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                          title="Clear customer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddCustomerModal(customerSearch)}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-[11px] font-bold whitespace-nowrap transition-colors shrink-0"
                      title="Add a new customer with mobile, address & opening balance"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Party</span>
                    </button>
                  </div>

                  {/* Autocomplete Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center justify-between border-b border-slate-200 sticky top-0">
                        <span>Matching Customers ({matchingCustomers.length})</span>
                        <span className="text-[10px] text-slate-400">Click any party to select</span>
                      </div>

                      {customerSearch.trim() && !customers.some(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                        <div className="p-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between gap-2">
                          <span className="text-xs text-blue-900 font-medium truncate">
                            Party not in list: <strong className="font-bold">&quot;{customerSearch.trim().toUpperCase()}&quot;</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCreateNewParty(customerSearch)}
                            className="shrink-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
                          >
                            + Add New Party
                          </button>
                        </div>
                      )}

                      {matchingCustomers.length > 0 ? (
                        matchingCustomers.map((c) => {
                          const isMatchPrefix = customerSearch.trim() && c.name.toLowerCase().startsWith(customerSearch.trim().toLowerCase());
                          return (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => handleSelectCustomer(c)}
                              className={`w-full text-left p-2.5 hover:bg-blue-50/80 transition-colors flex items-center justify-between text-xs ${
                                selectedCustomerId === c.id ? "bg-blue-50 font-bold" : ""
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className={isMatchPrefix ? "text-blue-700 underline underline-offset-2" : ""}>
                                    {c.name}
                                  </span>
                                  {c.is_unidentified && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                                      Retail Cash
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  {c.phone && <span>📞 {c.phone}</span>}
                                  {c.address && <span>• {c.address}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className={`text-[11px] font-semibold ${c.current_balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  Due: {formatCurrency(c.current_balance)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : customerSearch.trim() ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          <p>No customer found matching &quot;<strong>{customerSearch}</strong>&quot;.</p>
                          <button
                            type="button"
                            onClick={() => handleCreateNewParty(customerSearch)}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create &quot;{customerSearch.trim().toUpperCase()}&quot;</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-600">No party accounts yet.</p>
                          <p className="mt-1 text-[11px]">Type customer name to create on the fly, or click &quot;Retail (UNKNOWN)&quot;.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Confirmation Details Card */}
                  {selectedCustomer && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-emerald-950">{selectedCustomer.name}</div>
                          <div className="text-[11px] text-emerald-700">
                            {selectedCustomer.phone || selectedCustomer.code || "Registered Customer"}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-800 text-xs">
                        Ledger Due: {formatCurrency(selectedCustomer.current_balance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bill Date (col-span-4 on md+) */}
                <div className="md:col-span-4 md:min-w-[160px] w-full space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Bill Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">Defaulted to today ({billDate})</p>
                </div>
              </div>
            </div>

            {/* Compact Horizontal Category Pill Tabs */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider px-0.5">
                Select Product Category
              </label>
              <div className="flex overflow-x-auto md:flex-wrap items-center gap-2 pb-1 whitespace-nowrap">
                {BILL_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c.id] || Layers;
                  const isActive = category === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Item Entry Section — Dense Table Layout */}
            {category === "cement" && (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Cement Specifications (Manual Entry)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {cementItems.length} {cementItems.length === 1 ? "Brand" : "Brands"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">
                      {getCategoryConfig("cement").desc} · Press Enter on Rate to add next row
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
                      Bags × Rate = Line Total
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowCementModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                        title="Admin: Edit, Add or Remove Cement Brands"
                      >
                        <Settings2 className="w-3 h-3" />
                        <span>Manage Brands</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isMobile ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs table-fixed min-w-[540px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-[5%] text-center whitespace-nowrap">#</th>
                          <th className="py-2.5 px-3 w-[35%] whitespace-nowrap">Cement Brand <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[20%] text-center whitespace-nowrap">Quantity (Bags) <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[22%] text-right whitespace-nowrap">Unit Rate / Bag (₹) <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[18%] text-right whitespace-nowrap">Item Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cementItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-emerald-50/20">
                            <td className="py-2 px-3 text-center font-bold text-slate-500">{index + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                ref={(el) => { cementFirstRefs.current[index] = el; }}
                                value={item.brand}
                                onChange={(e) => handleCementItemChange(index, "brand", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              >
                                {cementBrands
                                  .filter((b) => b.isActive || b.name === item.brand)
                                  .map((b) => (
                                    <option key={b.id} value={b.name}>
                                      {b.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                placeholder="e.g. 50"
                                value={item.bags}
                                onChange={(e) => handleCementItemChange(index, "bags", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="1"
                                  required
                                  placeholder="e.g. 340"
                                  value={item.rate}
                                  onChange={(e) => handleCementItemChange(index, "rate", e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const nextIdx = cementItems.length;
                                      handleAddCementItem();
                                      setTimeout(() => cementFirstRefs.current[nextIdx]?.focus(), 20);
                                    }
                                  }}
                                  className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-950">
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{formatCurrency(item.amount, false)}</span>
                                {cementItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCementItem(index)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 space-y-2.5">
                    {cementItems.map((item, index) => (
                      <div key={item.id} className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Item #{index + 1}
                          </span>
                          {cementItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCementItem(index)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-md hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Cement Brand <span className="text-rose-500">*</span>
                          </label>
                          <select
                            ref={(el) => { cementFirstRefs.current[index] = el; }}
                            value={item.brand}
                            onChange={(e) => handleCementItemChange(index, "brand", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          >
                            {cementBrands
                              .filter((b) => b.isActive || b.name === item.brand)
                              .map((b) => (
                                <option key={b.id} value={b.name}>
                                  {b.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Qty (Bags) *</label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              placeholder="50"
                              value={item.bags}
                              onChange={(e) => handleCementItemChange(index, "bags", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit Rate (₹) *</label>
                            <input
                              type="number"
                              step="0.5"
                              min="1"
                              required
                              placeholder="340"
                              value={item.rate}
                              onChange={(e) => handleCementItemChange(index, "rate", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const nextIdx = cementItems.length;
                                  handleAddCementItem();
                                  setTimeout(() => cementFirstRefs.current[nextIdx]?.focus(), 20);
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Item Total (₹)</label>
                            <div className="w-full px-2 py-1.5 text-xs rounded-lg border border-emerald-200 bg-white text-right font-mono font-black text-emerald-950 truncate">
                              {formatCurrency(item.amount, false)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 bg-emerald-50/40 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = cementItems.length;
                      handleAddCementItem();
                      setTimeout(() => cementFirstRefs.current[nextIdx]?.focus(), 20);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Item</span>
                  </button>

                  <div className="text-right text-xs text-emerald-950 font-semibold bg-white px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between sm:justify-end gap-3">
                    <span>Total: <strong className="font-black text-emerald-900">{totalCementBags} Bags</strong></span>
                    <span className="text-emerald-300">|</span>
                    <span>Subtotal: <strong className="font-black text-emerald-900">{formatCurrency(cementTotal)}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {category === "rod" && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Rod / Steel Specifications (Manual Entry)
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {rodItems.length} {rodItems.length === 1 ? "Size" : "Sizes"}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700/80 mt-0.5">
                      {getCategoryConfig("rod").desc} · Press Enter on Rate to add next row
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-700 font-medium hidden sm:inline">
                      Kg × Rate/Kg = Line Total
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowRodModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                        title="Admin: Edit, Add or Remove Rod Sizes & Rates"
                      >
                        <Settings2 className="w-3 h-3" />
                        <span>Manage Sizes</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isMobile ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs table-fixed min-w-[600px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-[4%] text-center whitespace-nowrap">#</th>
                          <th className="py-2.5 px-3 w-[16%] whitespace-nowrap">Rod Size <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[24%] whitespace-nowrap">Brand</th>
                          <th className="py-2.5 px-3 w-[18%] text-center whitespace-nowrap">Quantity (Kg) <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[20%] text-right whitespace-nowrap">Rate / Kg (₹) <span className="text-rose-500">*</span></th>
                          <th className="py-2.5 px-3 w-[18%] text-right whitespace-nowrap">Item Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rodItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-amber-50/20">
                            <td className="py-2 px-3 text-center font-bold text-slate-500">{index + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                ref={(el) => { rodFirstRefs.current[index] = el; }}
                                value={item.size}
                                onChange={(e) => handleRodItemChange(index, "size", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              >
                                {rodSizes
                                  .filter((s) => s.isActive || s.size === item.size)
                                  .map((s) => (
                                    <option key={s.id} value={s.size}>
                                      {s.size}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. Tata Tiscon, Jindal"
                                value={item.brand}
                                onChange={(e) => handleRodItemChange(index, "brand", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.001"
                                min="0.1"
                                required
                                placeholder="e.g. 21"
                                value={item.kg}
                                onChange={(e) => handleRodItemChange(index, "kg", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  required
                                  placeholder="e.g. 120"
                                  value={item.rate}
                                  onChange={(e) => handleRodItemChange(index, "rate", e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const nextIdx = rodItems.length;
                                      handleAddRodItem();
                                      setTimeout(() => rodFirstRefs.current[nextIdx]?.focus(), 20);
                                    }
                                  }}
                                  className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-amber-950">
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{formatCurrency(item.amount, false)}</span>
                                {rodItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRodItem(index)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 space-y-2.5">
                    {rodItems.map((item, index) => (
                      <div key={item.id} className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Item #{index + 1}
                          </span>
                          {rodItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRodItem(index)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-md hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Rod Size <span className="text-rose-500">*</span>
                          </label>
                          <select
                            ref={(el) => { rodFirstRefs.current[index] = el; }}
                            value={item.size}
                            onChange={(e) => handleRodItemChange(index, "size", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          >
                            {rodSizes
                              .filter((s) => s.isActive || s.size === item.size)
                              .map((s) => (
                                <option key={s.id} value={s.size}>
                                  {s.size}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Brand</label>
                          <input
                            type="text"
                            placeholder="e.g. Tata Tiscon, Jindal"
                            value={item.brand}
                            onChange={(e) => handleRodItemChange(index, "brand", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Qty (Kg) *</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.1"
                              required
                              placeholder="21"
                              value={item.kg}
                              onChange={(e) => handleRodItemChange(index, "kg", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit Rate (₹) *</label>
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              required
                              placeholder="120"
                              value={item.rate}
                              onChange={(e) => handleRodItemChange(index, "rate", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const nextIdx = rodItems.length;
                                  handleAddRodItem();
                                  setTimeout(() => rodFirstRefs.current[nextIdx]?.focus(), 20);
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Item Total (₹)</label>
                            <div className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-200 bg-white text-right font-mono font-black text-amber-950 truncate">
                              {formatCurrency(item.amount, false)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 bg-amber-50/40 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = rodItems.length;
                      handleAddRodItem();
                      setTimeout(() => rodFirstRefs.current[nextIdx]?.focus(), 20);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Item</span>
                  </button>

                  <div className="text-right text-xs text-amber-950 font-semibold bg-white px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-between sm:justify-end gap-3">
                    <span>Total: <strong className="font-black text-amber-900">{totalRodKg.toFixed(2)} Kg</strong></span>
                    <span className="text-amber-300">|</span>
                    <span>Subtotal: <strong className="font-black text-amber-900">{formatCurrency(rodTotal)}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {category !== "cement" && category !== "rod" && (
              <div className="bg-white rounded-2xl border border-blue-200 shadow-2xs overflow-hidden">
                <datalist id="sales-hardware-catalog">
                  {hardwareItems.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.unit} • ₹{h.defaultRate})
                    </option>
                  ))}
                </datalist>

                <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                        {getCategoryConfig(category).label} Specifications (Manual Entry)
                      </span>
                      <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                        {dailyItems.length} {dailyItems.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700/80 mt-0.5">
                      {getCategoryConfig(category).desc} · Press Enter on Unit Rate to add next row
                    </p>
                  </div>
                  <span className="text-[11px] text-blue-700 font-medium hidden sm:inline">
                    Qty × Rate = Line Total
                  </span>
                </div>

                {!isMobile ? (
                  <div className="w-full text-xs">
                    {/* CSS Grid Header — identical column tracks as body rows */}
                    <div className="grid grid-cols-[20px_minmax(0,3fr)_minmax(72px,1fr)_minmax(66px,0.72fr)_minmax(88px,0.9fr)_minmax(82px,0.9fr)] items-center gap-2 px-3 py-2.5 bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                      <div className="text-center whitespace-nowrap">#</div>
                      <div className="whitespace-nowrap truncate">
                        Product Name / Description <span className="text-rose-500">*</span>
                      </div>
                      <div className="whitespace-nowrap">Brand</div>
                      <div className="text-center whitespace-nowrap">
                        Quantity <span className="text-rose-500">*</span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        Unit Rate (₹) <span className="text-rose-500">*</span>
                      </div>
                      <div className="text-right whitespace-nowrap">Item Total (₹)</div>
                    </div>

                    {/* CSS Grid Body Rows */}
                    <div className="divide-y divide-slate-100">
                      {dailyItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[20px_minmax(0,3fr)_minmax(72px,1fr)_minmax(66px,0.72fr)_minmax(88px,0.9fr)_minmax(82px,0.9fr)] items-center gap-2 px-3 py-2 hover:bg-blue-50/20 transition-colors"
                        >
                          <div className="text-center font-bold text-slate-500 tabular-nums">
                            {idx + 1}
                          </div>

                          <div className="min-w-0">
                            <input
                              ref={(el) => { dailyFirstRefs.current[idx] = el; }}
                              type="text"
                              required
                              list="sales-hardware-catalog"
                              placeholder="Product / Item Description"
                              value={item.name}
                              onChange={(e) => handleDailyItemChange(idx, "name", e.target.value)}
                              className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>

                          <div className="min-w-0">
                            <input
                              type="text"
                              placeholder="Brand"
                              value={item.brand || ""}
                              onChange={(e) => handleDailyItemChange(idx, "brand", e.target.value)}
                              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>

                          <div className="min-w-0">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              placeholder="Qty"
                              value={item.qty}
                              onChange={(e) => handleDailyItemChange(idx, "qty", e.target.value)}
                              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>

                          <div className="min-w-0 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              required
                              placeholder="0.00"
                              value={item.rate}
                              onChange={(e) => handleDailyItemChange(idx, "rate", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const nextIdx = dailyItems.length;
                                  handleAddDailyItem();
                                  setTimeout(() => dailyFirstRefs.current[nextIdx]?.focus(), 20);
                                }
                              }}
                              className="w-full h-9 pl-5 pr-2 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>

                          <div className="min-w-0 flex items-center justify-end gap-1 font-mono font-black text-blue-950 tabular-nums">
                            <span className="truncate">{formatCurrency(item.amount, false)}</span>
                            {dailyItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDailyItem(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-2.5">
                    {dailyItems.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-blue-200/80 bg-blue-50/20 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                            Item #{idx + 1}
                          </span>
                          {dailyItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDailyItem(idx)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-md hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        {/* Row 1: Product Name full-width */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Product Name / Description <span className="text-rose-500">*</span>
                          </label>
                          <input
                            ref={(el) => { dailyFirstRefs.current[idx] = el; }}
                            type="text"
                            required
                            list="sales-hardware-catalog"
                            placeholder="e.g. Anchor 16A Switch / 2.5mm Wire"
                            value={item.name}
                            onChange={(e) => handleDailyItemChange(idx, "name", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                          />
                        </div>
                        {/* Row 2: Brand full-width */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Brand</label>
                          <input
                            type="text"
                            placeholder="e.g. Havells"
                            value={item.brand || ""}
                            onChange={(e) => handleDailyItemChange(idx, "brand", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
                          />
                        </div>
                        {/* Row 3: Qty, Unit Rate, and Item Total in 3-col grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Qty *</label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              placeholder="5"
                              value={item.qty}
                              onChange={(e) => handleDailyItemChange(idx, "qty", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit Rate (₹) *</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              required
                              placeholder="250"
                              value={item.rate}
                              onChange={(e) => handleDailyItemChange(idx, "rate", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const nextIdx = dailyItems.length;
                                  handleAddDailyItem();
                                  setTimeout(() => dailyFirstRefs.current[nextIdx]?.focus(), 20);
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Item Total (₹)</label>
                            <div className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-white text-right font-mono font-black text-blue-950 truncate">
                              {formatCurrency(item.amount, false)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-3 py-2.5 bg-blue-50/40 border-t border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = dailyItems.length;
                      handleAddDailyItem();
                      setTimeout(() => dailyFirstRefs.current[nextIdx]?.focus(), 20);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Item</span>
                  </button>

                  <div className="text-right text-xs text-blue-950 font-semibold bg-white px-3 py-1.5 rounded-lg border border-blue-200 flex items-center justify-between sm:justify-end gap-3">
                    <span>Total: <strong className="font-black text-blue-900">{totalDailyQty} {totalDailyQty === 1 ? "Unit" : "Units"}</strong></span>
                    <span className="text-blue-300">|</span>
                    <span>Subtotal: <strong className="font-black text-blue-900">{formatCurrency(dailyTotal)}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bill Summary Card (Full Width below Item Entry) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Bill Summary
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryConfig(category).badgeClass}`}>
                  {getCategoryConfig(category).shortLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Items Subtotal:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {formatCurrency(goodsSubtotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              {/* Labour & Transport Charges (Left Half on lg+) */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Labour Charge (₹)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0.00"
                      value={labourCost}
                      onChange={(e) => setLabourCost(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Transport Charge (₹)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0.00"
                      value={transportCost}
                      onChange={(e) => setTransportCost(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Total Invoice Value & Save Actions (Right Half on lg+) */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-slate-50/80 border border-slate-200 p-3.5 sm:p-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Invoice Value
                  </div>
                  <div className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                    {formatCurrency(currentTotal)}
                  </div>
                  {(labourVal > 0 || transportVal > 0) && (
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2">
                      {labourVal > 0 && <span>+Labour: {formatCurrency(labourVal)}</span>}
                      {transportVal > 0 && <span>+Transport: {formatCurrency(transportVal)}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  {!selectedCustomerId && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold">
                      ⚠️ Select customer to enable posting
                    </div>
                  )}
                  {selectedCustomerId && goodsSubtotal <= 0 && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium">
                      Enter quantity &amp; unit rate to calculate total
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Link
                      href="/sales"
                      className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={!selectedCustomerId || currentTotal <= 0 || goodsSubtotal <= 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingBill ? "Update & Save Invoice" : "Post Bill & Save"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Fixed Bottom Action Bar (< 768px) */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Invoice Value
              </div>
              <div className="text-lg font-black text-blue-700 font-mono leading-tight truncate">
                {formatCurrency(currentTotal)}
              </div>
            </div>
            <button
              type="submit"
              disabled={!selectedCustomerId || currentTotal <= 0 || goodsSubtotal <= 0}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{editingBill ? "Update & Save" : "Post Bill & Save"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Add Customer Modal Popup */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Add New Customer / Party
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter mobile, address & opening balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-3.5 text-xs">
              {/* Customer Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer / Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. MANOJ BEHERA"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold uppercase text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile / Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="+91 94370 00000"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  For WhatsApp bills and payment reminders
                </span>
              </div>

              {/* Address / Location */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address / Site Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    placeholder="e.g. Chikiti Pentho / Bhubaneswar"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Opening Balance */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opening Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={newCustomerOpeningBalance}
                    onChange={(e) => setNewCustomerOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Existing outstanding due before this bill (leave 0 if fresh account)
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Select Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Master Catalog Modals */}
      <CementBrandManagerModal
        isOpen={showCementModal}
        onClose={() => setShowCementModal(false)}
        onBrandCreated={(b) => {
          setCementItems((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            const rate = b.defaultRate ? String(b.defaultRate) : last.rate;
            const bags = parseFloat(last.bags) || 0;
            const r = parseFloat(rate) || 0;
            updated[updated.length - 1] = {
              ...last,
              brand: b.name,
              rate,
              amount: bags * r,
            };
            return updated;
          });
        }}
      />
      <RodSizeManagerModal
        isOpen={showRodModal}
        onClose={() => setShowRodModal(false)}
        onSizeCreated={(s) => {
          setRodItems((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            const rate = s.defaultRate ? String(s.defaultRate) : last.rate;
            const kg = parseFloat(last.kg) || 0;
            const r = parseFloat(rate) || 0;
            updated[updated.length - 1] = {
              ...last,
              size: s.size,
              rate,
              amount: kg * r,
            };
            return updated;
          });
        }}
      />
    </div>
  );
}
