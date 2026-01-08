/**
 * Health Inspection Types
 * 
 * Aligned with existing Supabase schema:
 * - health_inspections (with JSONB action_items, documents)
 * - health_certificates
 * - health_inspection_notifications
 */

// ============================================================================
// ENUMS
// ============================================================================

export type InspectionResult = 'passed' | 'failed' | 'conditional' | 'pending';
export type ActionItemPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationSeverity = 'critical' | 'major' | 'minor';
export type NotificationType = 'action_item' | 'deadline' | 'visit' | 'certificate';

export const INSPECTION_RESULTS: { value: InspectionResult; label: string; color: string }[] = [
  { value: 'passed', label: 'Passed', color: 'green' },
  { value: 'conditional', label: 'Conditional Pass', color: 'amber' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'pending', label: 'Pending Review', color: 'gray' },
];

export const ACTION_ITEM_PRIORITIES: { value: ActionItemPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'red' },
  { value: 'high', label: 'High', color: 'amber' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'low', label: 'Low', color: 'gray' },
];

// ============================================================================
// JSONB TYPES (stored in health_inspections table)
// ============================================================================

export interface InspectionActionItem {
  id: string;
  description: string;
  priority: ActionItemPriority;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  resolution_notes?: string;
}

export interface InspectionDocument {
  id: string;
  name: string;
  url: string;
  type: 'report' | 'photo' | 'other';
  uploaded_at: string;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface HealthInspection {
  id: string;
  organization_id: string;
  
  // Dates & Times (using existing column names)
  visit_date: string;      // DATE as ISO string
  start_time?: string;     // TIME as HH:MM
  end_time?: string;
  
  // Inspector Info
  inspector_name?: string;
  inspector_title?: string;
  inspector_organization?: string;
  inspector_phone?: string;
  inspector_email?: string;
  
  // Results
  result: InspectionResult;
  score?: number;
  grade?: string;
  
  // Documentation
  notes?: string;
  report_url?: string;
  documents: InspectionDocument[];
  action_items: InspectionActionItem[];
  
  // Next Inspection
  next_inspection_due?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface HealthCertificate {
  id: string;
  organization_id: string;
  
  // Certificate Details
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  
  // Issuing Authority
  issuing_authority?: string;
  jurisdiction?: string;
  
  // Document
  image_url?: string;
  file_path?: string;
  
  // Status
  is_current: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface HealthInspectionNotification {
  id: string;
  organization_id: string;
  inspection_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  deadline?: string;
  read_by: string[]; // Array of user IDs
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface InspectionFormData {
  visit_date: string;
  start_time?: string;
  end_time?: string;
  inspector_name?: string;
  inspector_title?: string;
  inspector_organization?: string;
  inspector_phone?: string;
  inspector_email?: string;
  result: InspectionResult;
  score?: number;
  grade?: string;
  notes?: string;
  next_inspection_due?: string;
  action_items: Omit<InspectionActionItem, 'completed_at'>[];
}

export interface CertificateFormData {
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  jurisdiction?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getResultColor = (result: InspectionResult): string => {
  const found = INSPECTION_RESULTS.find(r => r.value === result);
  return found?.color || 'gray';
};

export const getPriorityColor = (priority: ActionItemPriority): string => {
  const found = ACTION_ITEM_PRIORITIES.find(p => p.value === priority);
  return found?.color || 'gray';
};

export const isExpiringSoon = (expiryDate?: string | null, daysThreshold = 30): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    // Check for invalid date
    if (isNaN(expiry.getTime())) return false;
    
    const today = new Date();
    const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays >= 0;
  } catch {
    return false;
  }
};

export const isExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    // Check for invalid date
    if (isNaN(expiry.getTime())) return false;
    
    return expiry < new Date();
  } catch {
    return false;
  }
};

export const getOpenActionItemCount = (inspection?: HealthInspection | null): number => {
  if (!inspection?.action_items) return 0;
  if (!Array.isArray(inspection.action_items)) return 0;
  return inspection.action_items.filter(item => item && !item.completed).length;
};

/** Generate a unique ID for JSONB items */
export const generateItemId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/** Safely format a date string, returns fallback on invalid date */
export const safeFormatDate = (
  dateString?: string | null, 
  options?: Intl.DateTimeFormatOptions,
  fallback = 'N/A'
): string => {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    // Check for invalid date
    if (isNaN(date.getTime())) return fallback;
    
    return date.toLocaleDateString('en-US', options || {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return fallback;
  }
};

/** Safely format a time string */
export const safeFormatTime = (timeString?: string | null): string => {
  if (!timeString) return '';
  // Time strings from DB are already in HH:MM format
  return timeString;
};
