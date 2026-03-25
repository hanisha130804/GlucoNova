# GlucoNova Testing Script
# This script tests the critical functionalities of the GlucoNova application

$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GlucoNova Application Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[Test 1] Checking server health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -ErrorAction Stop
    Write-Host "✓ Server is healthy" -ForegroundColor Green
    Write-Host "  Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Server health check failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: User Registration
Write-Host "[Test 2] Testing user registration..." -ForegroundColor Yellow
$testUser = @{
    name = "Test User"
    email = "test$(Get-Random -Maximum 9999)@gluconova.com"
    password = "Test123!@#"
    role = "patient"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $testUser -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ User registration successful" -ForegroundColor Green
    Write-Host "  User ID: $($response.user.id)" -ForegroundColor Gray
    Write-Host "  Email: $($response.user.email)" -ForegroundColor Gray
    $userId = $response.user.id
    $token = $response.token
} catch {
    Write-Host "✗ User registration failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    $userId = $null
    $token = $null
}
Write-Host ""

# Test 3: Login Authentication
Write-Host "[Test 3] Testing login authentication..." -ForegroundColor Yellow
if ($userId) {
    $loginData = @{
        email = ($testUser | ConvertFrom-Json).email
        password = ($testUser | ConvertFrom-Json).password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -ErrorAction Stop
        Write-Host "✓ Login successful" -ForegroundColor Green
        Write-Host "  Token: $($response.token.Substring(0, 50))..." -ForegroundColor Gray
        $token = $response.token
    } catch {
        Write-Host "✗ Login failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $token = $null
    }
} else {
    Write-Host "⊘ Skipping login test (no user registered)" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: AI Insulin Prediction
Write-Host "[Test 4] Testing AI insulin prediction..." -ForegroundColor Yellow
if ($token) {
    $predictionData = @{
        current_glucose_mgdl = 180
        carbs_g = 45
        insulin_type = "rapid"
        icr = 10
        isf = 50
        correction_target = 100
        activity_level = "moderate"
        diabetes_type = "type2"
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $token"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/predictions/insulin" -Method Post -Body $predictionData -ContentType "application/json" -Headers $headers -ErrorAction Stop
        Write-Host "✓ AI insulin prediction successful" -ForegroundColor Green
        Write-Host "  Predicted Insulin: $($response.rounded_units) units" -ForegroundColor Gray
        Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Gray
        Write-Host "  Explanation: $($response.explanation)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ AI insulin prediction failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⊘ Skipping insulin prediction test (not authenticated)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
