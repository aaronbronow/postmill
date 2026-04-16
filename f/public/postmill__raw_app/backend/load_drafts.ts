import * as wmill from 'windmill-client';
import { S3Object } from 'windmill-client';

export async function main(filename: string) {
        const bucketPath = 'u/aaron/post-photos-app-bucket-dev';
        const s3_drafts_file: S3Object = {
                s3: filename
        };

        try {
                const file_content = await wmill.loadS3File(s3_drafts_file, bucketPath);
                if (!file_content) return [];

                const file_content_str = new TextDecoder().decode(file_content);
                const data = JSON.parse(file_content_str);

                return data.drafts || [];
        } catch (e) {
                console.error("Failed to load drafts:", e);
                return [];
        }
}
