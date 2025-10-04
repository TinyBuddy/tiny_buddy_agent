# HAProxy Configuration Fixes Documentation

This document explains the fixes made to resolve the configuration errors identified during the HAProxy syntax check.

## Identified Issues

1. **Invalid character '/' in port number**
   - Error at line 76: `'server websocket_server' : invalid character '/' in port number '//stg.tinybuddy.dev/hardware' in 'wss://stg.tinybuddy.dev/hardware'`

2. **Deprecation warning for 'forceclose' keyword**
   - Warning: `keyword 'forceclose' is deprecated in favor of 'httpclose', and will not be supported by future versions`

3. **HTTP request rule order warnings**
   - Warnings about `http-request` rules placed after `use_backend` rules

## Applied Fixes

### 1. Server Directive Format Correction

**Original:**
```
server websocket_server wss://stg.tinybuddy.dev/hardware ssl verify none
```

**Fixed:**
```
server websocket_server stg.tinybuddy.dev:443 ssl verify none sni stg.tinybuddy.dev
```

**Reason:**
- HAProxy does not accept full URLs in the server directive
- Must use the format `[host]:[port]` for backend servers
- Added SNI (Server Name Indication) parameter to ensure proper SSL/TLS connection
- Specified port 443 explicitly for HTTPS/WebSocket Secure connections

### 2. Deprecated 'forceclose' Parameter

**Original:**
```
option forceclose
```

**To be fixed:**
```
option httpclose
```

**Reason:**
- 'forceclose' is deprecated in favor of 'httpclose'
- This ensures compatibility with future HAProxy versions

### 3. HTTP Request Rule Order

**Original:**
```
use_backend websocket_backend if is_websocket has_connection_upgrade

# 添加WebSocket所需的头信息
http-request set-header X-Forwarded-Proto https if { ssl_fc }
http-request set-header X-Forwarded-For %[src]
```

**To be fixed:**
```
# 添加WebSocket所需的头信息
http-request set-header X-Forwarded-Proto https if { ssl_fc }
http-request set-header X-Forwarded-For %[src]

use_backend websocket_backend if is_websocket has_connection_upgrade
```

**Reason:**
- Although functional, it's better to place HTTP request rules before backend selection
- This aligns with HAProxy's recommendation and avoids warning messages
- Maintains the same logical flow but in a more recommended order

## Verification Steps

To verify the fixed configuration:

1. Run the syntax check:
   ```bash
   haproxy -c -f /etc/haproxy/haproxy.cfg
   ```

2. If syntax check passes, start HAProxy:
   ```bash
   systemctl start haproxy
   ```

3. Check HAProxy status:
   ```bash
   systemctl status haproxy
   ```

## Additional Recommendations

1. Consider updating to a newer version of HAProxy for improved features and security
2. Add proper logging configuration to monitor WebSocket connections
3. Implement health checks for the backend server once it's confirmed to be stable