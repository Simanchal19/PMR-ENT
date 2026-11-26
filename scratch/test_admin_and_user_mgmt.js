/**
 * Automated Verification Suite for Admin Role Capabilities & User Management
 * 
 * Verifies:
 * 1. Default Enterprise Users initialization.
 * 2. Creating a new Enterprise Login (e.g. new manager / auditor).
 * 3. Logging in with newly created Enterprise user.
 * 4. Editing User details (full name, email, allowed usernames).
 * 5. Resetting / Updating user password.
 * 6. Toggling user active status (deactivating and activating).
 * 7. Preventing deletion/deactivation of protected superuser.
 * 8. Deleting a custom user login.
 * 9. Admin role authorization for Customer Payment Allocation.
 * 10. Admin role authorization for Payment Allocation Reversal.
 * 11. Customer profile updates via updateCustomer (name, phone, address, opening balance).
 * 12. Supplier profile updates via updateSupplier (name, category, opening balance, current balance).
 * 13. Audit logs generated for all admin actions.
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
  signInWithPortal,
  signOutUser,
} = jiti("./src/lib/auth.ts");

const {
  getEnterpriseUsers,
  createEnterpriseUser,
  updateEnterpriseUser,
  updateUserPassword,
  toggleUserStatus,
  deleteEnterpriseUser,
  getCustomers,
  saveCustomers,
  updateCustomer,
  getSuppliers,
  saveSuppliers,
  updateSupplier,
  allocatePaymentToBills,
  reversePaymentAllocation,
  getAuditLogs,
} = jiti("./src/lib/storage.ts");

async function runAdminAndUserMgmtTests() {
  console.log("=== STARTING ADMIN & USER MANAGEMENT VERIFICATION SUITE ===\n");
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

  // 1. Initial Users Check
  const initialUsers = getEnterpriseUsers();
  assert(Array.isArray(initialUsers) && initialUsers.length === 3, "Default 3 enterprise users loaded");
  assert(initialUsers.some(u => u.role === "admin"), "Admin user exists in initial list");
  assert(initialUsers.some(u => u.role === "owner"), "Owner user exists in initial list");
  assert(initialUsers.some(u => u.role === "manager"), "Manager user exists in initial list");

  // 2. Create New User
  const newStaffRes = createEnterpriseUser({
    username: "depot_manager",
    fullName: "Ramesh Jena",
    email: "ramesh@pramodmaharaj.in",
    role: "manager",
    password: "Password@123",
  }, "System Administrator (Admin)");
  assert(newStaffRes.success === true, "New manager account successfully created");
  assert(newStaffRes.user.username === "depot_manager", "New user has correct username");

  // 3. Login with newly created user
  const newLoginRes = await signInWithPortal({
    emailOrUsername: "depot_manager",
    password: "Password@123",
    portalRole: "manager",
  });
  assert(newLoginRes.success === true, "New manager can log into manager portal");
  assert(newLoginRes.user.fullName === "Ramesh Jena", "Logged in session matches new user details");

  // 4. Update user profile
  const updateRes = updateEnterpriseUser(newStaffRes.user.id, {
    fullName: "Ramesh Kumar Jena",
    phone: "9876543210",
  }, "System Administrator (Admin)");
  assert(updateRes.success === true, "User details updated successfully");
  assert(updateRes.user.fullName === "Ramesh Kumar Jena", "User full name reflects update");

  // 5. Update password
  const pwdRes = updateUserPassword(newStaffRes.user.id, "NewSecurePass@2026", "System Administrator (Admin)");
  assert(pwdRes.success === true, "Password reset succeeded");

  // Verify login with old password fails
  const oldLoginRes = await signInWithPortal({
    emailOrUsername: "depot_manager",
    password: "Password@123",
    portalRole: "manager",
  });
  assert(oldLoginRes.success === false, "Old password rejected after reset");

  // Verify login with new password succeeds
  const newPwdLoginRes = await signInWithPortal({
    emailOrUsername: "depot_manager",
    password: "NewSecurePass@2026",
    portalRole: "manager",
  });
  assert(newPwdLoginRes.success === true, "Login succeeds with new password");

  // 6. Toggle status (deactivate user)
  const toggleOff = toggleUserStatus(newStaffRes.user.id, false, "System Administrator (Admin)");
  assert(toggleOff.success === true, "User deactivated successfully");
  const postToggleUsers = getEnterpriseUsers();
  const deactivatedUser = postToggleUsers.find(u => u.id === newStaffRes.user.id);
  assert(deactivatedUser && deactivatedUser.isActive === false, "User isActive is now false");

  // Attempt login with disabled account
  const disabledLoginRes = await signInWithPortal({
    emailOrUsername: "depot_manager",
    password: "NewSecurePass@2026",
    portalRole: "manager",
  });
  assert(disabledLoginRes.success === false, "Disabled user is blocked from logging in");

  // Toggle status back (activate user)
  const toggleOn = toggleUserStatus(newStaffRes.user.id, true, "System Administrator (Admin)");
  assert(toggleOn.success === true, "User re-activated successfully");
  const reactivatedUser = getEnterpriseUsers().find(u => u.id === newStaffRes.user.id);
  assert(reactivatedUser && reactivatedUser.isActive === true, "User isActive is now true");

  // 7. Protect primary admin
  const adminUser = initialUsers.find(u => u.role === "admin");
  const delAdminRes = deleteEnterpriseUser(adminUser.id, "System Administrator (Admin)");
  assert(delAdminRes.success === false, "Primary Administrator account cannot be deleted");

  // 8. Delete created user
  const delNewUserRes = deleteEnterpriseUser(newStaffRes.user.id, "System Administrator (Admin)");
  assert(delNewUserRes.success === true, "Custom manager account deleted successfully");
  const postDelUsers = getEnterpriseUsers();
  assert(!postDelUsers.some(u => u.id === newStaffRes.user.id), "Deleted user no longer in users list");

  // 9. Admin role authorized in Customer Payment Allocation
  // Setup mock customer and payment
  const mockCust = {
    id: "cust-test-01",
    name: "PRADEEP NAYAK",
    code: "CUST-9901",
    phone: "9123456780",
    address: "Bhubaneswar",
    is_unidentified: false,
    is_active: true,
    opening_balance: 5000,
    current_balance: 5000,
    total_bills_amount: 0,
    total_paid_amount: 0,
    created_at: new Date().toISOString()
  };
  saveCustomers([mockCust]);

  // Test updateCustomer
  const custEditRes = updateCustomer("cust-test-01", {
    name: "PRADEEP KUMAR NAYAK",
    phone: "9123456789",
    opening_balance: 7500,
  }, "System Administrator (Admin)");
  assert(custEditRes.success === true, "updateCustomer succeeded");
  assert(custEditRes.customer.name === "PRADEEP KUMAR NAYAK", "Customer name updated");
  assert(custEditRes.customer.opening_balance === 7500, "Customer opening balance updated");
  assert(custEditRes.customer.current_balance === 7500, "Customer current balance adjusted by diff (+2500)");

  // 10. Supplier profile updates via updateSupplier
  const mockSupplier = {
    id: "sup-test-01",
    code: "SUP-9901",
    name: "ODISHA TMT STEEL STOCKIST",
    supply_category: "rod",
    is_active: true,
    opening_balance: 20000,
    current_balance: 20000,
    total_purchases_amount: 0,
    total_paid_amount: 0,
  };
  saveSuppliers([mockSupplier]);

  const supEditRes = updateSupplier("sup-test-01", {
    name: "ODISHA TMT STEEL & REBAR STOCKIST",
    gstin: "21ABCDE1234F1Z5",
    opening_balance: 35000,
    category: "rod",
  }, "System Administrator (Admin)");
  assert(supEditRes.success === true, "updateSupplier succeeded");
  assert(supEditRes.supplier.name === "ODISHA TMT STEEL & REBAR STOCKIST", "Supplier name updated");
  assert(supEditRes.supplier.opening_balance === 35000, "Supplier opening balance updated");
  assert(supEditRes.supplier.current_balance === 35000, "Supplier current balance adjusted by diff (+15000)");

  // 11. Allocation & Reversal checks with admin role
  // allocatePaymentToBills with admin role
  const allocRes = allocatePaymentToBills(
    "pay-fake-id",
    [{ billId: "bill-fake-id", amount: 1000 }],
    "admin", // role
    "Admin User"
  );
  // It will fail because payment doesn't exist, but NOT with unauthorized role error
  assert(allocRes.error !== "Unauthorized. Only Manager or Owner can manage allocations.", 
    "Admin role is NOT blocked by role check in allocatePaymentToBills");

  const revRes = reversePaymentAllocation(
    "alloc-fake-id",
    "Customer correction",
    "admin", // role
    "Admin User"
  );
  assert(revRes.error !== "Unauthorized. Only Manager or Owner can reverse allocations.",
    "Admin role is NOT blocked by role check in reversePaymentAllocation");

  // 12. Audit Logs Check
  const auditLogs = getAuditLogs();
  assert(auditLogs.some(l => l.action === "CREATE_USER"), "CREATE_USER audit log recorded");
  assert(auditLogs.some(l => l.action === "UPDATE_USER"), "UPDATE_USER audit log recorded");
  assert(auditLogs.some(l => l.action === "RESET_USER_PASSWORD"), "RESET_USER_PASSWORD audit log recorded");
  assert(auditLogs.some(l => l.action === "UPDATE_CUSTOMER"), "UPDATE_CUSTOMER audit log recorded");
  assert(auditLogs.some(l => l.action === "UPDATE_SUPPLIER"), "UPDATE_SUPPLIER audit log recorded");

  console.log(`\n=== ALL ${passed}/${total} ADMIN & USER MANAGEMENT TESTS PASSED! ===`);
}

runAdminAndUserMgmtTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
