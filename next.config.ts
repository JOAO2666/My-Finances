import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes com binários nativos / uso exclusivo de servidor
  serverExternalPackages: ["@libsql/client", "exceljs", "jspdf"],
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
