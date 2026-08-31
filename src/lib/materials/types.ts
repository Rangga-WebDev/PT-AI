/** @format */

import type {
  ExtractionStatus,
  MaterialKind,
  MaterialVisibility,
} from "@/lib/validation/materials";

/** Bentuk bahan ajar sebagaimana dilihat antarmuka. Kunci objek tidak termasuk. */
export interface MaterialView {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  materialKind: MaterialKind | null;
  status: "draft" | "published" | "archived";
  visibility: MaterialVisibility;
  sequence: number | null;
  url: string | null;
  hasFile: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  extractionStatus: ExtractionStatus;
  extractedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
