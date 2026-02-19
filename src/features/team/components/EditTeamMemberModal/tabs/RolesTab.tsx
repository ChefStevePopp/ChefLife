import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChefHat, Briefcase, Building2, Loader2, DollarSign, Lock, Pencil, Clock, Banknote } from "lucide-react";
import type { TeamMember } from "../../../types";
import { supabase } from "@/lib/supabase";
import { ImportedBadge } from "@/shared/components/ImportedBadge";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { SECURITY_LEVELS } from "@/config/security";

interface RolesTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
  editorSecurityLevel?: number;
}

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle, action, badge }) => (
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {badge}
        </div>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-sm text-gray-500 text-center py-6 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
    {message}
  </div>
);

// Add button component
const AddButton: React.FC<{ onClick: () => void; color: string }> = ({ onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-${color}-400 hover:text-${color}-300 hover:bg-${color}-500/10 rounded-lg transition-colors`}
  >
    <Plus className="w-4 h-4" />
    Add
  </button>
);

export const RolesTab: React.FC<RolesTabProps> = ({
  formData,
  setFormData,
  editorSecurityLevel = SECURITY_LEVELS.ECHO,
}) => {
  const [kitchenStations, setKitchenStations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Pay Type & Wage Visibility ───────────────────────────────
  // pay_type drives wage visibility: 'hourly' = wages visible, 'salary' = wages locked
  // Alpha editors can temporarily unlock salary wages via TwoStageButton for analysis
  const payType = formData.pay_type || 'hourly';
  const isSalaried = payType === 'salary';
  const isEditorAlpha = (editorSecurityLevel ?? SECURITY_LEVELS.ECHO) <= SECURITY_LEVELS.ALPHA;
  const [salaryWageOverride, setSalaryWageOverride] = useState(false);
  const wagesVisible = !isSalaried || salaryWageOverride;

  // Fetch kitchen stations from operations_settings
  useEffect(() => {
    const fetchKitchenStations = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const organizationId = user?.user_metadata?.organizationId;

        if (!organizationId) {
          console.error("No organization ID found");
          return;
        }

        const { data, error } = await supabase
          .from("operations_settings")
          .select("kitchen_stations")
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          console.error("Error fetching operations settings:", error);
          return;
        }

        setKitchenStations(data?.kitchen_stations || []);
      } catch (error) {
        console.error("Error fetching kitchen stations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKitchenStations();
  }, []);

  // Role functions (keep wages[] in sync as parallel array)
  const addRole = () => {
    setFormData({
      ...formData,
      roles: [...(formData.roles || []), ""],
      wages: [...(formData.wages || []), 0],
    });
  };

  const updateRole = (index: number, value: string) => {
    const newRoles = [...(formData.roles || [])];
    newRoles[index] = value;
    setFormData({ ...formData, roles: newRoles });
  };

  const removeRole = (index: number) => {
    const newRoles = [...(formData.roles || [])];
    const newWages = [...(formData.wages || [])];
    newRoles.splice(index, 1);
    newWages.splice(index, 1);
    setFormData({ ...formData, roles: newRoles, wages: newWages });
  };

  const updateWage = (index: number, value: number) => {
    const newWages = [...(formData.wages || [])];
    // Pad with zeros if wages array is shorter than roles array
    while (newWages.length <= index) newWages.push(0);
    newWages[index] = value;
    setFormData({ ...formData, wages: newWages });
  };

  // Department functions
  const addDepartment = () => {
    setFormData({
      ...formData,
      departments: [...(formData.departments || []), ""],
    });
  };

  const updateDepartment = (index: number, value: string) => {
    const newDepartments = [...(formData.departments || [])];
    newDepartments[index] = value;
    setFormData({ ...formData, departments: newDepartments });
  };

  const removeDepartment = (index: number) => {
    const newDepartments = [...(formData.departments || [])];
    newDepartments.splice(index, 1);
    setFormData({ ...formData, departments: newDepartments });
  };

  // Station toggle
  const handleStationToggle = (station: string) => {
    const currentStations = [...(formData.kitchen_stations || [])];
    const stationIndex = currentStations.indexOf(station);

    if (stationIndex >= 0) {
      currentStations.splice(stationIndex, 1);
    } else {
      currentStations.push(station);
    }

    setFormData({ ...formData, kitchen_stations: currentStations });
  };

  const selectedStationsCount = (formData.kitchen_stations || []).length;
  
  // Check if this member was imported (their departments/roles came from import)
  const isImported = !!formData.import_source && formData.import_source !== 'manual';

  return (
    <div className="space-y-8">
      {/* Section: Departments */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Building2}
          iconColor="text-amber-400"
          bgColor="bg-amber-500/20"
          title="Departments"
          subtitle="Which teams they belong to"
          action={<AddButton onClick={addDepartment} color="amber" />}
          badge={isImported && (formData.departments?.length || 0) > 0 ? (
            <ImportedBadge source={formData.import_source} compact />
          ) : undefined}
        />

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {(formData.departments || []).length > 0 ? (
            (formData.departments || []).map((dept, index) => (
              <div key={index} className="flex gap-2 group">
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => updateDepartment(index, e.target.value)}
                  className="input flex-1 min-w-0"
                  placeholder="e.g., Kitchen, Front of House, Management"
                  autoFocus={dept === ""}
                />
                <button
                  type="button"
                  onClick={() => removeDepartment(index)}
                  className="p-2.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <EmptyState message="No departments assigned. Click Add to assign this person to a department." />
          )}
        </div>
      </section>

      {/* Section: Scheduled Roles */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Briefcase}
          iconColor="text-green-400"
          bgColor="bg-green-500/20"
          title="Scheduled Roles"
          subtitle="Job titles used for scheduling"
          action={<AddButton onClick={addRole} color="green" />}
          badge={isImported && (formData.roles?.length || 0) > 0 ? (
            <ImportedBadge source={formData.import_source} compact />
          ) : undefined}
        />

        {/* Pay Type Toggle — persistent, drives labour intelligence inclusion */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 flex-shrink-0">Compensation</span>
          <div className="flex rounded-lg border border-gray-700/50 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, pay_type: 'hourly' });
                setSalaryWageOverride(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                !isSalaried
                  ? 'bg-green-500/20 text-green-400 border-r border-green-500/30'
                  : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 border-r border-gray-700/50'
              }`}
            >
              <Clock className="w-3 h-3" />
              Hourly
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, pay_type: 'salary' });
                setSalaryWageOverride(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                isSalaried
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              <Banknote className="w-3 h-3" />
              Salary
            </button>
          </div>
          {isSalaried && !salaryWageOverride && isEditorAlpha && (
            <TwoStageButton
              onConfirm={() => setSalaryWageOverride(true)}
              icon={Lock}
              confirmIcon={Pencil}
              confirmText="Show Wages?"
              variant="warning"
              size="sm"
              timeout={3000}
            />
          )}
          {isSalaried && salaryWageOverride && (
            <button
              type="button"
              onClick={() => setSalaryWageOverride(false)}
              className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
            >
              Re-lock
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {(formData.roles || []).length > 0 ? (
            (formData.roles || []).map((role, index) => (
              <div key={index} className="flex gap-2 group items-center">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => updateRole(index, e.target.value)}
                  className="input flex-1 min-w-0"
                  placeholder="e.g., Line Cook, Server, Bartender"
                  autoFocus={role === ""}
                />
                {/* Wage input — gated by pay_type */}
                {wagesVisible ? (
                  <div className="relative flex-shrink-0 w-[110px]">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-400 pointer-events-none" />
                    <input
                      type="number"
                      value={(formData.wages || [])[index] || ''}
                      onChange={(e) => updateWage(index, parseFloat(e.target.value) || 0)}
                      className="input pl-7 pr-8 w-full text-right tabular-nums"
                      placeholder="0.00"
                      min="0"
                      step="0.25"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">/hr</span>
                  </div>
                ) : (
                  <div className="relative flex-shrink-0 w-[110px]">
                    <div className="input pl-7 pr-8 w-full text-right tabular-nums bg-gray-800/80 text-gray-600 cursor-not-allowed flex items-center justify-end">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                      <span className="text-sm">—</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeRole(index)}
                  className="p-2.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <EmptyState message="No roles assigned. Click Add to define their scheduling roles." />
          )}
        </div>

        {/* Footer context */}
        <p className="mt-3 text-xs text-gray-500">
          {isSalaried
            ? 'Salaried — excluded from Labour Intelligence calculations.'
            : 'Hourly wages power the Labour Intelligence row on the schedule.'
          }
        </p>
      </section>

      {/* Section: Kitchen Stations */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={ChefHat}
          iconColor="text-primary-400"
          bgColor="bg-primary-500/20"
          title="Kitchen Stations"
          subtitle={selectedStationsCount > 0 
            ? `Trained on ${selectedStationsCount} station${selectedStationsCount > 1 ? 's' : ''}`
            : "Where they can work"
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            <span className="ml-2 text-gray-400">Loading stations...</span>
          </div>
        ) : kitchenStations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {kitchenStations.map((station) => {
              const isSelected = (formData.kitchen_stations || []).includes(station);
              return (
                <button
                  key={station}
                  type="button"
                  onClick={() => handleStationToggle(station)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-primary-500/20 border-primary-500/50 ring-1 ring-primary-500/30'
                      : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-primary-500/30' : 'bg-gray-700/50'
                  }`}>
                    <ChefHat className={`w-4 h-4 ${isSelected ? 'text-primary-400' : 'text-gray-500'}`} />
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    {station}
                  </span>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
            <ChefHat className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No kitchen stations configured yet.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Add stations in Organization Settings → Operations Variables
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
