import { validateBorrowRequest } from "../../lib/inventory/validation";
import type { InventoryItem } from "../../types/inventory";

const mockItem: InventoryItem = {
    id: "item-test-1",
    name: "Raspberry Pi 4 Model B",
    description: "4GB RAM single board computer",
    category: "Controllers",
    total_quantity: 10,
    available_quantity: 4,
    condition: "Good",
    price_equivalent: 4500,
    handling_instructions: "Use with 5V 3A official power supply",
    max_borrow_days: 5,
    max_quantity_per_request: 2,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

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

export function runCatalogValidationTests() {
    console.log("-> Running Catalog & Validation Logic Tests");

    // 1. Quantity capped by item per-request limit
    runTest("test_borrow_quantity_capped_by_item_limit", () => {
        const today = new Date();
        const returnDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        const result = validateBorrowRequest(mockItem, {
            quantity: 3, // exceeds max_quantity_per_request = 2
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when quantity exceeds max_quantity_per_request",
        );
        assert(
            result.error?.includes("exceeds per-member limit") === true,
            `Expected error message to mention per-member limit, got: ${result.error}`,
        );
    });

    // 2. Quantity capped by available stock
    runTest("test_borrow_quantity_capped_by_available_stock", () => {
        const lowStockItem: InventoryItem = {
            ...mockItem,
            available_quantity: 1,
            max_quantity_per_request: 5,
        };
        const today = new Date();
        const returnDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        const result = validateBorrowRequest(lowStockItem, {
            quantity: 2, // exceeds available_quantity = 1
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when quantity exceeds available stock",
        );
        assert(
            result.error?.includes("exceeds available stock") === true,
            `Expected error message to mention available stock, got: ${result.error}`,
        );
    });

    // 3. Zero available stock blocks request
    runTest("test_zero_available_stock_blocks_request", () => {
        const outOfStockItem: InventoryItem = {
            ...mockItem,
            available_quantity: 0,
        };
        const today = new Date();
        const returnDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        const result = validateBorrowRequest(outOfStockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when available_quantity is 0",
        );
        assert(
            result.error === "Item is currently out of stock.",
            `Expected 'Item is currently out of stock.', got: ${result.error}`,
        );
    });

    // 4. Return date exceeding max_borrow_days rejected (max_borrow_days = 5, day 6 selected)
    runTest("test_return_date_exceeding_max_borrow_days_rejected", () => {
        const today = new Date();
        const returnDateDay6 = new Date(
            today.getTime() + 6 * 24 * 60 * 60 * 1000,
        ); // 6 days > 5 max_borrow_days
        const result = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDateDay6,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when duration exceeds max_borrow_days",
        );
        assert(
            result.error?.includes("exceeds maximum allowed duration") === true,
            `Expected error to mention maximum allowed duration, got: ${result.error}`,
        );
    });

    // 5. Return date in past rejected
    runTest("test_return_date_in_past_rejected", () => {
        const today = new Date();
        const pastDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
        const result = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: pastDate,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when return date is before start date",
        );
        assert(
            result.error?.includes("cannot be earlier than start date") ===
                true,
            `Expected error to mention date ordering, got: ${result.error}`,
        );
    });
}

if (typeof require !== "undefined" && require.main === module) {
    runCatalogValidationTests();
}
