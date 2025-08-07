import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow building to an alternate output directory so production builds
  // don’t clobber the dev server’s .next artifacts
  // On Vercel, always use the default .next directory so the platform can find manifests
  distDir: process.env.VERCEL ? '.next' : (process.env.NEXT_DIST_DIR || '.next'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/**',
      },
    ],
  },
};

export default nextConfig;
