# Policy Documents Bucket - Supabase Storage Setup

## Bucket Configuration

**Bucket Name:** `policy-documents`

**Settings:**
- Public: `true` (allows read access via public URLs)
- File size limit: 10 MB
- Allowed MIME types: `application/pdf`

## Storage Path Structure

```
{organizationId}/policies/{timestamp}_{sanitizedFilename}.pdf
```

**Example:**
```
org_abc123/policies/1706738400000_food_safety_standards.pdf
```

## Row-Level Security (RLS) Policies

### Policy 1: Public Read Access (Organization-Scoped)

**Policy Name:** `policy_documents_select`

**Operation:** SELECT

**SQL:**
```sql
CREATE POLICY policy_documents_select
ON storage.objects FOR SELECT
USING (
  bucket_id = 'policy-documents'
  AND (
    -- Organization members can read their org's policy documents
    (storage.foldername(name))[1] IN (
      SELECT o.id::text
      FROM organizations o
      INNER JOIN user_organizations uo ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid()
    )
    -- Omega users (developers) can read all policy documents
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'system_role' = 'dev'
    )
  )
);
```

**Description:**
- Organization members can view policy documents belonging to their organization
- Omega users (system_role = 'dev') bypass organization restrictions and can view all documents

---

### Policy 2: Insert Access (Alpha/Bravo Users)

**Policy Name:** `policy_documents_insert`

**Operation:** INSERT

**SQL:**
```sql
CREATE POLICY policy_documents_insert
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'policy-documents'
  AND (
    -- Alpha/Bravo users can upload to their organization's folder
    (storage.foldername(name))[1] IN (
      SELECT o.id::text
      FROM organizations o
      INNER JOIN user_organizations uo ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid()
      AND uo.security_level <= 2  -- Alpha (0) or Bravo (2)
    )
    -- Omega users can upload to any organization
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'system_role' = 'dev'
    )
  )
);
```

**Description:**
- Alpha (security_level = 0) and Bravo (security_level = 2) users can upload policy documents
- Documents must be uploaded to the user's organization folder path
- Omega users can upload to any organization folder for testing/support

---

### Policy 3: Delete Access (Alpha/Bravo Users)

**Policy Name:** `policy_documents_delete`

**Operation:** DELETE

**SQL:**
```sql
CREATE POLICY policy_documents_delete
ON storage.objects FOR DELETE
USING (
  bucket_id = 'policy-documents'
  AND (
    -- Alpha/Bravo users can delete from their organization's folder
    (storage.foldername(name))[1] IN (
      SELECT o.id::text
      FROM organizations o
      INNER JOIN user_organizations uo ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid()
      AND uo.security_level <= 2  -- Alpha (0) or Bravo (2)
    )
    -- Omega users can delete from any organization
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'system_role' = 'dev'
    )
  )
);
```

**Description:**
- Alpha/Bravo users can delete policy documents from their organization
- Used when editing policies (old PDF is deleted when new version is uploaded)
- Omega users can delete any policy document for testing/support

---

## Security Notes

### Omega User Bypass Pattern

All RLS policies include the Omega user bypass clause:

```sql
OR EXISTS (
  SELECT 1 FROM auth.users u
  WHERE u.id = auth.uid()
  AND u.raw_user_meta_data->>'system_role' = 'dev'
)
```

This ensures developers can:
- Test the system with any organization
- Provide support by viewing/managing documents
- Debug issues without organization restrictions

### Organization Isolation

Policy documents are isolated by organization using folder path:
- Path format: `{organizationId}/policies/{filename}`
- RLS checks first folder segment matches user's organization
- Prevents cross-organization data access

### Permission Levels

| Security Level | Role   | Can View | Can Upload | Can Delete |
|---------------|--------|----------|------------|------------|
| 0             | Alpha  | ✅       | ✅         | ✅         |
| 2             | Bravo  | ✅       | ✅         | ✅         |
| 3             | Charlie| ✅       | ❌         | ❌         |
| 4+            | Delta+ | ✅       | ❌         | ❌         |
| dev           | Omega  | ✅       | ✅         | ✅         |

## File Validation

**Client-Side (policy-service.ts):**
- MIME type: Must be `application/pdf`
- File size: Maximum 10MB
- Filename sanitization: Remove special characters, lowercase

**Server-Side (Supabase Storage):**
- Bucket configuration enforces file size limit
- RLS policies enforce organization access

## Public URL Access

After upload, files are accessible via public URL:

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('policy-documents')
  .getPublicUrl(filePath);

// Example URL:
// https://your-project.supabase.co/storage/v1/object/public/policy-documents/org_abc123/policies/1706738400000_food_safety.pdf
```

Public URLs are:
- Shareable within the organization
- Embedded in PolicyTemplate records
- Used for "View PDF" functionality in the UI
- Still protected by organization-scoped RLS on the database side

## Setup Instructions

### 1. Create Bucket via Supabase Dashboard

1. Navigate to: Storage > Create new bucket
2. Name: `policy-documents`
3. Public bucket: Enable ✅
4. File size limit: 10485760 bytes (10MB)
5. Allowed MIME types: `application/pdf`

### 2. Apply RLS Policies

Run each policy SQL statement in: SQL Editor > New query

Execute in order:
1. `policy_documents_select`
2. `policy_documents_insert`
3. `policy_documents_delete`

### 3. Verify Permissions

Test with different user roles:
- Alpha user: Upload, view, delete ✅
- Bravo user: Upload, view, delete ✅
- Charlie user: View only, upload blocked ✅
- Omega user: Full access to all organizations ✅

### 4. Test Upload Flow

```typescript
// Test upload
const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
const url = await policyService.uploadPolicyDocument(file, organizationId);
console.log('Uploaded:', url);

// Test delete
await policyService.deletePolicyDocument(url);
console.log('Deleted successfully');
```

## Troubleshooting

### Common Issues

**Issue:** Upload fails with "new row violates row-level security policy"
- **Cause:** User doesn't have INSERT permission (Charlie or lower)
- **Fix:** Ensure user is Alpha or Bravo level

**Issue:** Can't view uploaded document
- **Cause:** Path doesn't match organization ID
- **Fix:** Verify upload path: `{organizationId}/policies/{filename}`

**Issue:** Omega user can't access documents
- **Cause:** Missing system_role metadata
- **Fix:** Set `raw_user_meta_data->>'system_role' = 'dev'` in auth.users table

**Issue:** Cross-organization access
- **Cause:** Incorrect folder path or RLS policy
- **Fix:** Verify path extraction: `(storage.foldername(name))[1]`

## Related Files

- **Service:** [src/lib/policy-service.ts](../../src/lib/policy-service.ts) - Upload/delete functions
- **Component:** [src/features/admin/components/sections/HRSettings/components/PolicyUploadForm.tsx](../../src/features/admin/components/sections/HRSettings/components/PolicyUploadForm.tsx) - Upload UI
- **Types:** [src/types/modules.ts](../../src/types/modules.ts) - PolicyTemplate interface
