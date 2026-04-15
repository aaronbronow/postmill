// there are multiple modes to add as header: //nobundling //native //npm //nodejs
// https://www.windmill.dev/docs/getting_started/scripts_quickstart/typescript#modes

//import * as wmill from "windmill-client"

import { GoogleDriveFile, isText, downloadFileContent } from './google_drive_utils';

export async function main(
  key: string,
  folder_url: string,
) {

  // parse folder url into folder ID
  // build api query string for /files?key=${key}&q=%27${folder_id}%27+in+parents
  // folder url example: https://drive.google.com/drive/folders/1fvotrdanVzoJyoAGNdCtGJyzi50-qzqG
  const LAST_URL_SEGMENT_REGEX = /(?:[^/?#]+)(?:[?#].*)?$/;
  // return the first match only if the result is not null else FOLDER_ID will be undefined
  const FOLDER_ID = folder_url.match(LAST_URL_SEGMENT_REGEX)?.[0];
  const SEARCH_URL = `https://www.googleapis.com/drive/v3/files?key=${key}&q=%27${FOLDER_ID}%27+in+parents`
  
  const response = await fetch(SEARCH_URL, {
    method: "GET",
    headers: {
      // Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  const files_to_download: GoogleDriveFile[] = [];
  
  if(result.files === undefined || result.files.length < 1) {
    console.log("No files");
    console.log(`FOLDER_ID: ${FOLDER_ID}`);
  } else {
    result.files.forEach((file: GoogleDriveFile) => {
      //console.log(file.id);
      file.downloadURL = `https://drive.google.com/uc?export=download&id=${file.id}`;
      files_to_download.push(file);
    });
  }

  // for(var i = 0; i < files_to_download.files.length; i++) 
  // {
  //   var file = files_to_download.files[i];
  //   if(isText(file)){
  //     console.log(`${file.id} appears to be text`);
  //     console.log(await downloadFileContent(file));
  //   }
  // }

  return { files: files_to_download };
}
