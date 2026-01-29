/**
 * Method Tab - Constants and Configuration
 */

import {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  RotateCcw,
  Thermometer,
  ShieldAlert,
  Clock,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Utensils,
} from 'lucide-react';

/**
 * Icon map for instruction callout blocks
 */
export const CALLOUT_ICONS: Record<string, React.ElementType> = {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  RotateCcw,
  Thermometer,
  ShieldAlert,
  Clock,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Utensils,
};

/**
 * Color configuration for callout blocks
 */
export const CALLOUT_COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  emerald: { bg: 'bg-emerald-950/60', border: 'border-l-emerald-500', icon: 'text-emerald-400', text: 'text-emerald-100' },
  amber: { bg: 'bg-amber-950/60', border: 'border-l-amber-500', icon: 'text-amber-400', text: 'text-amber-100' },
  rose: { bg: 'bg-rose-950/60', border: 'border-l-rose-500', icon: 'text-rose-400', text: 'text-rose-100' },
  blue: { bg: 'bg-blue-950/60', border: 'border-l-blue-500', icon: 'text-blue-400', text: 'text-blue-100' },
  cyan: { bg: 'bg-cyan-950/60', border: 'border-l-cyan-500', icon: 'text-cyan-400', text: 'text-cyan-100' },
  orange: { bg: 'bg-orange-950/60', border: 'border-l-orange-500', icon: 'text-orange-400', text: 'text-orange-100' },
  purple: { bg: 'bg-purple-950/60', border: 'border-l-purple-500', icon: 'text-purple-400', text: 'text-purple-100' },
  lime: { bg: 'bg-lime-950/60', border: 'border-l-lime-500', icon: 'text-lime-400', text: 'text-lime-100' },
  pink: { bg: 'bg-pink-950/60', border: 'border-l-pink-500', icon: 'text-pink-400', text: 'text-pink-100' },
  teal: { bg: 'bg-teal-950/60', border: 'border-l-teal-500', icon: 'text-teal-400', text: 'text-teal-100' },
  primary: { bg: 'bg-primary-950/60', border: 'border-l-primary-500', icon: 'text-primary-400', text: 'text-primary-100' },
};
