import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Header } from "@/shared/components/Header";
import { Sidebar } from "@/shared/components/Sidebar";
import { MobileNav } from "@/shared/components/MobileNav";
import { TeamChat } from "@/shared/components/TeamChat";
import { PriceWatchTicker } from "@/features/admin/components/AdminDashboard/PriceWatchTicker";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export const MainLayout: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const location = useLocation();

  // Close chat when switching between mobile and desktop to prevent layout issues
  useEffect(() => {
    setIsChatOpen(false);
  }, [isMobile]);

  // Show ticker on admin routes (Nexus)
  const showTicker = location.pathname.startsWith("/admin");

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Price Watch Ticker - Top Bar (Admin/Nexus only) */}
      {showTicker && (
        <div className="w-full sticky top-0 z-50 bg-gray-900">
          <PriceWatchTicker />
        </div>
      )}

      {/* Header with full width and proper edge padding */}
      <div className="w-full sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="mx-auto w-full px-4 lg:px-6 xl:px-8">
          <Header className="w-full" />
        </div>
      </div>

      <div className={`${showTicker ? "h-[calc(100vh-64px-48px)]" : "h-[calc(100vh-64px)]"} overflow-hidden relative`}>
        {/* Desktop Sidebar - hidden on mobile */}
        {!isMobile && (
          <Sidebar className={`fixed left-0 ${showTicker ? "top-[112px]" : "top-[64px]"} bottom-0 w-20 z-30 border-r border-gray-800 transition-all duration-300`} />
        )}

        {/* Main Content Area */}
        <main
          className={`${isMobile ? "ml-0" : "ml-20"} ${isMobile ? "mb-16 pb-16" : "mr-[2.15rem]"} h-full overflow-y-auto transition-all duration-300`}
        >
          <div className="mx-auto max-w-screen-2xl p-4">
            <Outlet />
          </div>
        </main>

        {/* Gradient Blur Backdrop - lower z-index than header */}
        <div
          className={`
            fixed inset-0 z-30
            transition-all duration-300 ease-in-out
            bg-gradient-to-l from-gray-900/90 via-gray-900/50 to-transparent
            backdrop-blur-md
            ${isChatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => setIsChatOpen(false)}
        />

        {/* Desktop Chat Button - hidden on mobile */}
        {!isMobile && (
          <button
            className="fixed left-0 bottom-4 z-40 flex items-center justify-center w-20 h-12 bg-gray-800/50 hover:bg-primary-600/20 text-gray-400 hover:text-primary-500 transition-all duration-200 border-t border-gray-700/50"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        {/* Desktop TeamChat */}
        <div
          className={`
            hidden lg:block fixed right-[-625px] ${showTicker ? "top-[112px]" : "top-[64px]"} bottom-[3rem]
            w-[625px] z-50 transform transition-all duration-300 ease-in-out
            ${isChatOpen ? "translate-x-[-630px]" : "translate-x-0"}
          `}
        >
          <TeamChat
            className="h-full w-full"
            onClose={() => setIsChatOpen(false)}
          />
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileNav onChatClick={() => setIsChatOpen(!isChatOpen)} />
        )}

        {/* Mobile TeamChat */}
        <div
          className={`
            lg:hidden fixed inset-0 z-50 
            transform transition-all duration-300 ease-in-out
            ${isChatOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <TeamChat
            className="h-full w-full"
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};
