import React, { useCallback, useState } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  UserX,
} from "lucide-react";
import { useTeamStore } from "@/stores/teamStore";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import toast from "react-hot-toast";

interface ImportTeamModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ImportTeamModal: React.FC<ImportTeamModalProps> = ({
  isOpen = false,
  onClose,
}) => {
  const { importTeamMembers, executeTeamImport } = useTeamStore();
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [missingAction, setMissingAction] = useState<'keep' | 'inactive' | 'delete'>('inactive');

  const downloadTemplate = () => {
    // Simplified - just create example CSV
    const csvContent = "First Name,Last name,Email,Mobile phone,Punch ID,Locations,Departments,Roles\n" +
      "John,Smith,john@example.com,555-0123,EMP001,Main Location,Kitchen,Line Cook";

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "team_import_template.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error("CSV file is empty");
            return;
          }

          const firstRow = results.data[0] as any;
          const headers = Object.keys(firstRow);

          // Check if it's a 7shifts export
          const is7shifts =
            headers.includes("First Name") && headers.includes("Last name");

          if (!is7shifts) {
            toast.error("Please use a 7shifts employee export CSV");
            return;
          }

          // Validate required columns
          const hasRequired =
            headers.includes("First Name") &&
            headers.includes("Last name");

          if (!hasRequired) {
            toast.error("CSV must have First Name and Last name columns");
            return;
          }

          // Create preview of first 5 rows
          const preview = results.data.slice(0, 5).map((row: any) => ({
            name: `${row["First Name"] || ""} ${row["Last name"] || ""}`.trim(),
            email: row["Email"] || "—",
            punchId: row["Punch ID"] || "—",
            departments: row["Departments"] || "—",
          }));

          setPreviewData(preview);
          setFileData(results.data);

          // Process import to get summary
          try {
            const summary = await importTeamMembers(results.data);
            setImportSummary(summary);
            toast.success(
              `Found ${results.data.length} team members in CSV`
            );
          } catch (error) {
            console.error("Error analyzing CSV:", error);
            toast.error("Failed to analyze CSV file");
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          toast.error("Failed to parse CSV file");
        },
      });
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read file");
    }
  }, [importTeamMembers]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleConfirmImport = async () => {
    if (!importSummary) return;

    try {
      const missingIds = importSummary.notInCSV.map((m: any) => m.id);
      await executeTeamImport(
        importSummary.newMembers,
        missingAction,
        missingIds
      );
      setFileData(null);
      setPreviewData(null);
      setFileName("");
      setImportSummary(null);
      onClose?.();
    } catch (error) {
      // Error already handled in store
    }
  };

  const handleCancel = () => {
    setFileData(null);
    setPreviewData(null);
    setFileName("");
    setImportSummary(null);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Import Team Data</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!fileData ? (
          <>
            {/* Template Download Section */}
            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white mb-1">
                    7shifts Export
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Export your employee list from 7shifts and upload here.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Example Template
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary-500/50 bg-primary-500/5"
                  : "border-gray-700 hover:border-primary-500/50 hover:bg-gray-700/50"
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary-400">Drop the file here...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Drag & drop your 7shifts CSV file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports 7shifts employee exports
                  </p>
                </div>
              )}
            </div>
          </>
        ) : importSummary?.needsConfirmation ? (
          <>
            {/* Confirmation Screen */}
            <div className="space-y-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Import Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">New members to add:</span>
                    <span className="text-green-400 font-semibold">
                      {importSummary.newMembers.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Existing members:</span>
                    <span className="text-gray-400">
                      {importSummary.duplicateCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                    <span className="text-gray-300 flex items-center gap-2">
                      <UserX className="w-4 h-4 text-rose-400" />
                      Not in CSV (86'd):
                    </span>
                    <span className="text-rose-400 font-semibold">
                      {importSummary.notInCSV.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Missing Members List */}
              {importSummary.notInCSV.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-rose-300 mb-2">
                        Members Not in New CSV
                      </h4>
                      <div className="space-y-1 mb-4">
                        {importSummary.notInCSV.slice(0, 5).map((member: any) => (
                          <div key={member.id} className="text-sm text-gray-300">
                            • {member.display_name || `${member.first_name} ${member.last_name}`}
                            {member.email && (
                              <span className="text-gray-500 ml-2">
                                ({member.email})
                              </span>
                            )}
                          </div>
                        ))}
                        {importSummary.notInCSV.length > 5 && (
                          <div className="text-sm text-gray-500">
                            ... and {importSummary.notInCSV.length - 5} more
                          </div>
                        )}
                      </div>

                      {/* Action Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-rose-300">
                          What should we do with these members?
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="missingAction"
                              value="keep"
                              checked={missingAction === 'keep'}
                              onChange={(e) => setMissingAction(e.target.value as 'keep')}
                              className="text-primary-600"
                            />
                            <span className="text-sm text-gray-300">
                              Keep them active (no change)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="missingAction"
                              value="inactive"
                              checked={missingAction === 'inactive'}
                              onChange={(e) => setMissingAction(e.target.value as 'inactive')}
                              className="text-primary-600"
                            />
                            <span className="text-sm text-gray-300">
                              Mark as deactivated (recommended)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="missingAction"
                              value="delete"
                              checked={missingAction === 'delete'}
                              onChange={(e) => setMissingAction(e.target.value as 'delete')}
                              className="text-primary-600"
                            />
                            <span className="text-sm text-gray-300">
                              Delete permanently
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
              <button onClick={handleCancel} className="btn-ghost text-sm">
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="btn-primary text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Import
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Preview Screen (no missing members) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">
                    Preview
                  </h3>
                  <p className="text-sm text-gray-400">
                    {fileName} • {fileData.length} team members
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFileData(null);
                    setPreviewData(null);
                    setFileName("");
                    setImportSummary(null);
                  }}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Choose different file
                </button>
              </div>

              {/* Summary */}
              {importSummary && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div className="text-sm text-green-300">
                      {importSummary.newMembers.length} new members to add
                      {importSummary.duplicateCount > 0 && (
                        <span className="text-gray-400 ml-2">
                          ({importSummary.duplicateCount} already exist)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Name
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Email
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Punch ID
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Departments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData?.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-white">{row.name}</td>
                        <td className="py-2 px-3 text-gray-300">{row.email}</td>
                        <td className="py-2 px-3 text-gray-300">
                          {row.punchId}
                        </td>
                        <td className="py-2 px-3 text-gray-300 truncate max-w-xs">
                          {row.departments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
              <button onClick={handleCancel} className="btn-ghost text-sm">
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="btn-primary text-sm"
                disabled={!importSummary}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {importSummary?.newMembers.length || 0} Team Members
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
