import {
    canAccessAdminInventory,
    canAccessMemberInventory,
} from "../../lib/inventory/validation";

function runTest(testName: string, fn: () => void) {
    try {
        fn();
        console.log(`  [PASS] ${testName}`);
    } catch (err) {
        console.error(`  [FAIL] ${testName}:`, (err as Error).message);
        throw err;
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

export function runInventoryRbacTests() {
    console.log("-> Running RBAC & Access Guard Tests");

    // 1. Unauthenticated visitors cannot access /inventory or /admin/inventory
    runTest("test_unauthenticated_user_denied_access", () => {
        const isLoggedIn = false;
        const roleSlug = null;

        const canAccessCatalog = canAccessMemberInventory(isLoggedIn);
        const canAccessAdmin = canAccessAdminInventory(roleSlug);

        assert(
            !canAccessCatalog,
            "Unauthenticated visitor must not be granted access to /inventory",
        );
        assert(
            !canAccessAdmin,
            "Unauthenticated visitor must not be granted access to /admin/inventory",
        );
    });

    // 2. Member role can access /inventory but gets 404/Denied on /admin/inventory
    runTest("test_member_role_can_access_catalog_only", () => {
        const isLoggedIn = true;
        const memberRoleSlug = "member";

        const canAccessCatalog = canAccessMemberInventory(isLoggedIn);
        const canAccessAdmin = canAccessAdminInventory(memberRoleSlug);

        assert(
            canAccessCatalog,
            "Member role must have access to /inventory catalog",
        );
        assert(
            !canAccessAdmin,
            "Member role must be denied access to /admin/inventory",
        );
    });

    // 3. User with slug panel-1 can access /admin/inventory
    runTest("test_panel_role_can_access_admin_inventory", () => {
        const panelRole1 = "panel-1";
        const panelRole2 = "recruitment-panel";

        assert(
            canAccessAdminInventory(panelRole1),
            "User with slug 'panel-1' must have access to /admin/inventory",
        );
        assert(
            canAccessAdminInventory(panelRole2),
            "User with slug 'recruitment-panel' must have access to /admin/inventory",
        );
    });

    // 4. User with admin role can access both /inventory and /admin/inventory
    runTest("test_admin_role_can_access_both_views", () => {
        const isLoggedIn = true;
        const adminRole = "admin";

        const canAccessCatalog = canAccessMemberInventory(isLoggedIn);
        const canAccessAdmin = canAccessAdminInventory(adminRole);

        assert(canAccessCatalog, "Admin role must have access to /inventory");
        assert(
            canAccessAdmin,
            "Admin role must have access to /admin/inventory",
        );
    });
}

if (typeof require !== "undefined" && require.main === module) {
    runInventoryRbacTests();
}
