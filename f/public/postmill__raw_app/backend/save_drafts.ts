import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(filename: string, images: { name: string, content: string }[]) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const bucketResource = await wmill.getResource(bucketPath);
  const s3_file: S3Object = { s3: filename };

  // 1. Upload images to S3
  if (images && images.length > 0) {
    for (const img of images) {
      // Use Buffer for reliable base64 decoding in Bun/Node
      const buffer = Buffer.from(img.content, 'base64');
      // Convert to Blob to ensure binary treatment by writeS3File
      const blob = new Blob([buffer]);
      
      await wmill.writeS3File({ s3: img.name }, blob, bucketPath);
    }
  }

  // 2. Update manifest
  let current_content = { status: 'ok', drafts: [] as any[] };

  try {
    const existing_bytes = await wmill.loadS3File(s3_file, bucketPath);
    if (existing_bytes) {
      current_content = JSON.parse(new TextDecoder().decode(existing_bytes));
    }
  } catch (e) {
    console.log("File not found, starting fresh.");
  }

  if (images && images.length > 0) {
    const new_draft = {
      id: Date.now(),
      images: images.map(img => ({
        url: `https://${bucketResource.bucket}.${bucketResource.endPoint}/${img.name}`
      })),
      created_at: new Date().toISOString()
    };
    current_content.drafts.push(new_draft);
  }

  await wmill.writeS3File(s3_file, JSON.stringify(current_content), bucketPath);
  
  return { status: 'Draft saved', draft_id: current_content.drafts.slice(-1)[0]?.id };
}
