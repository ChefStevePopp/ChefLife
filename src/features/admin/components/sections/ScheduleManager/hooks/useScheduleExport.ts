/**
 * useScheduleExport Hook
 * 
 * Handles exporting schedules to CSV format.
 * Priority: Downloads original uploaded CSV from Supabase Storage
 * Fallback: Generates CSV from shift data if original not available
 */

import { supabase } from "@/lib/supabase";
import { useScheduleStore } from "@/stores/scheduleStore";
import Papa from "papaparse";
import toast from "react-hot-toast";

export const useScheduleExport = () => {
  const { scheduleShifts, fetchShifts } = useScheduleStore();

  const exportScheduleToCSV = async (scheduleId: string) => {
    try {
      // First, get the schedule record to find the file_url
      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();

      if (scheduleError) throw scheduleError;
      
      if (!schedule) {
        toast.error("Schedule not found");
        return;
      }

      // Check if there's a file_url (original CSV)
      if (schedule.file_url) {
        // Download the original CSV file from storage
        try {
          // Extract the file path from the public URL
          // URL format: https://{project}.supabase.co/storage/v1/object/public/schedules/{path}
          const urlParts = schedule.file_url.split('/storage/v1/object/public/schedules/');
          
          if (urlParts.length < 2) {
            throw new Error('Invalid file URL format');
          }
          const filePath = decodeURIComponent(urlParts[1]);

          // Download the file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('schedules')
            .download(filePath);

          if (downloadError) throw downloadError;

          if (!fileData) {
            throw new Error('No file data returned from storage');
          }

          // Create a download link for the original file
          const url = URL.createObjectURL(fileData);
          const link = document.createElement('a');
          link.href = url;
          
          // Create filename from schedule dates
          const filename = `schedule_${schedule.start_date}_to_${schedule.end_date}.csv`;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success('Original schedule file downloaded successfully');
          return;
        } catch (storageError) {
          console.error('Error downloading from storage:', storageError);
          toast.error('Original file not available, generating from shift data...', {
            duration: 4000,
          });
          // Fall through to generate CSV from shifts
        }
      }

      // FALLBACK: If no file_url or download failed, generate CSV from shift data
      // This handles schedules from 7shifts or if storage file is missing
      await fetchShifts(scheduleId);

      // Get the shifts from the store
      const shifts = useScheduleStore.getState().scheduleShifts;

      if (shifts.length === 0) {
        toast.error("No shifts found to export");
        return;
      }

      // Convert shifts to CSV format
      const csvData = shifts.map((shift) => ({
        "Employee Name":
          `${shift.first_name || ""} ${shift.last_name || ""}`.trim() ||
          shift.employee_name,
        Role: shift.role || "",
        Date: shift.shift_date,
        "Start Time": shift.start_time,
        "End Time": shift.end_time,
        "Break Duration": shift.break_duration || 0,
        Notes: shift.notes || "",
      }));

      // Use PapaParse to convert to CSV string
      const csv = Papa.unparse(csvData);

      // Create a blob and download link
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const filename = `schedule_${schedule.start_date}_to_${schedule.end_date}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Schedule exported successfully");
    } catch (error) {
      console.error("Error exporting schedule:", error);
      toast.error("Failed to export schedule");
    }
  };

  return {
    exportScheduleToCSV,
    scheduleShifts,
  };
};
