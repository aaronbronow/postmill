
/**
 * This file contains shared types and helper functions for interacting
 * with Google Drive files.
 */

/**
 * This type defines the structure for our consolidated media object.
 */
export type MediaContent = {
  images: GoogleDriveFile[];
  description: string;
};

// Export the type so it can be imported by other files.
export type GoogleDriveFile = {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  downloadURL: string;
};

export type GoogleDriveFileList = {
  files: GoogleDriveFile[];
};

// Export the set of MIME types for reuse.
export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp"
]);

/**
 * Checks if a Google Drive file is a plain text file.
 */
export function isText(file: GoogleDriveFile): boolean {
  return file.mimeType === "text/plain";
}

/**
 * Checks if a Google Drive file is an image.
 */
export function isImage(file: GoogleDriveFile): boolean {
  return IMAGE_MIME_TYPES.has(file.mimeType);
}

/**
 * Gets the file content as text/plain
 */
export async function downloadFileContent(file: GoogleDriveFile): Promise<string> {
  console.log(`Starting download for ${file.name}...`);

  var text_content = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}`, {
    method: "GET",
    headers: {
      // Authorization: "Bearer " + token,
      "Content-Type": "text/plain",
    },
  });
  return text_content.text();
}
