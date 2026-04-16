import { expect, test, mock } from "bun:test";
import { main } from "./load_drafts";
import * as wmill from "windmill-client";

// Mock the windmill-client module
mock.module("windmill-client", () => ({
  loadS3File: mock(),
}));

test("load_drafts returns drafts from S3 file", async () => {
  const mockDrafts = { drafts: [{ id: 1, title: "Draft 1" }] };
  const encodedContent = new TextEncoder().encode(JSON.stringify(mockDrafts));

  // Setup the mock implementation
  const mockedLoadS3File = wmill.loadS3File as any;
  mockedLoadS3File.mockResolvedValue(encodedContent);

  const result = await main("test-file.json");

  expect(result).toEqual(mockDrafts.drafts);
  expect(mockedLoadS3File).toHaveBeenCalledWith({ s3: "test-file.json" }, 'u/aaron/post-photos-app-bucket-dev');
});

test("load_drafts returns empty array on failure", async () => {
  const mockedLoadS3File = wmill.loadS3File as any;
  mockedLoadS3File.mockRejectedValue(new Error("S3 Error"));

  const result = await main("missing-file.json");

  expect(result).toEqual([]);
});
