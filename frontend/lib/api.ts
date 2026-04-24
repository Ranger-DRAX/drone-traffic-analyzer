const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const errorPayload = await response.json();
      detail = errorPayload.detail ?? errorPayload.message ?? detail;
    } catch {
      detail = response.statusText || detail;
    }

    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export type JobUploadResponse = {
  job_id: string;
  status: string;
  message: string;
};

export type JobStatusResponse = {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  error?: string | null;
  input_video_path?: string | null;
  output_video_path?: string | null;
  csv_report_path?: string | null;
  summary_json_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type JobSummaryResponse = {
  job_id: string;
  status: string;
  summary: Record<string, unknown>;
};

export async function uploadVideo(file: File): Promise<JobUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<JobUploadResponse>("/jobs/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return requestJson<JobStatusResponse>(`/jobs/${jobId}/status`);
}

export async function getJobSummary(jobId: string): Promise<JobSummaryResponse> {
  return requestJson<JobSummaryResponse>(`/jobs/${jobId}/summary`);
}

export function getJobVideoUrl(jobId: string): string {
  return `${API_BASE_URL}/jobs/${jobId}/video`;
}

export function getJobReportUrl(jobId: string): string {
  return `${API_BASE_URL}/jobs/${jobId}/report`;
}
