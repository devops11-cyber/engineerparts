const wooCommerceUrl = process.env.WOOCOMMERCE_URL;
const wooCommerceImagePattern = wooCommerceUrl
  ? [{ protocol: new URL(wooCommerceUrl).protocol.replace(":", ""), hostname: new URL(wooCommerceUrl).hostname }]
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedHosts: [".monkeycode-ai.live"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "shop.engineerparts.com" },
      ...wooCommerceImagePattern,
    ],
  },
};

export default nextConfig;
