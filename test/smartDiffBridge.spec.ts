import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { mockGenerateSummary, mockShapeUnifiedDiff } = vi.hoisted(() => ({
  mockGenerateSummary: vi.fn(),
  mockShapeUnifiedDiff: vi.fn((text: string) => text),
}));

vi.mock("@mcarvin/smart-diff", () => {
  const DEFAULT_NOISE_EXCLUDES = [
    "package-lock.json",
    "yarn.lock",
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    "__snapshots__",
  ] as const;
  return {
    __esModule: true,
    generateSummary: mockGenerateSummary,
    shapeUnifiedDiff: mockShapeUnifiedDiff,
    DEFAULT_NOISE_EXCLUDES,
    truncateUnifiedDiffForLlm: (text: string) => text,
    resolveLlmMaxDiffChars: (n?: number) => n ?? 120_000,
  };
});

import type { GitlabClient } from "@src/gitlab/client.js";
import {
  summarizeCompareDiffWithSmartDiff,
  summarizeMergeRequestDiffWithSmartDiff,
} from "@src/integrations/smartDiffBridge.js";

type MockClient = GitlabClient & {
  request: Mock;
  requestAllPages: Mock;
};

function mockClient(): MockClient {
  return {
    request: vi.fn(),
    requestAllPages: vi.fn(),
  } as unknown as MockClient;
}

function makeChange(newPath: string | null, oldPath: string | null = newPath) {
  return {
    old_path: oldPath,
    new_path: newPath,
    new_file: false,
    renamed_file: false,
    deleted_file: false,
    diff: `@@ -1 +1 @@\n-old ${newPath ?? oldPath}\n+new ${newPath ?? oldPath}\n`,
  };
}

describe("smartDiffBridge", () => {
  beforeEach(() => {
    mockGenerateSummary.mockReset();
    mockGenerateSummary.mockResolvedValue("SUMMARY");
    mockShapeUnifiedDiff.mockClear();
    mockShapeUnifiedDiff.mockImplementation((text: string) => text);
  });

  it("exports summarizeCompareDiffWithSmartDiff", () => {
    expect(typeof summarizeCompareDiffWithSmartDiff).toBe("function");
  });

  it("summarizeMergeRequestDiffWithSmartDiff forwards diffShaping to shapeUnifiedDiff", async () => {
    const client = mockClient();
    client.request
      .mockResolvedValueOnce({ target_branch: "main", source_branch: "feat/x" })
      .mockResolvedValueOnce({ changes: [makeChange("src/app.ts")] });
    client.requestAllPages.mockResolvedValueOnce([{ id: "abc", message: "commit" }]);

    const shaping = { stripDiffPreamble: true, maxHunkLines: 50 };
    const out = await summarizeMergeRequestDiffWithSmartDiff({
      client,
      projectId: "group/proj",
      mergeRequestIid: 42,
      diffShaping: shaping,
    });

    expect(out).toBe("SUMMARY");
    expect(mockShapeUnifiedDiff).toHaveBeenCalledWith(expect.any(String), shaping);
  });

  it("summarizeMergeRequestDiffWithSmartDiff drops DEFAULT_NOISE_EXCLUDES entries", async () => {
    const client = mockClient();
    client.request
      .mockResolvedValueOnce({ target_branch: "main", source_branch: "feat/x" })
      .mockResolvedValueOnce({
        changes: [
          makeChange("src/app.ts"),
          makeChange("package-lock.json"),
          makeChange("dist/bundle.js"),
          makeChange("nested/node_modules/pkg/index.js"),
        ],
      });
    client.requestAllPages.mockResolvedValueOnce([{ id: "abc", message: "commit" }]);

    await summarizeMergeRequestDiffWithSmartDiff({
      client,
      projectId: 1,
      mergeRequestIid: 7,
      excludeDefaultNoise: true,
    });

    const passed = mockGenerateSummary.mock.calls[0][0] as {
      fileNames: string[];
      diffText: string;
    };
    expect(passed.fileNames).toEqual(["src/app.ts"]);
    expect(passed.diffText).toContain("src/app.ts");
    expect(passed.diffText).not.toContain("package-lock.json");
    expect(passed.diffText).not.toContain("dist/bundle.js");
    expect(passed.diffText).not.toContain("node_modules");
  });

  it("summarizeMergeRequestDiffWithSmartDiff honors includeFolders / excludeFolders", async () => {
    const client = mockClient();
    client.request
      .mockResolvedValueOnce({ target_branch: "main", source_branch: "feat/x" })
      .mockResolvedValueOnce({
        changes: [
          makeChange("src/app.ts"),
          makeChange("src/legacy/old.ts"),
          makeChange("docs/readme.md"),
        ],
      });
    client.requestAllPages.mockResolvedValueOnce([]);

    await summarizeMergeRequestDiffWithSmartDiff({
      client,
      projectId: 1,
      mergeRequestIid: 7,
      includeFolders: ["src"],
      excludeFolders: ["legacy"],
    });

    const passed = mockGenerateSummary.mock.calls[0][0] as { fileNames: string[] };
    expect(passed.fileNames).toEqual(["src/app.ts"]);
  });

  it("summarizeCompareDiffWithSmartDiff applies filtering + shaping", async () => {
    const client = mockClient();
    client.request.mockResolvedValueOnce({
      diffs: [makeChange("src/app.ts"), makeChange("coverage/lcov.info")],
      commits: [{ id: "abc", message: "commit" }],
    });

    await summarizeCompareDiffWithSmartDiff({
      client,
      projectId: "g/p",
      from: "v1",
      to: "main",
      excludeDefaultNoise: true,
      diffShaping: { stripDiffPreamble: true },
    });

    const passed = mockGenerateSummary.mock.calls[0][0] as { fileNames: string[] };
    expect(passed.fileNames).toEqual(["src/app.ts"]);
    expect(mockShapeUnifiedDiff).toHaveBeenCalledWith(expect.any(String), {
      stripDiffPreamble: true,
    });
  });

  it("summarizeMergeRequestDiffWithSmartDiff does not call shapeUnifiedDiff with shaping when none provided (still called with undefined)", async () => {
    const client = mockClient();
    client.request
      .mockResolvedValueOnce({ target_branch: "main", source_branch: "feat/x" })
      .mockResolvedValueOnce({ changes: [makeChange("src/app.ts")] });
    client.requestAllPages.mockResolvedValueOnce([]);

    await summarizeMergeRequestDiffWithSmartDiff({
      client,
      projectId: 1,
      mergeRequestIid: 7,
    });

    expect(mockShapeUnifiedDiff).toHaveBeenCalledWith(expect.any(String), undefined);
  });
});
