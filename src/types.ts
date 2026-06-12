/**
 * Types for Promotora Credit Video Formalization Platform
 */

export enum ContractStatus {
  PENDING = 'Pendente',
  RECORDED = 'Gravado',
  APPROVED = 'Aprovado',
  REJECTED = 'Reprovado'
}

export interface ClientMetadata {
  ipAddress: string;
  userAgent: string;
  platform: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  deviceInfo?: string;
  screenResolution?: string;
  timestampStart?: string;
  timestampVideoRecorded?: string;
  timestampSigned?: string;
}

export interface Contract {
  id: string; // unique ID
  contractNumber: string; // e.g. "CON-100452-2026"
  clientName: string;
  clientCpf: string; // Censored (e.g. 123.***.***-45)
  bankName: string;
  releasedValue: number;
  installmentValue: number;
  installmentsCount: number;
  createdAt: string;
  status: ContractStatus;
  rejectionReason?: string;
  
  // Completed data
  videoBlobKey?: string; // Key in IndexedDB for the video blob
  signatureImage?: string; // base64 string
  metadata?: ClientMetadata;
  verifiedAt?: string;
}

export interface AuditLog {
  id: string;
  contractId: string;
  action: string; // e.g., "Contrato Criado", "Visualizou Link", "Gravou Vídeo", "Assinou Contrato", "Aprovado", "Rejeitado"
  timestamp: string;
  description: string;
}
