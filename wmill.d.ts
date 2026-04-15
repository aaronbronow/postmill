// THIS FILE IS READ-ONLY
// AND GENERATED AUTOMATICALLY FROM YOUR RUNNABLES

export declare const backend: {
  create_ig_media_container: (args: {}) => Promise<any>;
  create_media_content: (args: {}) => Promise<any>;
  get_google_drive_folder_contents: (args: {}) => Promise<any>;
  meta_webhooks: (args: {}) => Promise<any>;
  post-photos-app-bucket-dev.resource: (args: {}) => Promise<any>;
  google_drive_utils: (args: {}) => Promise<any>;
};

export declare const backendAsync: {
  create_ig_media_container: (args: {}) => Promise<string>;
  create_media_content: (args: {}) => Promise<string>;
  get_google_drive_folder_contents: (args: {}) => Promise<string>;
  meta_webhooks: (args: {}) => Promise<string>;
  post-photos-app-bucket-dev.resource: (args: {}) => Promise<string>;
  google_drive_utils: (args: {}) => Promise<string>;
};

export type Job = {
  type: "QueuedJob" | "CompletedJob";
  id: string;
  created_at: number;
  started_at: number | undefined;
  duration_ms: number;
  success: boolean;
  args: any;
  result: any;
};

/**
 * Execute a job and wait for it to complete and return the completed job
 * @param id
 */
export declare function waitJob(id: string): Promise<Job>;

/**
 * Get a job by id and return immediately with the current state of the job
 * @param id
 */
export declare function getJob(id: string): Promise<Job>;

export type StreamUpdate = {
  new_result_stream?: string;
  stream_offset?: number;
};

/**
 * Stream job results using SSE. Calls onUpdate for each stream update,
 * and resolves with the final result when the job completes.
 * @param id - The job ID to stream
 * @param onUpdate - Optional callback for stream updates with new_result_stream data
 * @returns Promise that resolves with the final job result
 */
export declare function streamJob(id: string, onUpdate?: (data: StreamUpdate) => void): Promise<any>;
