import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(filename: string, draftId: number) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const s3_file: S3Object = { s3: filename };

  try {
    const existing_bytes = await wmill.loadS3File(s3_file, bucketPath);
    if (!existing_bytes) {
      return { status: 'Error', message: 'Manifest file not found' };
    }

    const current_content = JSON.parse(new TextDecoder().decode(existing_bytes));
    const draftIndex = current_content.drafts.findIndex((d: any) => d.id === draftId);

    if (draftIndex === -1) {
      return { status: 'Error', message: 'Draft not found' };
    }

    const draftToDelete = current_content.drafts[draftIndex];

    // 1. Delete associated images from S3
    for (const img of draftToDelete.images) {
      // Extract the object key from the URL
      // URL format: https://bucket.endpoint/key
      const url = new URL(img.url);
      const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      
      try {
        await wmill.deleteS3File({ s3: key }, bucketPath);
        console.log(`Deleted image: ${key}`);
      } catch (e) {
        console.error(`Failed to delete image ${key}:`, e);
      }
    }

    // 2. Remove draft from manifest
    current_content.drafts.splice(draftIndex, 1);

    // 3. Save updated manifest
    await wmill.writeS3File(s3_file, JSON.stringify(current_content), bucketPath);

    return { status: 'Draft deleted', draft_id: draftId };
  } catch (e: any) {
    console.error('Error deleting draft:', e);
    return { status: 'Error', message: e.message || String(e) };
  }
}
