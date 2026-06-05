// BASE JOB PAYLOAD INTERFACE

export interface IBaseJobPayload {
    tenantId: string;
    createdAt: string;
    correlationId?: string;
    priority?: number;
    attemptsMade?: number;
}

export interface IJobSourceMetadata {
    sourceModule?: string;
    sourceIp?: string;
  triggeredByUserId?: string;
}

export interface IJobProcessingMetadata {
  
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processedBy?: string;
  resultSummary?: string;
}