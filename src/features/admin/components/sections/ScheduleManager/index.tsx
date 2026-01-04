// MODULARIZATION IN PROGRESS - BACKUP EXISTS AS index.backup.tsx IF NEEDED
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Upload,
  History,
  Link,
  Clock,
  Users,
  FileSpreadsheet,
  RefreshCw,
  Download,
  X,
  Settings,
  Eye,
  Trash,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Plug,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useScheduleStore } from "@/stores/scheduleStore";
import { ScheduleShift } from "@/types/schedule";
import {
  CSVConfiguration,
  ColumnMapping,
  TimeFormatToggle,
  EmployeeMatchingModal,
  ScheduleWeekView,
  PreviousSchedulesView,
  UpcomingSchedulesView,
} from "./components";
import { useScheduleMappingStore } from "@/stores/scheduleMappingStore";
import { MappingManager } from "./components/MappingManager";

import { useScheduleExport } from "./hooks/useScheduleExport";
import { useScheduleData } from "./hooks/useScheduleData";
import { useScheduleUpload } from "./hooks/useScheduleUpload";
import { useScheduleUI } from "./hooks/useScheduleUI";
import { use7ShiftsSync } from "./hooks/use7ShiftsSync";

// Helper function to format time based on user preference
const formatTime = (timeStr: string, format: "12h" | "24h"): string => {
  if (!timeStr) return "";

  // If already in 12-hour format with am/pm
  if (
    timeStr.toLowerCase().includes("am") ||
    timeStr.toLowerCase().includes("pm")
  ) {
    return format === "12h" ? timeStr : convertTo24Hour(timeStr);
  }

  // If in 24-hour format (HH:MM)
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
    return format === "24h" ? timeStr : convertTo12Hour(timeStr);
  }

  // Return as is if we can't determine the format
  return timeStr;
};

// Convert 24-hour format to 12-hour format
const convertTo12Hour = (time24: string): string => {
  const [hourStr, minute] = time24.split(":");
  const hour = parseInt(hourStr, 10);

  if (hour === 0) {
    return `12:${minute} AM`;
  } else if (hour < 12) {
    return `${hour}:${minute} AM`;
  } else if (hour === 12) {
    return `12:${minute} PM`;
  } else {
    return `${hour - 12}:${minute} PM`;
  }
};

// Convert 12-hour format to 24-hour format
const convertTo24Hour = (time12: string): string => {
  const [timePart, meridiem] = time12.toLowerCase().split(/(am|pm)/);
  let [hourStr, minute] = timePart.trim().split(":");
  let hour = parseInt(hourStr, 10);

  if (meridiem.includes("pm") && hour < 12) {
    hour += 12;
  } else if (meridiem.includes("am") && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
};

export const ScheduleManager: React.FC = () => {
  const navigate = useNavigate();
  
  // UI state hook for tabs, modals, and preferences
  const {
    activeTab,
    setActiveTab,
    timeFormat,
    setTimeFormat,
    isViewModalOpen,
    openViewModal,
    closeViewModal,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    selectedScheduleId,
  } = useScheduleUI();

  // 7shifts sync hook (simplified - uses centralized integration)
  const {
    isConnected: is7shiftsConnected,
    isLoading: is7shiftsLoading,
    lastSyncAt,
    locationId: sevenShiftsLocationId,
    isSyncing,
    syncStartDate,
    setSyncStartDate,
    syncEndDate,
    setSyncEndDate,
    syncSchedule: handleSync7shifts,
    canSync,
  } = use7ShiftsSync();

  // Use the export hook
  const { exportScheduleToCSV } = useScheduleExport();

  // Use the upload hook for CSV upload workflow
  const {
    csvFile,
    previewData,
    parsedShifts,
    isUploading,
    isUploadModalOpen,
    isEmployeeMatchingModalOpen,
    showCSVConfig,
    selectedMapping,
    activateImmediately,
    startDate,
    endDate,
    setCsvFile,
    setPreviewData,
    setIsUploadModalOpen,
    setIsEmployeeMatchingModalOpen,
    setShowCSVConfig,
    setSelectedMapping,
    setActivateImmediately,
    setStartDate,
    setEndDate,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleUpload,
    handleConfirmMatches,
  } = useScheduleUpload();

  // Use the data hook for all schedule data operations
  const {
    currentSchedule,
    scheduleShifts,
    upcomingSchedules,
    previousSchedules,
    allSchedules,
    isLoading,
    initialFetchDone,
    error,
    manualScheduleId,
    setManualScheduleId,
    fetchCurrentScheduleData,
    fetchUpcomingSchedulesData,
    fetchPreviousSchedulesData,
    fetchShiftsForSchedule,
    handlePreviousWeek,
    handleNextWeek,
    handleManualScheduleChange,
    refreshCurrentSchedule,
  } = useScheduleData();

  // Get operation functions from the store (schedule activation only)
  const { error: scheduleError } = useScheduleStore();

  // Get the mapping store functions
  const { mappings, fetchMappings } = useScheduleMappingStore();

  // Load saved mappings from the store on component mount
  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Save a column mapping
  const handleSaveMapping = (mapping: ColumnMapping) => {
    // Use the store to save the mapping
    useScheduleMappingStore
      .getState()
      .saveMapping(mapping)
      .then(() => {
        setSelectedMapping(mapping);
        setShowCSVConfig(false);
        toast.success("Mapping saved successfully");
      })
      .catch((error) => {
        console.error("Error saving mapping:", error);
        toast.error("Failed to save mapping");
      });
  };


  // Handle activating an upcoming schedule
  const handleActivateUpcoming = async (scheduleId: string) => {
    setIsUploading(true);
    try {
      // Call the actual activate function from the store
      await useScheduleStore.getState().activateSchedule(scheduleId);

      // Refresh the schedule data using the hook
      await refreshCurrentSchedule();
      await fetchUpcomingSchedulesData();

      toast.success("Schedule activated successfully");
    } catch (error) {
      console.error("Error activating schedule:", error);
      toast.error(scheduleError || "Failed to activate schedule");
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (!initialFetchDone) return; // Wait for initial data load
    
    if (activeTab === "upcoming") {
      fetchUpcomingSchedulesData();
    } else if (activeTab === "previous") {
      fetchPreviousSchedulesData();
    } else if (activeTab === "config") {
      fetchMappings();
    }
    // Note: "current" tab doesn't need to refetch on switch - data is already loaded
  }, [activeTab, initialFetchDone, fetchUpcomingSchedulesData, fetchPreviousSchedulesData, fetchMappings]);

  // Process shifts to organize them by day - use manual selection
  const days = useMemo(() => {
    // Find the manually selected schedule or fall back to current
    const displaySchedule = manualScheduleId 
      ? allSchedules.find(s => s.id === manualScheduleId) || currentSchedule
      : currentSchedule;
      
    if (!displaySchedule) {
      // Return empty days for the week
      return Array(7)
        .fill(null)
        .map((_, i) => ({
          date: "",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ][i],
          shifts: [],
        }));
    }

    // Group shifts by date
    const shiftsByDate = scheduleShifts.reduce(
      (acc, shift) => {
        if (!acc[shift.shift_date]) {
          acc[shift.shift_date] = [];
        }
        acc[shift.shift_date].push(shift);
        return acc;
      },
      {} as Record<string, ScheduleShift[]>,
    );

    // DEBUG: Log what dates we have shifts for
    console.log('Schedule shifts by date:', Object.keys(shiftsByDate));
    console.log('Total shifts:', scheduleShifts.length);
    console.log('Display schedule:', displaySchedule.start_date, 'to', displaySchedule.end_date);

    // Create array of days
    const startDate = new Date(displaySchedule.start_date + 'T00:00:00'); // Force local time
    return Array(7)
      .fill(null)
      .map((_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const shiftsForDay = shiftsByDate[dateStr] || [];
        
        // DEBUG: Log each day
        console.log(`Day ${i}: ${dateStr} (${[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ][i]}) - ${shiftsForDay.length} shifts`);
        
        return {
          date: dateStr,
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ][i],
          shifts: shiftsForDay,
        };
      });
  }, [currentSchedule, scheduleShifts, manualScheduleId, allSchedules]);

  return (
    <div className="space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Schedule Manager
          </h1>
          <p className="text-sm sm:text-base text-gray-400">Upload and manage employee schedules</p>
        </div>
      </div>

      {/* Tabs - Responsive with horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50 -mx-1 px-1">
        <button
          onClick={() => setActiveTab("current")}
          className={`tab primary whitespace-nowrap flex-shrink-0 snap-start ${activeTab === "current" ? "active" : ""}`}
        >
          <Calendar
            className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0 ${activeTab === "current" ? "text-primary-400" : ""}`}
          />
          <span className="text-sm sm:text-base">Current Schedule</span>
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`tab green whitespace-nowrap flex-shrink-0 snap-start ${activeTab === "upcoming" ? "active" : ""}`}
        >
          <Clock
            className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0 ${activeTab === "upcoming" ? "text-green-400" : ""}`}
          />
          <span className="text-sm sm:text-base">Upcoming</span>
        </button>
        <button
          onClick={() => setActiveTab("previous")}
          className={`tab amber whitespace-nowrap flex-shrink-0 snap-start ${activeTab === "previous" ? "active" : ""}`}
        >
          <History
            className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0 ${activeTab === "previous" ? "text-amber-400" : ""}`}
          />
          <span className="text-sm sm:text-base">Previous</span>
        </button>
        <button
          onClick={() => setActiveTab("integration")}
          className={`tab rose whitespace-nowrap flex-shrink-0 snap-start ${activeTab === "integration" ? "active" : ""}`}
        >
          <Link
            className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0 ${activeTab === "integration" ? "text-rose-400" : ""}`}
          />
          <span className="text-sm sm:text-base hidden sm:inline">7shifts Sync</span>
          <span className="text-sm sm:text-base sm:hidden">7shifts</span>
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`tab purple whitespace-nowrap flex-shrink-0 snap-start ${activeTab === "config" ? "active" : ""}`}
        >
          <Settings
            className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0 ${activeTab === "config" ? "text-purple-400" : ""}`}
          />
          <span className="text-sm sm:text-base hidden sm:inline">CSV Configuration</span>
          <span className="text-sm sm:text-base sm:hidden">CSV</span>
        </button>
      </div>

      {/* Current Schedule Tab */}
      {activeTab === "current" && (
        <div className="space-y-6">
          {/* Current Schedule Card */}
          <div className="card p-6">
            {/* Header Section - Responsive */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 bg-[#262d3c] p-3 sm:p-4 rounded-lg shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-white">
                    Current Schedule
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {currentSchedule
                      ? `Week of ${currentSchedule.start_date} - ${currentSchedule.end_date}`
                      : "No active schedule"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Week Navigation - Safety Override - Responsive */}
                {allSchedules.length > 0 && (
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 flex-shrink-0">
                    <button
                      onClick={handlePreviousWeek}
                      className="p-1 hover:bg-gray-600/50 rounded transition-colors"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
                    </button>
                    <select
                      value={manualScheduleId || ""}
                      onChange={(e) => handleManualScheduleChange(e.target.value)}
                      className="bg-transparent border-none text-xs sm:text-sm text-gray-300 focus:outline-none cursor-pointer pr-4 sm:pr-6"
                      style={{ minWidth: "140px" }}
                      title={`${allSchedules.length} schedules available`}
                    >
                      {allSchedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.start_date} to {schedule.end_date}
                          {schedule.status === "current" ? " (Current)" : ""}
                          {schedule.status === "upcoming" ? " (Upcoming)" : ""}
                          {schedule.status === "previous" ? " (Previous)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleNextWeek}
                      className="p-1 hover:bg-gray-600/50 rounded transition-colors"
                      title="Next week"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
                    </button>
                  </div>
                )}
                <TimeFormatToggle
                  timeFormat={timeFormat}
                  onChange={setTimeFormat}
                />
                <button 
                  onClick={() => currentSchedule && exportScheduleToCSV(currentSchedule.id)}
                  disabled={!currentSchedule}
                  className="btn-ghost text-sm hidden md:flex"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button 
                  onClick={() => currentSchedule && exportScheduleToCSV(currentSchedule.id)}
                  disabled={!currentSchedule}
                  className="btn-ghost text-sm md:hidden p-2"
                >
                  <Download className="w-4 h-4" />
                </button>
                {currentSchedule && (
                  <>
                    <button
                      onClick={openDeleteModal}
                      className="btn-ghost-red text-sm hidden md:flex"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                    <button
                      onClick={openDeleteModal}
                      className="btn-ghost-red text-sm md:hidden p-2"
                      title="Delete Schedule"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-primary text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Upload Schedule</span>
                  <span className="sm:hidden">Upload</span>
                </button>
              </div>
            </div>

            {/* Schedule Calendar View */}
            <div className="bg-gray-800/50 rounded-lg p-6 min-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                </div>
              ) : !currentSchedule ? (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Calendar className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-4">No active schedule found</p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn-primary"
                  >
                    Upload Schedule
                  </button>
                </div>
              ) : (
                <ScheduleWeekView
                  scheduleShifts={scheduleShifts}
                  startDate={currentSchedule.start_date}
                  timeFormat={timeFormat}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Schedules Tab */}
      {activeTab === "upcoming" && (
        <div className="card p-6">
          {/* Header Section - Matching Design */}
          <div className="flex items-center justify-between mb-6 bg-[#262d3c] p-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#262d3c]">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  Upcoming Schedules
                </h3>
                <p className="text-sm text-gray-400">
                  View and manage upcoming schedules
                </p>
              </div>
            </div>
            <div className="flex gap-2 mr-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Schedule
              </button>
            </div>
          </div>

           {/* Upcoming Schedules Tab */}
               <UpcomingSchedulesView
            upcomingSchedules={upcomingSchedules}
            onActivate={handleActivateUpcoming}
            onExport={exportScheduleToCSV}
            onView={async (scheduleId) => {
              await fetchShiftsForSchedule(scheduleId);
              openViewModal(scheduleId);
            }}
            onDelete={async (scheduleId) => {
              const success = await useScheduleStore.getState().deleteSchedule(scheduleId);
              if (success) {
                toast.success("Upcoming schedule deleted successfully");
                await fetchUpcomingSchedulesData();
              } else {
                toast.error("Failed to delete upcoming schedule");
              }
            }}
            onUploadNew={() => setIsUploadModalOpen(true)}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Previous Schedules Tab */}
      {activeTab === "previous" && (
        <div className="card p-6">
          {/* Header Section - Matching Design */}
          <div className="flex items-center justify-between mb-6 bg-[#262d3c] p-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#262d3c]">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <History className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  Previous Schedules
                </h3>
                <p className="text-sm text-gray-400">
                  View and download past schedules
                </p>
              </div>
            </div>
          </div>

          <PreviousSchedulesView
            schedules={useScheduleStore.getState().previousSchedules}
            onView={async (scheduleId) => {
              await fetchShiftsForSchedule(scheduleId);
              openViewModal(scheduleId);
            }}
            onExport={exportScheduleToCSV}
            onDelete={async (scheduleId) => {
              const success = await useScheduleStore.getState().deleteSchedule(scheduleId);
              if (success) {
                toast.success("Schedule deleted successfully");
                await fetchPreviousSchedulesData();
              } else {
                toast.error("Failed to delete schedule");
              }
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 7shifts Sync Tab - SIMPLIFIED */}
      {activeTab === "integration" && (
        <div className="card p-6">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6 bg-[#262d3c] p-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#262d3c]">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <Link className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  7shifts Sync
                </h3>
                <p className="text-sm text-gray-400">
                  Import schedules from your 7shifts account
                </p>
              </div>
            </div>
          </div>

          {is7shiftsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full"></div>
            </div>
          ) : is7shiftsConnected ? (
            /* Connected State - Show Sync Controls */
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <img
                        src="https://framerusercontent.com/images/GTwNANjmDcbIsFhKyhhH32pNv4.png?scale-down-to=512"
                        alt="7shifts logo"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">7shifts</h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Location ID: {sevenShiftsLocationId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/integrations')}
                    className="btn-ghost text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </button>
                </div>
                {lastSyncAt && (
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-green-500/20">
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Sync Controls */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-white font-medium mb-4">Import Schedule</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Select a date range to import shifts from 7shifts into ChefLife.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={syncStartDate}
                      onChange={(e) => setSyncStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={syncEndDate}
                      onChange={(e) => setSyncEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSync7shifts}
                  disabled={!canSync}
                  className="btn-primary w-full"
                >
                  {isSyncing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected State - Prompt to Connect */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Plug className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                7shifts Not Connected
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Connect your 7shifts account in the Integrations hub to enable automatic schedule imports.
              </p>
              <button
                onClick={() => navigate('/admin/integrations')}
                className="btn-primary"
              >
                <Plug className="w-4 h-4 mr-2" />
                Go to Integrations
              </button>
              <p className="text-xs text-gray-500 mt-4">
                <a 
                  href="https://www.7shifts.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-400 inline-flex items-center gap-1"
                >
                  Don't have 7shifts? Learn more <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSV Configuration Tab */}
      {activeTab === "config" && (
        <div className="card p-6">
          {/* Header Section - Matching Vendor Invoice Manager Style */}
          <div className="flex items-center justify-between mb-6 bg-[#262d3c] p-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#262d3c]">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  CSV Configuration
                </h3>
                <p className="text-sm text-gray-400">
                  Manage CSV import mappings for different schedule formats
                </p>
              </div>
            </div>
          </div>

          {/* Help Section - What are CSV Mappings? */}
          <div className="expandable-info-section mb-6">
            <button
              onClick={(e) => {
                const section = e.currentTarget.closest('.expandable-info-section');
                section?.classList.toggle('expanded');
              }}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <h3 className="text-lg font-medium text-white">What are CSV Mappings?</h3>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up w-5 h-5 text-gray-400">
                <path d="m18 15-6-6-6 6"></path>
              </svg>
            </button>
            <div className="expandable-info-content">
              <p className="text-sm text-gray-300 p-4">
                CSV Mappings tell ChefLife how to read your schedule files. Different scheduling systems (7shifts, HotSchedules, Excel) export data with different column names and formats. 
                For example, one system might use "Employee Name" while another uses "Staff Member" or "Team Member". 
                Mappings let you save these configurations so you don't have to set them up every time you upload a schedule.
              </p>
            </div>
          </div>

          {/* Mapping Manager Component */}
          <MappingManager
            onSelectMapping={setSelectedMapping}
            onCreateMapping={() => {
              setCsvFile(null);
              setSelectedMapping(null);
              setIsUploadModalOpen(true);
              setShowCSVConfig(true);
            }}
          />
        </div>
      )}

      {/* Quick Reference - Separate Card */}
      {activeTab === "config" && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Quick Reference
              </h3>
              <p className="text-sm text-gray-400">
                Common CSV format types and their use cases
              </p>
            </div>
          </div>

          {/* Help Section - Format Types */}
          <div className="expandable-info-section mb-6">
            <button
              onClick={(e) => {
                const section = e.currentTarget.closest('.expandable-info-section');
                section?.classList.toggle('expanded');
              }}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <h3 className="text-lg font-medium text-white">Understanding Format Types</h3>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up w-5 h-5 text-gray-400">
                <path d="m18 15-6-6-6 6"></path>
              </svg>
            </button>
            <div className="expandable-info-content">
              <div className="text-sm text-gray-300 p-4 space-y-3">
                <div>
                  <p className="font-medium text-purple-400 mb-1">Standard Format</p>
                  <p className="text-sm">Each row is one shift with separate columns for employee, date, start time, and end time. Common in systems like 7shifts and HotSchedules.</p>
                  <p className="text-xs text-gray-500 mt-1">Example: John Doe | 2024-12-28 | 09:00 | 17:00 | Server</p>
                </div>
                <div>
                  <p className="font-medium text-purple-400 mb-1">Weekly Format</p>
                  <p className="text-sm">Employees are listed in rows, days of the week are columns, and shift times are in the cells. Common in Excel-based schedules.</p>
                  <p className="text-xs text-gray-500 mt-1">Example: John Doe | 9am-5pm | OFF | 10am-6pm | ...</p>
                </div>
                <div>
                  <p className="font-medium text-purple-400 mb-1">Custom Format</p>
                  <p className="text-sm">For unique CSV layouts that don't fit the standard or weekly patterns. Map any columns you need from your custom export.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                <h4 className="font-medium text-white">Standard Format</h4>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                One row per shift with date, time, and employee columns
              </p>
              <div className="text-xs text-gray-500">
                Best for: 7shifts, HotSchedules, POS exports
              </div>
            </div>

            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h4 className="font-medium text-white">Weekly Format</h4>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Employees in rows, weekdays as columns
              </p>
              <div className="text-xs text-gray-500">
                Best for: Excel schedules, printed rotas
              </div>
            </div>

            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h4 className="font-medium text-white">Custom Format</h4>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Define your own column mappings for unique layouts
              </p>
              <div className="text-xs text-gray-500">
                Best for: Custom spreadsheets, legacy systems
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Matching Modal */}
      <EmployeeMatchingModal
        isOpen={isEmployeeMatchingModalOpen}
        onClose={() => setIsEmployeeMatchingModalOpen(false)}
        scheduleEmployees={parsedShifts.map((shift) => ({
          employee_name: shift.employee_name,
          first_name: shift.first_name,
          last_name: shift.last_name,
          role: shift.role,
        }))}
        onConfirmMatches={async (matches) => {
          const success = await handleConfirmMatches(matches);
          
          // Refresh data after successful upload
          if (success) {
            if (activateImmediately) {
              await refreshCurrentSchedule();
            } else {
              await fetchUpcomingSchedulesData();
            }
          }
        }}
      />

      {/* Schedule View Modal */}
      {isViewModalOpen && selectedScheduleId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-lg w-full max-w-5xl my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                Schedule Details
              </h3>
              <div className="flex items-center gap-3">
                <TimeFormatToggle
                  timeFormat={timeFormat}
                  onChange={setTimeFormat}
                />
                <button
                  onClick={() => exportScheduleToCSV(selectedScheduleId)}
                  className="btn-ghost text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
                </div>
              ) : scheduleShifts.length > 0 ? (
                <div className="space-y-6">
                  {/* Schedule info */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">
                      Schedule Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Shifts:</span>
                        <span className="text-white ml-2">
                          {scheduleShifts.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Unique Employees:</span>
                        <span className="text-white ml-2">
                          {
                            new Set(scheduleShifts.map((s) => s.employee_name))
                              .size
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Date Range:</span>
                        <span className="text-white ml-2">
                          {scheduleShifts.length > 0
                            ? `${new Date(Math.min(...scheduleShifts.map((s) => new Date(s.shift_date).getTime()))).toLocaleDateString()} - 
                             ${new Date(Math.max(...scheduleShifts.map((s) => new Date(s.shift_date).getTime()))).toLocaleDateString()}`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shifts table */}
                  <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            Employee
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            Role
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            Start Time
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            End Time
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {scheduleShifts
                          .sort(
                            (a, b) =>
                              a.shift_date.localeCompare(b.shift_date) ||
                              a.start_time.localeCompare(b.start_time),
                          )
                          .map((shift) => {
                            // Calculate shift duration
                            const startParts = shift.start_time.split(":");
                            const endParts = shift.end_time.split(":");
                            const startHours = parseInt(startParts[0]);
                            const startMinutes = parseInt(startParts[1]);
                            const endHours = parseInt(endParts[0]);
                            const endMinutes = parseInt(endParts[1]);

                            let durationHours = endHours - startHours;
                            let durationMinutes = endMinutes - startMinutes;

                            if (durationMinutes < 0) {
                              durationHours -= 1;
                              durationMinutes += 60;
                            }

                            // Handle overnight shifts
                            if (durationHours < 0) {
                              durationHours += 24;
                            }

                            const durationStr = `${durationHours}h ${durationMinutes}m`;

                            return (
                              <tr
                                key={shift.id}
                                className="hover:bg-gray-700/30"
                              >
                                <td className="px-4 py-2 text-sm text-white">
                                  {shift.employee_name}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {shift.role ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${(() => {
                                        // Generate a consistent color for each role
                                        const roleHash = shift.role
                                          .split("")
                                          .reduce(
                                            (acc, char) =>
                                              acc + char.charCodeAt(0),
                                            0,
                                          );
                                        const bgColors = [
                                          "bg-primary-500/20 text-primary-400",
                                          "bg-green-500/20 text-green-400",
                                          "bg-amber-500/20 text-amber-400",
                                          "bg-rose-500/20 text-rose-400",
                                          "bg-purple-500/20 text-purple-400",
                                          "bg-blue-500/20 text-blue-400",
                                        ];
                                        return bgColors[
                                          roleHash % bgColors.length
                                        ];
                                      })()}`}
                                    >
                                      {shift.role}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {new Date(
                                    shift.shift_date,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {formatTime(shift.start_time, timeFormat)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {formatTime(shift.end_time, timeFormat)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {durationStr}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-white mb-2">
                    No Shifts Found
                  </h4>
                  <p className="text-gray-400">
                    There are no shifts associated with this schedule.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={closeViewModal}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Schedule Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-lg w-full max-w-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                Upload Schedule
              </h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setShowCSVConfig(false);
                  setCsvFile(null);
                  setPreviewData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {showCSVConfig ? (
                <CSVConfiguration
                  previewData={previewData}
                  onSaveMapping={handleSaveMapping}
                  onCancel={() => setShowCSVConfig(false)}
                />
              ) : (
                <div className="space-y-6">
                  {/* File Upload */}
                  <div
                    className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => {
                      const input = document.getElementById(
                        "schedule-file-input",
                      ) as HTMLInputElement;
                      if (input) input.click();
                    }}
                  >
                    <input
                      type="file"
                      id="schedule-file-input"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    {csvFile ? (
                      <div>
                        <p className="text-white font-medium">{csvFile.name}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {(csvFile.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          className="text-primary-400 text-sm mt-2 hover:text-primary-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCsvFile(null);
                            setPreviewData(null);
                          }}
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-medium">
                          Drag & drop your CSV file here
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          or click to browse files
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mapping Selection */}
                  {csvFile && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          CSV Mapping
                        </label>
                        <div className="flex gap-2">
                          <select
                            className="input flex-1"
                            value={selectedMapping?.id || ""}
                            onChange={(e) => {
                              const mappingId = e.target.value;
                              const mapping = mappings.find(
                                (m) => m.id === mappingId,
                              );
                              setSelectedMapping(mapping || null);
                            }}
                          >
                            <option value="">Select a mapping</option>
                            {mappings.map((mapping) => (
                              <option key={mapping.id} value={mapping.id}>
                                {mapping.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setShowCSVConfig(true)}
                            className="btn-secondary whitespace-nowrap"
                          >
                            Configure New
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Start Date
                          </label>
                          <input
                            type="date"
                            className="input w-full"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            End Date
                          </label>
                          <input
                            type="date"
                            className="input w-full"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="activate-immediately"
                          className="mr-2"
                          checked={activateImmediately}
                          onChange={(e) =>
                            setActivateImmediately(e.target.checked)
                          }
                        />
                        <label
                          htmlFor="activate-immediately"
                          className="text-gray-300"
                        >
                          Activate immediately (replace current schedule)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!showCSVConfig && (
              <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setCsvFile(null);
                    setPreviewData(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!csvFile || !selectedMapping || isUploading}
                  className="btn-primary"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    "Upload Schedule"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Delete Current Schedule
              </h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete the current schedule? This
                action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const success = await useScheduleStore
                        .getState()
                        .deleteSchedule(currentSchedule.id);
                      if (success) {
                        toast.success("Schedule deleted successfully");
                        closeDeleteModal();
                        // Refresh the current schedule using hook
                        await refreshCurrentSchedule();
                      } else {
                        toast.error("Failed to delete schedule");
                      }
                    } catch (error) {
                      console.error("Error deleting schedule:", error);
                      toast.error("An error occurred while deleting schedule");
                    }
                  }}
                  className="btn-danger"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete Schedule"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
