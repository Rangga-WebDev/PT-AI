/** @format */

import type { NextConfig } from "next";

// Batas body Server Action sengaja dibiarkan pada bawaan Next.js yang ketat.
// Unggahan berkas besar melewati Route Handler /api/materials/upload, sehingga
// tidak ada alasan melonggarkan batas itu untuk seluruh aplikasi.
const nextConfig: NextConfig = {};

export default nextConfig;
