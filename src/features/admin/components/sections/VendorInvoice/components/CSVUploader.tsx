import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Settings,
  Calendar,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  ShieldAlert,
} from "lucide-react";
import Papa from "papaparse";
import { useVendorInvoiceStore } from "@/stores/vendorInvoiceStore";
import { parseLocalDate, formatDateForDisplay, getLocalDateString } from "@/utils/dateUtils";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";

interface Props {
  onUpload: (data: any[], fileDate?: Date, sourceFile?: File, supersedeInfo?: { isSupersede: boolean; existingDate: string }) => void;
  hasTemplate?: boolean;
  vendorId?: string;
}

export const CSVUploader: React.FC<Props> = ({
  onUpload,
  hasTemplate = true,
  vendorId,
}) => {
  const { checkDuplicateFile } = useVendorInvoiceStore();
  const { securityLevel } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    filename: string;
    existingDate: string;
    detectedInvoiceDate: Date | null;
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmingSupersede, setConfirmingSupersede] = useState(false);

  // Permission check: Only Omega, Alpha, Bravo can supersede imports
  const canSupersede = securityLevel <= SECURITY_LEVELS.BRAVO;

  // Function to detect date from filename and return as LOCAL date
  // Uses parseLocalDate to avoid timezone shift!
  const detectDateFromFilename = (filename: string): Date | null => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

    // Try different date formats
    // Format: MM-DD-YYYY or DD-MM-YYYY
    const dashFormat = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    // Format: MM-DD-YY or DD-MM-YY
    const dashFormatShortYear = /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
    // Format: YYYY-MM-DD
    const isoFormat = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    // Format: MM_DD_YYYY or DD_MM_YYYY
    const underscoreFormat = /^(\d{1,2})_(\d{1,2})_(\d{4})$/;
    // Format: MM_DD_YY or DD_MM_YY
    const underscoreFormatShortYear = /^(\d{1,2})_(\d{1,2})_(\d{2})$/;
    // Format: MMDDYYYY or DDMMYYYY
    const noSeparatorFormat = /^(\d{2})(\d{2})(\d{4})$/;
    // Format: MMDDYY or DDMMYY
    const noSeparatorFormatShortYear = /^(\d{2})(\d{2})(\d{2})$/;

    let match;
    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;

    // Helper to build local date string and validate
    const tryBuildDate = (y: number, m: number, d: number): Date | null => {
      // Basic validation
      if (m < 1 || m > 12 || d < 1 || d > 31) return null;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = parseLocalDate(dateStr);
      // Verify the date components match (catches invalid dates like Feb 30)
      if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        return date;
      }
      return null;
    };

    if ((match = nameWithoutExt.match(isoFormat))) {
      // YYYY-MM-DD - unambiguous
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(dashFormat))) {
      // MM-DD-YYYY - assume US format
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(dashFormatShortYear))) {
      // MM-DD-YY - assume US format, 20xx century
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = 2000 + parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(underscoreFormat))) {
      // MM_DD_YYYY - assume US format
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(underscoreFormatShortYear))) {
      // MM_DD_YY - assume US format, 20xx century
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = 2000 + parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(noSeparatorFormat))) {
      // MMDDYYYY - assume US format
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    } else if ((match = nameWithoutExt.match(noSeparatorFormatShortYear))) {
      // MMDDYY - assume US format, 20xx century
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = 2000 + parseInt(match[3], 10);
    }

    if (year && month && day) {
      const date = tryBuildDate(year, month, day);
      if (date) {
        // Validate the date is reasonable (within 10 years)
        const now = new Date();
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(now.getFullYear() - 10);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(now.getFullYear() + 1);

        if (date >= tenYearsAgo && date <= oneYearFromNow) {
          return date;
        }
      }
    }

    return null;
  };

  // Process the file (called directly or after duplicate confirmation)
  const processFile = useCallback(
    (file: File, invoiceDate: Date | null, supersedeInfo?: { isSupersede: boolean; existingDate: string }) => {
      // First try to detect the delimiter
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const firstLine = text.split("\n")[0];

        // Try to auto-detect the delimiter
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;

        let delimiter = ",";
        if (tabCount > commaCount && tabCount > semicolonCount)
          delimiter = "\t";
        if (semicolonCount > commaCount && semicolonCount > tabCount)
          delimiter = ";";

        Papa.parse(file, {
          delimiter,
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => {
            return header.trim().toLowerCase();
          },
          complete: (results) => {
            setIsProcessing(false);

            if (results.errors.length > 0) {
              console.error("Parse errors:", results.errors);
              setError(
                `Error parsing file: ${results.errors[0].message}. Row: ${results.errors[0].row}`,
              );
              return;
            }

            if (!results.data || results.data.length === 0) {
              setError("No valid data found in the file.");
              return;
            }

            // Check if we have any valid columns
            const headers = Object.keys(results.data[0]);
            if (headers.length === 0) {
              setError("No valid columns found in the file.");
              return;
            }

            // Remove any completely empty rows
            const filteredData = results.data.filter((row) =>
              Object.values(row).some((val) => val !== "" && val != null),
            );

            if (filteredData.length === 0) {
              setError("File contains no valid data rows.");
              return;
            }

            // Pass the detected date, source file, and supersede info to onUpload
            onUpload(filteredData, invoiceDate || undefined, file, supersedeInfo);
            setDuplicateWarning(null);
            setPendingFile(null);
          },
          error: (error) => {
            console.error("Parse error:", error);
            setError(`Failed to parse file: ${error.message}`);
            setIsProcessing(false);
          },
        });
      };
      reader.readAsText(file);
    },
    [onUpload],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setError(null);
        setDuplicateWarning(null);
        setIsProcessing(true);

        // Detect date from filename (will be passed to DataPreview)
        const detectedDate = detectDateFromFilename(file.name);

        // Check for duplicate filename
        if (vendorId) {
          const { isDuplicate, existingDate } = await checkDuplicateFile(
            vendorId,
            file.name,
          );
          if (isDuplicate && existingDate) {
            setDuplicateWarning({
              filename: file.name,
              existingDate,
              detectedInvoiceDate: detectedDate,
            });
            setPendingFile(file);
            setIsProcessing(false);
            return; // Wait for user confirmation
          }
        }

        // No duplicate, process immediately (not a supersede)
        processFile(file, detectedDate);
      }
    },
    [vendorId, checkDuplicateFile, processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "text/plain": [".csv", ".txt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".csv",
      ],
    },
    multiple: false,
    disabled: !hasTemplate,
  });

  if (!hasTemplate) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-500/10 rounded-lg p-6">
          <div className="text-center">
            <Settings className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              CSV Template Required
            </h3>
            <p className="text-gray-400 mb-4">
              Upload a sample CSV invoice to set up the column mapping template
              for this vendor.
            </p>
          </div>
          <CSVUploader onUpload={onUpload} hasTemplate={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 rounded-lg p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowFormatInfo((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="font-medium text-blue-400">Supported Formats</p>
          </div>
          {showFormatInfo ? (
            <ChevronUp className="w-4 h-4 text-blue-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-400" />
          )}
        </div>

        {showFormatInfo && (
          <div className="mt-3 pl-7 text-sm text-gray-300">
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>CSV files with comma, tab, or semicolon separators</li>
              <li>Files must have a header row with column names</li>
              <li>
                Required columns: item code, product name, unit price, unit of
                measure
              </li>
              <li>
                Pro tip: Name your file with a date (e.g., 01-02-2024.csv) to
                auto-detect the invoice date
              </li>
            </ul>
          </div>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center
          transition-colors cursor-pointer
          ${isDragActive ? "border-primary-500 bg-primary-500/10" : "border-gray-700 hover:border-primary-500/50"}
          ${error ? "border-rose-500" : ""}
        `}
      >
        <input id="csv-file-input" {...getInputProps()} />
        <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-white mb-2">
          Drop your vendor invoice CSV here
        </p>
        <p className="text-sm text-gray-400">or click to select file</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Floating Action Bar for Duplicate Confirmation */}
      {duplicateWarning && pendingFile && (
        <div className="floating-action-bar">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* File Info */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-rose-400" />
                  <span className="text-white font-medium">{duplicateWarning.filename}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span>imported</span>
                  <span className="text-white">
                    {formatDateForDisplay(duplicateWarning.existingDate.split('T')[0])}
                  </span>
                </div>
                {duplicateWarning.detectedInvoiceDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Invoice:</span>
                    <span className="text-white font-medium">
                      {formatDateForDisplay(getLocalDateString(duplicateWarning.detectedInvoiceDate))}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-gray-700" />

              {/* Actions - Permission controlled */}
              {canSupersede ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDuplicateWarning(null);
                      setPendingFile(null);
                      setConfirmingSupersede(false);
                    }}
                    className="btn-ghost text-sm py-1.5 px-4"
                  >
                    Cancel
                  </button>
                  
                  {/* Two-Stage Confirmation Button */}
                  {!confirmingSupersede ? (
                    <button
                      onClick={() => setConfirmingSupersede(true)}
                      className="btn-secondary text-sm py-1.5 px-4 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Create Version 2
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProcessing(true);
                        setConfirmingSupersede(false);
                        // Pass supersede info for NEXUS audit trail
                        processFile(pendingFile, duplicateWarning.detectedInvoiceDate, {
                          isSupersede: true,
                          existingDate: duplicateWarning.existingDate,
                        });
                      }}
                      className="btn-primary text-sm py-1.5 px-4 flex items-center gap-2 bg-amber-600 hover:bg-amber-500 animate-pulse"
                    >
                      <Check className="w-4 h-4" />
                      Confirm Supersede
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-sm">Manager access required to supersede</span>
                  </div>
                  <button
                    onClick={() => {
                      setDuplicateWarning(null);
                      setPendingFile(null);
                    }}
                    className="btn-ghost text-sm py-1.5 px-4"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
