# Session 58 Starting Prompt

## Context

I'm Steve, owner/chef of Memphis Fire BBQ and creator of ChefLife - a restaurant management system. We're building VIM (Vendor Invoice Manager) in our React/TypeScript/Supabase stack.

## Last Session (57) Summary

We built the **VendorSettings L6 system** - a tablet-first interface for configuring how invoices are imported from each vendor. Key components:

1. **vendorConfigsStore.ts** - New Zustand store with smart defaults based on vendor names
2. **VendorCard** - Shared component with colored initials, 44px touch targets
3. **VendorSettingsModal** - Full config with toggles, rep details, smart defaults button
4. **VendorSettings** - Search, filter, sort, responsive grid

Architecture decision: Vendor CRUD happens in Operations, VIM Settings only configures import methods.

## Current Bug to Fix

**Logo upload has silent failure** - no toast, no error, no change.

Debug logging was added to `src/shared/components/VendorCard/index.tsx`. Check browser console on upload attempt.

Likely causes:
1. `organizationId` undefined from hook
2. RLS policy missing on "Logos" bucket (capital L)
3. Bucket configuration issue

**RLS policies needed for Logos bucket:**
```sql
CREATE POLICY "Users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'Logos' AND
  EXISTS (
    SELECT 1 FROM organization_roles
    WHERE user_id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Public read for logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'Logos');
```

## Key Files

- `src/stores/vendorConfigsStore.ts` - NEW store
- `src/shared/components/VendorCard/index.tsx` - Card with debug logging
- `src/features/admin/components/sections/VendorInvoice/components/VendorSettings.tsx`
- `src/features/admin/components/sections/VendorInvoice/components/VendorSettingsModal.tsx`
- `docs/handoffs/SESSION-57-handoff.md` - Full handoff details

## Database

- **Table `vendor_configs`** - Created and working
- **Bucket `Logos`** - Exists but needs RLS policies

## Priorities

1. Fix logo upload (debug, add RLS if needed)
2. Remove debug logging once fixed
3. Test full save flow for vendor settings
4. (Future) PDF template editor - currently placeholder

## Important Patterns

- RLS uses `organization_roles` table (has `user_id`), NOT `organization_team_members`
- Terminology: "invoices" not "imports" in user-facing UI
- Tablet-first: 44px+ touch targets, responsive grid

Ready to debug and complete the VendorSettings feature!
