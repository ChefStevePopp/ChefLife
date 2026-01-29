/**
 * ControlPointBadges - CCP, QCP, and warning badges for steps
 */

import React from 'react';
import { ShieldAlert, Eye, AlertTriangle } from 'lucide-react';
import type { RecipeStep } from '@/features/recipes/types/recipe';

interface ControlPointBadgesProps {
  step: RecipeStep;
  size?: 'small' | 'normal' | 'large';
  subtle?: boolean;
}

export const ControlPointBadges: React.FC<ControlPointBadgesProps> = ({ 
  step, 
  size = 'normal', 
  subtle = false 
}) => {
  const badges = [];
  
  if (step.is_critical_control_point) {
    badges.push({
      key: 'ccp',
      label: size === 'small' ? 'CCP' : 'Critical Control Point',
      color: subtle 
        ? 'bg-rose-500/10 text-rose-400/70 border-rose-500/20'
        : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: ShieldAlert,
    });
  }
  
  if (step.is_quality_control_point) {
    badges.push({
      key: 'qcp',
      label: size === 'small' ? 'QCP' : 'Quality Control Point',
      color: subtle
        ? 'bg-amber-500/10 text-amber-400/70 border-amber-500/20'
        : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: Eye,
    });
  }
  
  if (step.warning_level && step.warning_level !== 'low') {
    badges.push({
      key: 'warning',
      label: size === 'small' 
        ? (step.warning_level === 'high' ? '⚠️' : '⚡') 
        : `${step.warning_level === 'high' ? 'High' : 'Medium'} Safety`,
      color: step.warning_level === 'high' 
        ? subtle ? 'bg-red-500/10 text-red-400/70 border-red-500/20' : 'bg-red-500/20 text-red-400 border-red-500/30'
        : subtle ? 'bg-orange-500/10 text-orange-400/70 border-orange-500/20' : 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      icon: AlertTriangle,
    });
  }
  
  if (badges.length === 0) return null;
  
  const badgeSize = size === 'small' ? 'px-1.5 py-0.5 text-[10px]' : size === 'large' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  const iconSize = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(badge => {
        const Icon = badge.icon;
        return (
          <span 
            key={badge.key}
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${badgeSize} ${badge.color}`}
          >
            <Icon className={iconSize} />
            <span>{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
};

export default ControlPointBadges;
