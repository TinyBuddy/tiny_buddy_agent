import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* 跨域请求配置 */
  allowedDevOrigins: ['47.113.195.117'],
  
  /* 输出配置 */
  output: 'standalone',
  
  /* 其他配置 */
  experimental: {
    // 可选：启用其他实验性功能
  },
  
  /* 生产环境的跨域配置 */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // 在生产环境中应限制为特定域名
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
