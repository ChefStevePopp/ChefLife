import React from "react";
import { User, Mail, Phone, Hash, AlertCircle, Users, Fingerprint } from "lucide-react";
import type { TeamMember } from "../../../types";
import { ImportedBadge } from "@/shared/components/ImportedBadge";

interface BasicInfoTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
  errors?: Record<string, string>;
  isSelfEdit?: boolean;
}

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle, badge }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {badge}
      </div>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  </div>
);

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  setFormData,
  errors = {},
  isSelfEdit = false,
}) => {
  const updateField = (field: keyof TeamMember, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Check if this member was imported
  const isImported = !!formData.import_source && formData.import_source !== 'manual';

  // Auto-generate display name if not set
  const handleNameChange = (field: 'first_name' | 'last_name', value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-update display name if it matches the old full name or is empty
    const oldFullName = `${formData.first_name} ${formData.last_name}`.trim();
    if (!formData.display_name || formData.display_name === oldFullName) {
      const newFirstName = field === 'first_name' ? value : formData.first_name;
      const newLastName = field === 'last_name' ? value : formData.last_name;
      newData.display_name = `${newFirstName} ${newLastName}`.trim();
    }
    
    setFormData(newData);
  };

  return (
    <div className="space-y-8">
      {/* Section: Identity */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Users}
          iconColor="text-primary-400"
          bgColor="bg-primary-500/20"
          title="Identity"
          subtitle="Name and how they're known"
          badge={isImported ? <ImportedBadge source={formData.import_source} /> : undefined}
        />
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                First Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleNameChange('first_name', e.target.value)}
                  className={`input w-full pl-10 ${errors.first_name ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="John"
                  required
                />
              </div>
              {errors.first_name && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.first_name}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Last Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleNameChange('last_name', e.target.value)}
                  className={`input w-full pl-10 ${errors.last_name ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="Smith"
                  required
                />
              </div>
              {errors.last_name && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Preferred Name - NOT imported, safe to edit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Preferred Name
              <span className="text-gray-500 font-normal ml-2">— what they go by</span>
            </label>
            <input
              type="text"
              value={formData.display_name || ""}
              onChange={(e) => updateField('display_name', e.target.value)}
              className="input w-full"
              placeholder={`${formData.first_name} ${formData.last_name}`.trim() || "How they prefer to be called"}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              This is how they'll appear on schedules and in the app
            </p>
          </div>
        </div>
      </section>

      {/* Section: Contact */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Mail}
          iconColor="text-green-400"
          bgColor="bg-green-500/20"
          title="Contact Information"
          subtitle="How to reach them"
          badge={isImported ? <ImportedBadge source={formData.import_source} /> : undefined}
        />

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => updateField('email', e.target.value)}
                className={`input w-full pl-10 ${errors.email ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                placeholder="john.smith@example.com"
                required
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => updateField('phone', e.target.value)}
                className="input w-full pl-10"
                placeholder="(555) 123-4567"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Used for shift reminders and urgent notifications
            </p>
          </div>
        </div>
      </section>

      {/* Section: System - Admin only */}
      {!isSelfEdit && (
        <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
          <SectionHeader
            icon={Fingerprint}
            iconColor="text-amber-400"
            bgColor="bg-amber-500/20"
            title="System"
            subtitle="Integration and tracking"
            badge={isImported && formData.punch_id ? <ImportedBadge source={formData.import_source} /> : undefined}
          />

          <div className="space-y-4">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Employee ID / Punch ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.punch_id || ""}
                  onChange={(e) => updateField('punch_id', e.target.value)}
                  className="input w-full pl-10"
                  placeholder="EMP001"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Links to payroll, time clock, or external systems like 7shifts
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
