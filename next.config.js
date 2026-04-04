/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA manifest is in /public/manifest.json
  // For Play Store: use TWA (Trusted Web Activity) after deploying to Vercel
  reactStrictMode: true,
  
  // Allow embedding from same origin
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
