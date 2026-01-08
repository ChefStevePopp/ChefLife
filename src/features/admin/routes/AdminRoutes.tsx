import React from "react";
import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import { AdminDashboard } from "../components/AdminDashboard";
import { VendorInvoiceManager } from "../components/sections/VendorInvoice/VendorInvoiceManager";
import { TeamManagement } from "../components/sections/TeamManagement";
import { PermissionsManager } from "../components/sections/PermissionsManager";
import { Nexus } from "../components/sections/Nexus";
import { HelpSupport } from "../components/sections/HelpSupport";
import { ExcelImports } from "../components/sections/ExcelImports";
import { RecipeManager } from "@/features/recipes/components/RecipeManager";
import { DevManagement } from "../components/sections/DevManagement";
import { OrganizationSettings } from "../components/settings/OrganizationSettings";
import { ModulesManager } from "../components/sections/ModulesManager";
import { IntegrationsManager } from "../components/sections/IntegrationsManager";
import { ActivityLogList } from "../components/ActivityLogList";
import { ScheduleManager } from "../components/sections/ScheduleManager";
import { TaskManager } from "../components/sections/TaskManager";
import { HACCPManager } from "../components/sections/HACCPManager";
import { ChecklistsManager } from "../components/sections/ChecklistsManager";
import { MyProfile } from "@/features/team/components/MyProfile";
import { TeamPerformance } from "@/features/team/components/TeamPerformance";
import { TeamPerformanceConfig } from "../components/sections/TeamPerformanceConfig";
import { Communications, TemplateEditor, TemplatePreview } from "../components/sections/Communications";

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="recipes" element={<RecipeManager />} />
        <Route path="team" element={<TeamManagement />} />
        <Route path="team/my-profile" element={<MyProfile />} />
        <Route path="team/performance" element={<TeamPerformance />} />
        <Route path="schedule/*" element={<ScheduleManager />} />
        <Route path="app-access" element={<PermissionsManager />} />
        <Route path="nexus" element={<Nexus />} />
        <Route path="help" element={<HelpSupport />} />
        <Route path="excel-imports" element={<ExcelImports />} />
        <Route path="vendor-invoices" element={<VendorInvoiceManager />} />
        <Route path="dev-management" element={<DevManagement />} />
        <Route path="organizations" element={<OrganizationSettings />} />
        <Route path="modules" element={<ModulesManager />} />
        <Route path="modules/team-performance" element={<TeamPerformanceConfig />} />
        <Route path="modules/communications" element={<Communications />} />
        <Route path="modules/communications/templates/new" element={<TemplateEditor />} />
        <Route path="modules/communications/templates/:id" element={<TemplateEditor />} />
        <Route path="modules/communications/templates/:id/preview" element={<TemplatePreview />} />
        <Route path="integrations" element={<IntegrationsManager />} />
        <Route path="activity" element={<ActivityLogList />} />
        <Route path="tasks" element={<TaskManager />} />
        <Route path="haccp" element={<HACCPManager />} />
        <Route path="checklists" element={<ChecklistsManager />} />
      </Route>
    </Routes>
  );
};
