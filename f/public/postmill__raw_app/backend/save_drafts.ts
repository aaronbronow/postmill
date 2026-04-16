import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(filename: string, images: string[]) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const bucketResource = await wmill.getResource(bucketPath);
  const s3_file: S3Object = { s3: filename };

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
        url: `https://${bucketResource.bucket}.${bucketResource.endPoint}/${img}`
      })),
      created_at: new Date().toISOString()
    };
    current_content.drafts.push(new_draft);
  }

  await wmill.writeS3File(s3_file, JSON.stringify(current_content), bucketPath);
  
  return { status: 'Draft saved', draft_id: current_content.drafts.slice(-1)[0]?.id };
}
