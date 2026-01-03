import type { SecurityLevel } from "@/config/security";

export interface Certification {
  id: string;
  name: string;
  issued_date?: string | null;
  expiry_date?: string | null;
  certificate_number?: string | null;
  issuing_body?: string | null;
  status?: 'valid' | 'expiring_soon' | 'expired';
}

export interface TeamMember {
  id: string;
  created_at?: string;
  updated_at?: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  email: string | null;
  phone?: string;
  punch_id?: string;
  avatar_url?: string;
  roles?: string[];
  departments?: string[];
  locations?: string[];
  notification_preferences?: Record<string, any>;
  kitchen_role?: string;        // Human-friendly label (display only)
  kitchen_stations?: string[];
  is_active?: boolean;
  
  // Security
  security_level?: SecurityLevel;  // The actual permission gatekeeper
  
  // Certifications
  certifications?: Certification[];
  
  // Import tracking
  import_source?: 'manual' | 'csv' | '7shifts' | null;
  import_file_url?: string | null;
  imported_at?: string | null;
}

export interface ImportSummary {
  newMembers: any[];
  existingToUpdate: { id: string; data: any }[];
  updateCount: number;
  notInCSV: TeamMember[];
  needsConfirmation: boolean;
}

export interface TeamStore {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  fetchTeamMembers: () => Promise<void>;
  createTeamMember: (member: Omit<TeamMember, "id">) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  importTeamMembers: (csvData: any[]) => Promise<ImportSummary>;
  executeTeamImport: (
    newMembers: any[], 
    handleMissingAction: 'keep' | 'inactive' | 'delete', 
    missingMemberIds: string[],
    file?: File,
    existingToUpdate?: { id: string; data: any }[]
  ) => Promise<number>;
}
