import {
    simulateApproveRequest,
    simulateMarkReturned,
    simulateRejectRequest,
} from "../../lib/inventory/state";
import type { InventoryItem, InventoryRequest } from "../../types/inventory";

const baseItem: InventoryItem = {
    id: "item-motor-1",
    name: "NEMA 17 Stepper Motor",
    description: "High torque bipolar stepper motor",
    category: "Motors & Actuators",
    total_quantity: 5,
    available_quantity: 5,
    condition: "Good",
    price_equivalent: 850,
    handling_instructions: "Avoid exceeding rated current of 1.5A per phase.",
    max_borrow_days: 7,
    max_quantity_per_request: 2,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

const baseRequest: InventoryRequest = {
    id: "req-001",
    item_id: baseItem.id,
    profile_id: "profile-member-1",
    quantity: 2,
    item_condition_snapshot: "Good",
    start_date: new Date().toISOString().split("T")[0],
    expected_return_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    actual_return_date: null,
    status: "pending",
    liability_consent_agreed: true,
    consent_signature_text: "Sanchit Mishra",
    rejection_reason: null,
    reviewer_profile_id: null,
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

export function runInventoryStateTests() {
    console.log("-> Running State Transition & RPC Tests");

    // 1. Approving request of 2 units reduces available stock from 5 to 3
    runTest("test_approve_request_decrements_available_stock", () => {
        const item = { ...baseItem, available_quantity: 5 };
        const request = {
            ...baseRequest,
            quantity: 2,
            status: "pending" as const,
        };
        const reviewerId = "admin-profile-uuid";

        const { updatedItem, updatedRequest } = simulateApproveRequest(
            item,
            request,
            reviewerId,
        );

        assert(
            updatedItem.available_quantity === 3,
            `Expected available quantity to decrease from 5 to 3, got: ${updatedItem.available_quantity}`,
        );
        assert(
            updatedRequest.status === "approved",
            `Expected request status to become 'approved', got: ${updatedRequest.status}`,
        );
        assert(
            updatedRequest.reviewer_profile_id === reviewerId,
            `Expected reviewer_profile_id to be set to ${reviewerId}`,
        );
    });

    // 2. Approving request when available < requested quantity fails with error
    runTest("test_approve_fails_if_stock_depleted", () => {
        const depletedItem: InventoryItem = {
            ...baseItem,
            available_quantity: 1, // Only 1 available, but 2 requested
        };
        const request = {
            ...baseRequest,
            quantity: 2,
            status: "pending" as const,
        };
        const reviewerId = "admin-profile-uuid";

        let errorCaught = false;
        try {
            simulateApproveRequest(depletedItem, request, reviewerId);
        } catch (err) {
            errorCaught = true;
            assert(
                (err as Error).message.includes("Insufficient stock"),
                `Expected 'Insufficient stock' error, got: ${(err as Error).message}`,
            );
        }

        assert(
            errorCaught,
            "Expected simulateApproveRequest to throw an error when stock is depleted",
        );
    });

    // 3. Marking returned increases available stock from 3 back to 5
    runTest("test_mark_returned_increments_available_stock", () => {
        const borrowedItem: InventoryItem = {
            ...baseItem,
            total_quantity: 5,
            available_quantity: 3, // Currently 3 available
        };
        const approvedRequest: InventoryRequest = {
            ...baseRequest,
            quantity: 2,
            status: "approved",
        };

        const { updatedItem, updatedRequest } = simulateMarkReturned(
            borrowedItem,
            approvedRequest,
            "Good",
        );

        assert(
            updatedItem.available_quantity === 5,
            `Expected available stock to return from 3 back to 5, got: ${updatedItem.available_quantity}`,
        );
        assert(
            updatedRequest.status === "returned",
            `Expected request status to become 'returned', got: ${updatedRequest.status}`,
        );
        assert(
            updatedRequest.actual_return_date !== null,
            "Expected actual_return_date to be recorded upon return",
        );
    });

    // 4. Rejecting leaves available stock unchanged
    runTest("test_reject_request_does_not_mutate_stock", () => {
        const item: InventoryItem = {
            ...baseItem,
            available_quantity: 4,
        };
        const request: InventoryRequest = {
            ...baseRequest,
            quantity: 2,
            status: "pending",
        };
        const reviewerId = "admin-profile-uuid";
        const reason = "Equipment reserved for upcoming workshop competition.";

        const { updatedItem, updatedRequest } = simulateRejectRequest(
            item,
            request,
            reviewerId,
            reason,
        );

        assert(
            updatedItem.available_quantity === 4,
            `Expected available quantity to remain 4, got: ${updatedItem.available_quantity}`,
        );
        assert(
            updatedRequest.status === "rejected",
            `Expected request status to become 'rejected', got: ${updatedRequest.status}`,
        );
        assert(
            updatedRequest.reviewer_profile_id === reviewerId,
            `Expected reviewer_profile_id to be set to ${reviewerId}`,
        );
        assert(
            updatedRequest.rejection_reason === reason,
            `Expected rejection reason to match, got: ${updatedRequest.rejection_reason}`,
        );
    });
}

if (typeof require !== "undefined" && require.main === module) {
    runInventoryStateTests();
}
