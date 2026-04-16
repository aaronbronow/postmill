# Postmill

Postmill is a draft management application for social media posts, built with Svelte and Windmill.

## Local Development & Testing

### Prerequisites

- [Bun](https://bun.sh/)
- [AWS CLI](https://aws.amazon.com/cli/) (authenticated with access to your own S3 bucket)
- **S3 Bucket**: You must have an S3 bucket and configured the AWS CLI with access to it.
- **Windmill Resources**: In Windmill, ensure you have an S3 resource pointing to your bucket.

### Running End-to-End Tests

To verify the draft creation and deletion flow, run the integration test script. You can set your bucket name via the `S3_BUCKET_NAME` environment variable:

```bash
S3_BUCKET_NAME=your-s3-bucket-name bun run e2e_draft_test.ts
```

Alternatively, you can manually update the `BUCKET_NAME` constant in `e2e_draft_test.ts`.

This test will:
1. Upload local test images to S3.
2. Update the `postmill.json` manifest in the bucket.
3. Verify the images and draft entry exist.
4. Clean up by removing the test data from both S3 and the manifest.

### Test Images

Sample images for testing are stored in the `test_images/` directory (ignored by git).
