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
  Bell,
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
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  tooltip?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export interface MenuSection {
  id: string;
  label?: string;
  items: MenuItem[];
}

export const menuItems = (isDev: boolean): MenuSection[] => {
  const items: MenuSection[] = [
    {
      id: "account",
      items: [
        { icon: User, label: "My Account", path: "/admin/account" },
        { icon: Home, label: "Dashboard", path: "/admin" },
      ],
    },
    {
      id: "kitchen",
      label: "KITCHEN",
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
      items: [
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
          label: "Attendance",
          path: "/admin/attendance",
          tooltip: "Are they here? Points & tracking",
          comingSoon: true,
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
          icon: Bell,
          label: "Notifications",
          path: "/admin/notifications",
          tooltip: "How we communicate",
        },
        {
          icon: Eye,
          label: "App Access",
          path: "/admin/permissions",
          tooltip: "What they can see in the app",
        },
      ],
    },
    {
      id: "organization",
      label: "ORGANIZATION",
      items: [
        {
          icon: Building2,
          label: "Organization",
          path: "/admin/organizations",
        },
        {
          icon: History,
          label: "Activity Log",
          path: "/admin/activity",
        },
      ],
    },
    {
      id: "data",
      label: "DATA MANAGEMENT",
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
      items: [
        { icon: HelpCircle, label: "Help & Support", path: "/admin/help" },
        { icon: Share2, label: "Refer a Friend", path: "/admin/refer" },
      ],
    },
  ];

  // Add Dev Management section only for dev users
  if (isDev) {
    items.push({
      id: "dev",
      label: "DEVELOPMENT",
      items: [
        {
          icon: Shield,
          label: "Dev Management",
          path: "/admin/dev-management",
        },
      ],
    });
  }

  return items;
};
