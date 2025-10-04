# 使用官方HAProxy镜像作为基础镜像
FROM haproxy:2.8-alpine

# 复制配置文件到容器中
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# 暴露HAProxy监听的端口
EXPOSE 8081

# 启动HAProxy服务并输出详细日志
CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg", "-d"]