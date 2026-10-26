export const INVENTORY_CATEGORIES = [
    "Controllers",
    "Motors & Actuators",
    "Sensors",
    "Power & Batteries",
    "Wires & Cables",
    "Equipment & Tools",
    "Mechanical & Hardware",
    "Electronic Components",
    "General",
] as const;

export type ItemCategory =
    (typeof INVENTORY_CATEGORIES)[number] | (string & {});

export type ItemCondition =
    "Brand New" | "Good" | "Fair" | "Damaged/Maintenance";

export type RequestStatus =
    "pending" | "approved" | "rejected" | "returned" | "cancelled";

export interface InventoryItem {
    id: string;
    name: string;
    description: string | null;
    category: ItemCategory;
    total_quantity: number;
    available_quantity: number;
    condition: ItemCondition;
    price_equivalent: number;
    handling_instructions: string | null;
    max_borrow_days: number;
    max_quantity_per_request: number;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export type InventoryItemInput = Omit<
    InventoryItem,
    "id" | "created_at" | "updated_at"
>;

export interface FetchInventoryOptions {
    category?: string;
    search?: string;
    inStockOnly?: boolean;
}

export interface InventoryRequest {
    id: string;
    item_id: string;
    profile_id: string;
    quantity: number;
    item_condition_snapshot: string;
    start_date: string;
    expected_return_date: string;
    actual_return_date: string | null;
    status: RequestStatus;
    liability_consent_agreed: boolean;
    consent_signature_text: string;
    rejection_reason: string | null;
    reviewer_profile_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    item?: InventoryItem;
    profile?: {
        id: string;
        email: string | null;
        fullName: string | null;
        avatarUrl: string | null;
    };
}

export interface BorrowRequestInput {
    item_id: string;
    profile_id: string;
    quantity: number;
    item_condition_snapshot: string;
    start_date?: string;
    expected_return_date: string;
    liability_consent_agreed: boolean;
    consent_signature_text: string;
}

export interface InventoryRpcResponse {
    success: boolean;
    request_id: string;
    item_id?: string;
    remaining_available?: number;
    status?: string;
}
