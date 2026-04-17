import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(
  filename: string, 
  draftId?: number, 
  description?: string,
  imageUrls?: string[], // URLs of already uploaded images
  reorderedImages?: { url: string }[] // For reordering existing draft images
) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const s3_file: S3Object = { s3: filename };

  // 1. Load manifest
  let current_content = { status: 'ok', drafts: [] as any[] };

  try {
    const existing_bytes = await wmill.loadS3File(s3_file, bucketPath);
    if (existing_bytes) {
      current_content = JSON.parse(new TextDecoder().decode(existing_bytes));
    }
  } catch (e) {
    console.log("File not found, starting fresh.");
  }

  // 2. Update or Create Draft
  if (draftId) {
    // Update existing draft
    const index = current_content.drafts.findIndex((d: any) => d.id === draftId);
    if (index !== -1) {
      const draft = current_content.drafts[index];
      
      if (description !== undefined) {
        draft.description = description;
      }
      
      if (reorderedImages) {
        // Handle reordering
        draft.images = reorderedImages;
      }
      
      if (imageUrls && imageUrls.length > 0) {
        // Append new images
        draft.images = [...(draft.images || []), ...imageUrls.map(url => ({ url }))];
      }
      
      draft.updated_at = new Date().toISOString();
    } else {
      return { status: 'Error', message: 'Draft not found' };
    }
  } else if (imageUrls && imageUrls.length > 0) {
    // Create new draft
    const new_draft = {
      id: Date.now(),
      images: imageUrls.map(url => ({ url })),
      description: description || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    current_content.drafts.push(new_draft);
  } else {
    return { status: 'Error', message: 'No images or draft ID provided' };
  }

  // 3. Save manifest
  await wmill.writeS3File(s3_file, JSON.stringify(current_content), bucketPath);
  
  const saved_draft_id = draftId || current_content.drafts.slice(-1)[0]?.id;
  return { status: 'Draft saved', draft_id: saved_draft_id };
}
