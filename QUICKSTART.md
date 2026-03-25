# GlucoNova - Quick Start Guide

## 🚀 Get Started in 30 Seconds

### Prerequisites
- Docker Desktop installed and running
- PowerShell (Windows) or terminal (Mac/Linux)

### Start the Application

```powershell
# Navigate to project folder
cd "g:\My Drive\GlucoNova\GlucoNova_project"

# Start all services
docker-compose up -d

# Wait 15 seconds for startup
Start-Sleep -Seconds 15

# Verify it's running
docker-compose ps
```

### Access the Application

**Open your browser**: http://localhost:3000

---

## ✅ Test Everything Works

### Option 1: Automated Tests (Recommended)

```powershell
.\test-app.ps1
```

Expected output: All 4 tests pass ✅

### Option 2: Manual Testing

1. **Register New Account**
   - Go to http://localhost:3000/register
   - Fill in name, email, password
   - Choose role: Patient or Doctor
   - Click Register

2. **Login**
   - Go to http://localhost:3000/login
   - Enter your credentials
   - You'll be redirected to dashboard

3. **Test AI Insulin Prediction**
   - From dashboard, navigate to Insulin Prediction tool
   - Enter current glucose: 180 mg/dL
   - Enter carbs: 45g
   - Click Predict
   - Result should show ~6 units

---

## 🔧 Common Commands

### Check Status
```powershell
docker-compose ps
```

### View Logs
```powershell
# Real-time logs
docker-compose logs -f

# Only app logs
docker-compose logs -f app

# Last 50 lines
docker-compose logs --tail=50 app
```

### Restart Services
```powershell
# Soft restart
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d
```

### Stop Everything
```powershell
docker-compose down
```

---

## 📊 Key URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application UI |
| API | http://localhost:3000/api/* | REST API endpoints |
| Health | http://localhost:3000/health | Health check endpoint |
| Database | localhost:5432 | PostgreSQL (internal use) |

---

## 🎯 Quick API Reference

### Register User
```powershell
$body = @{
    name = "Your Name"
    email = "you@example.com"
    password = "YourPassword123!"
    role = "patient"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
  -Method Post -Body $body -ContentType "application/json"
```

### Login
```powershell
$login = @{
    email = "you@example.com"
    password = "YourPassword123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method Post -Body $login -ContentType "application/json"

$token = $response.token
```

### AI Insulin Prediction
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$prediction = @{
    current_glucose_mgdl = 180
    carbs_g = 45
    insulin_type = "rapid"
    icr = 10
    isf = 50
    correction_target = 100
    activity_level = "moderate"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3000/api/predictions/insulin" `
  -Method Post -Headers $headers -Body $prediction -ContentType "application/json"

Write-Host "Predicted Insulin: $($result.rounded_units) units"
```

---

## ❓ Troubleshooting

### Can't Access http://localhost:3000

**Check if containers are running:**
```powershell
docker-compose ps
```

**Should show:**
```
NAME            STATUS
gluconova-app   Up (healthy)
gluconova-db    Up (healthy)
```

**If not running:**
```powershell
docker-compose up -d
```

### Tests Failing

**Re-run migrations:**
```powershell
docker-compose restart app
```

**Check logs for errors:**
```powershell
docker-compose logs app
```

### Port Already in Use

**Find what's using port 3000:**
```powershell
netstat -ano | findstr :3000
```

**Change port in docker-compose.yml:**
```yaml
ports:
  - "3001:8080"  # Use 3001 instead
```

---

## 💡 Tips

### Faster Startup
After first build, subsequent startups are much faster:
```powershell
docker-compose up -d  # ~10 seconds vs 3 minutes
```

### View Database
```powershell
# Connect to PostgreSQL
docker exec -it gluconova-db psql -U gluconova_user -d gluconova

# List tables
\dt

# Query users
SELECT * FROM users;
```

### Clean Slate
Start completely fresh:
```powershell
docker-compose down -v  # Removes volumes too
docker-compose up --build -d
```

---

## 📝 What's Running?

### Services

1. **PostgreSQL Database** (`gluconova-db`)
   - Stores all user data
   - Port: 5432
   - Data persisted in Docker volume

2. **Application Server** (`gluconova-app`)
   - Express.js backend + React frontend
   - Port: 3000 (external), 8080 (internal)
   - Auto-runs database migrations

### Features Available

✅ User Registration & Login  
✅ Glucose Tracking  
✅ AI Insulin Dose Calculator  
✅ Meal Logging  
✅ Medication Management  
✅ Doctor Dashboard  
✅ Patient Dashboard  
✅ Real-time Updates (WebSocket)  

---

## 🎉 Success Indicators

You know everything is working when:

1. ✅ `docker-compose ps` shows both containers as "Up"
2. ✅ http://localhost:3000 loads in browser
3. ✅ Health check returns: `{"status": "ok"}`
4. ✅ Can register new user
5. ✅ Can login successfully
6. ✅ AI predictions return results

---

## 📚 More Information

- **Full Documentation**: See `FINAL_STATUS.md`
- **Troubleshooting Guide**: See `SETUP_ISSUES_AND_SOLUTIONS.md`
- **Project Overview**: See `README.md`

---

## 🆘 Need Help?

### Quick Diagnostics
```powershell
# Check container status
docker-compose ps

# View recent logs
docker-compose logs --tail=100 app

# Test health endpoint
Invoke-RestMethod http://localhost:3000/health

# Run automated tests
.\test-app.ps1
```

### Common Error Messages

**"Connection refused"** → Containers not running → `docker-compose up -d`

**"Table doesn't exist"** → Migrations failed → `docker-compose restart app`

**"Port already allocated"** → Change port in docker-compose.yml

---

**Last Updated**: 2026-03-25  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
