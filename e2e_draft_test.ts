import { $ } from "bun";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "your-s3-bucket-name";
const MANIFEST_FILE = "postmill.json";
const TEST_IMAGE_DIR = "test_images";

async function runTest() {
  console.log("🚀 Starting End-to-End Draft Test (using Backend Scripts)...");

  // 1. Prepare unique test identifiers
  const testId = `test-${Date.now()}`;
  const localImages = ["DSC01008.jpg", "DSC01013.jpg"];
  const s3Keys = localImages.map(img => `${testId}-${img}`);
  
  // Note: Backend save_drafts creates its own URLs based on the resource config,
  // but for verification we need to know where it's going.

  try {
    // 2. Prepare images as base64 (simulating frontend behavior)
    console.log(`📦 Preparing ${localImages.length} test images as base64...`);
    const imageData = localImages.map(img => {
      const buffer = readFileSync(`${TEST_IMAGE_DIR}/${img}`);
      return {
        name: `${testId}-${img}`,
        content: buffer.toString('base64')
      };
    });

    // 3. Create Draft using save_drafts backend script via Windmill CLI
    console.log(`📤 Calling save_drafts backend script...`);
    // Using --local to run the local version of the script
    const saveResult = await $`wmill run --local f/public/postmill__raw_app/backend/save_drafts.ts \
      --args '{"filename": "${MANIFEST_FILE}", "images": ${JSON.stringify(imageData)}}'`.json();

    if (saveResult.status !== 'Draft saved') {
      throw new Error(`Failed to save draft: ${JSON.stringify(saveResult)}`);
    }
    const draftId = saveResult.draft_id;
    console.log(`   ✅ Draft created with ID: ${draftId}`);

    // 4. Verify everything exists in S3
    console.log(`🔍 Verifying images and manifest in S3...`);
    for (const s3Key of s3Keys) {
      const lsResult = await $`aws s3 ls s3://${BUCKET_NAME}/${s3Key}`.text();
      if (!lsResult.includes(s3Key)) {
        throw new Error(`Verification failed: ${s3Key} not found in S3.`);
      }
    }
    console.log(`   ✅ All images verified in S3.`);

    const verifyManifest = await $`aws s3 cp s3://${BUCKET_NAME}/${MANIFEST_FILE} -`.json();
    const draftFound = verifyManifest.drafts.find((d: any) => d.id === draftId);
    if (!draftFound) {
      throw new Error(`Verification failed: Draft ${draftId} not found in ${MANIFEST_FILE}.`);
    }
    console.log(`   ✅ Draft verified in manifest.`);

    // 5. Delete Draft using delete_draft backend script via Windmill CLI
    console.log(`🧹 Calling delete_draft backend script...`);
    const deleteResult = await $`wmill run --local f/public/postmill__raw_app/backend/delete_draft.ts \
      --args '{"filename": "${MANIFEST_FILE}", "draftId": ${draftId}}'`.json();

    if (deleteResult.status !== 'Draft deleted') {
      throw new Error(`Failed to delete draft: ${JSON.stringify(deleteResult)}`);
    }
    console.log(`   ✅ Draft deleted successfully.`);

    // 6. Final verification (should be gone)
    console.log(`🔍 Final verification of cleanup...`);
    for (const s3Key of s3Keys) {
      const lsResult = await $`aws s3 ls s3://${BUCKET_NAME}/${s3Key}`.text();
      if (lsResult.includes(s3Key)) {
        throw new Error(`Cleanup failed: ${s3Key} still exists in S3.`);
      }
    }
    
    const finalManifest = await $`aws s3 cp s3://${BUCKET_NAME}/${MANIFEST_FILE} -`.json();
    const stillExists = finalManifest.drafts.find((d: any) => d.id === draftId);
    if (stillExists) {
      throw new Error(`Cleanup failed: Draft ${draftId} still exists in manifest.`);
    }
    console.log(`   ✅ Cleanup verified.`);

    console.log("\n✨ End-to-End Test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

runTest();
