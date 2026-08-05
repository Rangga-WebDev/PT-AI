/** @format */

import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("menggabungkan beberapa class menjadi satu string", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("mengabaikan nilai falsy", () => {
    expect(cn("px-2", false, undefined, null)).toBe("px-2");
  });

  it("menyelesaikan konflik utility Tailwind dengan nilai terakhir", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
