import { supabase } from "./supabase";

export const ALLOWED_POLICY_FILE_TYPES = ["application/pdf"];
export const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const policyService = {
  /**
   * Upload a policy PDF document to Supabase Storage
   * @param file - PDF file to upload
   * @param organizationId - Organization ID for path organization
   * @returns Public URL of uploaded file
   */
  async uploadPolicyDocument(
    file: File,
    organizationId: string
  ): Promise<string> {
    try {
      // Validate file type
      if (!ALLOWED_POLICY_FILE_TYPES.includes(file.type)) {
        throw new Error("Only PDF files are allowed for policy documents.");
      }

      // Validate file size
      if (file.size > MAX_POLICY_FILE_SIZE) {
        throw new Error("File size too large. Maximum size is 10MB.");
      }

      // Sanitize filename (remove special chars, keep extension)
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();

      // Generate timestamp-prefixed filename for uniqueness
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;

      // Construct storage path: {organizationId}/policies/{timestamp}_{filename}
      const filePath = `${organizationId}/policies/${fileName}`;

      // Upload to Supabase Storage bucket "policy-documents"
      const { error: uploadError, data } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("policy-documents").getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading policy document:", error);
      throw error;
    }
  },

  /**
   * Delete a policy PDF document from Supabase Storage
   * @param url - Public URL of the file to delete
   */
  async deletePolicyDocument(url: string): Promise<void> {
    try {
      // Extract path from URL (format: .../policy-documents/{path})
      const path = url.split("/policy-documents/").pop();
      if (!path) throw new Error("Invalid policy document URL");

      const { error } = await supabase.storage
        .from("policy-documents")
        .remove([decodeURIComponent(path)]);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting policy document:", error);
      throw error;
    }
  },
};
