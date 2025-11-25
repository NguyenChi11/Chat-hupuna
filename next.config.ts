import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Các cấu hình khác giữ nguyên ở đây nếu có
  images: {
    // Cho phép load ảnh từ MEGA (avatar sau khi upload)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mega.nz',
        pathname: '/file/**',
      },
    ],
  },
};

export default nextConfig;
