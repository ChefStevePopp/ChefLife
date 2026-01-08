/**
 * useHealthInspections Hook
 * 
 * CRUD operations for health inspections (with JSONB action_items)
 * and certificates. Aligned with existing Supabase schema.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  HealthInspection, 
  HealthCertificate,
  InspectionFormData,
  CertificateFormData,
  InspectionActionItem 
} from '@/types/healthInspection';
import { generateItemId } from '@/types/healthInspection';
import toast from 'react-hot-toast';

// ============================================================================
// SAFE HELPERS
// ============================================================================

/** Safely ensure a value is an array */
const ensureArray = <T,>(value: T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  return [];
};

/** Safely get a string or null */
const safeString = (value: string | null | undefined): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
};

/** Safely get a number or null */
const safeNumber = (value: number | null | undefined): number | null => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return null;
};

interface UseHealthInspectionsOptions {
  organizationId: string;
}

interface UseHealthInspectionsReturn {
  // Data
  inspections: HealthInspection[];
  certificate: HealthCertificate | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Inspection CRUD
  addInspection: (data: InspectionFormData) => Promise<HealthInspection | null>;
  updateInspection: (id: string, data: Partial<InspectionFormData>) => Promise<boolean>;
  deleteInspection: (id: string) => Promise<boolean>;
  
  // Action Item operations (updates JSONB in place)
  toggleActionItem: (inspectionId: string, itemId: string, completed: boolean) => Promise<boolean>;
  addActionItem: (inspectionId: string, description: string, priority?: string) => Promise<boolean>;
  deleteActionItem: (inspectionId: string, itemId: string) => Promise<boolean>;
  
  // Certificate operations
  updateCertificate: (data: CertificateFormData) => Promise<boolean>;
  uploadCertificateImage: (file: File) => Promise<string | null>;
  removeCertificateImage: () => Promise<boolean>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export const useHealthInspections = ({ 
  organizationId 
}: UseHealthInspectionsOptions): UseHealthInspectionsReturn => {
  const [inspections, setInspections] = useState<HealthInspection[]>([]);
  const [certificate, setCertificate] = useState<HealthCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // FETCH DATA
  // ============================================================================
  
  const fetchInspections = useCallback(async () => {
    if (!organizationId) {
      setInspections([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('health_inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('visit_date', { ascending: false });

      // Handle table not existing (during initial setup)
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[useHealthInspections] health_inspections table does not exist yet');
          setInspections([]);
          return;
        }
        throw error;
      }
      
      // Ensure action_items and documents are arrays, handle malformed data
      const processedData = (data || []).map(inspection => {
        let actionItems = ensureArray(inspection.action_items);
        let documents = ensureArray(inspection.documents);
        
        // Validate action items have required fields
        actionItems = actionItems.filter(item => 
          item && typeof item === 'object' && item.id && item.description
        );
        
        return {
          ...inspection,
          action_items: actionItems,
          documents: documents,
          // Ensure result has a valid value
          result: inspection.result || 'pending',
        };
      });
      
      setInspections(processedData);
    } catch (error) {
      console.error('[useHealthInspections] Error fetching inspections:', error);
      toast.error('Failed to load inspection history');
    }
  }, [organizationId]);

  const fetchCertificate = useCallback(async () => {
    if (!organizationId) {
      setCertificate(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('health_certificates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_current', true)
        .maybeSingle();

      // Handle table not existing (during initial setup)
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[useHealthInspections] health_certificates table does not exist yet');
          setCertificate(null);
          return;
        }
        throw error;
      }
      
      setCertificate(data);
    } catch (error) {
      console.error('[useHealthInspections] Error fetching certificate:', error);
      // Don't toast - certificate might not exist yet
    }
  }, [organizationId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchInspections(), fetchCertificate()]);
    setIsLoading(false);
  }, [fetchInspections, fetchCertificate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============================================================================
  // INSPECTION CRUD
  // ============================================================================

  const addInspection = async (data: InspectionFormData): Promise<HealthInspection | null> => {
    setIsSaving(true);
    try {
      // Prepare action items with IDs
      const actionItems: InspectionActionItem[] = (data.action_items || []).map(item => ({
        ...item,
        id: item.id || generateItemId(),
      }));

      const insertData = {
        organization_id: organizationId,
        visit_date: data.visit_date,
        start_time: safeString(data.start_time),
        end_time: safeString(data.end_time),
        inspector_name: safeString(data.inspector_name),
        inspector_title: safeString(data.inspector_title),
        inspector_organization: safeString(data.inspector_organization),
        inspector_phone: safeString(data.inspector_phone),
        inspector_email: safeString(data.inspector_email),
        result: data.result || 'passed',
        score: safeNumber(data.score),
        grade: safeString(data.grade),
        notes: safeString(data.notes),
        next_inspection_due: safeString(data.next_inspection_due),
        action_items: actionItems,
        documents: [],
      };

      const { data: newInspection, error } = await supabase
        .from('health_inspections')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Inspection added successfully');
      await fetchInspections();
      return newInspection;
    } catch (error: any) {
      console.error('[useHealthInspections] Error adding inspection:', error);
      
      // Handle specific error cases
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        toast.error('Database not configured. Please run migrations.');
      } else if (error.code === '23505') {
        toast.error('An inspection already exists for this date');
      } else if (error.code === '23503') {
        toast.error('Invalid reference. Please refresh and try again.');
      } else {
        toast.error('Failed to add inspection');
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const updateInspection = async (id: string, data: Partial<InspectionFormData>): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Build update object, only including provided fields
      const updateData: Record<string, any> = {};
      
      if (data.visit_date !== undefined) updateData.visit_date = data.visit_date;
      if (data.start_time !== undefined) updateData.start_time = safeString(data.start_time);
      if (data.end_time !== undefined) updateData.end_time = safeString(data.end_time);
      if (data.inspector_name !== undefined) updateData.inspector_name = safeString(data.inspector_name);
      if (data.inspector_title !== undefined) updateData.inspector_title = safeString(data.inspector_title);
      if (data.inspector_organization !== undefined) updateData.inspector_organization = safeString(data.inspector_organization);
      if (data.inspector_phone !== undefined) updateData.inspector_phone = safeString(data.inspector_phone);
      if (data.inspector_email !== undefined) updateData.inspector_email = safeString(data.inspector_email);
      if (data.result !== undefined) updateData.result = data.result;
      if (data.score !== undefined) updateData.score = safeNumber(data.score);
      if (data.grade !== undefined) updateData.grade = safeString(data.grade);
      if (data.notes !== undefined) updateData.notes = safeString(data.notes);
      if (data.next_inspection_due !== undefined) updateData.next_inspection_due = safeString(data.next_inspection_due);
      
      if (data.action_items !== undefined) {
        updateData.action_items = data.action_items.map(item => ({
          ...item,
          id: item.id || generateItemId(),
        }));
      }

      const { error } = await supabase
        .from('health_inspections')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Inspection updated');
      await fetchInspections();
      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error updating inspection:', error);
      toast.error('Failed to update inspection');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteInspection = async (id: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('health_inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Inspection deleted');
      setInspections(prev => prev.filter(i => i.id !== id));
      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error deleting inspection:', error);
      toast.error('Failed to delete inspection');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // ACTION ITEM OPERATIONS (JSONB updates)
  // ============================================================================

  const toggleActionItem = async (inspectionId: string, itemId: string, completed: boolean): Promise<boolean> => {
    try {
      const inspection = inspections.find(i => i.id === inspectionId);
      if (!inspection) {
        console.warn('[useHealthInspections] Inspection not found:', inspectionId);
        return false;
      }

      const currentItems = ensureArray(inspection.action_items);
      const updatedItems = currentItems.map(item => 
        item.id === itemId 
          ? { ...item, completed, completed_at: completed ? new Date().toISOString() : undefined }
          : item
      );

      const { error } = await supabase
        .from('health_inspections')
        .update({ action_items: updatedItems })
        .eq('id', inspectionId);

      if (error) throw error;

      // Optimistic update
      setInspections(prev => prev.map(i => 
        i.id === inspectionId ? { ...i, action_items: updatedItems } : i
      ));

      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error toggling action item:', error);
      toast.error('Failed to update action item');
      return false;
    }
  };

  const addActionItem = async (
    inspectionId: string, 
    description: string, 
    priority: string = 'medium'
  ): Promise<boolean> => {
    if (!description?.trim()) {
      toast.error('Action item description is required');
      return false;
    }
    
    try {
      const inspection = inspections.find(i => i.id === inspectionId);
      if (!inspection) {
        console.warn('[useHealthInspections] Inspection not found:', inspectionId);
        return false;
      }

      const newItem: InspectionActionItem = {
        id: generateItemId(),
        description: description.trim(),
        priority: priority as any,
        completed: false,
      };

      const currentItems = ensureArray(inspection.action_items);
      const updatedItems = [...currentItems, newItem];

      const { error } = await supabase
        .from('health_inspections')
        .update({ action_items: updatedItems })
        .eq('id', inspectionId);

      if (error) throw error;

      // Optimistic update
      setInspections(prev => prev.map(i => 
        i.id === inspectionId ? { ...i, action_items: updatedItems } : i
      ));

      toast.success('Action item added');
      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error adding action item:', error);
      toast.error('Failed to add action item');
      return false;
    }
  };

  const deleteActionItem = async (inspectionId: string, itemId: string): Promise<boolean> => {
    try {
      const inspection = inspections.find(i => i.id === inspectionId);
      if (!inspection) {
        console.warn('[useHealthInspections] Inspection not found:', inspectionId);
        return false;
      }

      const currentItems = ensureArray(inspection.action_items);
      const updatedItems = currentItems.filter(item => item.id !== itemId);

      const { error } = await supabase
        .from('health_inspections')
        .update({ action_items: updatedItems })
        .eq('id', inspectionId);

      if (error) throw error;

      // Optimistic update
      setInspections(prev => prev.map(i => 
        i.id === inspectionId ? { ...i, action_items: updatedItems } : i
      ));

      toast.success('Action item removed');
      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error deleting action item:', error);
      toast.error('Failed to remove action item');
      return false;
    }
  };

  // ============================================================================
  // CERTIFICATE OPERATIONS
  // ============================================================================

  const updateCertificate = async (data: CertificateFormData): Promise<boolean> => {
    if (!organizationId) {
      toast.error('Organization not found');
      return false;
    }
    
    setIsSaving(true);
    try {
      if (certificate) {
        // Update existing
        const { error } = await supabase
          .from('health_certificates')
          .update(data)
          .eq('id', certificate.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('health_certificates')
          .insert({
            organization_id: organizationId,
            is_current: true,
            ...data,
          });

        if (error) throw error;
      }

      toast.success('Certificate info updated');
      await fetchCertificate();
      return true;
    } catch (error: any) {
      console.error('[useHealthInspections] Error updating certificate:', error);
      
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        toast.error('Database not configured. Please run migrations.');
      } else {
        toast.error('Failed to update certificate');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadCertificateImage = async (file: File): Promise<string | null> => {
    if (!organizationId) {
      toast.error('Organization not found');
      return null;
    }
    
    if (!file) {
      toast.error('No file selected');
      return null;
    }
    
    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${organizationId}/certificates/${timestamp}.${fileExt}`;

      // Remove old file if exists
      if (certificate?.file_path) {
        await supabase.storage
          .from('health-inspections')
          .remove([certificate.file_path]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('health-inspections')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('health-inspections')
        .getPublicUrl(filePath);

      // Update or create certificate record
      if (certificate) {
        await supabase
          .from('health_certificates')
          .update({ image_url: publicUrl, file_path: filePath })
          .eq('id', certificate.id);
      } else {
        await supabase
          .from('health_certificates')
          .insert({
            organization_id: organizationId,
            image_url: publicUrl,
            file_path: filePath,
            is_current: true,
          });
      }

      toast.success('Certificate image uploaded');
      await fetchCertificate();
      return publicUrl;
    } catch (error: any) {
      console.error('[useHealthInspections] Error uploading certificate:', error);
      
      if (error.message?.includes('storage')) {
        toast.error('Storage not configured. Check bucket setup.');
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        toast.error('Database not configured. Please run migrations.');
      } else {
        toast.error('Failed to upload certificate');
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const removeCertificateImage = async (): Promise<boolean> => {
    if (!certificate?.file_path) return true;
    
    setIsSaving(true);
    try {
      // Remove from storage
      await supabase.storage
        .from('health-inspections')
        .remove([certificate.file_path]);

      // Update certificate record
      await supabase
        .from('health_certificates')
        .update({ image_url: null, file_path: null })
        .eq('id', certificate.id);

      toast.success('Certificate image removed');
      await fetchCertificate();
      return true;
    } catch (error) {
      console.error('[useHealthInspections] Error removing certificate:', error);
      toast.error('Failed to remove certificate');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    inspections,
    certificate,
    isLoading,
    isSaving,
    addInspection,
    updateInspection,
    deleteInspection,
    toggleActionItem,
    addActionItem,
    deleteActionItem,
    updateCertificate,
    uploadCertificateImage,
    removeCertificateImage,
    refresh,
  };
};
