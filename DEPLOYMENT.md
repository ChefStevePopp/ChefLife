# ChefLife Deployment Guide

This guide will help you deploy ChefLife to production.

---

## Prerequisites

Before deploying, ensure you have:

- ✅ A Supabase account and project created
- ✅ Database migrations run in Supabase
- ✅ A Netlify account (or other hosting provider)
- ✅ Your Supabase URL and Anon Key ready

---

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose your organization
4. Give it a name (e.g., "cheflife-production")
5. Generate a strong database password
6. Select a region close to your users
7. Click "Create new project"

### 1.2 Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Navigate to `supabase/migrations/` in this repo
3. Run each migration file in order (by timestamp/filename)
4. Verify tables are created in **Database > Tables**

### 1.3 Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure email templates if desired
4. Set up **Site URL** to your production domain

### 1.4 Set Up Storage (if using media uploads)

1. Go to **Storage**
2. Create buckets as needed:
   - `recipe-images`
   - `team-avatars`
   - `vendor-invoices`
3. Configure storage policies

### 1.5 Get Your API Credentials

1. Go to **Settings > API**
2. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key

---

## Step 2: Deploy to Netlify

### 2.1 Connect Repository

1. Go to https://netlify.com
2. Click "Add new site" > "Import an existing project"
3. Choose "GitHub" and authorize Netlify
4. Select your `ChefLife` repository
5. Click "Deploy site" (we'll configure it next)

### 2.2 Configure Build Settings

In Netlify dashboard:

1. Go to **Site settings > Build & deploy > Build settings**
2. Set:
   - **Base directory:** (leave empty)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Go to **Site settings > Build & deploy > Environment**
4. Click **Edit variables**
5. Set **Node version:**
   - Key: `NODE_VERSION`
   - Value: `20`

### 2.3 Add Environment Variables

In **Site settings > Build & deploy > Environment variables**, add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 2.4 Configure Domain (Optional)

1. Go to **Domain settings**
2. Add custom domain if you have one
3. Configure DNS as instructed
4. Enable HTTPS (automatic with Netlify)

### 2.5 Deploy!

1. Go to **Deploys**
2. Click "Trigger deploy" > "Deploy site"
3. Wait for build to complete (~2-3 minutes)
4. Click the deploy link to view your live site!

---

## Step 3: Initial Setup

### 3.1 Create Your Organization

1. Visit your deployed site
2. Click "Sign Up"
3. Create your admin account
4. Complete organization setup:
   - Restaurant name
   - Contact information
   - Settings

### 3.2 Configure Vendors

1. Go to **Admin > Vendor Management**
2. Add your vendors (GFS, US Foods, etc.)
3. Configure invoice import templates

### 3.3 Import Initial Data (Optional)

If you have existing data from Excel:

1. Go to **Admin > Import Data**
2. Import master ingredients
3. Import recipes
4. Import team members

---

## Step 4: Invite Your Team

1. Go to **Team Management**
2. Click "Invite Team Member"
3. Enter email addresses
4. Set roles and permissions
5. Team members will receive invite emails

---

## Troubleshooting

### Build Fails

**Error:** TypeScript compilation errors

**Solution:** Make sure you're using the `build` script, not `build:check`:
```json
"build": "vite build"
```

### Can't Connect to Database

**Error:** "Failed to connect to Supabase"

**Solutions:**
1. Verify `VITE_SUPABASE_URL` is correct (should start with `https://`)
2. Verify `VITE_SUPABASE_ANON_KEY` is the **anon public** key, not the service key
3. Check Supabase project is active (not paused)

### Environment Variables Not Working

**Solutions:**
1. Verify variables are set in Netlify dashboard
2. Trigger a new deploy after adding variables
3. Check variable names start with `VITE_` (required for Vite)

### Images/Assets Not Loading

**Solution:** Make sure assets are in `public/` directory, not `src/`

---

## Production Checklist

Before going live with real data:

- [ ] Database migrations run successfully
- [ ] Environment variables set in Netlify
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (Netlify does this automatically)
- [ ] Test user registration and login
- [ ] Test creating a recipe
- [ ] Test importing vendor invoice
- [ ] Test team permissions
- [ ] Backup plan in place (Supabase has automatic backups)

---

## Monitoring & Maintenance

### View Logs

**Netlify:**
- Deploys > (click a deploy) > Deploy log

**Supabase:**
- Logs > Edge Functions (if using)
- Database > Query Performance

### Database Backups

Supabase automatically backs up your database daily. To manually backup:

1. Go to **Database > Backups**
2. Download backup or restore from a previous backup

### Updating ChefLife

When you push changes to GitHub:

1. Netlify automatically detects the change
2. Triggers a new build
3. Deploys to production

To prevent auto-deploy:
1. Go to **Site settings > Build & deploy**
2. Stop auto publishing

---

## Support

If you run into issues:

1. Check the build logs in Netlify
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Test in local dev environment first

---

## Going Further

### Custom Features

Want to customize ChefLife for your restaurant?

- Modify `tailwind.config.js` for your brand colors
- Add custom modules in `src/features/`
- Extend database schema with new migrations

### Scaling

For high-traffic restaurants:

- Upgrade Supabase plan for more connections
- Consider Netlify Pro for faster builds
- Implement caching strategies
- Use Supabase Edge Functions for heavy processing

---

**Congratulations! 🎉**

Your ChefLife instance is now live. Time to take control of your restaurant operations with data-driven decisions.

*Built by chefs, for chefs.*
