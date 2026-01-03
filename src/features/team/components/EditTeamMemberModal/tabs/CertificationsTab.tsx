import React, { useState } from "react";
import { Award, Plus, Trash2, Calendar, Building, Hash, AlertTriangle, CheckCircle, Clock, Info, X } from "lucide-react";
import type { TeamMember, Certification } from "../../../types";

interface CertificationsTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
  canEdit?: boolean; // Can the current user add/remove certifications?
}

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

// Common certification types in food service
const COMMON_CERTIFICATIONS = [
  "Food Handler's Certificate",
  "SmartServe",
  "ProServe",
  "First Aid / CPR",
  "WHMIS",
  "Allergen Awareness",
  "ServSafe",
  "Food Safety Manager",
];

// Calculate certification status based on expiry date
const getCertificationStatus = (expiryDate?: string | null): 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' => {
  if (!expiryDate) return 'no_expiry';
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  if (expiry < now) return 'expired';
  if (expiry <= thirtyDaysFromNow) return 'expiring_soon';
  return 'valid';
};

// Status badge component
const StatusBadge: React.FC<{ status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' }> = ({ status }) => {
  const config = {
    valid: { icon: CheckCircle, text: 'Valid', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    expiring_soon: { icon: Clock, text: 'Expiring Soon', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    expired: { icon: AlertTriangle, text: 'Expired', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    no_expiry: { icon: CheckCircle, text: 'No Expiry', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  };
  
  const { icon: Icon, text, color } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${color}`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
};

// Generate a unique ID for new certifications
const generateId = () => `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const CertificationsTab: React.FC<CertificationsTabProps> = ({
  formData,
  setFormData,
  canEdit = true,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCertification, setNewCertification] = useState<Partial<Certification>>({
    name: '',
    issued_date: '',
    expiry_date: '',
    certificate_number: '',
    issuing_body: '',
  });
  const [customName, setCustomName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);

  const certifications = formData.certifications || [];

  // Add a new certification
  const handleAddCertification = () => {
    const name = useCustomName ? customName : newCertification.name;
    if (!name?.trim()) return;

    const cert: Certification = {
      id: generateId(),
      name: name.trim(),
      issued_date: newCertification.issued_date || null,
      expiry_date: newCertification.expiry_date || null,
      certificate_number: newCertification.certificate_number || null,
      issuing_body: newCertification.issuing_body || null,
    };

    setFormData({
      ...formData,
      certifications: [...certifications, cert],
    });

    // Reset form
    setNewCertification({
      name: '',
      issued_date: '',
      expiry_date: '',
      certificate_number: '',
      issuing_body: '',
    });
    setCustomName('');
    setUseCustomName(false);
    setIsAddingNew(false);
  };

  // Remove a certification
  const handleRemoveCertification = (certId: string) => {
    setFormData({
      ...formData,
      certifications: certifications.filter(c => c.id !== certId),
    });
  };

  // Update a certification field
  const handleUpdateCertification = (certId: string, field: keyof Certification, value: string) => {
    setFormData({
      ...formData,
      certifications: certifications.map(c => 
        c.id === certId ? { ...c, [field]: value || null } : c
      ),
    });
  };

  // Count by status
  const statusCounts = certifications.reduce((acc, cert) => {
    const status = getCertificationStatus(cert.expiry_date);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Certifications Section */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Award}
          iconColor="text-rose-400"
          bgColor="bg-rose-500/20"
          title="Certifications"
          subtitle={certifications.length > 0 
            ? `${certifications.length} certification${certifications.length > 1 ? 's' : ''} on file` 
            : "Track required certifications"
          }
          action={
            canEdit && !isAddingNew && (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )
          }
        />

        {/* Status Summary */}
        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {statusCounts.expired && statusCounts.expired > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3 h-3" />
                {statusCounts.expired} Expired
              </span>
            )}
            {statusCounts.expiring_soon && statusCounts.expiring_soon > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Clock className="w-3 h-3" />
                {statusCounts.expiring_soon} Expiring Soon
              </span>
            )}
            {(statusCounts.valid || 0) + (statusCounts.no_expiry || 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-400 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-3 h-3" />
                {(statusCounts.valid || 0) + (statusCounts.no_expiry || 0)} Valid
              </span>
            )}
          </div>
        )}

        {/* Add New Certification Form */}
        {canEdit && isAddingNew && (
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white">Add Certification</h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewCertification({ name: '', issued_date: '', expiry_date: '', certificate_number: '', issuing_body: '' });
                  setCustomName('');
                  setUseCustomName(false);
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Certification Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Certification Type
                </label>
                {!useCustomName ? (
                  <div className="space-y-2">
                    <select
                      value={newCertification.name || ''}
                      onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="">Select a certification...</option>
                      {COMMON_CERTIFICATIONS.map(cert => (
                        <option key={cert} value={cert}>{cert}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setUseCustomName(true)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      + Add custom certification
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter certification name..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomName(false);
                        setCustomName('');
                      }}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      ← Back to common certifications
                    </button>
                  </div>
                )}
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={newCertification.issued_date || ''}
                    onChange={(e) => setNewCertification({ ...newCertification, issued_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newCertification.expiry_date || ''}
                    onChange={(e) => setNewCertification({ ...newCertification, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Optional Fields Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Hash className="w-3 h-3 inline mr-1" />
                    Certificate # <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newCertification.certificate_number || ''}
                    onChange={(e) => setNewCertification({ ...newCertification, certificate_number: e.target.value })}
                    placeholder="e.g., 12345678"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Building className="w-3 h-3 inline mr-1" />
                    Issuing Body <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newCertification.issuing_body || ''}
                    onChange={(e) => setNewCertification({ ...newCertification, issuing_body: e.target.value })}
                    placeholder="e.g., Ontario Health"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Add Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddCertification}
                  disabled={!(useCustomName ? customName.trim() : newCertification.name)}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Certification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Certifications List */}
        {certifications.length > 0 ? (
          <div className="space-y-3">
            {certifications.map((cert) => {
              const status = getCertificationStatus(cert.expiry_date);
              return (
                <div
                  key={cert.id}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name & Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-white truncate">{cert.name}</h4>
                        <StatusBadge status={status} />
                      </div>
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Issued</span>
                          <p className="text-gray-300">
                            {cert.issued_date 
                              ? new Date(cert.issued_date).toLocaleDateString() 
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Expires</span>
                          <p className={`${status === 'expired' ? 'text-rose-400' : status === 'expiring_soon' ? 'text-amber-400' : 'text-gray-300'}`}>
                            {cert.expiry_date 
                              ? new Date(cert.expiry_date).toLocaleDateString() 
                              : 'No expiry'}
                          </p>
                        </div>
                        {cert.certificate_number && (
                          <div>
                            <span className="text-gray-500">Cert #</span>
                            <p className="text-gray-300 truncate">{cert.certificate_number}</p>
                          </div>
                        )}
                        {cert.issuing_body && (
                          <div>
                            <span className="text-gray-500">Issuer</span>
                            <p className="text-gray-300 truncate">{cert.issuing_body}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remove Button - only if canEdit */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(cert.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors flex-shrink-0"
                        title="Remove certification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isAddingNew && (
          <div className="text-sm text-gray-500 text-center py-8 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
            <Award className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p>No certifications on file</p>
            <p className="text-xs text-gray-600 mt-1">
              {canEdit ? 'Click "Add" to track certifications' : 'Only managers can add certifications'}
            </p>
          </div>
        )}
      </section>

      {/* Info Section */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300">About Certifications</h4>
            <p className="text-sm text-gray-500 mt-1">
              Track food safety certifications, training completions, and compliance requirements. 
              Certifications expiring within 30 days will be flagged for renewal.
              {!canEdit && (
                <span className="block mt-2 text-gray-600">
                  Contact a manager to update certifications.
                </span>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
