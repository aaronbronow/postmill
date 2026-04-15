
import { GoogleDriveFile, isImage, isText, downloadFileContent, MediaContent } from './google_drive_utils';

/**
 * This is the main function for the Windmill script.
 * It processes a list of GoogleDriveFile objects and organizes them
 * into a single MediaContent object.
 */
export async function main(files: GoogleDriveFile[]): Promise<MediaContent> {

  // 1. Initialize the object we are going to return.
  const mediaContent: MediaContent = {
    images: [],
    description: "", // Start with an empty description
  };

  let descriptionPromise: Promise<string> | null = null;

  // 2. Iterate through all the files to sort them.
  for (const file of files) {
    // If it's an image, add it to the images array.
    if (isImage(file)) {
      mediaContent.images.push(file);
    }

    // If it's the specific description file, start downloading its content.
    if (isText(file) && file.name === "description.txt") {
      descriptionPromise = downloadFileContent(file);
    }
  }

  // 3. After the loop, wait for the description download to finish (if it was started).
  if (descriptionPromise) {
    mediaContent.description = await descriptionPromise;
  }

  // 4. Return the final, structured object.
  console.log("Created MediaContent:", mediaContent);
  return mediaContent;
}

// Example of how you might run this (for testing purposes)
/*
const sampleFiles: GoogleDriveFile[] = [
    {
      "kind": "drive#file",
      "id": "1-mx6PUAs9TcnU2ZbfKYhlwUbgg30JOwJ",
      "name": "description.txt",
      "mimeType": "text/plain"
    },
    {
      "kind": "drive#file",
      "id": "18FWcDzSls4AeQSMLMbuP7rAzxJeHcZpW",
      "name": "photo.jpg",
      "mimeType": "image/jpeg"
    },
    {
      "kind": "drive#file",
      "id": "99cvgDzSls4AeQSMLMbuP7rAzxJeHcZpW",
      "name": "vacation.png",
      "mimeType": "image/png"
    }
];

main(sampleFiles);
*/
