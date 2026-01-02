import { useState, useCallback } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useScheduleStore } from "@/stores/scheduleStore";
import { parseScheduleCsvWithMapping } from "@/lib/schedule-parser-enhanced";
import { ColumnMapping } from "../components";

interface UseScheduleUploadReturn {
  // State
  csvFile: File | null;
  previewData: any[] | null;
  parsedShifts: any[];
  employeeMatches: { [key: string]: any };
  isUploading: boolean;
  isUploadModalOpen: boolean;
  isEmployeeMatchingModalOpen: boolean;
  showCSVConfig: boolean;
  selectedMapping: ColumnMapping | null;
  activateImmediately: boolean;
  startDate: string;
  endDate: string;
  
  // Setters
  setCsvFile: (file: File | null) => void;
  setPreviewData: (data: any[] | null) => void;
  setParsedShifts: (shifts: any[]) => void;
  setEmployeeMatches: (matches: { [key: string]: any }) => void;
  setIsUploadModalOpen: (open: boolean) => void;
  setIsEmployeeMatchingModalOpen: (open: boolean) => void;
  setShowCSVConfig: (show: boolean) => void;
  setSelectedMapping: (mapping: ColumnMapping | null) => void;
  setActivateImmediately: (activate: boolean) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  
  // Functions
  parseCSVFile: (file: File) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleUpload: () => Promise<void>;
  handleConfirmMatches: (matches: { [key: string]: any }) => Promise<void>;
  resetUploadState: () => void;
}

/**
 * Custom hook for managing CSV schedule uploads
 * Handles file selection, parsing, employee matching, and upload workflow
 * Reusable for both Schedule Manager and Attendance Manager
 */
export const useScheduleUpload = (): UseScheduleUploadReturn => {
  // File upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [parsedShifts, setParsedShifts] = useState<any[]>([]);
  const [employeeMatches, setEmployeeMatches] = useState<{ [key: string]: any }>({});
  
  // Upload workflow state
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEmployeeMatchingModalOpen, setIsEmployeeMatchingModalOpen] = useState(false);
  const [showCSVConfig, setShowCSVConfig] = useState(false);
  
  // Configuration state
  const [selectedMapping, setSelectedMapping] = useState<ColumnMapping | null>(null);
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 6); // 7 days total (today + 6)
    return date.toISOString().split("T")[0];
  });
  
  // Get store functions
  const { uploadSchedule, error: scheduleError } = useScheduleStore();
  
  /**
   * Parse CSV file using Papa Parse
   */
  const parseCSVFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.error("Error parsing CSV:", results.errors);
          toast.error("Error parsing CSV file");
          return;
        }
        
        // Set the parsed data for preview
        setPreviewData(results.data);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast.error("Failed to parse CSV file");
      },
    });
  }, []);
  
  /**
   * Handle file selection from input
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVFile(file);
    }
  }, [parseCSVFile]);
  
  /**
   * Handle file drop
   */
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVFile(file);
    }
  }, [parseCSVFile]);
  
  /**
   * Handle drag over event (required for drop to work)
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);
  
  /**
   * Handle initial upload - parse CSV and show employee matching
   */
  const handleUpload = useCallback(async () => {
    if (!csvFile) return;
    
    setIsUploading(true);
    try {
      let shifts;
      
      // If we have a selected mapping, use it to parse the CSV
      if (selectedMapping) {
        shifts = await parseScheduleCsvWithMapping(
          csvFile,
          selectedMapping,
          startDate
        );
      } else {
        shifts = [];
        toast.error("Please select or create a CSV mapping first");
        setIsUploading(false);
        return;
      }
      
      if (shifts.length === 0) {
        toast.error("No valid shifts found in the CSV file");
        setIsUploading(false);
        return;
      }
      
      console.log(`Found ${shifts.length} shifts in the uploaded file`);
      
      // Validate that all shifts have a date
      const shiftsWithoutDate = shifts.filter((shift) => !shift.date);
      if (shiftsWithoutDate.length > 0) {
        console.warn(
          `Found ${shiftsWithoutDate.length} shifts without dates, adding today's date`
        );
        // Fix shifts without dates by adding today's date
        const today = new Date().toISOString().split("T")[0];
        shifts = shifts.map((shift) => ({
          ...shift,
          date: shift.date || today,
        }));
      }
      
      // Close the upload modal first, then show the employee matching modal
      setIsUploadModalOpen(false);
      setParsedShifts(shifts);
      setIsEmployeeMatchingModalOpen(true);
    } catch (error) {
      console.error("Error uploading schedule:", error);
      toast.error(scheduleError || "Failed to upload schedule");
    } finally {
      setIsUploading(false);
    }
  }, [csvFile, selectedMapping, startDate, scheduleError]);
  
  /**
   * Handle employee matching confirmation and final upload
   */
  const handleConfirmMatches = useCallback(async (matches: { [key: string]: any }) => {
    setEmployeeMatches(matches);
    setIsEmployeeMatchingModalOpen(false);
    
    try {
      setIsUploading(true);
      
      // Apply the matches to the parsed shifts
      const matchedShifts = parsedShifts.map((shift) => {
        const match = matches[shift.employee_name];
        if (match) {
          return {
            ...shift,
            employee_id: match.punch_id || match.id,
            first_name: match.first_name,
            last_name: match.last_name,
            punch_id: match.punch_id,
          };
        }
        return shift;
      });
      
      console.log(`Uploading ${matchedShifts.length} shifts to schedule store`);
      
      // Call the actual upload function from the store with the matched shifts
      await uploadSchedule(csvFile, {
        startDate: startDate,
        endDate: endDate,
        activateImmediately: activateImmediately,
        source: "csv",
        selectedMapping: selectedMapping,
        matchedShifts: matchedShifts,
      });
      
      toast.success(
        `Schedule uploaded successfully as ${activateImmediately ? "current" : "upcoming"} schedule`
      );
      
      // Reset state
      setCsvFile(null);
      setPreviewData(null);
      setIsUploadModalOpen(false);
      
      return true; // Signal success to caller
    } catch (error) {
      console.error("Error uploading schedule:", error);
      toast.error(scheduleError || "Failed to upload schedule");
      return false; // Signal failure to caller
    } finally {
      setIsUploading(false);
    }
  }, [
    parsedShifts,
    csvFile,
    startDate,
    endDate,
    activateImmediately,
    selectedMapping,
    uploadSchedule,
    scheduleError,
  ]);
  
  /**
   * Reset all upload state (useful for cleanup)
   */
  const resetUploadState = useCallback(() => {
    setCsvFile(null);
    setPreviewData(null);
    setParsedShifts([]);
    setEmployeeMatches({});
    setIsUploading(false);
    setIsUploadModalOpen(false);
    setIsEmployeeMatchingModalOpen(false);
    setShowCSVConfig(false);
    setSelectedMapping(null);
    setActivateImmediately(false);
    setStartDate(new Date().toISOString().split("T")[0]);
    const date = new Date();
    date.setDate(date.getDate() + 6);
    setEndDate(date.toISOString().split("T")[0]);
  }, []);
  
  return {
    // State
    csvFile,
    previewData,
    parsedShifts,
    employeeMatches,
    isUploading,
    isUploadModalOpen,
    isEmployeeMatchingModalOpen,
    showCSVConfig,
    selectedMapping,
    activateImmediately,
    startDate,
    endDate,
    
    // Setters
    setCsvFile,
    setPreviewData,
    setParsedShifts,
    setEmployeeMatches,
    setIsUploadModalOpen,
    setIsEmployeeMatchingModalOpen,
    setShowCSVConfig,
    setSelectedMapping,
    setActivateImmediately,
    setStartDate,
    setEndDate,
    
    // Functions
    parseCSVFile,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleUpload,
    handleConfirmMatches,
    resetUploadState,
  };
};
