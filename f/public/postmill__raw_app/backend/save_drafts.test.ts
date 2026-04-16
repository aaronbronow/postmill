import { expect, test, mock } from "bun:test";
import { main } from "./save_drafts";
import * as wmill from "windmill-client";

// Mock the windmill-client module
mock.module("windmill-client", () => ({
  loadS3File: mock(),
  writeS3File: mock(),
  getResource: mock(),
}));

test("save_drafts saves new draft when images are provided", async () => {
  const bucketResource = { bucket: "my-bucket", endPoint: "s3.amazonaws.com" };
  const existingContent = { status: "ok", drafts: [] };
  const encodedContent = new TextEncoder().encode(JSON.stringify(existingContent));

  const mockedGetResource = wmill.getResource as any;
  const mockedLoadS3File = wmill.loadS3File as any;
  const mockedWriteS3File = wmill.writeS3File as any;

  mockedGetResource.mockResolvedValue(bucketResource);
  mockedLoadS3File.mockResolvedValue(encodedContent);
  mockedWriteS3File.mockResolvedValue(null);

  const images = ["image1.png"];
  const filename = "drafts.json";

  const result = await main(filename, images);

  expect(result.status).toBe("Draft saved");
  expect(result.draft_id).toBeDefined();
  expect(mockedWriteS3File).toHaveBeenCalled();
  
  const writeArgs = mockedWriteS3File.mock.calls[0];
  const savedData = JSON.parse(writeArgs[1]);
  expect(savedData.drafts.length).toBe(1);
  expect(savedData.drafts[0].images[0].url).toContain("my-bucket.s3.amazonaws.com/image1.png");
});

test("save_drafts handles missing file by starting fresh", async () => {
  const bucketResource = { bucket: "my-bucket", endPoint: "s3.amazonaws.com" };
  const mockedGetResource = wmill.getResource as any;
  const mockedLoadS3File = wmill.loadS3File as any;
  const mockedWriteS3File = wmill.writeS3File as any;

  mockedGetResource.mockResolvedValue(bucketResource);
  mockedLoadS3File.mockRejectedValue(new Error("File not found"));
  mockedWriteS3File.mockResolvedValue(null);

  const result = await main("new-file.json", ["img.png"]);

  expect(result.status).toBe("Draft saved");
  expect(mockedWriteS3File).toHaveBeenCalled();
});
