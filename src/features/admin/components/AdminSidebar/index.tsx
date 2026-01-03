import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { menuItems, type MenuItem, type MenuSection } from "./menuItems";
import { ChevronRight, Home, Pin } from "lucide-react";
import { SECURITY_LEVELS, type SecurityLevel } from "@/config/security";

interface AdminSidebarProps {
  onToggleCollapse?: (collapsed: boolean) => void;
}

// Storage keys
const ACTIVE_SECTION_KEY = 'cheflife-sidebar-section';
const KEEP_OPEN_KEY = 'cheflife-sidebar-pinned';
const AUTO_COLLAPSE_DELAY = 4000; // 4 seconds

// L5 Color progression: primary → green → amber → rose → purple → red
// Matches index.css tab colors
const SECTION_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  kitchen:      { bg: 'bg-primary-500/10', border: 'border-primary-500/30', text: 'text-primary-400', hex: '#38bdf8' },
  team:         { bg: 'bg-green-500/10',   border: 'border-green-500/30',   text: 'text-green-400',   hex: '#4ade80' },
  organization: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   hex: '#fbbf24' },
  data:         { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400',    hex: '#fb7185' },
  support:      { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  hex: '#c084fc' },
  dev:          { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     hex: '#f87171' },
};

const getColors = (id: string) => SECTION_COLORS[id] || SECTION_COLORS.team;

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onToggleCollapse }) => {
  const location = useLocation();
  const { isDev, securityLevel } = useAuth();
  const userSecurityLevel: SecurityLevel = (securityLevel ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const sections = menuItems(isDev, userSecurityLevel);

  const [activeSection, setActiveSection] = useState<string | null>(() => 
    localStorage.getItem(ACTIVE_SECTION_KEY)
  );
  const [isPinned, setIsPinned] = useState<boolean>(() => 
    localStorage.getItem(KEEP_OPEN_KEY) === 'true'
  );
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const autoCollapseTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-collapse timer
  const resetAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
    if (activeSection && !isPinned) {
      autoCollapseTimer.current = setTimeout(() => setActiveSection(null), AUTO_COLLAPSE_DELAY);
    }
  }, [activeSection, isPinned]);

  useEffect(() => {
    resetAutoCollapseTimer();
    return () => { if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current); };
  }, [activeSection, resetAutoCollapseTimer]);

  // Persist states
  useEffect(() => { localStorage.setItem(KEEP_OPEN_KEY, isPinned.toString()); }, [isPinned]);
  useEffect(() => {
    if (activeSection) localStorage.setItem(ACTIVE_SECTION_KEY, activeSection);
    else localStorage.removeItem(ACTIVE_SECTION_KEY);
  }, [activeSection]);

  // Notify parent of width
  useEffect(() => {
    const isPersistentlyExpanded = isPinned && activeSection !== null;
    onToggleCollapse?.(!isPersistentlyExpanded);
  }, [activeSection, isPinned, onToggleCollapse]);

  // Find active section from route
  const findActiveSection = useCallback(() => {
    for (const section of sections) {
      if (section.items.some(item => 
        location.pathname === item.path || location.pathname.startsWith(item.path + '/')
      )) return section.id;
    }
    return null;
  }, [sections, location.pathname]);

  // Auto-expand on mount
  useEffect(() => {
    const routeSection = findActiveSection();
    if (routeSection && routeSection !== 'account') setActiveSection(routeSection);
  }, []);

  const toggleSection = (id: string) => setActiveSection(prev => prev === id ? null : id);
  const isItemActive = (item: MenuItem) => 
    location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  const sectionHasActiveItem = (section: MenuSection) => 
    section.items.some(item => isItemActive(item));

  // Render menu item in expanded panel
  const renderMenuItem = (item: MenuItem, sectionId: string) => {
    const isActive = isItemActive(item);
    const isDisabled = item.disabled || item.comingSoon;
    const colors = getColors(sectionId);

    const content = (
      <>
        <item.icon size={18} className={`flex-shrink-0 ${isActive ? colors.text : ''}`} />
        <span className="flex-1 text-sm">{item.label}</span>
        {item.comingSoon && (
          <span className="text-[10px] text-amber-500/70 font-medium uppercase tracking-wide px-1.5 py-0.5 bg-amber-500/10 rounded">
            Soon
          </span>
        )}
      </>
    );

    const classes = `relative group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 ${
      isDisabled
        ? 'text-gray-600 cursor-not-allowed'
        : isActive
          ? 'bg-gray-800/80 text-white border border-gray-700/50'
          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`;

    return isDisabled 
      ? <div className={classes}>{content}</div>
      : <Link to={item.path} className={classes}>{content}</Link>;
  };

  // Render section icon in rail
  const renderSectionIcon = (section: MenuSection) => {
    const isActive = activeSection === section.id;
    const hasActiveItem = sectionHasActiveItem(section);
    const isHovered = hoveredSection === section.id;
    const colors = getColors(section.id);
    const SectionIcon = section.icon;

    if (!SectionIcon) return null;

    // Grey default, colored on hover/active
    const iconColor = (isActive || hasActiveItem || isHovered) ? colors.hex : '#6b7280';

    return (
      <button
        onClick={() => toggleSection(section.id)}
        onMouseEnter={() => setHoveredSection(section.id)}
        onMouseLeave={() => setHoveredSection(null)}
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 border ${
          isActive 
            ? `${colors.bg} ${colors.border}`
            : hasActiveItem
              ? `${colors.bg} border-transparent`
              : 'hover:bg-gray-800 border-transparent'
        }`}
        title={section.label}
      >
        <SectionIcon size={22} className="transition-colors duration-200" style={{ color: iconColor }} />
        {hasActiveItem && !isActive && (
          <div 
            className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: colors.hex }}
          />
        )}
      </button>
    );
  };

  // Render expanded panel
  const renderExpandedSection = () => {
    if (!activeSection) return null;
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;

    const colors = getColors(section.id);
    const SectionIcon = section.icon;

    return (
      <div 
        className="w-56 bg-[#0d1117] border-r border-gray-800/50 flex flex-col animate-in slide-in-from-left-2 duration-200"
        onMouseEnter={resetAutoCollapseTimer}
        onClick={resetAutoCollapseTimer}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            {SectionIcon && (
              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <SectionIcon size={18} className={colors.text} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className={`text-sm font-semibold ${colors.text}`}>{section.label}</h2>
              <p className="text-xs text-gray-500">{section.items.length} items</p>
            </div>
            <button
              onClick={() => setIsPinned(prev => !prev)}
              className={`p-1.5 rounded-lg transition-all ${
                isPinned ? `${colors.bg} ${colors.text}` : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
              title={isPinned ? 'Unpin sidebar' : 'Keep sidebar open'}
            >
              <Pin size={14} className={isPinned ? 'rotate-45' : ''} />
            </button>
          </div>
        </div>

        {/* Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.path}>{renderMenuItem(item, section.id)}</li>
            ))}
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <div className="h-screen flex relative z-50">
      {/* Icon Rail */}
      <div className="w-[72px] bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-3 flex justify-center border-b border-gray-800">
          <img
            src="https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png"
            alt="ChefLife"
            className="w-11 h-11 rounded-xl object-contain"
          />
        </div>

        {/* Rail Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5">
          <div className="space-y-2">
            {/* Dashboard - always primary */}
            <Link
              to="/admin"
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                location.pathname === '/admin'
                  ? 'bg-primary-500/10 border border-primary-500/30'
                  : 'hover:bg-gray-800 border border-transparent'
              }`}
              title="Dashboard"
            >
              <Home 
                size={22} 
                style={{ color: location.pathname === '/admin' ? '#38bdf8' : '#6b7280' }}
                className="transition-colors duration-200"
              />
            </Link>

            <div className="h-px bg-gray-800 mx-2 my-3" />

            {/* Section Icons */}
            {sections
              .filter(s => s.collapsible !== false && s.icon)
              .map((section) => (
                <div key={section.id}>{renderSectionIcon(section)}</div>
              ))}
          </div>
        </nav>

        {/* Collapse button */}
        {activeSection && (
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={() => setActiveSection(null)}
              className="w-12 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              title="Collapse"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {renderExpandedSection()}
    </div>
  );
};
