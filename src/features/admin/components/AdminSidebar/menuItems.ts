import {
  User,
  Building2,
  Users,
  Clock,
  FileText,
  HelpCircle,
  Share2,
  Shield,
  Database,
  UtensilsCrossed,
  Package,
  Settings,
  Box,
  ChefHat,
  CircleDollarSign,
  History,
  Satellite,
  Calendar,
  Home,
  ThermometerSnowflake,
  Thermometer,
  ClipboardList,
  LibraryBig,
  Globe,
  ClipboardCheck,
  Briefcase,
  Scale,
  Eye,
  Lock,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { type SecurityLevel, SECURITY_LEVELS } from "@/config/security";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  tooltip?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  /** Minimum security level required to see this item (lower = more access) */
  minSecurityLevel?: SecurityLevel;
}

export interface MenuSection {
  id: string;
  label?: string;
  icon?: LucideIcon; // Section icon for collapsed rail view
  items: MenuItem[];
  /** Minimum security level required to see this section */
  minSecurityLevel?: SecurityLevel;
  /** Whether section can be collapsed (default true for labeled sections) */
  collapsible?: boolean;
}

/**
 * Generate menu items based on user's security level
 * @param isDev - Legacy flag, now derived from security level
 * @param securityLevel - User's protocol level (0=Omega, 1=Alpha, etc.)
 */
export const menuItems = (isDev: boolean, securityLevel: SecurityLevel = SECURITY_LEVELS.ECHO): MenuSection[] => {
  // Helper to check if user can see an item
  const canSee = (minLevel?: SecurityLevel) => {
    if (minLevel === undefined) return true;
    return securityLevel <= minLevel; // Lower number = higher access
  };

  const allSections: MenuSection[] = [
    {
      id: "account",
      collapsible: false, // Dashboard always visible
      items: [
        { icon: Home, label: "Dashboard", path: "/admin" },
      ],
    },
    {
      id: "kitchen",
      label: "KITCHEN",
      icon: ChefHat,
      collapsible: true,
      items: [
        { icon: LibraryBig, label: "Recipe Manager", path: "/admin/recipes" },
        { icon: UtensilsCrossed, label: "Task Manager", path: "/admin/tasks" },
        {
          icon: ThermometerSnowflake,
          label: "HACCP",
          path: "/admin/haccp",
        },
        {
          icon: ClipboardList,
          label: "Checks & Specs",
          path: "/admin/checklists",
        },
      ],
    },
    {
      id: "team",
      label: "TEAM",
      icon: Users,
      collapsible: true,
      items: [
        {
          icon: User,
          label: "My Profile",
          path: "/admin/team/my-profile",
          tooltip: "Your account settings",
        },
        {
          icon: Users,
          label: "The Roster",
          path: "/admin/team",
          tooltip: "Who's on the team",
        },
        {
          icon: Calendar,
          label: "The Schedule",
          path: "/admin/schedule",
          tooltip: "When they're here",
        },
        {
          icon: ClipboardCheck,
          label: "Team Performance",
          path: "/admin/team/performance",
          tooltip: "Points, tiers & coaching",
        },
        {
          icon: Briefcase,
          label: "Job Descriptions",
          path: "/admin/job-descriptions",
          tooltip: "What they do here",
          comingSoon: true,
        },
        {
          icon: Scale,
          label: "Policies",
          path: "/admin/policies",
          tooltip: "How we operate",
          comingSoon: true,
        },
        {
          icon: Satellite,
          label: "Nexus",
          path: "/admin/nexus",
          tooltip: "Notification broadcast settings",
          minSecurityLevel: SECURITY_LEVELS.ALPHA, // Ω and α only
        },
        {
          icon: Lock,
          label: "App Access",
          path: "/admin/app-access",
          tooltip: "Security protocols & feature access",
          minSecurityLevel: SECURITY_LEVELS.ALPHA, // Ω and α only
        },
      ],
    },
    {
      id: "organization",
      label: "ORGANIZATION",
      icon: Building2,
      collapsible: true,
      items: [
        {
          icon: Building2,
          label: "Settings",
          path: "/admin/organizations",
          tooltip: "Organization profile & preferences",
        },
        {
          icon: Package,
          label: "Modules",
          path: "/admin/modules",
          tooltip: "Enable/disable feature packs",
          minSecurityLevel: SECURITY_LEVELS.ALPHA, // Ω and α only
        },
        {
          icon: Globe,
          label: "Integrations",
          path: "/admin/integrations",
          tooltip: "Connect external services",
          minSecurityLevel: SECURITY_LEVELS.ALPHA, // Ω and α only
        },
        {
          icon: History,
          label: "Activity Log",
          path: "/admin/activity",
          tooltip: "Audit trail of all actions",
        },
      ],
    },
    {
      id: "data",
      label: "DATA MANAGEMENT",
      icon: Database,
      collapsible: true,
      items: [
        {
          icon: Database,
          label: "Master Ingredient List",
          path: "/admin/excel-imports#ingredients",
        },
        {
          icon: CircleDollarSign,
          label: "Vendor Invoices",
          path: "/admin/excel-imports#prepared",
        },
        {
          icon: Package,
          label: "Food Inventory Review",
          path: "/admin/excel-imports#inventory",
        },
        {
          icon: Settings,
          label: "Operation Variables",
          path: "/admin/excel-imports#operations",
        },
        {
          icon: Box,
          label: "Food Relationships",
          path: "/admin/excel-imports#relationships",
        },
      ],
    },
    {
      id: "support",
      label: "SUPPORT",
      icon: LifeBuoy,
      collapsible: true,
      items: [
        { icon: HelpCircle, label: "Help & Support", path: "/admin/help" },
        { icon: Share2, label: "Refer a Friend", path: "/admin/refer" },
      ],
    },
  ];

  // Add Dev Management section only for Omega (0) users
  if (securityLevel === SECURITY_LEVELS.OMEGA) {
    allSections.push({
      id: "dev",
      label: "DEVELOPMENT",
      icon: Shield,
      collapsible: true,
      items: [
        {
          icon: Shield,
          label: "Dev Management",
          path: "/admin/dev-management",
        },
      ],
    });
  }

  // Filter sections and items based on security level
  return allSections
    .filter(section => canSee(section.minSecurityLevel))
    .map(section => ({
      ...section,
      items: section.items.filter(item => canSee(item.minSecurityLevel))
    }))
    .filter(section => section.items.length > 0); // Remove empty sections
};
