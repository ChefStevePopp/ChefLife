// ============================================================================
// INVENTORY COUNT SESSIONS
// ============================================================================
// Types for the inventory session system - groups counts into logical events
// with workflow control for review/approval.
// ============================================================================

export type SessionType = 
  | 'full_physical'    // Sunday night full inventory (requires review)
  | 'station_prep'     // Line cook station check (no review needed)
  | 'receiving'        // Delivery verification (links to invoice)
  | 'spot_check'       // Variance investigation
  | 'cycle_count';     // Rotating partial inventory

export type SessionStatus = 
  | 'in_progress'      // Still counting
  | 'pending_review'   // Submitted, awaiting approval
  | 'approved'         // Approved by reviewer
  | 'rejected'         // Sent back for recount
  | 'cancelled';       // Abandoned

export type CountType = 
  | 'physical'         // Standard physical count
  | 'prep'             // Prepared item count
  | 'receiving'        // Delivery/receiving count
  | 'spot_check'       // Variance investigation
  | 'adjustment';      // Manager adjustment (with reason)

export type CountStatus = 
  | 'pending'          // Awaiting review
  | 'verified'         // Verified by counter
  | 'approved'         // Approved by reviewer
  | 'flagged'          // Flagged for investigation
  | 'adjusted'         // Adjusted by reviewer
  | 'completed';       // Completed (no review needed)

// ============================================================================
// DATABASE TYPES (match Supabase schema)
// ============================================================================

export interface InventoryCountSessionDB {
  id: string;
  organization_id: string;
  session_type: SessionType;
  name: string | null;
  description: string | null;
  scope_categories: string[] | null;
  scope_locations: string[] | null;
  scope_vendor: string | null;
  scope_invoice_id: string | null;
  started_at: string;
  started_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  requires_review: boolean;
  status: SessionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  total_items_counted: number;
  total_value: number;
  total_variance_value: number;
  items_with_variance: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedInventoryCountDB {
  id: string;
  organization_id: string;
  master_ingredient_id: string;
  session_id: string | null;
  count_type: CountType;
  count_date: string;
  quantity: number;
  expected_quantity: number | null;
  previous_quantity: number | null;
  unit_cost: number;
  total_value: number;
  location: string | null;
  counted_by: string | null;
  created_by_name: string | null;
  notes: string | null;
  status: CountStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  adjustment_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VIEW TYPES (match Supabase views)
// ============================================================================

export interface PendingReviewSession {
  session_id: string;
  organization_id: string;
  session_type: SessionType;
  session_name: string | null;
  started_at: string;
  completed_at: string | null;
  started_by_name: string | null;
  status: SessionStatus;
  total_counts: number;
  total_value: number;
  items_with_variance: number;
  variance_value: number;
  variance_percent: number;
}

export interface CountForReview {
  count_id: string;
  session_id: string;
  organization_id: string;
  master_ingredient_id: string;
  product: string;
  item_code: string | null;
  major_group: string | null;
  category: string | null;
  sub_category: string | null;
  storage_area: string | null;
  unit_of_measure: string | null;
  previous_quantity: number | null;
  current_count: number;
  expected_quantity: number | null;
  variance: number;
  variance_percent: number;
  unit_cost: number;
  total_value: number;
  status: CountStatus;
  count_date: string;
  counted_by: string | null;
  counted_by_name: string | null;
  notes: string | null;
}

export interface CurrentOnHand {
  organization_id: string;
  master_ingredient_id: string;
  on_hand_quantity: number;
  last_unit_cost: number;
  total_value: number;
  last_counted: string;
  location: string | null;
  status: CountStatus;
}

// ============================================================================
// APP TYPES (transformed for UI)
// ============================================================================

export interface InventorySession {
  id: string;
  organizationId: string;
  sessionType: SessionType;
  name: string | null;
  description: string | null;
  scopeCategories: string[] | null;
  scopeLocations: string[] | null;
  scopeVendor: string | null;
  scopeInvoiceId: string | null;
  startedAt: string;
  startedBy: string | null;
  startedByName?: string;
  completedAt: string | null;
  completedBy: string | null;
  requiresReview: boolean;
  status: SessionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  totalItemsCounted: number;
  totalValue: number;
  totalVarianceValue: number;
  itemsWithVariance: number;
  variancePercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCount {
  id: string;
  sessionId: string;
  masterIngredientId: string;
  product: string;
  itemCode: string | null;
  majorGroup: string | null;
  category: string | null;
  subCategory: string | null;
  storageArea: string | null;
  unitOfMeasure: string | null;
  previousCount: number | null;
  currentCount: number;
  expectedCount: number | null;
  variance: number;
  variancePercent: number;
  unitCost: number;
  totalValue: number;
  status: CountStatus;
  countDate: string;
  countedBy: string | null;
  countedByName: string | null;
  notes: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  full_physical: 'Full Physical Inventory',
  station_prep: 'Station Prep Count',
  receiving: 'Receiving Count',
  spot_check: 'Spot Check',
  cycle_count: 'Cycle Count',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const COUNT_STATUS_LABELS: Record<CountStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  approved: 'Approved',
  flagged: 'Flagged',
  adjusted: 'Adjusted',
  completed: 'Completed',
};

export const SESSION_TYPE_CONFIG: Record<SessionType, { 
  requiresReview: boolean; 
  color: string; 
  icon: string;
  description: string;
}> = {
  full_physical: { 
    requiresReview: true, 
    color: 'amber',
    icon: 'Package',
    description: 'Complete inventory count requiring management approval',
  },
  station_prep: { 
    requiresReview: false, 
    color: 'green',
    icon: 'ChefHat',
    description: 'Quick station count for prep planning',
  },
  receiving: { 
    requiresReview: false, 
    color: 'blue',
    icon: 'Truck',
    description: 'Verify delivery quantities against invoice',
  },
  spot_check: { 
    requiresReview: true, 
    color: 'rose',
    icon: 'Search',
    description: 'Targeted count to investigate variance',
  },
  cycle_count: { 
    requiresReview: true, 
    color: 'purple',
    icon: 'RefreshCw',
    description: 'Scheduled partial inventory rotation',
  },
};
