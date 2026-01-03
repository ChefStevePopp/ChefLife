import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LiveClockProps {
  showDate?: boolean;
  showIcon?: boolean;
  className?: string;
  compact?: boolean;
}

export const LiveClock: React.FC<LiveClockProps> = ({
  showDate = true,
  showIcon = true,
  className = '',
  compact = false,
}) => {
  const { organization } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get org timezone or fall back to browser timezone
  const timezone = organization?.settings?.timezone || 
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Update time every second for smooth clock feel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time in org timezone
  const formatTime = () => {
    try {
      return currentTime.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  // Format date in org timezone
  const formatDate = () => {
    try {
      return currentTime.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: compact ? 'short' : 'long',
        month: compact ? 'short' : 'long',
        day: 'numeric',
        year: compact ? undefined : 'numeric',
      });
    } catch {
      return currentTime.toLocaleDateString('en-US', {
        weekday: compact ? 'short' : 'long',
        month: compact ? 'short' : 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-gray-800/30 px-4 py-1.5 rounded-lg ${className}`}>
      {showIcon && (
        <Clock className="w-4 h-4 text-primary-400" />
      )}
      <div className="text-gray-300 text-sm">
        {showDate && (
          <>
            <span className="font-medium">{formatDate()}</span>
            <span className="mx-2 text-gray-500">•</span>
          </>
        )}
        <span className="text-primary-400 font-mono">{formatTime()}</span>
      </div>
    </div>
  );
};
