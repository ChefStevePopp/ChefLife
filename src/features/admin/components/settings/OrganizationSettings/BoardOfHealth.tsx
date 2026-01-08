/**
 * BoardOfHealth - Health Compliance Management (L5)
 * 
 * Full-featured health inspection tracking with:
 * - Certificate upload/capture with metadata
 * - Inspection CRUD with action items
 * - Real database integration
 * 
 * Shared between: Company Settings (Compliance tab) and HACCP Manager
 */

import React, { useState, useRef } from 'react';
import { 
  FileCheck, 
  Camera, 
  Upload, 
  X, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  FileText,
  CheckCircle,
  Clock,
  User,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Organization } from '@/types/organization';
import type { HealthInspection, InspectionFormData } from '@/types/healthInspection';
import { isExpiringSoon, isExpired, getOpenActionItemCount, safeFormatDate } from '@/types/healthInspection';
import { useHealthInspections } from './useHealthInspections';
import { InspectionModal } from './InspectionModal';
import { LoadingLogo } from '@/features/shared/components';

interface BoardOfHealthProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const BoardOfHealth: React.FC<BoardOfHealthProps> = ({
  organization,
}) => {
  // Guard against missing organization
  if (!organization?.id) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Organization not found</p>
        </div>
      </div>
    );
  }

  const {
    inspections,
    certificate,
    isLoading,
    isSaving,
    addInspection,
    updateInspection,
    deleteInspection,
    toggleActionItem,
    updateCertificate,
    uploadCertificateImage,
    removeCertificateImage,
  } = useHealthInspections({ organizationId: organization.id });

  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<HealthInspection | null>(null);
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Certificate upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await uploadCertificateImage(file);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        setIsUploading(true);
        const file = new File([blob], 'certificate.jpg', { type: 'image/jpeg' });
        await uploadCertificateImage(file);
        setIsUploading(false);
        stopCapture();
      }, 'image/jpeg', 0.9);
    }
  };

  // Inspection handlers
  const handleAddInspection = () => {
    setEditingInspection(null);
    setShowInspectionModal(true);
  };

  const handleEditInspection = (inspection: HealthInspection) => {
    setEditingInspection(inspection);
    setShowInspectionModal(true);
  };

  const handleSaveInspection = async (data: InspectionFormData): Promise<boolean> => {
    if (editingInspection) {
      return await updateInspection(editingInspection.id, data);
    } else {
      const result = await addInspection(data);
      return result !== null;
    }
  };

  const handleDeleteInspection = async (id: string) => {
    await deleteInspection(id);
    setShowDeleteConfirm(null);
  };

  const getResultBadge = (result: HealthInspection['result']) => {
    switch (result) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
            <CheckCircle className="w-3 h-3" />
            Passed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
            <X className="w-3 h-3" />
            Failed
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-sm">
            <AlertTriangle className="w-3 h-3" />
            Conditional
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-sm">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingLogo message="Loading compliance data..." />
      </div>
    );
  }

  const certificateExpiring = isExpiringSoon(certificate?.expiry_date);
  const certificateExpired = isExpired(certificate?.expiry_date);

  return (
    <div className="space-y-6">
      {/* Current Certificate Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Health Certificate</h2>
            <p className="text-sm text-gray-400">Current Board of Health certification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Info, Requirements & Metadata */}
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Your Board of Health certification must be prominently displayed in your 
              establishment. Upload or photograph your current certificate for digital records.
            </p>

            {/* Certificate Metadata */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Certificate Number
                  </label>
                  <input
                    type="text"
                    value={certificate?.certificate_number || ''}
                    onChange={(e) => updateCertificate({ certificate_number: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., HC-2024-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={certificate?.jurisdiction || ''}
                    onChange={(e) => updateCertificate({ jurisdiction: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Region of Niagara"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={certificate?.issue_date || ''}
                    onChange={(e) => updateCertificate({ issue_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={certificate?.expiry_date || ''}
                    onChange={(e) => updateCertificate({ expiry_date: e.target.value })}
                    className={`input w-full ${certificateExpired ? 'border-red-500' : certificateExpiring ? 'border-amber-500' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Expiry Warning */}
            {certificateExpired && (
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Certificate Expired</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Your health certificate has expired. Contact your local health department to renew.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {certificateExpiring && !certificateExpired && (
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Certificate Expiring Soon</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Your certificate expires in less than 30 days. Schedule a renewal inspection.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Certificate Display/Upload */}
          <div>
            <div className="bg-gray-800/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[280px] border border-gray-700/50">
              {isCapturing ? (
                <div className="relative w-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      onClick={takePhoto}
                      disabled={isUploading}
                      className="btn-primary"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Capture'}
                    </button>
                    <button onClick={stopCapture} className="btn-ghost">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : certificate?.image_url ? (
                <div className="relative w-full">
                  <img
                    src={certificate.image_url}
                    alt="Health Certificate"
                    className="max-w-full max-h-[240px] mx-auto rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(certificate.image_url!, '_blank')}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => window.open(certificate.image_url!, '_blank')}
                      className="p-2 bg-gray-800/80 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                      title="View full size"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={removeCertificateImage}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Remove certificate"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    No certificate uploaded
                  </p>
                  <div className="flex gap-3 justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="btn-ghost"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    <button onClick={startCapture} className="btn-ghost">
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inspection History Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Inspection History</h2>
              <p className="text-sm text-gray-400">
                {inspections.length} inspection{inspections.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
          </div>
          <button onClick={handleAddInspection} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Inspection
          </button>
        </div>

        {inspections.length > 0 ? (
          <div className="space-y-4">
            {inspections.map((inspection) => {
              const isExpanded = expandedInspection === inspection.id;
              const openActionItems = getOpenActionItemCount(inspection);
              
              return (
                <div 
                  key={inspection.id} 
                  className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden"
                >
                  {/* Inspection Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/20 transition-colors"
                    onClick={() => setExpandedInspection(isExpanded ? null : inspection.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {safeFormatDate(inspection.visit_date)}
                          </span>
                          {getResultBadge(inspection.result)}
                          {inspection.score != null && (
                            <span className="text-sm text-gray-400">
                              {inspection.score}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          {inspection.inspector_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {inspection.inspector_name}
                            </span>
                          )}
                          {inspection.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {inspection.start_time}
                              {inspection.end_time && ` - ${inspection.end_time}`}
                            </span>
                          )}
                          {openActionItems > 0 && (
                            <span className="text-amber-400">
                              {openActionItems} open action item{openActionItems !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditInspection(inspection); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit inspection"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(inspection.id); }}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Delete inspection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-700/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Inspector Details */}
                        {(inspection.inspector_name || inspection.inspector_organization) && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Inspector
                            </p>
                            {inspection.inspector_name && (
                              <p className="text-sm text-white">{inspection.inspector_name}</p>
                            )}
                            {inspection.inspector_title && (
                              <p className="text-sm text-gray-400">{inspection.inspector_title}</p>
                            )}
                            {inspection.inspector_organization && (
                              <p className="text-sm text-gray-400">{inspection.inspector_organization}</p>
                            )}
                          </div>
                        )}

                        {/* Action Items */}
                        {inspection.action_items && inspection.action_items.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">
                              Action Items ({inspection.action_items.filter(i => i.completed).length}/{inspection.action_items.length} complete)
                            </p>
                            <div className="space-y-2">
                              {inspection.action_items.map((item) => (
                                <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={(e) => toggleActionItem(inspection.id, item.id, e.target.checked)}
                                    className="form-checkbox mt-0.5 rounded bg-gray-700 border-gray-600 text-lime-500 focus:ring-lime-500/20"
                                  />
                                  <span className={`text-sm transition-colors ${
                                    item.completed 
                                      ? 'text-gray-500 line-through' 
                                      : 'text-gray-300 group-hover:text-white'
                                  }`}>
                                    {item.description}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {inspection.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <p className="text-sm text-gray-400">{inspection.notes}</p>
                        </div>
                      )}

                      {/* Next Inspection */}
                      {inspection.next_inspection_due && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <p className="text-xs text-gray-500">
                            Next inspection due: {' '}
                            <span className="text-gray-300">
                              {safeFormatDate(inspection.next_inspection_due)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === inspection.id && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                        <p className="text-sm text-red-300 mb-3">
                          Delete this inspection record? This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteInspection(inspection.id)}
                            className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No Inspections Recorded</p>
            <p className="text-sm text-gray-400 mb-4">
              Add your inspection history to track compliance over time
            </p>
            <button onClick={handleAddInspection} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add First Inspection
            </button>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      <InspectionModal
        isOpen={showInspectionModal}
        onClose={() => {
          setShowInspectionModal(false);
          setEditingInspection(null);
        }}
        onSave={handleSaveInspection}
        inspection={editingInspection}
        isSaving={isSaving}
      />
    </div>
  );
};
