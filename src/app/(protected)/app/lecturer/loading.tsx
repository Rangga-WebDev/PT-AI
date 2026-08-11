/** @format */

import { PageContainer } from "@/components/layout/page-container";
import { SkeletonState } from "@/components/shared/states/skeleton-state";

export default function Loading() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6 py-8">
        <SkeletonState lines={2} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonState lines={4} />
          <SkeletonState lines={4} />
        </div>
      </div>
    </PageContainer>
  );
}
