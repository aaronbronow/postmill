import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(filename: string, draftId: number) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const s3_file: S3Object = { s3: filename };

  // 1. Fetch Draft Data
  const existing_bytes = await wmill.loadS3File(s3_file, bucketPath);
  if (!existing_bytes) {
    throw new Error('Manifest file not found');
  }
  const current_content = JSON.parse(new TextDecoder().decode(existing_bytes));
  const draft = current_content.drafts.find((d: any) => d.id === draftId);
  if (!draft) {
    throw new Error('Draft not found');
  }

  const imageUrl = draft.images[0]?.url;
  const text = draft.description || "";
  if (!imageUrl) {
    throw new Error('No images found in draft');
  }

  // 2. Setup Credentials from Windmill Variables (with env fallbacks)
  let userId = process.env.THREADS_USER_ID;
  let accessToken = process.env.THREADS_ACCESS_TOKEN;

  try {
    if (!userId || userId === 'your-threads-user-id') {
      userId = await wmill.getVariable('u/aaron/THREADS_USER_ID');
    }
    if (!accessToken || accessToken === 'your-threads-access-token') {
      accessToken = await wmill.getVariable('u/aaron/THREADS_ACCESS_TOKEN');
    }
  } catch (e) {
    console.log("Windmill variables not found, relying on environment variables.");
  }

  if (!userId || !accessToken) {
    throw new Error('Threads credentials not configured. Set u/aaron/THREADS_USER_ID and u/aaron/THREADS_ACCESS_TOKEN in Windmill.');
  }

  // 3. Step A: Create Media Container
  console.log(`Creating Threads media container for image: ${imageUrl}`);
  const containerResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'IMAGE',
      image_url: imageUrl,
      text: text,
      access_token: accessToken
    })
  });

  const containerData = await containerResponse.json();
  if (containerData.error) {
    throw new Error(`Threads API Error (Container): ${JSON.stringify(containerData.error)}`);
  }
  const creationId = containerData.id;
  console.log(`Media container created with ID: ${creationId}`);

  // 4. Step B: Polling for status
  let status = 'IN_PROGRESS';
  let attempts = 0;
  while (status !== 'FINISHED' && attempts < 10) {
    console.log(`Polling for container status... Attempt ${attempts + 1}`);
    const statusResponse = await fetch(`https://graph.threads.net/v1.0/${creationId}?fields=status&access_token=${accessToken}`);
    const statusData = await statusResponse.json();
    
    if (statusData.error) {
        throw new Error(`Threads API Error (Status): ${JSON.stringify(statusData.error)}`);
    }
    
    status = statusData.status;
    if (status === 'FINISHED') break;
    if (status === 'ERROR') {
        throw new Error('Threads media processing failed with status ERROR');
    }

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
    attempts++;
  }

  if (status !== 'FINISHED') {
    throw new Error('Threads media processing timed out');
  }

  // 5. Step C: Publish Container
  console.log(`Publishing media container ${creationId}...`);
  const publishResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    })
  });

  const publishData = await publishResponse.json();
  if (publishData.error) {
    throw new Error(`Threads API Error (Publish): ${JSON.stringify(publishData.error)}`);
  }

  console.log(`Draft published to Threads! ID: ${publishData.id}`);
  return { status: 'Success', thread_id: publishData.id };
}
