import {getResource} from "windmill-client"

export async function main(filename: string) {
  const bucketResource = await getResource('u/aaron/post-photos-app-bucket-dev');
  
  return `https://${bucketResource.bucket}.${bucketResource.endPoint}/${filename}`;
}
