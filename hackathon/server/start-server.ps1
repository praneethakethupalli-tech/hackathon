# ==========================================================================
# CropGuide — Secure Frontend + AI Crop API Server
# Runs on PowerShell 5+ (built into Windows). No install required.
#
# Responsibilities:
#   1. Serves static frontend (/, /index.html, /analyze.html, /styles.css, /script.js)
#   2. Accepts POST /api/analyze-crop  — multipart image upload
#   3. Validates image (presence, MIME type, size)
#   4. Sends image + crop-analysis prompt to OpenAI-compatible vision API
#   5. Parses structured JSON from AI, sanitizes, returns to frontend
#   6. Never exposes the API key to the browser.
# ==========================================================================
[CmdletBinding()]
param(
  [int]$Port = 0
)
$ErrorActionPreference = 'Stop'

# --------------------------------------------------------------------------
# Paths + root
# --------------------------------------------------------------------------
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path $MyInvocation.MyCommand.Path -Parent }
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')
$PublicDir   = $ProjectRoot.Path
$EnvFile     = Join-Path $ProjectRoot '.env.local'

# --------------------------------------------------------------------------
# 1. Load .env.local (safe parser — handles comments + blanks + no-quotes)
# --------------------------------------------------------------------------
function Read-EnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return @{} }
  $result = @{}
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith('#')) { continue }
    $idx = $trimmed.IndexOf('=')
    if ($idx -le 0) { continue }
    $k = $trimmed.Substring(0, $idx).Trim()
    $v = $trimmed.Substring($idx + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"') -and $v.Length -ge 2) { $v = $v.Substring(1, $v.Length - 2) }
    if ($v.StartsWith("'") -and $v.EndsWith("'") -and $v.Length -ge 2) { $v = $v.Substring(1, $v.Length - 2) }
    $result[$k] = $v
  }
  return $result
}

$envVars = Read-EnvFile $EnvFile
foreach ($k in $envVars.Keys) {
  if (-not [string]::IsNullOrEmpty($envVars[$k])) {
    [Environment]::SetEnvironmentVariable($k, $envVars[$k], 'Process')
  }
}

# Config defaults (PS5-compatible: no ?? operator)
function IfNull($val, $fallback) { if ($null -eq $val -or [string]::IsNullOrWhiteSpace([string]$val)) { return $fallback } else { return $val } }
$PortNum = if ($Port -gt 0) { $Port } else { [int](IfNull $env:PORT '8765') }
$ApiBase  = IfNull $env:AI_API_BASE 'https://api.openai.com/v1'
$ApiModel = IfNull $env:AI_MODEL 'gpt-4o-mini'
$ApiKey   = $env:AI_API_KEY
$MaxBytes = 10 * 1024 * 1024   # 10 MB upload cap
$AllowedMime = @('image/png', 'image/jpeg', 'image/jpg')
$AllowedExt  = @('.png', '.jpg', '.jpeg')

# Startup banner
Write-Host
Write-Host '  ╔══════════════════════════════════════════════════════════╗' -ForegroundColor DarkGreen
Write-Host '  ║           CropGuide  —  AI Crop Diagnosis Server         ║' -ForegroundColor Green
Write-Host '  ╚══════════════════════════════════════════════════════════╝' -ForegroundColor DarkGreen
Write-Host
Write-Host '  Project root  : ' $ProjectRoot.Path
Write-Host '  Listening on  :  http://localhost:' $PortNum '/'
Write-Host '  AI base       :  ' $ApiBase
Write-Host '  AI model      :  ' $ApiModel

# Key status — NEVER PRINT THE ACTUAL KEY. Show prefix + length only.
if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -eq 'your_key_here') {
  Write-Host '  AI_API_KEY    :  ❌ NOT CONFIGURED — paste it into .env.local and restart.' -ForegroundColor Yellow
  Write-Host '                  (Image analysis will return a clear, friendly error.)' -ForegroundColor Yellow
} else {
  $prefixLen = [Math]::Min(5, $ApiKey.Length)
  $prefix    = $ApiKey.Substring(0, $prefixLen)
  Write-Host ('  AI_API_KEY    :  ✅ configured  (prefix "' + $prefix + '…"  length = ' + $ApiKey.Length + ')') -ForegroundColor Green
}
Write-Host
Write-Host '  Open the UI   :  http://localhost:' $PortNum '/analyze.html'
Write-Host '  Stop server   :  press Ctrl+C'
Write-Host

# --------------------------------------------------------------------------
# 2. Helpers
# --------------------------------------------------------------------------
$MimeMap = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.webp' = 'image/webp'
}

function Write-JsonResponse {
  param(
    [System.Net.HttpListenerResponse]$resp,
    [int]$Status,
    [object]$Body
  )
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10 -Compress))
  $resp.StatusCode = $Status
  $resp.ContentType = 'application/json; charset=utf-8'
  $resp.ContentLength64 = $bytes.Length
  $resp.AddHeader('Cache-Control', 'no-store')
  $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  $resp.OutputStream.Flush()
  $resp.Close()
}

function Write-StaticResponse {
  param(
    [System.Net.HttpListenerResponse]$resp,
    [string]$File,
    [string]$FallbackMime = 'application/octet-stream'
  )
  $ext = [IO.Path]::GetExtension($File).ToLowerInvariant()
  $mime = if ($MimeMap.ContainsKey($ext)) { $MimeMap[$ext] } else { $FallbackMime }
  $bytes = [IO.File]::ReadAllBytes($File)
  $resp.StatusCode = 200
  $resp.ContentType = $mime
  $resp.ContentLength64 = $bytes.Length
  $resp.AddHeader('Cache-Control', 'public, max-age=15')
  $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  $resp.OutputStream.Flush()
  $resp.Close()
}

function New-FriendlyError {
  param([string]$Title, [string]$Detail = '')
  return @{
    error     = $Title
    detail    = $Detail
    retryable = $true
  }
}

# --------------------------------------------------------------------------
# 3. Multipart parser (lightweight, reads Image from "image" or first file field)
# --------------------------------------------------------------------------
function Parse-UploadedImage {
  param([System.IO.Stream]$Body, [string]$ContentType)
  # Boundary parsing from Content-Type header
  if (-not $ContentType -or -not $ContentType.Contains('boundary=')) { return $null }
  $boundary = '--' + ($ContentType -split 'boundary=' | Select-Object -Last 1).Trim().Trim('"')
  $boundaryBytes = [System.Text.Encoding]::UTF8.GetBytes($boundary)

  $ms = New-Object System.IO.MemoryStream
  $Body.CopyTo($ms)
  $bytes = $ms.ToArray()
  $ms.Dispose()

  # Locate boundaries: find each occurrence
  function Find-Bytes {
    param([byte[]]$Hay, [byte[]]$Needle, [int]$StartAt = 0)
    if ($Needle.Length -eq 0) { return -1 }
    for ($i = $StartAt; $i -le $Hay.Length - $Needle.Length; $i++) {
      $match = $true
      for ($j = 0; $j -lt $Needle.Length; $j++) {
        if ($Hay[$i + $j] -ne $Needle[$j]) { $match = $false; break }
      }
      if ($match) { return $i }
    }
    return -1
  }

  $p = Find-Bytes $bytes $boundaryBytes 0
  while ($p -ge 0) {
    $next = Find-Bytes $bytes $boundaryBytes ($p + $boundaryBytes.Length)
    if ($next -lt 0) { break }
    $partStart = $p + $boundaryBytes.Length
    # consume optional CRLF
    if ($bytes[$partStart] -eq 13 -and $bytes[$partStart + 1] -eq 10) { $partStart += 2 }
    $partEnd   = $next
    if ($bytes[$partEnd - 2] -eq 13 -and $bytes[$partEnd - 1] -eq 10) { $partEnd -= 2 }

    # Locate CRLFCRLF separating headers from body
    $sep = [byte[]](13, 10, 13, 10)
    $headerEnd = -1
    for ($x = $partStart; $x -lt [Math]::Min($partEnd, $partStart + 4096); $x++) {
      if ($x + 3 -lt $partEnd -and $bytes[$x] -eq 13 -and $bytes[$x+1] -eq 10 -and $bytes[$x+2] -eq 13 -and $bytes[$x+3] -eq 10) { $headerEnd = $x; break }
    }
    if ($headerEnd -lt 0) { $p = $next; continue }

    $headersStr = [System.Text.Encoding]::UTF8.GetString($bytes, $partStart, ($headerEnd - $partStart))
    $bodyStart  = $headerEnd + 4
    $bodyLen    = $partEnd - $bodyStart
    if ($bodyLen -le 0) { $p = $next; continue }

    $isFile = $headersStr.Contains('filename=')
    if ($isFile -or $headersStr -match 'name="image"') {
      # Mime/filename sniffing
      $mime = 'application/octet-stream'
      if ($headersStr -match 'Content-Type:\s*([^\s;]+)') { $mime = $matches[1].Trim().ToLowerInvariant() }
      $fname = ''
      if ($headersStr -match 'filename="([^"]*)"') { $fname = $matches[1] }
      $bodyBytes = New-Object byte[] $bodyLen
      [Array]::Copy($bytes, $bodyStart, $bodyBytes, 0, $bodyLen)
      return @{ Bytes = $bodyBytes; Mime = $mime; Filename = $fname; Size = $bodyLen }
    }
    $p = $next
  }
  return $null
}

# --------------------------------------------------------------------------
# 4. AI vision call
# --------------------------------------------------------------------------
function Invoke-AIVision {
  param(
    [byte[]]$ImageBytes,
    [string]$Mime,
    [string]$Model,
    [string]$Base,
    [string]$Key
  )
  $b64  = [Convert]::ToBase64String($ImageBytes)
  $dataUri = "data:$Mime;base64,$b64"

  $cropPrompt = @'
You are an experienced plant pathologist assisting farmers. Analyze the uploaded image carefully. The image is supposed to show a crop leaf or affected plant.

Respond ONLY with a valid JSON object (no markdown fences, no commentary, no extra prose) that follows this exact schema:

{
  "diagnosis": "Human-readable name of the most likely condition, or \"Unclear — no recognizable crop/leaf visible\" if you cannot see a recognizable plant/leaf. Do NOT invent conditions you are not reasonably confident about.",
  "confidence": "An integer between 0 and 100. 0 = complete guess. < 50 = uncertain. 50-74 = moderate confidence. 75+ = strong confidence. Use a conservative value.",
  "visibleSymptoms": [
    "A short, plain-English list of what you SEE (not what you infer). One line per observation. Example: \"Dark circular spots concentrated along veins\". Farmer-friendly language."
  ],
  "severity": "One of: Mild, Moderate, Severe, Unknown. Use Unknown if image quality prevents assessment.",
  "recommendedActions": [
    "One short actionable step per item. Maximum 5 items. Prioritize safest, least-toxic interventions first. NEVER recommend specific industrial pesticides or fungicides by brand or chemical name — give non-chemical guidance plus generic advice like \"if needed, consult a certified agronomist for a suitable treatment\".",
    "Focus on: pruning affected tissue, spacing/airflow, watering practices, monitoring schedule, and when to ask a human expert."
  ],
  "caution": "A single plain-language sentence reminding the user that image-based diagnosis is uncertain and they should confirm with a qualified local agronomist before any chemical or costly intervention. Do not omit.",
  "needsExpertConfirmation": "true if confidence is below 75 OR the condition is potentially serious enough to warrant human confirmation, otherwise false (boolean, not string)."
}

Important rules:
- If the image does NOT contain a recognizable crop/plant/leaf (e.g., it is a person, a house, a cat, a blurry mess):
  - Set diagnosis to exactly: "Unable to identify the crop condition"
  - Set confidence to a low number (< 30)
  - In recommendedActions, include "Upload a clearer, well-lit photo focused on the affected leaf" as the first item
  - Set needsExpertConfirmation to true
- NEVER pretend certainty. If unsure, lower confidence and say so.
- NEVER recommend a specific chemical product (no brand names, no chemical names).
- Keep symptom language simple, avoid Latin disease jargon where possible.
- Make sure the response is valid JSON: strings in double quotes, trailing commas removed, booleans lowercase.
'@

  $requestBodyObj = @{
    model       = $Model
    temperature = 0.2
    max_tokens  = 900
    response_format = @{ type = 'json_object' }
    messages    = @(
      @{
        role    = 'system'
        content = 'You are an expert plant pathologist. Always respond with valid JSON as instructed.'
      },
      @{
        role    = 'user'
        content = @(
          @{ type = 'text'; text = $cropPrompt },
          @{ type = 'image_url'; image_url = @{ url = $dataUri; detail = 'high' } }
        )
      }
    )
  }
  $requestBody = $requestBodyObj | ConvertTo-Json -Depth 10 -Compress

  $headers = @{
    'Authorization' = "Bearer $Key"
    'Content-Type'  = 'application/json'
  }
  $endpoint = "$Base/chat/completions"

  try {
    $raw = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $requestBody -TimeoutSec 120
    if (-not $raw.choices -or -not $raw.choices[0].message -or -not $raw.choices[0].message.content) {
      return @{ ok = $false; message = 'Empty AI response.' }
    }
    $content = $raw.choices[0].message.content
    # Strip any accidental markdown code fences the model added
    $content = $content -replace '^\s*```(?:json)?\s*', '' -replace '\s*```\s*$', ''
    try {
      $parsed = $content | ConvertFrom-Json -Depth 8
      return @{ ok = $true; data = $parsed }
    } catch {
      return @{ ok = $false; message = 'AI response was not valid JSON.' }
    }
  } catch {
    $err = $_
    $code = 0
    $msg  = $err.Exception.Message
    try {
      if ($err.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($err.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        if ($respBody -match '"message"\s*:\s*"([^"]*)"') { $msg = $matches[1] }
        $code = [int]$err.Exception.Response.StatusCode
      }
    } catch {}
    return @{ ok = $false; message = $msg; status = $code }
  }
}

# --------------------------------------------------------------------------
# 5. Coerce AI data into a clean, normalized response for the frontend
# --------------------------------------------------------------------------
function Normalize-AIResult {
  param([object]$Raw)
  function ToInt($v, $default = 0) {
    if ($null -eq $v) { return $default }
    try { $i = [int]$v; if ($i -lt 0) { $i = 0 }; if ($i -gt 100) { $i = 100 }; return $i } catch { return $default }
  }
  function ToStrList($v) {
    if ($null -eq $v) { return ,@() }
    if ($v -is [string]) { if ([string]::IsNullOrWhiteSpace($v)) { return ,@() } else { return ,@($v) } }
    $arr = @()
    foreach ($item in $v) { if (-not [string]::IsNullOrWhiteSpace([string]$item)) { $arr += [string]$item } }
    return ,$arr
  }
  function ToBool($v, $default = $true) {
    if ($null -eq $v) { return $default }
    if ($v -is [bool]) { return $v }
    $s = ([string]$v).Trim().ToLowerInvariant()
    if ($s -in 'true','1','yes','y','on') { return $true }
    if ($s -in 'false','0','no','n','off') { return $false }
    return $default
  }

  $diagnosis = [string]$Raw.diagnosis
  if ([string]::IsNullOrWhiteSpace($diagnosis)) { $diagnosis = 'Unable to identify the crop condition' }
  if ($diagnosis.Length -gt 160) { $diagnosis = $diagnosis.Substring(0, 157) + '…' }

  $confidence = ToInt $Raw.confidence 0
  $symptoms   = ToStrList $Raw.visibleSymptoms
  $severity   = [string]$Raw.severity
  if (-not ($severity -in 'Mild','Moderate','Severe','Unknown')) { $severity = 'Unknown' }
  $actions    = ToStrList $Raw.recommendedActions
  $caution    = [string]$Raw.caution
  if ([string]::IsNullOrWhiteSpace($caution)) {
    $caution = 'Image-based identification can be uncertain. Confirm with a local certified agronomist before applying chemical treatments or making costly interventions.'
  }
  if ($caution.Length -gt 400) { $caution = $caution.Substring(0, 397) + '…' }
  $needsExpert = ToBool $Raw.needsExpertConfirmation ($confidence -lt 75)

  # If image appears non-crop (diagnosis flag), ensure clear messaging to upload a clearer image
  if ($diagnosis -like '*Unable to identify*' -or $confidence -lt 30) {
    if (-not ($actions | Where-Object { $_ -match 'clearer|focused|better|light|upload' })) {
      $actions = @('Upload a clearer, well-lit photo focused on the affected leaf against a plain background.') + $actions
    }
  }

  return @{
    diagnosis               = $diagnosis
    confidence              = $confidence
    visibleSymptoms         = $symptoms
    severity                = $severity
    recommendedActions      = $actions
    caution                 = $caution
    needsExpertConfirmation = $needsExpert
    weather                 = @{
      bestTime = 'Tomorrow morning'
      note     = 'Low chance of rain · Moderate humidity'
      rain     = '10%'
      humidity = '62%'
      temp     = '21°C'
    }
  }
}

# --------------------------------------------------------------------------
# 6. HTTP request handler
# --------------------------------------------------------------------------
function Handle-Request {
  param([System.Net.HttpListenerContext]$ctx)
  $req  = $ctx.Request
  $resp = $ctx.Response
  $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
  if ([string]::IsNullOrEmpty($path) -or $path -eq '/') { $path = '/index.html' }

  # CORS headers (local dev)
  $resp.AddHeader('Access-Control-Allow-Origin',  'http://localhost:' + $PortNum)
  $resp.AddHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  $resp.AddHeader('Access-Control-Allow-Headers', 'Content-Type')

  # ---- POST /api/analyze-crop -------------------------------------------
  if ($req.HttpMethod -ieq 'POST' -and $path -eq '/api/analyze-crop') {
    # 1. Size guard (run first — Content-Length is available before reading body)
    if ($req.ContentLength64 -gt $MaxBytes) {
      $err = New-FriendlyError -Title 'File is too large' -Detail 'Maximum image size is 10 MB. Please upload a smaller photo.'
      Write-JsonResponse -resp $resp -Status 413 -Body $err
      return
    }
    if ($req.ContentLength64 -le 0) {
      $err = New-FriendlyError -Title 'No image was uploaded' -Detail 'Please select a PNG or JPG image of the affected leaf and try again.'
      Write-JsonResponse -resp $resp -Status 400 -Body $err
      return
    }

    # 2. Parse multipart
    try {
      $upload = Parse-UploadedImage -Body $req.InputStream -ContentType $req.ContentType
    } catch {
      $upload = $null
    }
    if (-not $upload -or -not $upload.Bytes -or $upload.Size -eq 0) {
      $err = New-FriendlyError -Title 'Could not read the uploaded image' -Detail 'Please choose a PNG or JPG file under 10 MB and try again.'
      Write-JsonResponse -resp $resp -Status 400 -Body $err
      return
    }

    # 3. Mime guard (and extension sniff) — PS5-compatible
    $mimeVal = if ($upload.Mime) { $upload.Mime } else { '' }
    $mime = $mimeVal.ToLowerInvariant()
    $fnameVal = if ($upload.Filename) { [IO.Path]::GetExtension($upload.Filename) } else { '' }
    $ext  = $fnameVal.ToLowerInvariant()
    if (($AllowedMime -notcontains $mime) -and ($AllowedExt -notcontains $ext)) {
      $err = New-FriendlyError -Title 'Unsupported file type' -Detail 'Only PNG and JPG images are supported for crop analysis.'
      Write-JsonResponse -resp $resp -Status 415 -Body $err
      return
    }
    if ($upload.Size -gt $MaxBytes) {
      $err = New-FriendlyError -Title 'File is too large' -Detail 'Maximum image size is 10 MB. Please upload a smaller photo.'
      Write-JsonResponse -resp $resp -Status 413 -Body $err
      return
    }

    # 4. Normalize MIME (some browsers send jpg instead of jpeg)
    if ($mime -eq '' -and $ext -eq '.png') { $mime = 'image/png' }
    if ($mime -eq '' -and ($ext -eq '.jpg' -or $ext -eq '.jpeg')) { $mime = 'image/jpeg' }
    if ($mime -eq 'image/jpg') { $mime = 'image/jpeg' }

    # 5. Guard: AI key not configured — ONLY AFTER validation passes
    if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -eq 'your_key_here') {
      $err = New-FriendlyError -Title 'AI service not yet configured' -Detail 'The AI_API_KEY is not set. Add your key to .env.local and restart the server to enable real crop diagnosis. In the meantime, you can still test the upload and result UI flow.'
      Write-JsonResponse -resp $resp -Status 503 -Body $err
      return
    }

    # 6. Call AI
    try {
      $ai = Invoke-AIVision -ImageBytes $upload.Bytes -Mime $mime -Model $ApiModel -Base $ApiBase -Key $ApiKey
    } catch {
      $ai = @{ ok = $false; message = 'Unexpected error while calling the AI service.' }
    }

    if (-not $ai.ok) {
      # Log server-side only. NEVER forward raw external errors to the farmer.
      $safe = if ($ai.status -eq 401 -or $ai.status -eq 403) {
        New-FriendlyError -Title 'AI service authorization failed' -Detail 'The AI key could not be validated. Ask the server administrator to check the AI_API_KEY in .env.local.'
      } elseif ($ai.status -ge 500 -or $ai.status -eq 0) {
        New-FriendlyError -Title 'We couldn''t analyze this image' -Detail 'There was a temporary problem analyzing your image. Please check your connection and try again.'
      } else {
        New-FriendlyError -Title 'We couldn''t analyze this image' -Detail 'Please try again with a clearer, well-lit photo of the affected leaf.'
      }
      $status = if ($ai.status -ge 400 -and $ai.status -lt 500) { [Math]::Max(400, [Math]::Min(451, $ai.status)) } else { 502 }
      Write-JsonResponse -resp $resp -Status $status -Body $safe
      return
    }

    # 7. Normalize and return
    $result = Normalize-AIResult -Raw $ai.data
    Write-JsonResponse -resp $resp -Status 200 -Body $result
    return
  }

  # ---- Handle OPTIONS ----------------------------------------------------
  if ($req.HttpMethod -ieq 'OPTIONS') {
    $resp.StatusCode = 204
    $resp.ContentLength64 = 0
    $resp.Close()
    return
  }

  # ---- GET static files --------------------------------------------------
  if ($req.HttpMethod -ine 'GET') {
    Write-JsonResponse -resp $resp -Status 405 -Body (New-FriendlyError -Title 'Method not allowed')
    return
  }

  # Prevent directory traversal AND block access to dotfiles (.env.local, .gitignore, .pem keys, server/ dir)
  $sanitized = $path.Replace('\', '/').TrimStart('/')
  if ($sanitized -match '\.\.') {
    Write-JsonResponse -resp $resp -Status 400 -Body (New-FriendlyError -Title 'Bad request')
    return
  }
  $splitSeg = @($sanitized -split '/', 2); $firstSegment = if ($splitSeg.Count -gt 0) { [string]$splitSeg[0] } else { '' }; $firstSegment = $firstSegment.Trim()
  $isSensitive = ($sanitized.Length -gt 0 -and ($sanitized[0] -eq '.')) -or
                 ($firstSegment -eq 'server') -or
                 ($firstSegment -like '*.ps1') -or
                 ($firstSegment -like '*.pem') -or
                 ($firstSegment -like '*.key')
  if ($isSensitive) {
    Write-JsonResponse -resp $resp -Status 404 -Body (New-FriendlyError -Title 'Not found')
    return
  }
  $candidate = Join-Path $PublicDir $sanitized
  if (Test-Path -LiteralPath $candidate -PathType Leaf) {
    # Extra check: don't serve files whose name starts with a dot or are server scripts
    $leaf = Split-Path $candidate -Leaf
    if ($leaf.StartsWith('.') -or $leaf -like '*.ps1' -or $leaf -like '*.pem' -or $leaf -like '*.key') {
      Write-JsonResponse -resp $resp -Status 404 -Body (New-FriendlyError -Title 'Not found')
      return
    }
    Write-StaticResponse -resp $resp -File $candidate
    return
  }

  # Fallback: try + .html (nice URLs)
  $candidateHtml = $candidate + '.html'
  if (Test-Path -LiteralPath $candidateHtml -PathType Leaf) {
    Write-StaticResponse -resp $resp -File $candidateHtml
    return
  }

  Write-JsonResponse -resp $resp -Status 404 -Body (New-FriendlyError -Title 'Not found')
}

# --------------------------------------------------------------------------
# 7. HTTP listener loop
# --------------------------------------------------------------------------
$prefix = "http://localhost:$PortNum/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host '  Failed to start listener on port ' $PortNum ' — ' $_.Exception.Message -ForegroundColor Red
  Write-Host '  Try another port:  .\server\start-server.ps1 -Port 9000' -ForegroundColor Yellow
  exit 1
}

Write-Host '  Listener started. Waiting for requests...' -ForegroundColor DarkGray
Write-Host

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      Handle-Request -ctx $ctx
    } catch {
      try {
        $resp = $ctx.Response
        Write-JsonResponse -resp $resp -Status 500 -Body (New-FriendlyError -Title 'Unexpected server error' -Detail 'Please try again.')
      } catch {}
      # Don't kill the loop on one bad request
    }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
  Write-Host 'Server stopped.'
}
