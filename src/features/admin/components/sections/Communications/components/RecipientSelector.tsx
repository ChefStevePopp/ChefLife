/**
 * RecipientSelector - Select Team Member for Email Preview
 * 
 * L5 Design: Dropdown with search and real-time context building
 * 
 * Features:
 * - Search/filter team members
 * - Shows position and tier status
 * - Integrates with usePerformanceStore for live data
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Users,
  ChevronDown,
  Search,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePerformanceStore } from '@/stores/performanceStore';

// =============================================================================
// TYPES
// =============================================================================

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  hire_date?: string;
  avatar_url?: string;
}

interface RecipientSelectorProps {
  organizationId: string;
  selectedId?: string;
  onSelect: (member: TeamMember | null) => void;
  placeholder?: string;
  showSampleOption?: boolean;
}

// =============================================================================
// TIER BADGE COMPONENT
// =============================================================================

const TierBadge: React.FC<{ tier: number }> = ({ tier }) => {
  const tierConfig: Record<number, { label: string; className: string }> = {
    1: { label: 'T1', className: 'bg-emerald-500/20 text-emerald-400' },
    2: { label: 'T2', className: 'bg-amber-500/20 text-amber-400' },
    3: { label: 'T3', className: 'bg-rose-500/20 text-rose-400' },
  };
  
  const config = tierConfig[tier] || tierConfig[1];
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  organizationId,
  selectedId,
  onSelect,
  placeholder = 'Select team member...',
  showSampleOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get performance data for tier badges
  const { teamPerformance, fetchTeamPerformance } = usePerformanceStore();
  
  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('organization_team_members')
          .select('id, first_name, last_name, email, position, hire_date, avatar_url')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('first_name');
        
        if (fetchError) throw fetchError;
        
        setTeamMembers(data || []);
        
        // Also fetch performance data if not loaded
        if (teamPerformance.size === 0) {
          await fetchTeamPerformance();
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMembers();
  }, [organizationId, fetchTeamPerformance]);
  
  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMembers;
    
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(member =>
      member.first_name.toLowerCase().includes(query) ||
      member.last_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.position?.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);
  
  // Find selected member
  const selectedMember = useMemo(() => {
    if (!selectedId || selectedId === 'sample') return null;
    return teamMembers.find(m => m.id === selectedId) || null;
  }, [selectedId, teamMembers]);
  
  // Get tier for a member
  const getMemberTier = (memberId: string): number => {
    const perf = teamPerformance.get(memberId);
    return perf?.tier ?? 1;
  };
  
  // Handle selection
  const handleSelect = (member: TeamMember | null) => {
    onSelect(member);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  // Handle sample selection
  const handleSampleSelect = () => {
    onSelect(null); // null = use sample data
    setIsOpen(false);
    setSearchQuery('');
  };
  
  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-left hover:bg-gray-750 transition-colors"
      >
        {selectedMember ? (
          <>
            <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <span className="flex-1 truncate text-white">
              {selectedMember.first_name} {selectedMember.last_name}
            </span>
            <TierBadge tier={getMemberTier(selectedMember.id)} />
          </>
        ) : selectedId === 'sample' || !selectedId ? (
          <>
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="flex-1 truncate text-gray-300">Sample Data (Marcus Chen)</span>
          </>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[320px] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
          </div>
          
          {/* Options */}
          <div className="max-h-[240px] overflow-y-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading team members...</span>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="flex items-center justify-center gap-2 py-8 text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {/* Sample Option */}
            {!isLoading && !error && showSampleOption && (
              <button
                onClick={handleSampleSelect}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300">Sample Data</div>
                  <div className="text-xs text-gray-500">Marcus Chen (Grill Lead)</div>
                </div>
                {(!selectedId || selectedId === 'sample') && (
                  <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                )}
              </button>
            )}
            
            {/* Divider */}
            {!isLoading && !error && showSampleOption && filteredMembers.length > 0 && (
              <div className="border-t border-gray-700 my-1" />
            )}
            
            {/* Team Members */}
            {!isLoading && !error && filteredMembers.map(member => {
              const tier = getMemberTier(member.id);
              const isSelected = selectedId === member.id;
              
              return (
                <button
                  key={member.id}
                  onClick={() => handleSelect(member)}
                  className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${
                    isSelected ? 'bg-primary-500/10' : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {member.position || member.email}
                    </div>
                  </div>
                  <TierBadge tier={tier} />
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
            
            {/* No Results */}
            {!isLoading && !error && filteredMembers.length === 0 && searchQuery && (
              <div className="py-6 text-center text-gray-500 text-sm">
                No team members match "{searchQuery}"
              </div>
            )}
            
            {/* Empty State */}
            {!isLoading && !error && teamMembers.length === 0 && (
              <div className="py-6 text-center text-gray-500 text-sm">
                No active team members found
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default RecipientSelector;
