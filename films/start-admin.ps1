$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundled = "C:\Users\zhang\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
$py = if (Test-Path $bundled) { $bundled } else { (Get-Command python -ErrorAction SilentlyContinue).Source }
if (-not $py) { $py = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $py) { Write-Host "Python not found"; exit 1 }
New-Item -ItemType Directory -Force -Path (Join-Path $root "logs") | Out-Null
Start-Process -FilePath $py -ArgumentList @("tools\admin_server.py", "--port", "8765") `
  -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "logs\admin.out.log") `
  -RedirectStandardError (Join-Path $root "logs\admin.err.log")
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8765/web/index.html"
