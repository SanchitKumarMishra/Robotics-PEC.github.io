import {
    validateBorrowRequest,
    validateConsentSnapshot,
    calculateLiabilityAmount,
} from "../../lib/inventory/validation";
import type { InventoryItem } from "../../types/inventory";

const mockItem: InventoryItem = {
    id: "item-consent-test",
    name: "LiPo Battery 3S 2200mAh",
    description: "11.1V high discharge rate battery",
    category: "Power & Batteries",
    total_quantity: 6,
    available_quantity: 4,
    condition: "Good",
    price_equivalent: 1650,
    handling_instructions:
        "Never discharge below 3.0V per cell. Store at storage voltage.",
    max_borrow_days: 7,
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

export function runLiabilityConsentTests() {
    console.log("-> Running Liability & Consent Tests");

    // 1. Explicit checkbox required
    runTest("test_consent_requires_explicit_checkbox", () => {
        const today = new Date();
        const returnDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        const result = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: false, // Checkbox unchecked
            signature: "Sanchit Mishra",
        });
        assert(
            !result.valid,
            "Expected validation to fail when liabilityAgreed is false",
        );
        assert(
            result.error?.includes("explicitly agree") === true,
            `Expected error to mention explicit agreement, got: ${result.error}`,
        );
    });

    // 2. Digital signature text required
    runTest("test_consent_requires_signature_text", () => {
        const today = new Date();
        const returnDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Empty string
        const resultEmpty = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "",
        });
        assert(
            !resultEmpty.valid,
            "Expected validation to fail when signature is empty string",
        );

        // Whitespace only
        const resultWhitespace = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "    ",
        });
        assert(
            !resultWhitespace.valid,
            "Expected validation to fail when signature is whitespace only",
        );

        // Valid signature passes
        const resultValid = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "21103099",
        });
        assert(
            resultValid.valid,
            `Expected valid signature to pass, got error: ${resultValid.error}`,
        );
    });

    // 3. Item condition snapshot matches item condition
    runTest("test_consent_snapshot_matches_item_condition", () => {
        // Matching condition should pass
        const validMatch = validateConsentSnapshot(mockItem.condition, "Good");
        assert(
            validMatch.valid,
            "Expected identical condition snapshot to pass",
        );

        // Case-insensitive match should pass
        const caseMatch = validateConsentSnapshot(mockItem.condition, "good");
        assert(
            caseMatch.valid,
            "Expected case-insensitive condition snapshot to pass",
        );

        // Stale or conflicting condition snapshot should fail
        const mismatch = validateConsentSnapshot(
            mockItem.condition,
            "Damaged/Maintenance",
        );
        assert(
            !mismatch.valid,
            "Expected mismatched condition snapshot to fail",
        );
        assert(
            mismatch.error?.includes("does not match") === true,
            `Expected mismatch error, got: ${mismatch.error}`,
        );

        // Integrated check through validateBorrowRequest
        const today = new Date();
        const returnDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        const reqMismatch = validateBorrowRequest(mockItem, {
            quantity: 1,
            startDate: today,
            expectedReturnDate: returnDate,
            liabilityAgreed: true,
            signature: "Sanchit Mishra",
            itemConditionSnapshot: "Fair", // Mismatched from "Good"
        });
        assert(
            !reqMismatch.valid,
            "Expected validateBorrowRequest to fail on mismatched condition snapshot",
        );
    });

    // 4. Price equivalent liability calculation
    runTest("test_price_equivalent_liability_calculation", () => {
        // 1 unit: 1650 * 1 = 1650
        const amount1 = calculateLiabilityAmount(mockItem.price_equivalent, 1);
        assert(
            amount1 === 1650,
            `Expected liability 1650 for 1 unit, got ${amount1}`,
        );

        // 2 units: 1650 * 2 = 3300
        const amount2 = calculateLiabilityAmount(mockItem.price_equivalent, 2);
        assert(
            amount2 === 3300,
            `Expected liability 3300 for 2 units, got ${amount2}`,
        );

        // 0 units edge case
        const amountZero = calculateLiabilityAmount(
            mockItem.price_equivalent,
            0,
        );
        assert(
            amountZero === 0,
            `Expected liability 0 for 0 units, got ${amountZero}`,
        );

        // Float rounding: 199.99 * 3 = 599.97
        const floatCalc = calculateLiabilityAmount(199.99, 3);
        assert(
            floatCalc === 599.97,
            `Expected liability 599.97, got ${floatCalc}`,
        );
    });
}

if (typeof require !== "undefined" && require.main === module) {
    runLiabilityConsentTests();
}
