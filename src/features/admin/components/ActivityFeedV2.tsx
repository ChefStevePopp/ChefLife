import React, { useEffect, useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  Users,
  Package,
  Settings,
  TrendingUp,
  Truck,
  ExternalLink,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { LoadingLogo } from "@/components/LoadingLogo";
import { motion, AnimatePresence } from "framer-motion";

/**
 * =============================================================================
 * ACTIVITY FEED V2 - L5 Triage Inbox Design
 * =============================================================================
 * Reference: L5-BUILD-STRATEGY.md, index.css subheader patterns
 * 
 * Mental Model: Notification inbox with urgency grouping
 * 
 * L5 Patterns Applied:
 * - subheader class for container styling
 * - subheader-icon-box for header icon
 * - subheader-toggle for severity filter stats
 * - icon-badge pattern for row indicators
 * 
 * Key Changes from V1:
 * - Vertical grouped list instead of horizontal cards
 * - "Needs Attention" vs "Recent" grouping
 * - Compact one-line items with expansion
 * - Uses NEXUS message field directly (no formatActivityDetails)
 * - Clear severity indicators using Lucide icons
 * =============================================================================
 */

// Types matching activity_logs table structure
interface Activity {
  id: string;
  activity_type: string;
  message: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  user_name?: string;
  details?: Record<string, any>;
  acknowledged_by?: string[];
  isAcknowledged?: boolean;
}

interface ActivityFeedV2Props {
  defaultDaysLimit?: number;
  maxItems?: number;
}

// Severity config - L5 color system
const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    iconBadgeClass: 'icon-badge-rose',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-l-rose-500',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    iconBadgeClass: 'icon-badge-amber',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-l-amber-500',
    label: 'Warning',
  },
  info: {
    icon: Info,
    iconBadgeClass: 'icon-badge-primary',
    textColor: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-l-primary-500',
    label: 'Info',
  },
};

// Category icon mapping
const getCategoryIcon = (category: string, activityType: string) => {
  const type = activityType.toLowerCase();
  if (type.includes('vendor') || type.includes('creep') || type.includes('price')) return Truck;
  if (type.includes('recipe')) return FileText;
  if (type.includes('team') || type.includes('performance')) return Users;
  if (type.includes('inventory')) return Package;
  if (type.includes('margin') || type.includes('cost')) return TrendingUp;
  
  switch (category) {
    case 'recipes': return FileText;
    case 'team': return Users;
    case 'inventory': return Package;
    case 'financial': return TrendingUp;
    case 'alerts': return Bell;
    case 'system': return Settings;
    default: return Bell;
  }
};

// Single activity row component
const ActivityRow: React.FC<{
  activity: Activity;
  onAcknowledge: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ activity, onAcknowledge, isExpanded, onToggleExpand }) => {
  const severity = SEVERITY_CONFIG[activity.severity] || SEVERITY_CONFIG.info;
  const CategoryIcon = getCategoryIcon(activity.category, activity.activity_type);
  const SeverityIcon = severity.icon;
  
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
  const fullTime = format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a");

  return (
    <div className={`border-l-2 ${activity.isAcknowledged ? 'border-l-gray-700' : severity.borderColor}`}>
      {/* Main row - always visible */}
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-800/50 transition-colors ${
          activity.isAcknowledged ? 'opacity-50' : ''
        }`}
        onClick={onToggleExpand}
      >
        {/* Category icon in badge style */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          activity.isAcknowledged ? 'bg-gray-700/50' : severity.bgColor
        }`}>
          <CategoryIcon className={`w-4 h-4 ${
            activity.isAcknowledged ? 'text-gray-500' : severity.textColor
          }`} />
        </div>
        
        {/* Message - truncated on one line */}
        <span className={`flex-1 text-sm truncate ${
          activity.isAcknowledged ? 'text-gray-500' : 'text-gray-200'
        }`}>
          {activity.message}
        </span>
        
        {/* Time */}
        <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block" title={fullTime}>
          {timeAgo}
        </span>
        
        {/* Expand chevron */}
        <ChevronRight className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${
          isExpanded ? 'rotate-90' : ''
        }`} />
      </div>
      
      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-12 space-y-3">
              {/* Full message */}
              <p className="text-sm text-gray-300">
                {activity.message}
              </p>
              
              {/* Meta info row */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fullTime}
                </span>
                {activity.user_name && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {activity.user_name}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${severity.bgColor} ${severity.textColor}`}>
                  {severity.label}
                </span>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {!activity.isAcknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcknowledge(activity.id);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark as Read
                  </button>
                )}
                {/* Future: Link to related page */}
                {activity.details?.link && (
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Details
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ActivityFeedV2: React.FC<ActivityFeedV2Props> = ({
  defaultDaysLimit = 14,
  maxItems = 50,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const { organization, user } = useAuth();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  // Fetch activities using NEXUS fields directly
  const fetchActivities = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - defaultDaysLimit);

      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, activity_type, message, category, severity, created_at, details, acknowledged_by")
        .eq("organization_id", organization.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (error) throw error;

      const formatted: Activity[] = (data || []).map((log) => {
        let acknowledgedBy: string[] = [];
        if (log.acknowledged_by) {
          if (Array.isArray(log.acknowledged_by)) {
            acknowledgedBy = log.acknowledged_by;
          } else if (typeof log.acknowledged_by === 'string') {
            try {
              acknowledgedBy = JSON.parse(log.acknowledged_by);
            } catch (e) {
              acknowledgedBy = [];
            }
          }
        }

        const userName = log.details?.user_name || 
                        (log.details?.changes?.first_name && log.details?.changes?.last_name 
                          ? `${log.details.changes.first_name} ${log.details.changes.last_name}` 
                          : undefined);

        return {
          id: log.id,
          activity_type: log.activity_type,
          message: log.message || formatActivityType(log.activity_type),
          category: log.category || 'system',
          severity: log.severity || 'info',
          created_at: log.created_at,
          user_name: userName,
          details: log.details,
          acknowledged_by: acknowledgedBy,
          isAcknowledged: user?.id ? acknowledgedBy.includes(user.id) : false,
        };
      });

      setActivities(formatted);
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, user?.id, defaultDaysLimit, maxItems]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Acknowledge handler
  const handleAcknowledge = async (id: string) => {
    if (!user?.id) return;

    try {
      const activity = activities.find(a => a.id === id);
      const currentAcked = activity?.acknowledged_by || [];
      
      if (currentAcked.includes(user.id)) return;
      
      const newAcked = [...currentAcked, user.id];

      const { error } = await supabase
        .from("activity_logs")
        .update({ acknowledged_by: newAcked })
        .eq("id", id);

      if (error) throw error;

      setActivities(prev => prev.map(a => 
        a.id === id 
          ? { ...a, acknowledged_by: newAcked, isAcknowledged: true }
          : a
      ));
    } catch (err) {
      console.error("Error acknowledging activity:", err);
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate counts for toggles
  const counts = {
    critical: activities.filter(a => a.severity === 'critical' && !a.isAcknowledged).length,
    warning: activities.filter(a => a.severity === 'warning' && !a.isAcknowledged).length,
    info: activities.filter(a => a.severity === 'info' && !a.isAcknowledged).length,
  };

  // Split into groups based on filter
  const filteredActivities = filterSeverity === 'all' 
    ? activities 
    : activities.filter(a => a.severity === filterSeverity);

  const needsAttention = filteredActivities.filter(a => 
    !a.isAcknowledged && (a.severity === 'critical' || a.severity === 'warning')
  );
  
  // Recent = info items + acknowledged items (if toggle is on)
  const recent = filteredActivities.filter(a => {
    // Always show unacknowledged info items
    if (a.severity === 'info' && !a.isAcknowledged) return true;
    // Show acknowledged items only if toggle is on
    if (a.isAcknowledged && showAcknowledged) return true;
    return false;
  });
  
  // Count how many acknowledged items are hidden
  const hiddenAcknowledgedCount = filteredActivities.filter(a => a.isAcknowledged).length;

  const displayedRecent = showAllRecent ? recent : recent.slice(0, 5);

  if (loading) {
    return (
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Activity</h3>
              <p className="subheader-subtitle">Loading...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 mt-4">
          <LoadingLogo message="Loading activity..." />
        </div>
      </div>
    );
  }

  if (!organization?.id) {
    return (
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box gray">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Activity</h3>
              <p className="subheader-subtitle">Select an organization</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalNeedsAttention = counts.critical + counts.warning;

  return (
    <div className="subheader">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          src/features/admin/components/ActivityFeedV2.tsx
        </div>
      )}

      {/* Header Row - L5 subheader pattern */}
      <div className="subheader-row">
        <div className="subheader-left">
          <div className={`subheader-icon-box ${totalNeedsAttention > 0 ? 'amber' : 'primary'}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="subheader-title">Activity</h3>
            <p className="subheader-subtitle">
              {totalNeedsAttention > 0 
                ? `${totalNeedsAttention} item${totalNeedsAttention !== 1 ? 's' : ''} need attention`
                : 'All caught up'
              }
            </p>
          </div>
        </div>

        {/* Right: Severity toggles + Refresh */}
        <div className="subheader-right">
          {/* Severity filter toggles - L5 subheader-toggle pattern */}
          <div 
            className={`subheader-toggle rose ${filterSeverity === 'critical' ? 'active' : ''}`}
            onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')}
          >
            <div className="subheader-toggle-icon cursor-pointer">
              {counts.critical > 0 ? (
                <span className="text-sm font-semibold text-rose-400">{counts.critical}</span>
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <span className="subheader-toggle-label">Critical</span>
          </div>

          <div 
            className={`subheader-toggle amber ${filterSeverity === 'warning' ? 'active' : ''}`}
            onClick={() => setFilterSeverity(filterSeverity === 'warning' ? 'all' : 'warning')}
          >
            <div className="subheader-toggle-icon cursor-pointer">
              {counts.warning > 0 ? (
                <span className="text-sm font-semibold text-amber-400">{counts.warning}</span>
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <span className="subheader-toggle-label">Warning</span>
          </div>

          <div 
            className={`subheader-toggle primary ${filterSeverity === 'info' ? 'active' : ''}`}
            onClick={() => setFilterSeverity(filterSeverity === 'info' ? 'all' : 'info')}
          >
            <div className="subheader-toggle-icon cursor-pointer">
              {counts.info > 0 ? (
                <span className="text-sm font-semibold text-primary-400">{counts.info}</span>
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <span className="subheader-toggle-label">Info</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchActivities}
            className="subheader-toggle-icon ml-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="mt-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Needs Attention Group */}
            {needsAttention.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                    Needs Attention
                  </span>
                  <span className="text-xs text-gray-500">({needsAttention.length})</span>
                </div>
                <div className="bg-gray-800/30 rounded-lg overflow-hidden divide-y divide-gray-700/30">
                  {needsAttention.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      onAcknowledge={handleAcknowledge}
                      isExpanded={expandedId === activity.id}
                      onToggleExpand={() => setExpandedId(
                        expandedId === activity.id ? null : activity.id
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Group - show if items exist OR if there are hidden acknowledged items */}
            {(recent.length > 0 || hiddenAcknowledgedCount > 0) && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Recent
                    </span>
                    <span className="text-xs text-gray-600">({recent.length})</span>
                  </div>
                  
                  {/* Show acknowledged toggle */}
                  {hiddenAcknowledgedCount > 0 && (
                    <button
                      onClick={() => setShowAcknowledged(!showAcknowledged)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <div className={`w-3 h-3 rounded border ${
                        showAcknowledged 
                          ? 'bg-primary-500 border-primary-500' 
                          : 'border-gray-600'
                      } flex items-center justify-center`}>
                        {showAcknowledged && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span>Show acknowledged ({hiddenAcknowledgedCount})</span>
                    </button>
                  )}
                </div>
                
                {/* List of recent items */}
                {displayedRecent.length > 0 ? (
                  <>
                    <div className="bg-gray-800/30 rounded-lg overflow-hidden divide-y divide-gray-700/30">
                      {displayedRecent.map((activity) => (
                        <ActivityRow
                          key={activity.id}
                          activity={activity}
                          onAcknowledge={handleAcknowledge}
                          isExpanded={expandedId === activity.id}
                          onToggleExpand={() => setExpandedId(
                            expandedId === activity.id ? null : activity.id
                          )}
                        />
                      ))}
                    </div>
                    
                    {/* Show more toggle */}
                    {recent.length > 5 && (
                      <button
                        onClick={() => setShowAllRecent(!showAllRecent)}
                        className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-colors"
                      >
                        {showAllRecent 
                          ? 'Show less' 
                          : `Show ${recent.length - 5} more`
                        }
                      </button>
                    )}
                  </>
                ) : (
                  /* Inbox zero state - only acknowledged items exist */
                  <div className="text-center py-6 bg-gray-800/20 rounded-lg border border-gray-700/30">
                    <Check className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Inbox zero</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {hiddenAcknowledgedCount} acknowledged item{hiddenAcknowledgedCount !== 1 ? 's' : ''} hidden
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeedV2;
