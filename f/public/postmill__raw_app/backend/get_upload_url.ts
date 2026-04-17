import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as wmill from "windmill-client";

export async function main(name: string, contentType: string) {
  const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
  const bucketResource = await wmill.getResource(bucketPath);

  const client = new S3Client({
    region: bucketResource.region,
    credentials: {
      accessKeyId: bucketResource.accessKey,
      secretAccessKey: bucketResource.secretKey,
    },
    endpoint: bucketResource.endPoint ? `https://${bucketResource.endPoint}` : undefined,
    forcePathStyle: !!bucketResource.pathStyle,
  });

  const command = new PutObjectCommand({
    Bucket: bucketResource.bucket,
    Key: name,
    ContentType: contentType,
  });

  // Generate a URL valid for 15 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
  
  // The final public URL where the image will be accessible
  const publicUrl = `https://${bucketResource.bucket}.${bucketResource.endPoint || `s3.${bucketResource.region}.amazonaws.com`}/${name}`;

  return { uploadUrl, publicUrl };
}
