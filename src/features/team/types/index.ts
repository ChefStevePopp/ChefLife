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
  kitchen_role?: string;
  kitchen_stations?: string[];
  is_active?: boolean;
}

export interface TeamStore {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  fetchTeamMembers: () => Promise<void>;
  createTeamMember: (member: Omit<TeamMember, "id">) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  importTeamMembers: (csvData: any[]) => Promise<{
    newMembers: any[];
    duplicateCount: number;
    notInCSV: TeamMember[];
    needsConfirmation: boolean;
  }>;
  executeTeamImport: (newMembers: any[], handleMissingAction: 'keep' | 'inactive' | 'delete', missingMemberIds: string[]) => Promise<number>;
}
