import type { InventoryItem, InventoryRequest } from "../../types/inventory";

export interface StateTransitionResult {
    updatedItem: InventoryItem;
    updatedRequest: InventoryRequest;
}

/**
 * Simulates atomic approve_inventory_request database function
 */
export function simulateApproveRequest(
    item: InventoryItem,
    request: InventoryRequest,
    reviewerProfileId: string,
): StateTransitionResult {
    if (request.status !== "pending") {
        throw new Error(
            `Only pending requests can be approved. Current status: ${request.status}`,
        );
    }

    if (item.available_quantity < request.quantity) {
        throw new Error(
            `Insufficient stock. Available: ${item.available_quantity}, Requested: ${request.quantity}`,
        );
    }

    const updatedItem: InventoryItem = {
        ...item,
        available_quantity: item.available_quantity - request.quantity,
        updated_at: new Date().toISOString(),
    };

    const updatedRequest: InventoryRequest = {
        ...request,
        status: "approved",
        reviewer_profile_id: reviewerProfileId,
        updated_at: new Date().toISOString(),
    };

    return { updatedItem, updatedRequest };
}

/**
 * Simulates atomic mark_inventory_returned database function
 */
export function simulateMarkReturned(
    item: InventoryItem,
    request: InventoryRequest,
    returnedCondition?: string,
): StateTransitionResult {
    if (request.status !== "approved") {
        throw new Error(
            `Only approved/active loans can be marked as returned. Current status: ${request.status}`,
        );
    }

    const newAvailable = Math.min(
        item.total_quantity,
        item.available_quantity + request.quantity,
    );

    const updatedItem: InventoryItem = {
        ...item,
        available_quantity: newAvailable,
        condition: (returnedCondition as any) ?? item.condition,
        updated_at: new Date().toISOString(),
    };

    const updatedRequest: InventoryRequest = {
        ...request,
        status: "returned",
        actual_return_date: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
    };

    return { updatedItem, updatedRequest };
}

/**
 * Simulates rejecting a borrow request
 */
export function simulateRejectRequest(
    item: InventoryItem,
    request: InventoryRequest,
    reviewerProfileId: string,
    reason?: string,
): StateTransitionResult {
    if (request.status !== "pending") {
        throw new Error(
            `Only pending requests can be rejected. Current status: ${request.status}`,
        );
    }

    // Rejection leaves stock unchanged
    const updatedItem: InventoryItem = { ...item };

    const updatedRequest: InventoryRequest = {
        ...request,
        status: "rejected",
        reviewer_profile_id: reviewerProfileId,
        rejection_reason: reason ?? null,
        updated_at: new Date().toISOString(),
    };

    return { updatedItem, updatedRequest };
}

/**
 * Simulates member self-cancellation of pending request
 */
export function simulateCancelRequest(
    request: InventoryRequest,
): InventoryRequest {
    if (request.status !== "pending") {
        throw new Error(
            `Only pending requests can be cancelled. Current status: ${request.status}`,
        );
    }

    return {
        ...request,
        status: "cancelled",
        updated_at: new Date().toISOString(),
    };
}
