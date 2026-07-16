/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@xenova/transformers", "sharp", "onnxruntime-node"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
