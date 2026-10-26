# Current Progress: Inventory Management System

**Branch:** `feature/Inventory`  
**Base Target:** Phase 1 and Phase 2 Backend Implementation Complete with Full Test Suite (17/17 tests passing); Phases 3–5 Ready for UI Implementation.

---

## 1. What Has Been Completed (Backend & Core)

### Phase 1: Database Schema & Migrations

- Migration file: `supabase/migrations/20261025000000_create_inventory_system.sql`
    - Table: `public.inventory_items`
        - Standardized categories: `'Controllers'`, `'Motors & Actuators'`, `'Sensors'`, `'Power & Batteries'`, `'Wires & Cables'`, `'Equipment & Tools'`, `'Mechanical & Hardware'`, `'Electronic Components'`, `'General'`.
        - Columns: `id`, `name`, `description`, `category`, `total_quantity`, `available_quantity`, `condition`, `price_equivalent`, `handling_instructions`, `max_borrow_days`, `max_quantity_per_request`, `image_url`, timestamps.
        - Constraints: Valid quantity checks, positive pricing, max borrow days validation.
    - Table: `public.inventory_requests`
        - Columns: `id`, `item_id`, `profile_id`, `quantity`, `item_condition_snapshot`, `start_date`, `expected_return_date`, `actual_return_date`, `status`, `liability_consent_agreed`, `consent_signature_text`, `rejection_reason`, `reviewer_profile_id`, timestamps.
        - Foreign keys: Cascade to `inventory_items` and `profiles`.
    - Stored Procedures / RPCs:
        - `public.approve_inventory_request(p_request_id, p_reviewer_profile_id)`: Atomic transaction with `FOR UPDATE` lock, checks stock, decrements `available_quantity`, sets status to `approved`.
        - `public.mark_inventory_returned(p_request_id, p_returned_condition)`: Atomic transaction, increments `available_quantity`, updates condition and actual return date.
        - `public.cancel_inventory_request(p_request_id)`: Atomic cancellation of pending requests by owner or panel/admin.
    - Row Level Security (RLS):
        - Enabled on both tables.
        - Authenticated users can view catalog and create requests for their own profile.
        - Users can cancel their own pending requests.
        - `is_admin_or_panel()` strictly required for inventory mutations, request approvals, and updates.

### Phase 2: Data Access Layer & TypeScript Contracts

- Types: `src/types/inventory.ts` & re-exported in `src/types/index.ts`
    - Defines `INVENTORY_CATEGORIES`, `ItemCategory`, `InventoryItem`, `InventoryRequest`, `InventoryItemInput`, `BorrowRequestInput`, `FetchInventoryOptions`, `ItemCondition`, `RequestStatus`, `InventoryRpcResponse`.
- Actions: `src/lib/supabase/actions/inventory.actions.ts` & `src/lib/supabase/actions/inventory.ts`
    - Items CRUD: `fetchInventoryItems` (supports category filtering, in-stock toggle, case-insensitive text search across name, description, category), `fetchInventoryItemById`, `createInventoryItem` (with category and bounds validation), `updateInventoryItem`, `deleteInventoryItem`.
    - Media: `uploadInventoryImage` (uploads component assets to Supabase storage `media/inventory`).
    - Requests: `submitBorrowRequest` (with input validation), `fetchUserBorrowRequests`, `fetchAllBorrowRequests`, `approveBorrowRequest`, `rejectBorrowRequest`, `markItemReturned`, `cancelBorrowRequest`.

### Validation, State Engine & Comprehensive Test Suite

- Validation Library: `src/lib/inventory/validation.ts`
    - `validateBorrowRequest`: Quantity bounds, per-item limits, stock availability, duration caps, date validations, liability consent checks, condition snapshot verification.
    - `validateConsentSnapshot`: Condition match verification.
    - `calculateLiabilityAmount`: Financial liability computation.
    - `canAccessAdminInventory` & `canAccessMemberInventory`: Role slug permissions.
- State Machine Simulator: `src/lib/inventory/state.ts`
    - Pure state transition functions simulating RPCs (`simulateApproveRequest`, `simulateMarkReturned`, `simulateRejectRequest`, `simulateCancelRequest`).
- Test Suite (4 files under `src/__tests__/inventory/`):
    1. `catalog-validation.test.ts`:
        - `test_borrow_quantity_capped_by_item_limit`
        - `test_borrow_quantity_capped_by_available_stock`
        - `test_zero_available_stock_blocks_request`
        - `test_return_date_exceeding_max_borrow_days_rejected`
        - `test_return_date_in_past_rejected`
    2. `liability-consent.test.ts`:
        - `test_consent_requires_explicit_checkbox`
        - `test_consent_requires_signature_text`
        - `test_consent_snapshot_matches_item_condition`
        - `test_price_equivalent_liability_calculation`
    3. `inventory-state.test.ts`:
        - `test_approve_request_decrements_available_stock`
        - `test_approve_fails_if_stock_depleted`
        - `test_mark_returned_increments_available_stock`
        - `test_reject_request_does_not_mutate_stock`
    4. `inventory-rbac.test.ts`:
        - `test_unauthenticated_user_denied_access`
        - `test_member_role_can_access_catalog_only`
        - `test_panel_role_can_access_admin_inventory`
        - `test_admin_role_can_access_both_views`
- Test Runner: `yarn test:inventory` executes all 4 suites (17/17 tests passing).

---

## 2. What Remains To Be Done (Phases 3–5 Frontend)

Refer to `task.md` for UI implementation specs:

1. **Phase 3: Member Portal UI**
    - Create catalog view with search and category filters.
    - Create item modal displaying specs, condition, price equivalent, and handling guidelines.
    - Create borrow request dialog with capped date-picker (`react-day-picker`) and digital liability signature.
    - Create member's loan history tracker.
    - Adhere strictly to the existing website theme (Tailwind tokens, Radix UI, Lucide icons, Sonner toasts).
2. **Phase 4: Admin/Panel Manager**
    - Sub-window 1: Borrow requests queue (pending, approved, returned, rejected) with approval/disapproval and return condition inspection.
    - Sub-window 2: Inventory CRUD editor (name, stock, condition, price equivalent, max days, per-member limit).
3. **Phase 5: Navigation & Route Registration**
    - Register routes in `src/lib/roles.ts` (`/inventory`, `/admin/inventory`).
    - Add navigation links in `Header.tsx` based on user roles.
