import { $ } from "bun";

const MANIFEST_FILE = "postmill.json";

async function runThreadsTest() {
  console.log("🧵 Starting Threads Posting Integration Test (using REMOTE script)...");

  // Using the draft ID we found in S3
  const draftId = 1776365320026;

  try {
    // Attempt to Post to Threads using the remote script path
    console.log(`🚀 Calling post_to_threads remote script for draft ${draftId}...`);
    
    // Windmill CLI expects the full remote path: f/folder/name
    const remotePath = "f/public/postmill__raw_app/backend/post_to_threads";

    const postResult = await $`wmill script run ${remotePath} \
      --data '{"filename": "${MANIFEST_FILE}", "draftId": ${draftId}}' \
      --silent`.json();

    if (postResult.status === 'Success') {
      console.log(`\n✨ SUCCESS! Post published to Threads.`);
      console.log(`🔗 Thread ID: ${postResult.thread_id}`);
    } else {
      console.error(`\n❌ Threads Posting Failed!`);
      console.error(JSON.stringify(postResult, null, 2));
    }

  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
}

runThreadsTest();
