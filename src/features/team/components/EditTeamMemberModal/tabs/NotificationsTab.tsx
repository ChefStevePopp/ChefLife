import React, { useState } from "react";
import { Bell, Mail, Smartphone, Calendar, Users, ChefHat, Package, AlertTriangle, ChevronUp } from "lucide-react";
import type { TeamMember } from "../../../types";

interface NotificationsTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
}

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle }) => (
  <div className="flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="flex-1">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
    <ChevronUp className="w-5 h-5 text-gray-400" />
  </div>
);

// Notification types per category
const SCHEDULING_NOTIFICATIONS = [
  { id: "schedule_published", label: "Schedule Published", description: "When a new schedule is posted" },
  { id: "shift_changes", label: "Shift Changes", description: "When your shifts are modified" },
  { id: "shift_reminders", label: "Shift Reminders", description: "Reminders before your shift starts" },
  { id: "time_off_updates", label: "Time Off Updates", description: "Status changes on time-off requests" },
];

const TEAM_NOTIFICATIONS = [
  { id: "team_announcements", label: "Team Announcements", description: "Important messages from management" },
  { id: "new_team_members", label: "New Team Members", description: "When someone joins the team" },
  { id: "role_changes", label: "Role Changes", description: "Updates to team roles and responsibilities" },
];

const OPERATIONS_NOTIFICATIONS = [
  { id: "recipe_updates", label: "Recipe Updates", description: "Changes to recipes and prep methods" },
  { id: "menu_changes", label: "Menu Changes", description: "New items or menu modifications" },
  { id: "prep_assignments", label: "Prep Assignments", description: "When prep tasks are assigned to you" },
];

const INVENTORY_NOTIFICATIONS = [
  { id: "low_stock_alerts", label: "Low Stock Alerts", description: "When items need to be reordered" },
  { id: "delivery_notifications", label: "Delivery Notifications", description: "When orders arrive" },
  { id: "price_changes", label: "Price Changes", description: "Significant vendor price changes" },
];

// Delivery channels
const CHANNELS = [
  { id: "app", label: "In-App", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: Smartphone },
];

// Toggle button component - pill style (no checkmark, color indicates state)
const ChannelToggle: React.FC<{
  channelId: string;
  channelLabel: string;
  icon: React.ElementType;
  isEnabled: boolean;
  onToggle: () => void;
}> = ({ channelId, channelLabel, icon: Icon, isEnabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
      isEnabled
        ? 'bg-green-500/20 border-green-500/50 text-green-400'
        : 'bg-gray-800/50 border-gray-700/50 text-gray-600 hover:border-gray-600 hover:text-gray-500'
    }`}
    title={`${isEnabled ? 'Disable' : 'Enable'} ${channelLabel}`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// Notification row component
const NotificationRow: React.FC<{
  id: string;
  label: string;
  description: string;
  preferences: Record<string, any>;
  onToggle: (channelId: string, value: boolean) => void;
}> = ({ id, label, description, preferences, onToggle }) => (
  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-800/40 transition-colors group">
    <div className="flex-1 min-w-0 pr-4">
      <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
        {label}
      </p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <div className="flex items-center gap-2">
      {CHANNELS.map((channel) => {
        const isEnabled = preferences[id]?.[channel.id] !== false;
        return (
          <ChannelToggle
            key={channel.id}
            channelId={channel.id}
            channelLabel={channel.label}
            icon={channel.icon}
            isEnabled={isEnabled}
            onToggle={() => onToggle(channel.id, !isEnabled)}
          />
        );
      })}
    </div>
  </div>
);

// Expandable section component
const ExpandableSection: React.FC<{
  id: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  infoText: string;
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, icon: Icon, iconColor, bgColor, title, subtitle, infoText, expandedSections, toggleSection, children }) => {
  const isExpanded = expandedSections.has(id);
  
  return (
    <section className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
      <div className="expandable-info-section" style={{ background: 'transparent' }}>
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="expandable-info-header w-full p-5"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">{subtitle}</p>
            </div>
          </div>
          <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
          {/* Info text */}
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-500 pl-[52px]">{infoText}</p>
          </div>
          
          {/* Content */}
          <div className="px-5 pb-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  formData,
  setFormData,
}) => {
  const preferences = formData.notification_preferences || {};
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['scheduling'])); // First one expanded by default

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Update a single preference
  const updatePreference = (typeId: string, channelId: string, value: boolean) => {
    setFormData({
      ...formData,
      notification_preferences: {
        ...preferences,
        [typeId]: {
          ...(preferences[typeId] || {}),
          [channelId]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Section: Scheduling Notifications */}
      <ExpandableSection
        id="scheduling"
        icon={Calendar}
        iconColor="text-primary-400"
        bgColor="bg-primary-500/20"
        title="Scheduling"
        subtitle="Shift and schedule notifications"
        infoText="Control how you're notified about schedule changes, shift updates, and time-off requests."
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="space-y-1">
          {SCHEDULING_NOTIFICATIONS.map((notification) => (
            <NotificationRow
              key={notification.id}
              id={notification.id}
              label={notification.label}
              description={notification.description}
              preferences={preferences}
              onToggle={(channelId, value) => updatePreference(notification.id, channelId, value)}
            />
          ))}
        </div>
      </ExpandableSection>

      {/* Section: Team Notifications */}
      <ExpandableSection
        id="team"
        icon={Users}
        iconColor="text-green-400"
        bgColor="bg-green-500/20"
        title="Team"
        subtitle="Team updates and announcements"
        infoText="Stay informed about team changes, announcements, and organizational updates."
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="space-y-1">
          {TEAM_NOTIFICATIONS.map((notification) => (
            <NotificationRow
              key={notification.id}
              id={notification.id}
              label={notification.label}
              description={notification.description}
              preferences={preferences}
              onToggle={(channelId, value) => updatePreference(notification.id, channelId, value)}
            />
          ))}
        </div>
      </ExpandableSection>

      {/* Section: Operations Notifications */}
      <ExpandableSection
        id="operations"
        icon={ChefHat}
        iconColor="text-amber-400"
        bgColor="bg-amber-500/20"
        title="Operations"
        subtitle="Kitchen and menu updates"
        infoText="Get notified about recipe changes, menu updates, and prep task assignments."
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="space-y-1">
          {OPERATIONS_NOTIFICATIONS.map((notification) => (
            <NotificationRow
              key={notification.id}
              id={notification.id}
              label={notification.label}
              description={notification.description}
              preferences={preferences}
              onToggle={(channelId, value) => updatePreference(notification.id, channelId, value)}
            />
          ))}
        </div>
      </ExpandableSection>

      {/* Section: Inventory Notifications */}
      <ExpandableSection
        id="inventory"
        icon={Package}
        iconColor="text-rose-400"
        bgColor="bg-rose-500/20"
        title="Inventory"
        subtitle="Stock and delivery alerts"
        infoText="Monitor stock levels, delivery arrivals, and vendor price changes."
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="space-y-1">
          {INVENTORY_NOTIFICATIONS.map((notification) => (
            <NotificationRow
              key={notification.id}
              id={notification.id}
              label={notification.label}
              description={notification.description}
              preferences={preferences}
              onToggle={(channelId, value) => updatePreference(notification.id, channelId, value)}
            />
          ))}
        </div>
      </ExpandableSection>

      {/* Section: Critical Notice - Always visible, not expandable */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-700/50">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Critical Notifications</h3>
            <p className="text-sm text-gray-400">These cannot be disabled</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Security alerts, system maintenance notices, and critical operational updates 
          will always be sent to your primary email address regardless of your preferences above.
        </p>
      </section>
    </div>
  );
};
