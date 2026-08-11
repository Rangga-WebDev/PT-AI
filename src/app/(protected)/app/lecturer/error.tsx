/** @format */

"use client";

import { useEffect } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ErrorState } from "@/components/shared/states/error-state";
import { Button } from "@/components/ui/button";

export default function LecturerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <ErrorState
        description="Halaman ini tidak dapat ditampilkan. Silakan coba lagi atau kembali ke dashboard."
        action={
          <Button variant="outline" onClick={reset}>
            Coba lagi
          </Button>
        }
      />
    </PageContainer>
  );
}
