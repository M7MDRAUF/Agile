import { describe, it, expect } from "vitest";
import { cn, initials, humanize } from "@/lib/utils";

describe("cn", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("initials", () => {
  it("returns up to two uppercased initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("madonna")).toBe("M");
    expect(initials("Jean Luc Picard")).toBe("JL");
  });
});

describe("humanize", () => {
  it("title-cases enum tokens", () => {
    expect(humanize("in_progress")).toBe("In Progress");
    expect(humanize("done")).toBe("Done");
  });
});
