/**
 * ChefLife Security Protocol System
 * 
 * Inspired by military protocol levels (NATO phonetic alphabet).
 * The culinary world has deep military roots - Escoffier's brigade system
 * was modeled after the French army. We continue that tradition.
 * 
 * Lower number = Higher access
 * 
 * Protocol Omega  → System (Dev/IT)
 * Protocol Alpha  → Owner (Account Holder)
 * Protocol Bravo  → Manager (Full Operations)
 * Protocol Charlie → Assistant Manager (Ops + Limited Admin)
 * Protocol Delta  → Supervisor (Daily Oversight)
 * Protocol Echo   → Team Member (Self-Service)
 */

export type SecurityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const SECURITY_LEVELS = {
  OMEGA: 0,    // System - Dev/IT
  ALPHA: 1,    // Owner - Account holder
  BRAVO: 2,    // Manager - Full operations
  CHARLIE: 3,  // Assistant Manager - Ops + limited admin
  DELTA: 4,    // Supervisor - Daily oversight
  ECHO: 5,     // Team Member - Self-service
} as const;

export interface SecurityLevelConfig {
  level: SecurityLevel;
  protocol: string;      // "Protocol Alpha", "Protocol Bravo", etc.
  name: string;          // "Owner", "Manager", etc.
  description: string;
  color: string;
  // What this level can do
  capabilities: {
    // Team management
    canViewTeam: boolean;
    canEditTeamMembers: boolean;
    canEditPermissions: boolean;
    canDeactivateMembers: boolean;
    canDeleteMembers: boolean;
    // Imported data
    canEditImportedData: boolean;
    // Self-service
    canEditOwnProfile: boolean;
    canEditOwnAvatar: boolean;
    canEditOwnNotifications: boolean;
    // Operations
    canManageSchedules: boolean;
    canManageRecipes: boolean;
    canManageInventory: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
}

export const SECURITY_CONFIG: Record<SecurityLevel, SecurityLevelConfig> = {
  [SECURITY_LEVELS.OMEGA]: {
    level: 0,
    protocol: 'Protocol Omega',
    name: 'System',
    description: 'Full system access - development & IT',
    color: 'gray',
    capabilities: {
      canViewTeam: true,
      canEditTeamMembers: true,
      canEditPermissions: true,
      canDeactivateMembers: true,
      canDeleteMembers: true,
      canEditImportedData: true,
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: true,
      canManageRecipes: true,
      canManageInventory: true,
      canViewReports: true,
      canManageSettings: true,
    },
  },
  [SECURITY_LEVELS.ALPHA]: {
    level: 1,
    protocol: 'Protocol Alpha',
    name: 'Owner',
    description: 'Account holder - full business access',
    color: 'amber',
    capabilities: {
      canViewTeam: true,
      canEditTeamMembers: true,
      canEditPermissions: true,
      canDeactivateMembers: true,
      canDeleteMembers: true,
      canEditImportedData: true,
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: true,
      canManageRecipes: true,
      canManageInventory: true,
      canViewReports: true,
      canManageSettings: true,
    },
  },
  [SECURITY_LEVELS.BRAVO]: {
    level: 2,
    protocol: 'Protocol Bravo',
    name: 'Manager',
    description: 'Full operational access',
    color: 'rose',
    capabilities: {
      canViewTeam: true,
      canEditTeamMembers: true,
      canEditPermissions: true,
      canDeactivateMembers: true,
      canDeleteMembers: false, // Can't permanently delete
      canEditImportedData: true,
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: true,
      canManageRecipes: true,
      canManageInventory: true,
      canViewReports: true,
      canManageSettings: false, // Org settings are owner-only
    },
  },
  [SECURITY_LEVELS.CHARLIE]: {
    level: 3,
    protocol: 'Protocol Charlie',
    name: 'Assistant Manager',
    description: 'Operations & limited team management',
    color: 'purple',
    capabilities: {
      canViewTeam: true,
      canEditTeamMembers: true,
      canEditPermissions: false, // Can't change security levels
      canDeactivateMembers: false,
      canDeleteMembers: false,
      canEditImportedData: false, // Can't override CSV data
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: true,
      canManageRecipes: true,
      canManageInventory: true,
      canViewReports: true,
      canManageSettings: false,
    },
  },
  [SECURITY_LEVELS.DELTA]: {
    level: 4,
    protocol: 'Protocol Delta',
    name: 'Supervisor',
    description: 'Daily operations oversight',
    color: 'green',
    capabilities: {
      canViewTeam: true,
      canEditTeamMembers: false, // View only
      canEditPermissions: false,
      canDeactivateMembers: false,
      canDeleteMembers: false,
      canEditImportedData: false,
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: true,
      canManageRecipes: false, // View only
      canManageInventory: true,
      canViewReports: true,
      canManageSettings: false,
    },
  },
  [SECURITY_LEVELS.ECHO]: {
    level: 5,
    protocol: 'Protocol Echo',
    name: 'Team Member',
    description: 'Self-service access',
    color: 'primary',
    capabilities: {
      canViewTeam: true, // Can see who's working
      canEditTeamMembers: false,
      canEditPermissions: false,
      canDeactivateMembers: false,
      canDeleteMembers: false,
      canEditImportedData: false,
      canEditOwnProfile: true,
      canEditOwnAvatar: true,
      canEditOwnNotifications: true,
      canManageSchedules: false, // View own shifts only
      canManageRecipes: false, // View only
      canManageInventory: false,
      canViewReports: false,
      canManageSettings: false,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a security level has a specific capability
 */
export function hasCapability(
  level: SecurityLevel,
  capability: keyof SecurityLevelConfig['capabilities']
): boolean {
  return SECURITY_CONFIG[level]?.capabilities[capability] ?? false;
}

/**
 * Check if user can perform action on another user
 * Rule: Can only manage users at same level or below
 */
export function canManageUser(
  actorLevel: SecurityLevel,
  targetLevel: SecurityLevel
): boolean {
  // Can't manage anyone at a higher level
  if (targetLevel < actorLevel) return false;
  
  // Omega (0) can manage everyone
  // Alpha (1) can manage 1, 2, 3, 4, 5
  // etc.
  return actorLevel <= targetLevel;
}

/**
 * Check if user can change another user's security level
 * 
 * @param actorLevel - The security level of the user making the change
 * @param targetCurrentLevel - The current level of the user being changed
 * @param targetNewLevel - The new level being assigned
 * @param alphaCount - Total number of Alpha users in the organization
 */
export function canChangeSecurityLevel(
  actorLevel: SecurityLevel,
  targetCurrentLevel: SecurityLevel,
  targetNewLevel: SecurityLevel,
  alphaCount: number = 1
): boolean {
  // Must have permission to edit permissions
  if (!hasCapability(actorLevel, 'canEditPermissions')) return false;
  
  // Can't promote someone above your own level
  if (targetNewLevel < actorLevel) return false;
  
  // Can't demote someone who's above your level
  if (targetCurrentLevel < actorLevel) return false;
  
  // Omega (0) can never be demoted by anyone
  if (targetCurrentLevel === SECURITY_LEVELS.OMEGA) return false;
  
  // Alpha (Owner) protection rules:
  // - If there's only 1 Alpha, they cannot be demoted (organizational continuity)
  // - If there are 2+ Alphas, any can be demoted (failsafe for mistakes)
  if (targetCurrentLevel === SECURITY_LEVELS.ALPHA && targetNewLevel > SECURITY_LEVELS.ALPHA) {
    // Trying to demote an Alpha
    if (alphaCount <= 1) {
      // Only 1 Alpha - protected, cannot demote
      return false;
    }
    // 2+ Alphas - can demote (but actor must be Omega or Alpha)
    if (actorLevel > SECURITY_LEVELS.ALPHA) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a specific Alpha user can be demoted
 * Convenience function for UI
 */
export function isAlphaProtected(alphaCount: number): boolean {
  return alphaCount <= 1;
}

/**
 * Get the default security level for a new team member
 */
export function getDefaultSecurityLevel(): SecurityLevel {
  return SECURITY_LEVELS.ECHO;
}

/**
 * Get the security level for a new account owner
 */
export function getOwnerSecurityLevel(): SecurityLevel {
  return SECURITY_LEVELS.ALPHA;
}

/**
 * Get security level config by level number
 */
export function getSecurityConfig(level: SecurityLevel): SecurityLevelConfig {
  return SECURITY_CONFIG[level] || SECURITY_CONFIG[SECURITY_LEVELS.ECHO];
}

/**
 * Get assignable security levels for a given actor
 * (levels they can assign to others)
 * 
 * @param actorLevel - The actor's security level
 * @param includeAlpha - Whether to include Alpha in the list (for promoting to Owner)
 */
export function getAssignableLevels(actorLevel: SecurityLevel, includeAlpha: boolean = false): SecurityLevel[] {
  if (!hasCapability(actorLevel, 'canEditPermissions')) return [];
  
  const levels: SecurityLevel[] = [];
  
  // Omega can assign all levels including Alpha
  if (actorLevel === SECURITY_LEVELS.OMEGA) {
    for (let l = 1 as SecurityLevel; l <= 5; l++) {
      levels.push(l as SecurityLevel);
    }
  } 
  // Alpha can assign Alpha (to promote others) and below
  else if (actorLevel === SECURITY_LEVELS.ALPHA) {
    if (includeAlpha) {
      levels.push(SECURITY_LEVELS.ALPHA);
    }
    for (let l = 2 as SecurityLevel; l <= 5; l++) {
      levels.push(l as SecurityLevel);
    }
  }
  // Others can assign levels at or below their own (but not Omega or Alpha)
  else {
    for (let l = Math.max(actorLevel, 2) as SecurityLevel; l <= 5; l++) {
      levels.push(l as SecurityLevel);
    }
  }
  
  return levels;
}

/**
 * Get the protocol name for display
 */
export function getProtocolName(level: SecurityLevel): string {
  return SECURITY_CONFIG[level]?.protocol || 'Unknown Protocol';
}

/**
 * Get short protocol code (Ω, α, β, γ, δ, ε)
 */
export function getProtocolCode(level: SecurityLevel): string {
  const codes: Record<SecurityLevel, string> = {
    0: 'Ω',  // Omega
    1: 'α',  // Alpha
    2: 'β',  // Bravo (Beta symbol for visual)
    3: 'γ',  // Charlie (Gamma)
    4: 'δ',  // Delta
    5: 'ε',  // Echo (Epsilon)
  };
  return codes[level] || '?';
}
