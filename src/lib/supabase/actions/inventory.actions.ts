import { client } from "../supabase";
import { base64ToBlob } from "../../utils";
import type {
    InventoryItem,
    InventoryItemInput,
    InventoryRequest,
    BorrowRequestInput,
    FetchInventoryOptions,
    InventoryRpcResponse,
} from "../../../types/inventory";

/* ----------------------------------------------------------------- Items CRUD */

export async function fetchInventoryItems(
    options?: FetchInventoryOptions,
): Promise<InventoryItem[]> {
    let query = client.from("inventory_items").select("*");

    if (options?.category && options.category !== "All") {
        query = query.eq("category", options.category);
    }

    if (options?.inStockOnly) {
        query = query.gt("available_quantity", 0);
    }

    if (options?.search && options.search.trim() !== "") {
        const term = options.search.trim();
        query = query.or(
            `name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`,
        );
    }

    query = query.order("name", { ascending: true });

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data as InventoryItem[]) ?? [];
}

export async function fetchInventoryItemById(
    id: string,
): Promise<InventoryItem | null> {
    const { data, error } = await client
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryItem;
}

export async function createInventoryItem(
    item: InventoryItemInput,
): Promise<InventoryItem> {
    if (!item.name || item.name.trim() === "") {
        throw new Error("Item name is required.");
    }
    if (!item.category || item.category.trim() === "") {
        throw new Error("Category is required.");
    }
    if (item.total_quantity === undefined || item.total_quantity < 0) {
        throw new Error("Total quantity must be greater than or equal to 0.");
    }
    if (item.available_quantity === undefined || item.available_quantity < 0) {
        throw new Error(
            "Available quantity must be greater than or equal to 0.",
        );
    }
    if (item.available_quantity > item.total_quantity) {
        throw new Error("Available quantity cannot exceed total quantity.");
    }
    if (item.price_equivalent === undefined || item.price_equivalent < 0) {
        throw new Error("Price equivalent must be non-negative.");
    }
    if (item.max_borrow_days !== undefined && item.max_borrow_days <= 0) {
        throw new Error("Max borrow days must be greater than 0.");
    }
    if (
        item.max_quantity_per_request !== undefined &&
        item.max_quantity_per_request <= 0
    ) {
        throw new Error("Max quantity per request must be greater than 0.");
    }

    const { data, error } = await client
        .from("inventory_items")
        .insert([
            {
                ...item,
                name: item.name.trim(),
                category: item.category.trim(),
            },
        ])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryItem;
}

export async function updateInventoryItem(
    id: string,
    item: Partial<InventoryItemInput>,
): Promise<InventoryItem> {
    if (item.name !== undefined && item.name.trim() === "") {
        throw new Error("Item name cannot be empty.");
    }
    if (item.category !== undefined && item.category.trim() === "") {
        throw new Error("Category cannot be empty.");
    }
    if (item.total_quantity !== undefined && item.total_quantity < 0) {
        throw new Error("Total quantity must be non-negative.");
    }
    if (item.available_quantity !== undefined && item.available_quantity < 0) {
        throw new Error("Available quantity must be non-negative.");
    }
    if (item.price_equivalent !== undefined && item.price_equivalent < 0) {
        throw new Error("Price equivalent must be non-negative.");
    }

    const payload: Record<string, unknown> = {
        ...item,
        updated_at: new Date().toISOString(),
    };

    if (item.name) payload.name = item.name.trim();
    if (item.category) payload.category = item.category.trim();

    const { data, error } = await client
        .from("inventory_items")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryItem;
}

export async function deleteInventoryItem(id: string): Promise<void> {
    const { error } = await client
        .from("inventory_items")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }
}

export async function uploadInventoryImage(
    fileName: string,
    base64Data: string,
): Promise<string> {
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const finalName = `${timestamp}_${cleanName}`;
    const folder = "inventory";
    const extension = cleanName.split(".").pop() || "png";
    const contentType = `image/${extension}`;
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const blob = base64ToBlob(base64String, contentType);
    const filePath = `${folder}/${finalName}`;

    const { error } = await client.storage
        .from("media")
        .upload(filePath, blob, { contentType, upsert: true });

    if (error) {
        throw new Error(`Failed to upload inventory image: ${error.message}`);
    }

    const { data: publicUrlData } = client.storage
        .from("media")
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

/* ----------------------------------------------------------------- Borrow Requests */

export async function submitBorrowRequest(
    input: BorrowRequestInput,
): Promise<InventoryRequest> {
    if (!input.liability_consent_agreed) {
        throw new Error("You must agree to the liability consent agreement.");
    }
    if (
        !input.consent_signature_text ||
        input.consent_signature_text.trim() === ""
    ) {
        throw new Error("Digital signature is required.");
    }
    if (input.consent_signature_text.trim().length < 3) {
        throw new Error(
            "A valid digital signature (full name or SID) is required.",
        );
    }
    if (!input.quantity || input.quantity <= 0) {
        throw new Error("Quantity must be at least 1.");
    }
    if (
        !input.item_condition_snapshot ||
        input.item_condition_snapshot.trim() === ""
    ) {
        throw new Error("Item condition snapshot is required.");
    }
    if (!input.expected_return_date) {
        throw new Error("Expected return date is required.");
    }

    const startDate =
        input.start_date ?? new Date().toISOString().split("T")[0];
    if (new Date(input.expected_return_date) < new Date(startDate)) {
        throw new Error(
            "Expected return date cannot be earlier than start date.",
        );
    }

    const { data, error } = await client
        .from("inventory_requests")
        .insert([
            {
                item_id: input.item_id,
                profile_id: input.profile_id,
                quantity: input.quantity,
                item_condition_snapshot: input.item_condition_snapshot.trim(),
                start_date: startDate,
                expected_return_date: input.expected_return_date,
                liability_consent_agreed: input.liability_consent_agreed,
                consent_signature_text: input.consent_signature_text.trim(),
                status: "pending",
            },
        ])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryRequest;
}

export async function fetchUserBorrowRequests(
    profileId: string,
): Promise<InventoryRequest[]> {
    const { data, error } = await client
        .from("inventory_requests")
        .select("*, item:inventory_items(*)")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return (data as InventoryRequest[]) ?? [];
}

export async function fetchAllBorrowRequests(
    status?: string,
): Promise<InventoryRequest[]> {
    let query = client
        .from("inventory_requests")
        .select("*, item:inventory_items(*), profile:profiles(*)")
        .order("created_at", { ascending: false });

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data as InventoryRequest[]) ?? [];
}

export async function approveBorrowRequest(
    requestId: string,
    reviewerProfileId: string,
): Promise<InventoryRpcResponse> {
    const { data, error } = await client.rpc("approve_inventory_request", {
        p_request_id: requestId,
        p_reviewer_profile_id: reviewerProfileId,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryRpcResponse;
}

export async function rejectBorrowRequest(
    requestId: string,
    reviewerProfileId: string,
    rejectionReason?: string,
): Promise<void> {
    const { error } = await client
        .from("inventory_requests")
        .update({
            status: "rejected",
            reviewer_profile_id: reviewerProfileId,
            rejection_reason: rejectionReason ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function markItemReturned(
    requestId: string,
    returnedCondition?: string,
): Promise<InventoryRpcResponse> {
    const { data, error } = await client.rpc("mark_inventory_returned", {
        p_request_id: requestId,
        p_returned_condition: returnedCondition ?? null,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data as InventoryRpcResponse;
}

export async function cancelBorrowRequest(
    requestId: string,
): Promise<InventoryRpcResponse> {
    // Attempt atomic RPC first
    const { data, error } = await client.rpc("cancel_inventory_request", {
        p_request_id: requestId,
    });

    if (!error && data) {
        return data as InventoryRpcResponse;
    }

    // Fallback to direct table update if RPC is unavailable or returns an error
    const { error: updateError } = await client
        .from("inventory_requests")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending");

    if (updateError) {
        throw new Error(error?.message || updateError.message);
    }

    return {
        success: true,
        request_id: requestId,
        status: "cancelled",
    };
}
