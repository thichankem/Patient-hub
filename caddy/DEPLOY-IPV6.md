# Triển khai PatientHub qua IPv6-only (FPT home network)

Setup này serve `dophuhung.fun` và `api.dophuhung.fun` qua IPv6 từ máy Windows tại nhà, không cần VPS, không đổi NS, không cần public IPv4.

## Kiến trúc

```
Internet IPv6
   ↓ [::]:443 (Let's Encrypt SSL tự động)
Caddy.exe native trên Windows host
   ├─ dophuhung.fun        → http://localhost:8080 (web container)
   └─ api.dophuhung.fun    → http://localhost:3000 (backend container)
                              ↓
                           postgres container
```

## Yêu cầu trước khi bắt đầu

- [ ] Máy Windows có thể bật **24/7**
- [ ] Có IPv6 GUA (Global Unicast Address) — xem `ipconfig` thấy địa chỉ bắt đầu bằng `2xxx:` hoặc `3xxx:`
- [ ] zonedns hỗ trợ **AAAA record** (xác nhận trong panel)
- [ ] Router FPT có thể **mở firewall IPv6 inbound** (đa số model FPT đều có)

## Bước 1 — Lấy IPv6 ổn định của máy host

PowerShell (admin):
```powershell
# Tắt SLAAC privacy extensions để IPv6 không đổi mỗi reboot.
netsh interface ipv6 set privacy state=disabled store=active
netsh interface ipv6 set privacy state=disabled store=persistent
netsh interface ipv6 set global randomizeidentifiers=disabled store=active
netsh interface ipv6 set global randomizeidentifiers=disabled store=persistent

# Reboot máy.
shutdown /r /t 0
```

Sau reboot, lấy IPv6 hiện tại:
```powershell
Get-NetIPAddress -AddressFamily IPv6 | Where-Object {
	$_.PrefixOrigin -eq "RouterAdvertisement" -and $_.SuffixOrigin -eq "Link"
} | Select-Object IPAddress
```

Ghi nhớ địa chỉ này — sẽ dùng làm AAAA record. **Lưu ý**: phần `/64 prefix` (4 group đầu) có thể vẫn đổi nếu FPT redelegate. Cần DDNS updater để xử lý.

## Bước 2 — Mở firewall IPv6 trên router AC1000Z (ZTE F671Y)

Đây là router FPT thường cấp, firmware ZTE.

**2.1. Login router**
- URL: `http://192.168.1.1`
- User mặc định: `admin`
- Password: in dưới đáy router (label "Pass Web" hoặc "Default Password"). Nếu reset rồi: `Zte521` / `admin` / `1234`

**2.2. Bật IPv6 (nếu chưa)**
- Vào **Internet** → **Connection Settings** → tab **IPv6** → đảm bảo **Enable IPv6** = ON
- Loại kết nối thường là **SLAAC + DHCPv6-PD** (FPT delegate /56 hoặc /64)

**2.3. Đường dẫn IPv6 Firewall trên F671Y**
- Vào **Security** → **Firewall** → **IPv6 Port Filter** (hoặc **IPv6 Filter** tuỳ firmware)
- Nếu không thấy: thử **Application** → **Port Forwarding** → tab **IPv6**
- Hoặc **Advanced Setup** → **Security** → **IPv6 Firewall**

**2.4. Tạo 2 rule (mặc định block-all → cần allow inbound)**

| Field | HTTP rule | HTTPS rule |
|---|---|---|
| Rule Name | `Caddy-HTTP` | `Caddy-HTTPS` |
| Direction | `WAN → LAN` (inbound) | `WAN → LAN` |
| Protocol | TCP | TCP |
| Source IP | (để trống = any) | (any) |
| Source Port | (any) | (any) |
| Destination IP | `<IPv6 máy host>` | `<IPv6 máy host>` |
| Destination Port | `80` | `443` |
| Action | Accept / Allow | Accept / Allow |

**2.5. Lưu cấu hình**: bấm **Apply** / **Save**. Một số firmware F671Y cần **Reboot router** để rule có hiệu lực.

**2.6. Verify từ ngoài**
Sau khi cài Caddy (bước 5), test từ thiết bị IPv6 khác (mobile 4G):
```
curl -6 -v http://[<IPv6 máy host>]:80/
```
Nếu connect được → firewall mở đúng. Nếu timeout → kiểm tra lại rule.

## Bước 3 — Mở Windows Firewall

PowerShell (admin):
```powershell
New-NetFirewallRule -DisplayName "Caddy HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Caddy HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## Bước 4 — Tạo AAAA records ở zonedns

Panel zonedns → quản lý `dophuhung.fun`:

| Type | Name | Value | TTL |
|---|---|---|---|
| AAAA | `@` | `<IPv6 máy host>` | 300 |
| AAAA | `api` | `<IPv6 máy host>` | 300 |
| AAAA | `www` | `<IPv6 máy host>` | 300 |

Test:
```powershell
nslookup -type=AAAA dophuhung.fun 8.8.8.8
nslookup -type=AAAA api.dophuhung.fun 8.8.8.8
```

## Bước 5 — Cài Caddy native Windows

Tải về: https://caddyserver.com/download → chọn **Windows / amd64** → tải file `caddy.exe`.

Đặt vào `C:\Caddy\caddy.exe`. Copy `Caddyfile` từ project sang `C:\Caddy\Caddyfile`.

Test trước:
```powershell
cd C:\Caddy
.\caddy.exe validate
```

Cài làm Windows Service (chạy ngầm 24/7):
```powershell
cd C:\Caddy
.\caddy.exe start
# Hoặc cài Caddy service chính thức theo https://caddyserver.com/docs/running#windows-service
```

## Bước 6 — Chạy Docker Compose

```powershell
cd C:\Users\ADMIN\OneDrive\Máy tính\Patienthub2
copy .env.docker.example .env
# Sửa .env: JWT_SECRET, AES_KEY (sinh bằng `openssl rand -hex 32` trên git bash)
docker compose up -d --build
```

## Bước 7 — Verify

Từ một thiết bị IPv6 khác (mobile data 4G/5G thường có IPv6):
- https://dophuhung.fun → load được FE
- https://api.dophuhung.fun/api/health → JSON `{"ok":true}`

Test từ ngoài qua service:
- https://www.ipv6proxy.net/ → nhập domain để test
- https://ready.chair6.net/?url=https://dophuhung.fun

## Bước 8 — Monitor IPv6 (vì zonedns không có API DDNS)

zonedns **không có API** → không tự update AAAA được. Khi FPT đổi /64 prefix, bạn phải vào panel zonedns sửa tay. Script `monitor-ipv6.ps1` sẽ phát hiện đổi và **bật thông báo Windows** để bạn biết.

**8.1. Cài BurntToast để có toast notification đẹp (tuỳ chọn)**
```powershell
Install-Module -Name BurntToast -Scope CurrentUser -Force
```
(Nếu skip: script tự fallback sang balloon tip Windows Forms.)

**8.2. Test script**
```powershell
cd C:\path\to\Patienthub2\caddy
powershell -ExecutionPolicy Bypass -File .\monitor-ipv6.ps1
```
Lần đầu chạy: phát hiện "IPv6 đổi" (từ rỗng → IPv6 hiện tại) và alert. Bạn dismiss đi.

**8.3. Lập lịch chạy mỗi 10 phút**
```powershell
$scriptPath = "$PWD\monitor-ipv6.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName "PatientHub IPv6 Monitor" -Action $action -Trigger $trigger -Settings $settings -User $env:USERNAME
```

**8.4. Khi nhận thông báo "IPv6 đổi"**
1. Mở panel zonedns
2. Sửa 3 record AAAA (`@`, `api`, `www`) về IPv6 mới hiển thị trong thông báo
3. Lưu — TTL 300s → 5 phút sau hoạt động lại

Tần suất FPT đổi prefix: tuỳ tài khoản, thường vài tuần đến vài tháng, một số khách không đổi cả năm.

## Troubleshooting

**Caddy không xin được Let's Encrypt cert**
- Let's Encrypt phải truy cập được `http://dophuhung.fun/.well-known/acme-challenge/...` qua IPv6
- Test: từ thiết bị IPv6 khác `curl http://dophuhung.fun/` — phải nhận response (dù 404)
- Nếu lỗi DNS: chờ AAAA propagate (~5 phút)
- Nếu lỗi connect: check router firewall + Windows Firewall

**Domain không resolve AAAA**
- TTL chưa hết — clear DNS cache: `ipconfig /flushdns`
- Test bằng DNS public: `nslookup -type=AAAA dophuhung.fun 8.8.8.8`

**Client IPv4-only không vào được**
- Đây là giới hạn cố hữu của IPv6-only — không sửa được trừ khi có public IPv4
- Workaround: hướng dẫn user dùng mobile data (thường có IPv6) thay vì wifi văn phòng (IPv4-only)
