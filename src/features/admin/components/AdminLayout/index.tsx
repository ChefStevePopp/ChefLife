import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminSidebar } from "../AdminSidebar";
import { UserMenu } from "@/shared/components/UserMenu";
import { LiveClock } from "@/shared/components/LiveClock";
import { ROUTES } from "@/config/routes";

// Rail = 72px, Expanded panel = 224px (w-56)
const RAIL_WIDTH = 72;
const PANEL_WIDTH = 224;

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  // Calculate sidebar width based on collapsed state
  const sidebarWidth = isSidebarCollapsed ? RAIL_WIDTH : RAIL_WIDTH + PANEL_WIDTH;

  // Update CSS variable for toast position based on clock location
  useEffect(() => {
    const updateToastPosition = () => {
      if (clockRef.current) {
        const rect = clockRef.current.getBoundingClientRect();
        const topOffset = rect.bottom + 12; // 12px gap below clock
        document.documentElement.style.setProperty('--toast-top-offset', `${topOffset}px`);
      }
    };

    updateToastPosition();
    window.addEventListener('resize', updateToastPosition);
    return () => window.removeEventListener('resize', updateToastPosition);
  }, []);

  // Save scroll position before unmount
  useEffect(() => {
    const saveScrollPosition = () => {
      if (contentRef.current) {
        localStorage.setItem(
          "adminLayoutScrollPosition",
          contentRef.current.scrollTop.toString(),
        );
      }
    };

    // Save on unmount and before page unload
    window.addEventListener("beforeunload", saveScrollPosition);

    return () => {
      saveScrollPosition();
      window.removeEventListener("beforeunload", saveScrollPosition);
    };
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem("adminLayoutScrollPosition");
    if (savedPosition && contentRef.current) {
      contentRef.current.scrollTop = parseInt(savedPosition, 10);
    }
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen z-50">
        <AdminSidebar onToggleCollapse={setIsSidebarCollapsed} />
      </div>
      
      {/* Main Content - shifts based on sidebar width */}
      <div 
        className="h-full overflow-hidden flex flex-col transition-all duration-200"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 p-3">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate(ROUTES.KITCHEN.DASHBOARD)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Return to Main Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            {/* Eye of Sauron - Centered Clock with Toast Drop Zone */}
            <div ref={clockRef} className="hidden md:flex flex-col items-center">
              <LiveClock />
            </div>
            
            <UserMenu />
          </div>
        </div>
        <div
          ref={contentRef}
          className="p-4 md:p-6 lg:p-8 w-full overflow-y-auto flex-1"
          style={{ height: "calc(100vh - 57px)" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};
