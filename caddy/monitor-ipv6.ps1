# Monitor IPv6 — phát hiện khi prefix IPv6 của FPT thay đổi và CẢNH BÁO.
#
# Lý do tồn tại: zonedns KHÔNG có API DDNS → không thể auto-update AAAA record.
# Khi FPT đổi /64 prefix, script này sẽ:
#   1. Ghi log vào C:\Caddy\ipv6-change.log
#   2. Bật Windows Toast notification để bạn biết mà vào panel zonedns sửa AAAA tay.
#   3. Hiển thị địa chỉ IPv6 mới + 3 record cần update.
#
# CÁCH DÙNG:
#   1. Chạy thử: powershell -ExecutionPolicy Bypass -File .\monitor-ipv6.ps1
#   2. Lập lịch chạy mỗi 10 phút qua Task Scheduler (xem DEPLOY-IPV6.md).

# === CONFIG ===
$DOMAIN     = "dophuhung.fun"
$RECORDS    = @("@", "api", "www")
$STATE_FILE = "$PSScriptRoot\last-ipv6.txt"
$LOG_FILE   = "$PSScriptRoot\ipv6-change.log"

function Write-Log($msg) {
	$line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
	Write-Host $line
	Add-Content -Path $LOG_FILE -Value $line -Encoding UTF8
}

# === LẤY IPv6 HIỆN TẠI từ service ngoài ===
try {
	$currentIPv6 = (Invoke-RestMethod -Uri "https://api6.ipify.org" -TimeoutSec 10).Trim()
} catch {
	Write-Log "ERROR: Không lấy được IPv6 từ api6.ipify.org: $_"
	exit 1
}

if (-not $currentIPv6 -or $currentIPv6 -notmatch '^[0-9a-fA-F:]+$') {
	Write-Log "ERROR: IPv6 không hợp lệ: '$currentIPv6'"
	exit 1
}

# === SO SÁNH VỚI LẦN TRƯỚC ===
$lastIPv6 = ""
if (Test-Path $STATE_FILE) {
	$lastIPv6 = (Get-Content $STATE_FILE -Raw).Trim()
}

if ($currentIPv6 -eq $lastIPv6) {
	# Không đổi — yên lặng, không log để khỏi đầy file.
	exit 0
}

# === IPv6 ĐÃ ĐỔI — cảnh báo ===
Write-Log "IPv6 changed: $lastIPv6 -> $currentIPv6"

# Lưu state mới NGAY để khỏi alert lặp.
Set-Content -Path $STATE_FILE -Value $currentIPv6 -Encoding ASCII

# In hướng dẫn ra console + log.
$instruction = @"

╔══════════════════════════════════════════════════════════════╗
║  ⚠ IPv6 PREFIX ĐÃ ĐỔI — phải update AAAA ở zonedns ngay     ║
╠══════════════════════════════════════════════════════════════╣
║  IPv6 cũ:  $lastIPv6
║  IPv6 mới: $currentIPv6
║
║  Vào panel zonedns, sửa 3 record AAAA về địa chỉ mới:
║    @    AAAA  $currentIPv6
║    api  AAAA  $currentIPv6
║    www  AAAA  $currentIPv6
║
║  Trang admin zonedns: https://zonedns.vn (hoặc URL bạn vẫn dùng)
╚══════════════════════════════════════════════════════════════╝
"@
Write-Host $instruction -ForegroundColor Yellow
Add-Content -Path $LOG_FILE -Value $instruction -Encoding UTF8

# === WINDOWS TOAST NOTIFICATION ===
# Dùng BurntToast nếu có, fallback sang MessageBox.
try {
	if (Get-Module -ListAvailable -Name BurntToast) {
		Import-Module BurntToast
		New-BurntToastNotification `
			-Text "PatientHub: IPv6 đã đổi!", "Mở zonedns sửa AAAA: $currentIPv6" `
			-AppLogo "$PSScriptRoot\..\favicon.ico" -ErrorAction SilentlyContinue
	} else {
		# Fallback: balloon tip qua NotifyIcon (Windows Forms).
		Add-Type -AssemblyName System.Windows.Forms
		$balloon = New-Object System.Windows.Forms.NotifyIcon
		$balloon.Icon = [System.Drawing.SystemIcons]::Warning
		$balloon.BalloonTipTitle = "PatientHub: IPv6 đã đổi!"
		$balloon.BalloonTipText = "Mở zonedns sửa AAAA về $currentIPv6"
		$balloon.Visible = $true
		$balloon.ShowBalloonTip(30000)
		Start-Sleep -Seconds 30
		$balloon.Dispose()
	}
} catch {
	Write-Log "WARN: Không hiển thị được notification: $_"
}
