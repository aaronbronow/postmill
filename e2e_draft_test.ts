import { $ } from "bun";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

const BUCKET_NAME = "bronownet-post-photos";
const MANIFEST_FILE = "postmill.json";
const TEST_IMAGE_DIR = "test_images";

async function runTest() {
  console.log("🚀 Starting End-to-End Draft Test...");

  // 1. Prepare unique test identifiers
  const testId = `test-${Date.now()}`;
  const localImages = ["DSC01008.jpg", "DSC01013.jpg"];
  const s3Keys = localImages.map(img => `${testId}-${img}`);
  const s3Urls = s3Keys.map(key => `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`);

  try {
    // 2. Upload test images
    console.log(`📤 Uploading ${localImages.length} test images with prefix ${testId}...`);
    for (let i = 0; i < localImages.length; i++) {
      const localPath = `${TEST_IMAGE_DIR}/${localImages[i]}`;
      const s3Key = s3Keys[i];
      await $`aws s3 cp ${localPath} s3://${BUCKET_NAME}/${s3Key} --quiet`;
      console.log(`   ✅ Uploaded: ${s3Key}`);
    }

    // 3. Download and update postmill.json
    console.log(`📥 Downloading ${MANIFEST_FILE}...`);
    const localManifestPath = `./${testId}-manifest.json`;
    await $`aws s3 cp s3://${BUCKET_NAME}/${MANIFEST_FILE} ${localManifestPath} --quiet`;

    console.log(`📝 Updating draft manifest...`);
    const manifestContent = JSON.parse(readFileSync(localManifestPath, "utf-8"));
    
    // Ensure drafts array exists
    if (!manifestContent.drafts) {
      manifestContent.drafts = [];
    }

    const newDraft = {
      id: testId,
      images: s3Urls.map(url => ({ url })),
      created_at: new Date().toISOString(),
      is_test: true
    };

    manifestContent.drafts.push(newDraft);
    writeFileSync(localManifestPath, JSON.stringify(manifestContent, null, 2));

    console.log(`📤 Uploading updated ${MANIFEST_FILE}...`);
    await $`aws s3 cp ${localManifestPath} s3://${BUCKET_NAME}/${MANIFEST_FILE} --quiet`;

    // 4. Verify everything exists
    console.log(`🔍 Verifying images in S3...`);
    for (const s3Key of s3Keys) {
      const lsResult = await $`aws s3 ls s3://${BUCKET_NAME}/${s3Key}`.text();
      if (!lsResult.includes(s3Key)) {
        throw new Error(`Verification failed: ${s3Key} not found in S3.`);
      }
    }
    console.log(`   ✅ All images verified.`);

    console.log(`🔍 Verifying draft in ${MANIFEST_FILE}...`);
    const verifyManifest = await $`aws s3 cp s3://${BUCKET_NAME}/${MANIFEST_FILE} -`.json();
    const draftFound = verifyManifest.drafts.find((d: any) => d.id === testId);
    if (!draftFound) {
      throw new Error(`Verification failed: Draft ${testId} not found in ${MANIFEST_FILE}.`);
    }
    console.log(`   ✅ Draft verified in manifest.`);

    // 5. Cleanup
    console.log(`🧹 Cleaning up...`);
    
    // Remove images from S3
    for (const s3Key of s3Keys) {
      await $`aws s3 rm s3://${BUCKET_NAME}/${s3Key} --quiet`;
    }
    console.log(`   ✅ S3 test images removed.`);

    // Remove draft from manifest
    const cleanupManifest = await $`aws s3 cp s3://${BUCKET_NAME}/${MANIFEST_FILE} -`.json();
    cleanupManifest.drafts = cleanupManifest.drafts.filter((d: any) => d.id !== testId);
    
    const cleanupPath = `./${testId}-cleanup.json`;
    writeFileSync(cleanupPath, JSON.stringify(cleanupManifest, null, 2));
    await $`aws s3 cp ${cleanupPath} s3://${BUCKET_NAME}/${MANIFEST_FILE} --quiet`;
    console.log(`   ✅ Draft removed from manifest.`);

    // Delete local temp files
    unlinkSync(localManifestPath);
    unlinkSync(cleanupPath);

    console.log("\n✨ Test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

runTest();
