# GlucoNova Setup Issues and Solutions

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The project location in `G:\My Drive\GlucoNova\GlucoNova_project` (a cloud-synced folder) is causing severe filesystem errors that prevent npm from installing packages and Docker from building efficiently.

## Issues Found

### Issue #1: NPM Installation Failures ⛔ CRITICAL
**Symptoms:**
- `npm install` runs for 10+ minutes without completing
- Repeated errors: `TAR_ENTRY_ERROR UNKNOWN: unknown error, write`
- Errors: `EBADF: bad file descriptor, write`
- Errors: `EPERM: operation not permitted, write`
- 398 directories exist in node_modules but installation incomplete

**Root Cause:**
Cloud sync services (OneDrive/Google Drive) lock files while syncing, preventing npm from writing package files. The "My Drive" path confirms this is a synced folder.

**Impact:**
- Cannot install dependencies reliably
- Missing critical packages: dotenv, drizzle-orm, pg, express, etc.
- Database migrations cannot run
- Application cannot start

### Issue #2: Docker Build Delays ⚠️ HIGH PRIORITY
**Symptoms:**
- Docker build taking 100+ seconds for simple operations
- Build process appears stuck loading local definitions

**Root Cause:**
Docker must access files through cloud sync layer, adding significant I/O overhead

**Impact:**
- Slow development iteration
- Potential build failures during image creation

### Issue #3: Database Migration Cannot Execute ⚠️ MEDIUM PRIORITY
**Symptoms:**
- `drizzle-kit migrate` command fails with "Cannot find module 'drizzle-kit'"
- PostgreSQL database is running but schema not initialized

**Root Cause:**
Incomplete npm installation means drizzle-kit is not available

**Impact:**
- Database tables not created
- API endpoints will fail when trying to query non-existent tables

## Recommended Solutions

### Solution A: Move Project Outside Cloud-Synced Folder ⭐⭐⭐ BEST

**This is the PERMANENT fix and highly recommended.**

```powershell
# Step 1: Stop all running processes
Get-Process | Where-Object {$_.Name -like "*node*" -or $_.Name -like "*npm*"} | Stop-Process -Force
docker-compose down

# Step 2: Copy project to local drive (NOT synced)
xcopy "g:\My Drive\GlucoNova\GlucoNova_project" "C:\GlucoNova" /E /I /H /Y

# Step 3: Navigate to new location
cd C:\GlucoNova

# Step 4: Remove corrupted node_modules
Remove-Item -Path "node_modules" -Recurse -Force

# Step 5: Clean npm cache
npm cache clean --force

# Step 6: Install dependencies fresh
npm install

# Step 7: Run database migrations
npm run db:migrate

# Step 8: Start development server
$env:NODE_ENV="development"; npx tsx server/index.ts

# Step 9: In another terminal, start frontend
npm run dev
```

**Benefits:**
- ✅ No cloud sync interference
- ✅ Fast npm installs (< 2 minutes)
- ✅ Fast Docker builds
- ✅ Standard Node.js development practice

**Important:** Keep only source code in cloud storage. Add `node_modules/` to your `.gitignore` and exclude it from OneDrive sync.

---

### Solution B: Exclude node_modules from Cloud Sync ⭐⭐ ALTERNATIVE

If you MUST keep the project in "My Drive":

1. **Exclude node_modules from OneDrive:**
   - Open OneDrive settings
   - Go to Account → Choose folders
   - OR use Group Policy/Registry to exclude specific paths
   
2. **Add to .gitignore:**
   ```
   node_modules/
   dist/
   .env
   ```

3. **Disable real-time protection temporarily during installs:**
   - Windows Security → Virus & threat protection → Manage settings
   - Turn off real-time protection (temporarily!)

4. **Then retry:**
   ```powershell
   Remove-Item node_modules -Recurse -Force
   npm cache clean --force
   npm install --no-optional --legacy-peer-deps
   ```

**Drawbacks:**
- ❌ Still may experience issues
- ❌ Manual sync management required
- ❌ Risk of sync conflicts

---

### Solution C: Use Docker for Everything ⭐⭐ VIABLE ALTERNATIVE

Since Docker is building (albeit slowly), use it for the entire setup:

```powershell
# Stop current build first
docker-compose down

# Rebuild from scratch
docker-compose up --build -d

# Wait 5 minutes for build and startup
Start-Sleep -Seconds 300

# Check if running
docker-compose ps

# View logs
docker-compose logs -f app
```

**Expected Behavior:**
- Container should build successfully (5-10 minutes)
- Database migrations run automatically via `server/migrate.js`
- App accessible at `http://localhost:3000`

**Test with:**
```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health
```

---

## Testing Script

Once the application is running (via any solution), use the test script:

```powershell
.\test-app.ps1
```

This will automatically test:
1. ✅ Server health endpoint
2. ✅ User registration
3. ✅ Login authentication
4. ✅ AI insulin prediction

---

## Verification Checklist

After applying a solution, verify:

- [ ] `npm install` completes in under 3 minutes
- [ ] `node_modules` directory exists with 400+ packages
- [ ] `npm run db:migrate` executes successfully
- [ ] Backend server starts on port 8080
- [ ] Frontend accessible at http://localhost:8080
- [ ] `/health` endpoint returns 200 OK
- [ ] Can register new user via UI or API
- [ ] Can login with registered credentials
- [ ] AI insulin prediction returns results

---

## Why This Happens

Cloud storage services like OneDrive/Google Drive:
1. **Monitor file changes** in real-time
2. **Lock files** while uploading/syncing
3. **Intercept file writes** causing delays
4. **Conflict with npm's parallel extraction** of thousands of files

Node.js projects typically have:
- 400-800 packages in node_modules
- 50,000-100,000 small files
- Frequent read/write operations during development

This combination makes cloud-synced folders unsuitable for Node.js development.

---

## Contact/Next Steps

If issues persist after moving to `C:\GlucoNova`:

1. Verify Node.js version: `node --version` (should be 18+)
2. Verify npm version: `npm --version` (should be 9+)
3. Check Docker: `docker --version`
4. Ensure PostgreSQL container is running: `docker ps`
5. Review logs: `docker-compose logs`

**Standard practice:** Development code in cloud backup, but `node_modules/` excluded from sync.
