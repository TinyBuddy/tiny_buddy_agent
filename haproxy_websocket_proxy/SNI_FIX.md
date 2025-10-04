# HAProxy SNI参数格式修复文档

## 问题描述

执行HAProxy配置验证时出现以下错误：

```
[ALERT]    (47044) : parsing [/etc/haproxy/haproxy.cfg:78] : 'server websocket_server' : error detected while parsing sni expression : unknown fetch method 'stg.tinybuddy.dev'.
```

这个错误表明HAProxy 2.4版本不接受之前使用的SNI参数格式 `sni stg.tinybuddy.dev`。

## 原因分析

在HAProxy 2.4及更早版本中，SNI参数需要使用fetch方法语法，而不能直接指定主机名。

## 修复方案

已将SNI参数格式修改为使用请求头中的Host字段：

```
# 修改前
server websocket_server stg.tinybuddy.dev:443 ssl verify none sni stg.tinybuddy.dev

# 修改后
server websocket_server stg.tinybuddy.dev:443 ssl verify none sni req.hdr(Host)
```

这个修改让HAProxy从请求头中提取Host字段作为SNI值，这样可以兼容HAProxy 2.4版本的语法要求。

## 验证步骤

1. 复制修复后的配置文件到/etc/haproxy/haproxy.cfg
2. 执行配置验证命令：`haproxy -c -f /etc/haproxy/haproxy.cfg`
3. 如果验证成功，可以重启HAProxy服务：`sudo systemctl restart haproxy`
4. 检查HAProxy服务状态：`sudo systemctl status haproxy`