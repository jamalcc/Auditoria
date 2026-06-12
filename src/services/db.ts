import { createClient } from '@supabase/supabase-js';
import { Contract, ContractStatus, AuditLog, ClientMetadata } from '../types';

const DB_NAME = 'PromotoraCreditoDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';
const CONTRACTS_KEY = 'promotora_contracts';
const LOGS_KEY = 'promotora_logs';

// Initialize Supabase Client dynamically from environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE);
      }
    };
  });
}

// Store a video blob in IndexedDB
export async function saveVideoBlob(contractId: string, blob: Blob): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(VIDEO_STORE, 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.put(blob, contractId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(store.transaction?.error);
    });
  } catch (error) {
    console.error('Error saving video blob to IndexedDB:', error);
  }
}

// Retrieve a video blob from IndexedDB
export async function getVideoBlob(contractId: string): Promise<Blob | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(VIDEO_STORE, 'readonly');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.get(contractId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(store.transaction?.error);
    });
  } catch (error) {
    console.error('Error getting video blob from IndexedDB:', error);
    return null;
  }
}

// Delete video blob
export async function deleteVideoBlob(contractId: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(VIDEO_STORE, 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.delete(contractId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(store.transaction?.error);
    });
  } catch (error) {
    console.error('Error deleting video blob:', error);
  }
}

// Mappers for database alignment (snake_case database columns vs CamelCase react types)
function mapToLocalContract(dbRow: any): Contract {
  return {
    id: dbRow.id,
    contractNumber: dbRow.contract_number || dbRow.contractNumber || '',
    clientName: dbRow.client_name || dbRow.clientName || '',
    clientCpf: dbRow.client_cpf || dbRow.clientCpf || '',
    bankName: dbRow.bank_name || dbRow.bankName || '',
    releasedValue: Number(dbRow.released_value !== undefined ? dbRow.released_value : (dbRow.releasedValue || 0)),
    installmentValue: Number(dbRow.installment_value !== undefined ? dbRow.installment_value : (dbRow.installmentValue || 0)),
    installmentsCount: Number(dbRow.installments_count !== undefined ? dbRow.installments_count : (dbRow.installmentsCount || 0)),
    createdAt: dbRow.created_at || dbRow.createdAt || new Date().toISOString(),
    status: dbRow.status as ContractStatus,
    rejectionReason: dbRow.rejection_reason || dbRow.rejectionReason || undefined,
    videoBlobKey: dbRow.video_blob_key || dbRow.videoBlobKey || undefined,
    signatureImage: dbRow.signature_image || dbRow.signatureImage || undefined,
    metadata: dbRow.metadata || undefined,
    verifiedAt: dbRow.verified_at || dbRow.verifiedAt || undefined
  };
}

function mapToDbContract(c: Contract) {
  return {
    id: c.id,
    contract_number: c.contractNumber,
    client_name: c.clientName,
    client_cpf: c.clientCpf,
    bank_name: c.bankName,
    released_value: c.releasedValue,
    installment_value: c.installmentValue,
    installments_count: c.installmentsCount,
    created_at: c.createdAt,
    status: c.status,
    rejection_reason: c.rejectionReason || null,
    video_blob_key: c.videoBlobKey || null,
    signature_image: c.signatureImage || null,
    metadata: c.metadata || null,
    verified_at: c.verifiedAt || null
  };
}

// Mock Contracts for initial setup
const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'c1_maria',
    contractNumber: 'CON-5489-2026',
    clientName: 'Maria Helena de Souza',
    clientCpf: '104.***.***-32',
    bankName: 'Banco Itaú Consignado',
    releasedValue: 12500.00,
    installmentValue: 345.50,
    installmentsCount: 48,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: ContractStatus.APPROVED,
    verifiedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M10 50 Q 50 20 80 50 T 150 30 T 190 60" fill="none" stroke="black" stroke-width="2"/></svg>',
    metadata: {
      ipAddress: '177.85.120.44',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Windows Win64',
      geolocation: {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracy: 12
      },
      deviceInfo: 'Intel Core PC - Chrome Desktop',
      screenResolution: '1920x1080',
      timestampStart: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      timestampVideoRecorded: new Date(Date.now() - (47 * 3600 * 1000 + 40 * 60000)).toISOString(),
      timestampSigned: new Date(Date.now() - (47 * 3600 * 1000 + 42 * 60000)).toISOString()
    }
  },
  {
    id: 'c2_pedro',
    contractNumber: 'CON-9921-2026',
    clientName: 'Pedro Renato Santos da Silva',
    clientCpf: '321.***.***-09',
    bankName: 'Banco C6 Consignado',
    releasedValue: 24000.00,
    installmentValue: 610.15,
    installmentsCount: 72,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: ContractStatus.RECORDED,
    metadata: {
      ipAddress: '189.6.14.22',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      platform: 'iPhone iOS',
      geolocation: {
        latitude: -22.9068,
        longitude: -43.1729,
        accuracy: 8
      },
      deviceInfo: 'Apple iPhone - Safari Mobile',
      screenResolution: '390x844',
      timestampStart: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      timestampVideoRecorded: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
      timestampSigned: new Date(Date.now() - (23 * 3600 * 1000 - 5 * 60000)).toISOString()
    }
  },
  {
    id: 'c3_fernanda',
    contractNumber: 'CON-7756-2026',
    clientName: 'Fernanda de Almeida Lima',
    clientCpf: '087.***.***-67',
    bankName: 'Banco do Brasil',
    releasedValue: 8000.00,
    installmentValue: 220.00,
    installmentsCount: 36,
    createdAt: new Date().toISOString(),
    status: ContractStatus.PENDING
  }
];

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'l1',
    contractId: 'c1_maria',
    action: 'Contrato Criado',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    description: 'Proposta inserida no painel administrativo por carlos.alessandrostp@gmail.com'
  },
  {
    id: 'l2',
    contractId: 'c1_maria',
    action: 'Link Acessado',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000 + 10 * 60000).toISOString(),
    description: 'Cliente acessou o link de formalização de IP 177.85.120.44'
  },
  {
    id: 'l3',
    contractId: 'c1_maria',
    action: 'Vídeo Gravado',
    timestamp: new Date(Date.now() - 47 * 3600 * 1000 + 40 * 60000).toISOString(),
    description: 'Gravação finalizada e enviada para o servidor.'
  },
  {
    id: 'l4',
    contractId: 'c1_maria',
    action: 'Contrato Assinado',
    timestamp: new Date(Date.now() - 47 * 3600 * 1000 + 42 * 60000).toISOString(),
    description: 'Assinatura eletrônica em canvas capturada e vinculada.'
  },
  {
    id: 'l5',
    contractId: 'c1_maria',
    action: 'Aprovado',
    timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    description: 'Formalização aprovada e validada juridicamente pelo agente.'
  },
  {
    id: 'l6',
    contractId: 'c2_pedro',
    action: 'Contrato Criado',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    description: 'Proposta inserida no painel administrativo.'
  },
  {
    id: 'l7',
    contractId: 'c2_pedro',
    action: 'Vídeo Gravado',
    timestamp: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    description: 'Gravação enviada por dispositivo celular iOS.'
  },
  {
    id: 'l8',
    contractId: 'c3_fernanda',
    action: 'Contrato Criado',
    timestamp: new Date().toISOString(),
    description: 'Contrato criado de R$ 8.000,00 para o Banco do Brasil.'
  }
];

// Load contracts
export function getContracts(): Contract[] {
  const localStorageData = localStorage.getItem(CONTRACTS_KEY);
  if (!localStorageData) {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(INITIAL_CONTRACTS));
    return INITIAL_CONTRACTS;
  }
  return JSON.parse(localStorageData);
}

// Save all contracts
export function saveContracts(contracts: Contract[]): void {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
  
  // Asynchronous background upload to Supabase when variable is configured
  if (supabase) {
    const dbContracts = contracts.map(mapToDbContract);
    supabase.from('contracts').upsert(dbContracts).then(({ error }) => {
      if (error) {
        console.error('Error syncing contracts to Supabase:', error);
      }
    });
  }
}

// Add positive action audit log
export function addAuditLog(contractId: string, action: string, description: string): AuditLog {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),
    contractId,
    action,
    timestamp: new Date().toISOString(),
    description
  };
  localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...logs]));
  
  // Asynchronous background insert into Supabase
  if (supabase) {
    supabase.from('audit_logs').insert({
      id: newLog.id,
      contract_id: newLog.contractId,
      action: newLog.action,
      timestamp: newLog.timestamp,
      description: newLog.description
    }).then(({ error }) => {
      if (error) {
        console.error('Error syncing audit log to Supabase:', error);
      }
    });
  }
  
  return newLog;
}

// Get audit logs
export function getAuditLogs(contractId?: string): AuditLog[] {
  const localStorageData = localStorage.getItem(LOGS_KEY);
  let logs: AuditLog[] = [];
  if (!localStorageData) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
    logs = INITIAL_LOGS;
  } else {
    logs = JSON.parse(localStorageData);
  }
  
  if (contractId) {
    return logs.filter(log => log.contractId === contractId);
  }
  return logs;
}

// Sync with Supabase on mount
export async function syncWithSupabase(): Promise<{ contracts: Contract[], logs: AuditLog[] } | null> {
  if (!supabase) return null;
  
  try {
    // 1. Fetch contracts
    const { data: dbContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (contractsError) throw contractsError;
    
    // 2. Fetch logs
    const { data: dbLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (logsError) throw logsError;
    
    const localContracts = getContracts();
    const localLogs = getAuditLogs();

    // Prevent blank local wipeouts if Supabase returns empty rows (e.g. newly provisioned or cleared db)
    // We synchronize local contracts/logs upward to populate the database
    if ((!dbContracts || dbContracts.length === 0) && localContracts.length > 0) {
      const dbContractsToInsert = localContracts.map(mapToDbContract);
      await supabase.from('contracts').upsert(dbContractsToInsert);
      
      if (localLogs.length > 0) {
        const dbLogsToInsert = localLogs.map(log => ({
          id: log.id,
          contract_id: log.contractId,
          action: log.action,
          timestamp: log.timestamp,
          description: log.description
        }));
        await supabase.from('audit_logs').upsert(dbLogsToInsert);
      }
      
      return { contracts: localContracts, logs: localLogs };
    }

    const mappedContracts = (dbContracts || []).map(mapToLocalContract);
    const mappedLogs = (dbLogs || []).map(row => ({
      id: row.id,
      contractId: row.contract_id || row.contractId,
      action: row.action,
      timestamp: row.timestamp,
      description: row.description
    }));
    
    // Safely sync into local cached copy
    if (mappedContracts.length > 0) {
      localStorage.setItem(CONTRACTS_KEY, JSON.stringify(mappedContracts));
    }
    if (mappedLogs.length > 0) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(mappedLogs));
    }
    
    return { 
      contracts: mappedContracts.length > 0 ? mappedContracts : localContracts, 
      logs: mappedLogs.length > 0 ? mappedLogs : localLogs 
    };
  } catch (error) {
    console.error('Error syncing from Supabase API:', error);
    return null;
  }
}

// Reset data to mock defaults if needed
export function resetDBData(): void {
  localStorage.removeItem(CONTRACTS_KEY);
  localStorage.removeItem(LOGS_KEY);
}

// Upload a video blob directly to the "videos-formalizacao" Supabase Storage bucket
export async function uploadVideoToSupabase(contractId: string, blob: Blob): Promise<string | null> {
  if (!supabase) return null;
  try {
    const fileName = `${contractId}.mp4`;
    const { data, error } = await supabase.storage
      .from('videos-formalizacao')
      .upload(fileName, blob, {
        contentType: 'video/mp4',
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading video to Supabase Storage "videos-formalizacao":', error);
      return null;
    }
    
    return fileName;
  } catch (err) {
    console.error('Unhandled error in uploadVideoToSupabase:', err);
    return null;
  }
}

// Dynamically retrieve either the local IndexedDB video URL or the public URL from Supabase Storage
export async function retrieveVideoUrl(contractId: string): Promise<string | null> {
  // 1. Try local cache in IndexedDB first
  const localBlob = await getVideoBlob(contractId);
  if (localBlob) {
    return URL.createObjectURL(localBlob);
  }
  
  // 2. Fall back to Supabase Storage "videos-formalizacao" public link
  if (supabase) {
    try {
      const { data } = supabase.storage
        .from('videos-formalizacao')
        .getPublicUrl(`${contractId}.mp4`);
        
      if (data && data.publicUrl) {
        return data.publicUrl;
      }
    } catch (e) {
      console.error('Error constructing public URL from Supabase Storage:', e);
    }
  }
  
  return null;
}
