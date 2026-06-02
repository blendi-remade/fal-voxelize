import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxelizer: Text → Image → 3D → Voxels",
  description:
    "Generate an image with Nano Banana 2, turn it into a 3D model with Hunyuan 3D, then voxelize it. Powered by fal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
