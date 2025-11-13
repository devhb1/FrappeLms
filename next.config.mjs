/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint checks
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checks
  },
  images: {
    unoptimized: true,
    domains: ['hebbkx1anhila5yf.public.blob.vercel-storage.com'], // Add external image domains
  },
  // Remove experimental optimizeCss as it's causing issues
}

export default nextConfig
