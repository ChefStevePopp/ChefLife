import React, { useState, useEffect, useRef } from "react";
import { Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CommonNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string | undefined;
  autoFocus?: boolean;
}

export const CommonNameAutocomplete: React.FC<CommonNameAutocompleteProps> = ({
  value,
  onChange,
  organizationId,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ common_name: string; usage_count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!organizationId || !value || value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_common_name_suggestions', {
          p_org_id: organizationId,
          p_search: value,
          p_limit: 10
        });

        if (error) {
          // Fallback to direct query if RPC doesn't exist yet
          const { data: fallbackData } = await supabase
            .from('master_ingredients')
            .select('common_name')
            .eq('organization_id', organizationId)
            .not('common_name', 'is', null)
            .ilike('common_name', `%${value}%`)
            .limit(10);
          
          if (fallbackData) {
            const counts: Record<string, number> = {};
            fallbackData.forEach(item => {
              if (item.common_name) {
                counts[item.common_name] = (counts[item.common_name] || 0) + 1;
              }
            });
            const grouped = Object.entries(counts)
              .map(([common_name, usage_count]) => ({ common_name, usage_count }))
              .sort((a, b) => b.usage_count - a.usage_count);
            setSuggestions(grouped);
          }
        } else if (data) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching common name suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [value, organizationId]);

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., Back Ribs, Chicken Thighs"
        className="input w-full pr-8"
      />
      {value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Links Code Groups and Umbrella Groups">
          <Link2 className="w-4 h-4 text-primary-400" />
        </div>
      )}
      
      {isOpen && (value?.length ?? 0) >= 2 && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1f2b] border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.common_name}
                  type="button"
                  onClick={() => handleSelect(suggestion.common_name)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                    suggestion.common_name === value ? "text-primary-400 bg-primary-500/10" : "text-gray-300"
                  }`}
                >
                  <span>{suggestion.common_name}</span>
                  <span className="text-xs text-gray-500">{suggestion.usage_count} items</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
