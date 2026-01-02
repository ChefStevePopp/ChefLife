import { useState, useCallback } from "react";

type TabType = "current" | "upcoming" | "previous" | "integration" | "config";
type TimeFormat = "12h" | "24h";

interface UseScheduleUIReturn {
  // Tab state
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  
  // Time format preference
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  toggleTimeFormat: () => void;
  
  // View modal state
  isViewModalOpen: boolean;
  openViewModal: (scheduleId: string) => void;
  closeViewModal: () => void;
  
  // Delete modal state
  isDeleteModalOpen: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  
  // Selected schedule for modals
  selectedScheduleId: string | null;
  setSelectedScheduleId: (id: string | null) => void;
}

/**
 * Custom hook for managing Schedule Manager UI state
 * Handles tabs, modals, and user preferences
 * Reusable for similar components with tab-based navigation
 */
export const useScheduleUI = (
  initialTab: TabType = "current"
): UseScheduleUIReturn => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Time format preference (could be persisted to localStorage)
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");
  
  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Selected schedule for modal operations
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  
  /**
   * Toggle between 12h and 24h time formats
   */
  const toggleTimeFormat = useCallback(() => {
    setTimeFormat((prev) => (prev === "12h" ? "24h" : "12h"));
  }, []);
  
  /**
   * Open view modal with a specific schedule
   */
  const openViewModal = useCallback((scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    setIsViewModalOpen(true);
  }, []);
  
  /**
   * Close view modal and clear selection
   */
  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    // Note: We don't clear selectedScheduleId here in case it's needed after close
  }, []);
  
  /**
   * Open delete confirmation modal
   */
  const openDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);
  
  /**
   * Close delete confirmation modal
   */
  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);
  
  return {
    // Tab state
    activeTab,
    setActiveTab,
    
    // Time format
    timeFormat,
    setTimeFormat,
    toggleTimeFormat,
    
    // View modal
    isViewModalOpen,
    openViewModal,
    closeViewModal,
    
    // Delete modal
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    
    // Selected schedule
    selectedScheduleId,
    setSelectedScheduleId,
  };
};
