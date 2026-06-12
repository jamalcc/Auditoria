import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, FileText, CheckCircle2, XCircle, AlertCircle, Copy, 
  ExternalLink, Download, Play, RefreshCw, Upload, ShieldCheck, DollarSign, 
  Trash2, Landmark, Check, HelpCircle, FileSpreadsheet, Eye, History, Clock
} from 'lucide-react';
import { Contract, ContractStatus, AuditLog } from '../types';
import { getContracts, saveContracts, addAuditLog, getAuditLogs, resetDBData, supabase, syncWithSupabase, retrieveVideoUrl } from '../services/db';
import LegalReport from './LegalReport';

// Robust Brazilian CPF Validator function
function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  
  // Exclude sequence of identical digits e.g. 111.111.111-11
  if (/^(\d)\1{10}$/.test(clean)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  
  return true;
}

export const isContractExpired = (contract: Contract) => {
  if (contract.status !== ContractStatus.PENDING) return false;
  const createdTime = new Date(contract.createdAt).getTime();
  return (Date.now() - createdTime) > 24 * 60 * 60 * 1000;
};

interface AdminPanelProps {
  onSelectContractForWizard: (id: string) => void;
}

export default function AdminPanel({ onSelectContractForWizard }: AdminPanelProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<ContractStatus | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newContractNumber, setNewContractNumber] = useState('');
  const [newBankName, setNewBankName] = useState('Banco Itaú Consignado');
  const [newReleasedValue, setNewReleasedValue] = useState('');
  const [newInstallmentsCount, setNewInstallmentsCount] = useState(48);
  const [newInstallmentValue, setNewInstallmentValue] = useState('');
  const [userHasEditedInstallment, setUserHasEditedInstallment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Supabase synchronization state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Selected audit contract details
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'details' | 'history'>('details');
  const [selectedLogs, setSelectedLogs] = useState<AuditLog[]>([]);
  const [showLegalReport, setShowLegalReport] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Clipboard feedback snackbar
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load contracts initially
  const loadData = () => {
    setContracts(getContracts());
  };

  const syncDatabase = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    setSyncMessage('Sincronizando...');
    const result = await syncWithSupabase();
    if (result) {
      setContracts(result.contracts);
      setSyncMessage('Sincronizado!');
      setTimeout(() => setSyncMessage(''), 3000);
    } else {
      setSyncMessage('Conexão Local ativada.');
      setTimeout(() => setSyncMessage(''), 3000);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    loadData();
    if (supabase) {
      syncDatabase();
    }

    // Auto-refresh/poll contracts from localStorage (and Supabase) every 4 seconds softly
    const interval = setInterval(() => {
      const freshContracts = getContracts();
      setContracts((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(freshContracts)) {
          return freshContracts;
        }
        return prev;
      });

      if (supabase) {
        syncWithSupabase().then((result) => {
          if (result && result.contracts) {
            setContracts((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(result.contracts)) {
                return result.contracts;
              }
              return prev;
            });
          }
        });
      }
    }, 4000);

    // Immediately capture state updates across multiple browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'promotora_contracts' || e.key === 'promotora_logs') {
        const freshContracts = getContracts();
        setContracts((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(freshContracts)) {
            return freshContracts;
          }
          return prev;
        });
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch and manage recorded video URL on contract selection
  useEffect(() => {
    let active = true;
    let localUrl: string | null = null;

    if (selectedContract && selectedContract.status !== ContractStatus.PENDING) {
      retrieveVideoUrl(selectedContract.id).then((url) => {
        if (active) {
          if (url) {
            if (url.startsWith('blob:')) {
              localUrl = url;
            }
            setVideoUrl(url);
          } else {
            setVideoUrl(null);
          }
        }
      }).catch((err) => {
        console.error('Erro ao resgatar gravação do proponente:', err);
        if (active) setVideoUrl(null);
      });
    } else {
      setVideoUrl(null);
    }

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [selectedContract]);

  // Format monetary value
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Censored CPF format
  const censorCPFInput = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
    }
    return cpf;
  };

  // dynamic installment calculation helper - only updates if the user has NOT edited it manually
  useEffect(() => {
    if (!userHasEditedInstallment && newReleasedValue) {
      const val = parseFloat(newReleasedValue);
      if (!isNaN(val) && val > 0) {
        // Approximate a standard personal/consignado interest rate
        const rate = 0.0195; // 1.95% a.m.
        const pmt = (val * rate) / (1 - Math.pow(1 + rate, -newInstallmentsCount));
        setNewInstallmentValue(pmt.toFixed(2));
      }
    }
  }, [newReleasedValue, newInstallmentsCount, userHasEditedInstallment]);

  // Handle contract generation
  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientCpf || !newContractNumber || !newReleasedValue) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (Nome, CPF, Número do Contrato e Valor).');
      return;
    }

    const cleanCpf = newClientCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setErrorMessage('CPF inválido. Por favor, digite um CPF real com dígitos verificadores válidos.');
      return;
    }

    const randId = 'ctr_' + Math.random().toString(36).substring(2, 9);

    const newContract: Contract = {
      id: randId,
      contractNumber: newContractNumber.trim(),
      clientName: newClientName.trim(),
      clientCpf: censorCPFInput(newClientCpf),
      bankName: newBankName,
      releasedValue: parseFloat(newReleasedValue),
      installmentValue: parseFloat(newInstallmentValue) || (parseFloat(newReleasedValue) / newInstallmentsCount),
      installmentsCount: newInstallmentsCount,
      createdAt: new Date().toISOString(),
      status: ContractStatus.PENDING
    };

    const updatedContracts = [newContract, ...contracts];
    saveContracts(updatedContracts);
    addAuditLog(randId, 'Contrato Criado', `Proposta inserida manualmente no painel de controle de crédito. Contrato No: ${newContract.contractNumber}.`);

    setContracts(updatedContracts);
    setShowCreateModal(false);
    
    // Clear state
    setNewClientName('');
    setNewClientCpf('');
    setNewContractNumber('');
    setNewReleasedValue('');
    setNewInstallmentValue('');
    setUserHasEditedInstallment(false);
    setErrorMessage('');
  };

  // Reset database entirely for testing
  const handleResetDatabase = () => {
    if (window.confirm('Deseja resetar a base para os contratos modelos? Isso limpará dados recentes.')) {
      resetDBData();
      loadData();
      setSelectedContract(null);
    }
  };

  // Open contract detailing inspector panel
  const handleInspectContract = (contract: Contract) => {
    setSelectedContract(contract);
    setSelectedLogs(getAuditLogs(contract.id));
    setShowRejectPanel(false);
    setRejectionReasonInput('');
    setDetailActiveTab('details');
  };

  // Synchronize sidebar selectedContract details if background poll receives new updates
  useEffect(() => {
    if (selectedContract) {
      const fresh = contracts.find(c => c.id === selectedContract.id);
      if (fresh) {
        if (
          fresh.status !== selectedContract.status || 
          fresh.createdAt !== selectedContract.createdAt || 
          fresh.signatureImage !== selectedContract.signatureImage ||
          fresh.rejectionReason !== selectedContract.rejectionReason
        ) {
          setSelectedContract(fresh);
          setSelectedLogs(getAuditLogs(fresh.id));
        }
      }
    }
  }, [contracts, selectedContract]);

  // Renew link expiration capability
  const handleRenewLink = (id: string) => {
    const updated = contracts.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: ContractStatus.PENDING,
          createdAt: new Date().toISOString(),
          rejectionReason: undefined,
          videoBlobKey: undefined,
          signatureImage: undefined
        };
      }
      return c;
    });
    saveContracts(updated);
    addAuditLog(id, 'Link Renovado', 'O administrador renovou a validade do link de formalização de proposta por mais 24 horas.');
    setContracts(updated);
    
    const fresh = updated.find(c => c.id === id);
    if (fresh) {
      setSelectedContract(fresh);
      setSelectedLogs(getAuditLogs(fresh.id));
    }
  };

  // Status changing logic
  const handleUpdateStatus = (id: string, newStatus: ContractStatus, reason?: string) => {
    const updated = contracts.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: newStatus,
          rejectionReason: reason || undefined
        };
      }
      return c;
    });

    saveContracts(updated);
    addAuditLog(
      id, 
      newStatus === ContractStatus.APPROVED ? 'Contrato Aprovado' : 'Contrato Reprovado', 
      newStatus === ContractStatus.APPROVED 
        ? 'Vídeo e biometria fiscal validados positivamente pelo auditor.'
        : `Proposta rejeitada. Motivo: ${reason}`
    );

    setContracts(updated);
    
    // Update local context
    if (selectedContract && selectedContract.id === id) {
      setSelectedContract({
        ...selectedContract,
        status: newStatus,
        rejectionReason: reason || undefined
      });
      setSelectedLogs(getAuditLogs(id));
    }
  };

  const handleDeleteContract = (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este contrato permanentemente?')) {
      const remaining = contracts.filter(c => c.id !== id);
      saveContracts(remaining);
      setContracts(remaining);
      if (selectedContract?.id === id) {
        setSelectedContract(null);
      }
    }
  };

  // Copying the direct contract link to clipboard
  const handleCopyShareLink = (contract: Contract) => {
    // Build simulated external absolute link based on environmental url or hostname
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?formalizar=${contract.id}`;

    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedId(contract.id);
        setTimeout(() => setCopiedId(null), 3000);
      })
      .catch((err) => console.error('Erro ao copiar link', err));
  };

  // Generate Excel (CSV) Report
  const handleExportCSV = () => {
    const headers = [
      'ID Contrato', 'Numero Contrato', 'Proponente Requerente', 'CPF Censurado', 
      'Banco Emitente', 'Valor Liberado (R$)', 'Valor Parcelas (R$)', 'Numero Parcelas', 
      'Data de Criacao', 'Status Atual', 'Motivo Rejeicao', 'IP de Conexao', 'Latitude', 'Longitude'
    ];

    const rows = contracts.map(c => {
      let mappedStatus = c.status;
      if (c.status === ContractStatus.APPROVED) mappedStatus = 'Validado' as any;
      else if (c.status === ContractStatus.RECORDED) mappedStatus = 'Vídeo Enviado' as any;
      else if (c.status === ContractStatus.PENDING) mappedStatus = 'Pendente' as any;
      else if (c.status === ContractStatus.REJECTED) mappedStatus = 'Reprovado' as any;

      return [
        c.id,
        c.contractNumber,
        c.clientName,
        c.clientCpf,
        c.bankName,
        c.releasedValue.toFixed(2),
        c.installmentValue.toFixed(2),
        c.installmentsCount,
        c.createdAt,
        mappedStatus,
        c.rejectionReason || 'N/A',
        c.metadata?.ipAddress || '',
        c.metadata?.geolocation?.latitude || '',
        c.metadata?.geolocation?.longitude || ''
      ];
    });

    // Encode standard Brazilian CSV string with semicolons
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Formalizacoes_${new Date().toLocaleDateString().replace(/\//g,'_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters calculation
  const filteredContracts = contracts.filter(c => {
    const matchesTab = activeTab === 'Todos' || c.status === activeTab;
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.clientCpf.includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  // Calculations for KPI numbers
  const totalCreated = contracts.length;
  const awaitingReview = contracts.filter(c => c.status === ContractStatus.RECORDED).length;
  const pendingCapture = contracts.filter(c => c.status === ContractStatus.PENDING).length;
  const totalApprovedValue = contracts
    .filter(c => c.status === ContractStatus.APPROVED)
    .reduce((sum, c) => sum + c.releasedValue, 0);

  // Form banks options array
  const BANK_OPTIONS = [
    'Banco Itaú Consignado',
    'Banco C6 Consignado',
    'Banco do Brasil',
    'Banco PAN',
    'Bradesco Promotora',
    'Caixa Econômica Federal',
    'Banco Safra Consignado'
  ];

  return (
    <div className="space-y-6" id="admin-panel-container">
      
      {/* 1. Statistics Summary Cards Grid (Bento style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Contratos Totais</span>
            <span className="text-xl font-display font-bold text-slate-800">{totalCreated}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl relative">
            <Play className="w-5 h-5" /><div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Aguardando Auditoria</span>
            <span className="text-xl font-display font-bold text-slate-800">{awaitingReview}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl/80">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Link Enviado (Pendente)</span>
            <span className="text-xl font-display font-bold text-slate-800">{pendingCapture}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Volume Formalizado Ativo</span>
            <span className="text-base font-display font-extrabold text-emerald-600 truncate max-w-[130px] block">{formatBRL(totalApprovedValue)}</span>
          </div>
        </div>

      </div>

      {/* 2. Main Search filter controls row */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tabs switch panel (Status filtering) */}
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl w-fit">
            <button
               onClick={() => setActiveTab('Todos')}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === 'Todos' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Todos ({contracts.length})
            </button>
            <button
               onClick={() => setActiveTab(ContractStatus.PENDING)}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === ContractStatus.PENDING ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Pendentes ({contracts.filter(c => c.status === ContractStatus.PENDING).length})
            </button>
            <button
               onClick={() => setActiveTab(ContractStatus.RECORDED)}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === ContractStatus.RECORDED ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Gravados ({contracts.filter(c => c.status === ContractStatus.RECORDED).length})
            </button>
            <button
               onClick={() => setActiveTab(ContractStatus.APPROVED)}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === ContractStatus.APPROVED ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Aprovados ({contracts.filter(c => c.status === ContractStatus.APPROVED).length})
            </button>
            <button
               onClick={() => setActiveTab(ContractStatus.REJECTED)}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === ContractStatus.REJECTED ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Reprovados ({contracts.filter(c => c.status === ContractStatus.REJECTED).length})
            </button>
          </div>

          {/* Action trigger row items */}
          <div className="flex items-center gap-2">
            
            {/* Search Input field */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, CPF ou banco..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-hidden"
              />
            </div>

            {/* Excel report export */}
            <button
              onClick={handleExportCSV}
              title="Exportar base para Excel"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </button>

            {/* Create Proposal Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nova Formalização
            </button>
          </div>

        </div>
      </div>

      {/* 3. Contracts List Table View panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table List Column (2 cols width on screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider">Painel Geral de Propostas</h3>
              {supabase ? (
                <button 
                  onClick={syncDatabase} 
                  type="button"
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100/50 transition cursor-pointer select-none"
                  title="Clique para sincronizar manualmente"
                >
                  <div className={`w-1.5 h-1.5 bg-teal-500 rounded-full ${isSyncing ? 'animate-ping' : 'animate-pulse'}`} />
                  <span>SUPABASE ATIVO</span>
                  {syncMessage && <span className="text-slate-500 font-normal">({syncMessage})</span>}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-250 select-none">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <span>MODO LOCAL</span>
                </div>
              )}
            </div>
            <button 
              onClick={handleResetDatabase}
              className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Restaurar Modelos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50/20 text-slate-400 uppercase tracking-widest text-[9.5px]">
                <tr className="border-b border-slate-100">
                  <th className="p-4">Contrato / Cliente</th>
                  <th className="p-4">Banco Parceiro</th>
                  <th className="p-4">Valor Líquido</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      Nenhum registro encontrado correspondente aos parâmetros.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => (
                    <tr 
                      key={contract.id}
                      className={`hover:bg-slate-50 transition cursor-pointer ${selectedContract?.id === contract.id ? 'bg-primary-50/30 font-medium' : ''}`}
                      onClick={() => handleInspectContract(contract)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 text-xs tracking-tight">{contract.clientName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded-sm text-slate-600">{contract.contractNumber}</span>
                          <span className="font-mono">CPF: {contract.clientCpf}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-semibold text-[11px]">{contract.bankName}</td>
                      <td className="p-4 text-slate-700">
                        <div className="font-medium">{formatBRL(contract.releasedValue)}</div>
                        <div className="text-[10px] text-slate-400">{contract.installmentsCount} parcelas de {formatBRL(contract.installmentValue)}</div>
                      </td>
                      <td className="p-4 text-center">
                        {isContractExpired(contract) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                            <Clock className="w-3 h-3 text-rose-500" />
                            Expirado (24h)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            contract.status === ContractStatus.APPROVED 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : contract.status === ContractStatus.REJECTED 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : contract.status === ContractStatus.RECORDED 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              contract.status === ContractStatus.APPROVED ? 'bg-emerald-500' :
                              contract.status === ContractStatus.REJECTED ? 'bg-rose-500' :
                              contract.status === ContractStatus.RECORDED ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'
                            }`} />
                            {contract.status === ContractStatus.APPROVED ? 'Validado' :
                             contract.status === ContractStatus.RECORDED ? 'Vídeo Enviado' :
                             contract.status === ContractStatus.PENDING ? 'Pendente' :
                             contract.status === ContractStatus.REJECTED ? 'Reprovado' : contract.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {/* Share clip link button */}
                          <button
                            onClick={() => handleCopyShareLink(contract)}
                            title="Copiar link de formalização"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition relative"
                          >
                            {copiedId === contract.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick validation view client simulation trigger */}
                          <button
                            onClick={() => onSelectContractForWizard(contract.id)}
                            title="Simular visualizador do cliente"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete permanence button */}
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            title="Deletar contrato permanentemente"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Details Panel (Right hand 1/3 sidebar) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          {selectedContract ? (
            <div className="space-y-4" id="contract-detail-panel">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-display font-medium text-slate-800 text-xs uppercase tracking-wider">Auditar Pasta do Cliente</h4>
                  <span className="font-mono text-[10px] text-slate-400">Contrato: {selectedContract.contractNumber}</span>
                </div>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Ocultar
                </button>
              </div>

              {/* Status banner */}
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                selectedContract.status === ContractStatus.APPROVED ? 'bg-emerald-50 text-emerald-800' :
                selectedContract.status === ContractStatus.REJECTED ? 'bg-rose-50 text-rose-800' :
                selectedContract.status === ContractStatus.RECORDED ? 'bg-indigo-50 text-indigo-800' : 'bg-amber-50 text-amber-800'
              }`}>
                {selectedContract.status === ContractStatus.APPROVED && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {selectedContract.status === ContractStatus.REJECTED && <XCircle className="w-5 h-5 text-rose-500" />}
                {selectedContract.status === ContractStatus.RECORDED && <Play className="w-5 h-5 text-indigo-600 animate-pulse" />}
                {selectedContract.status === ContractStatus.PENDING && <AlertCircle className="w-5 h-5 text-amber-500" />}
                
                <div className="text-[11px]">
                  <span className="font-semibold block">Situação: {selectedContract.status}</span>
                  {selectedContract.status === ContractStatus.PENDING && 'Aguardando o cliente gravar o vídeo formal eletrônico.'}
                  {selectedContract.status === ContractStatus.RECORDED && 'Assinatura e vídeo pendentes de revisão legal.'}
                  {selectedContract.status === ContractStatus.APPROVED && 'Validação em vídeo validada judicialmente com sucesso.'}
                  {selectedContract.status === ContractStatus.REJECTED && `Rejeitado: ${selectedContract.rejectionReason}`}
                </div>
              </div>

              {/* Tab Selector for Inspector Options */}
              <div className="flex border-b border-slate-100 text-[11px] font-bold shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('details')}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all ${
                    detailActiveTab === 'details'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  📁 Dados & Mídia
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('history')}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all ${
                    detailActiveTab === 'history'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  📜 Linha do Tempo (Logs)
                </button>
              </div>

              {/* Tab: General Details & Media assets */}
              {detailActiveTab === 'details' ? (
                <div className="space-y-4">
                  {/* Customer Core Information */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-100">
                    <p><span className="text-slate-400">Proponente:</span> <span className="font-medium text-slate-700">{selectedContract.clientName}</span></p>
                    <p><span className="text-slate-400">Banco:</span> <span className="font-medium text-slate-700">{selectedContract.bankName}</span></p>
                    <p><span className="text-slate-400">Crédito Líquido:</span> <span className="font-bold text-slate-800">{formatBRL(selectedContract.releasedValue)}</span></p>
                    <p><span className="text-slate-400">Valores:</span> <span className="text-slate-600">{selectedContract.installmentsCount} parcelas de {formatBRL(selectedContract.installmentValue)}</span></p>
                    <p><span className="text-slate-400">Criado em:</span> <span className="text-slate-600">{new Date(selectedContract.createdAt).toLocaleString('pt-BR')}</span></p>
                  </div>

                  {/* Show Audit Files triggers if recorded or reviewed */}
                  {selectedContract.status !== ContractStatus.PENDING ? (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-slate-400 uppercase tracking-widest text-[9.5px]">EVIDÊNCIAS DE BACKUP DE JUIZO</h5>
                      
                      {/* Signature visual */}
                      {selectedContract.signatureImage && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assinatura Eletrônica</span>
                          <div className="bg-white rounded-lg p-1 border border-slate-100 flex items-center justify-center max-w-full h-16">
                            <img 
                              src={selectedContract.signatureImage} 
                              alt="Assinatura Cliente" 
                              referrerPolicy="no-referrer"
                              className="max-h-full object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Video compliance playback and MP4 download */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gravação em Vídeo de Aceite</span>
                        {videoUrl ? (
                          <div className="space-y-2">
                            <div className="bg-black rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
                              <video 
                                src={videoUrl} 
                                controls 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <a 
                              href={videoUrl}
                              download={`EnvioLink_Video_${selectedContract.contractNumber}.mp4`}
                              className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-center font-bold text-[10px] transition flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" /> Baixar Gravação (MP4)
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-1 py-3 px-1 bg-slate-100 rounded-lg border border-dashed border-slate-200 text-center">
                            <Play className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <p className="text-[10px] text-slate-500 font-medium leading-none">Contrato de Teste Modelo</p>
                            <p className="text-[8.5px] text-slate-400 leading-tight px-1 mt-0.5">Use o botão <strong className="text-slate-500">"Simular visualizador"</strong> ao lado para gravar um vídeo real de demonstração.</p>
                          </div>
                        )}
                      </div>

                      {/* PDF report visual link trigger */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowLegalReport(true)}
                          className="w-full py-2 bg-slate-900 text-white rounded-xl text-center font-bold text-[11px] shadow-sm hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Visualizar Relatório
                        </button>
                      </div>

                      {/* Action Review Buttons */}
                      {selectedContract.status === ContractStatus.RECORDED && (
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Decisão Probatória da Auditoria</span>
                          
                          {!showRejectPanel ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleUpdateStatus(selectedContract.id, ContractStatus.APPROVED)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> AVALIAR OK (APROVAR)
                              </button>
                              
                              <button
                                onClick={() => setShowRejectPanel(true)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> REJEITAR VÍDEO
                              </button>
                            </div>
                          ) : (
                            <div className="bg-rose-50/50 p-2 border border-rose-100 rounded-lg space-y-2">
                              <span className="text-[10px] font-semibold text-rose-800 block">Indique o motivo da rejeição do vídeo:</span>
                              <input
                                type="text"
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                placeholder="Ex: Áudio inaudível, cpf errado, etc"
                                className="w-full text-xs p-1.5 bg-white border border-rose-200 rounded-md focus:outline-hidden text-rose-900"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setShowRejectPanel(false)}
                                  className="px-2.5 py-1 text-[10px] bg-slate-200 rounded-md text-slate-600 hover:bg-slate-300 transition"
                                >
                                  Voltar
                                </button>
                                <button
                                  onClick={() => {
                                    if (rejectionReasonInput.trim()) {
                                      handleUpdateStatus(selectedContract.id, ContractStatus.REJECTED, rejectionReasonInput.trim());
                                    }
                                  }}
                                  className="px-2.5 py-1 text-[10px] bg-rose-600 text-white rounded-md hover:bg-rose-700 font-medium transition"
                                >
                                  Rejeitar Proposta
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(selectedContract.status === ContractStatus.APPROVED || selectedContract.status === ContractStatus.REJECTED) && (
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AÇÕES CORRETIVAS</span>
                          <button
                            onClick={() => handleRenewLink(selectedContract.id)}
                            className="w-full py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl text-center font-bold text-[10.5px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reativar Link (Permitir Envio Novamente)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl text-[11px] text-slate-600 text-center space-y-3">
                      <p>Este cliente ainda não iniciou a validação técnica de conformidade.</p>
                      <p className="font-medium text-slate-700">Copie o link seguro de envio e envie ao cliente para que ele possa realizar a assinatura digital e gravação da biometria:</p>
                      
                      {isContractExpired(selectedContract) ? (
                        <div className="p-2.5 border border-rose-200 bg-rose-50 text-rose-800 rounded-lg text-[10.5px] space-y-2 mb-1">
                          <p className="font-bold flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-600" /> Link Expirado! (Criado há +24h)
                          </p>
                          <p className="text-[10px] text-slate-500">O cliente receberá uma mensagem de erro informando que o link expirou ao tentar acessá-lo.</p>
                          <button
                            onClick={() => handleRenewLink(selectedContract.id)}
                            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin-once" /> Reativar Link (Mais 24 horas vago)
                          </button>
                        </div>
                      ) : (
                        <div className="p-2 border border-emerald-100 bg-emerald-50 text-emerald-800 rounded-lg text-[10px]">
                          <p className="font-bold flex items-center justify-center gap-1 text-emerald-700">
                            ✓ Link Seguro Válido e Ativo
                          </p>
                          <p className="text-slate-500 mt-0.5">Válido até: {new Date(new Date(selectedContract.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString('pt-BR')}</p>
                        </div>
                      )}

                      {/* Professional Shareable link input field copy widget */}
                      <div className="space-y-1.5 rounded-lg bg-white p-2 border border-slate-200 text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">URL de Formalização</span>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            readOnly
                            onClick={(e) => {
                              (e.target as HTMLInputElement).select();
                              handleCopyShareLink(selectedContract);
                            }}
                            value={`${window.location.origin}${window.location.pathname}?formalizar=${selectedContract.id}`}
                            className="bg-slate-50 border border-slate-100 rounded-lg py-1 px-2 text-[10px] text-slate-600 truncate flex-1 select-all cursor-pointer font-mono h-7"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(selectedContract)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition shadow-xs flex items-center gap-1 shrink-0 h-7 ${
                              copiedId === selectedContract.id 
                                ? 'bg-emerald-600 text-white animate-pulse' 
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {copiedId === selectedContract.id ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <Copy className="w-3 h-3 text-white" />
                            )}
                          </button>
                        </div>
                      </div>

                      {!isContractExpired(selectedContract) && (
                        <button
                          onClick={() => handleRenewLink(selectedContract.id)}
                          className="text-[10px] text-zinc-500 hover:text-indigo-600 hover:underline flex items-center justify-center gap-1 mx-auto mt-1 font-medium transition cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-zinc-400 hover:text-indigo-600" /> Atualizar / Estender validade (+24h)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab: Chronological Customer Interaction Timeline */
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <History className="w-4 h-4 text-indigo-600" />
                    <h5 className="font-semibold text-slate-700 text-xs">Histórico de Interações</h5>
                  </div>
                  <div className="relative pl-3.5 border-l-2 border-indigo-100 space-y-4 py-1 ml-1.5">
                    {selectedLogs && selectedLogs.length > 0 ? (
                      selectedLogs.map((log) => {
                        const isSuccess = log.action.includes('Aprovado') || log.action.includes('Concluída') || log.action.includes('Confirmado') || log.action.includes('Vídeo Gravado');
                        const isWarning = log.action.includes('Reprovado') || log.action.includes('Rejeitado') || log.action.includes('Excluir');
                        const isAction = log.action.includes('Iniciada') || log.action.includes('Acessado');
                        
                        return (
                          <div key={log.id} className="relative text-xs">
                            {/* Marker circle dot */}
                            <div className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white ${
                              isSuccess ? 'border-emerald-500 bg-emerald-50' :
                              isWarning ? 'border-rose-500 bg-rose-50' :
                              isAction ? 'border-indigo-500 bg-indigo-50' : 'border-slate-450 border-slate-400 bg-slate-50'
                            }`} />
                            
                            <div className="flex flex-col">
                              <div className="flex items-start justify-between gap-1.5 text-[11px]">
                                <span className="font-bold text-slate-800 leading-snug">{log.action}</span>
                                <span className="font-mono text-[9px] text-slate-400 shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(log.timestamp).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 font-sans">
                                {log.description}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        Nenhum registro de interação gerado para este contrato ainda.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-xs">
              Selecione um contrato na tabela ao lado para visualizar a pasta de auditoria do cliente.
            </div>
          )}
        </div>

      </div>

      {/* 4. MODAL: CREATE CONTRACT */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="create-contract-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden max-w-lg w-full">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-sm tracking-tight">Nova Proposta para Vídeo Formalização</h3>
                <p className="text-[10px] text-slate-400">Cadastre e gere o link probatório para o cliente</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-white/60 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-5 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-100 font-semibold rounded-lg text-[11px]">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nome Completo do Cliente *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Maria de Oliveira Santos"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Inscrição CPF Titular *</label>
                  <input
                    type="text"
                    required
                    value={newClientCpf}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/\D/g, '');
                      if (cleanValue.length <= 11) {
                        let formatted = cleanValue;
                        if (cleanValue.length > 3 && cleanValue.length <= 6) {
                          formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3)}`;
                        } else if (cleanValue.length > 6 && cleanValue.length <= 9) {
                          formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3, 6)}.${cleanValue.substring(6)}`;
                        } else if (cleanValue.length > 9) {
                          formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3, 6)}.${cleanValue.substring(6, 9)}-${cleanValue.substring(9, 11)}`;
                        }
                        setNewClientCpf(formatted);
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-primary-500 font-mono font-semibold"
                  />
                  {newClientCpf && (
                    <div className="mt-1 text-[10px] font-medium">
                      {newClientCpf.replace(/\D/g, '').length < 11 ? (
                        <span className="text-slate-400">Digitando... (Faltam {11 - newClientCpf.replace(/\D/g, '').length} dígitos)</span>
                      ) : validateCPF(newClientCpf.replace(/\D/g, '')) ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-0.5">✓ CPF válido para operação</span>
                      ) : (
                        <span className="text-rose-500 font-semibold flex items-center gap-0.5">✗ Dígitos verificadores do CPF inválidos</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Número do Contrato *</label>
                  <input
                    type="text"
                    required
                    value={newContractNumber}
                    onChange={(e) => setNewContractNumber(e.target.value)}
                    placeholder="Ex: 8594032"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Banco Emitente *</label>
                  <input
                    type="text"
                    required
                    list="banks-suggest-list"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="Ex: Banco Itaú Consignado"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-primary-500"
                  />
                  <datalist id="banks-suggest-list">
                    {BANK_OPTIONS.map(bank => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Prazo (Meses) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="360"
                    value={newInstallmentsCount}
                    onChange={(e) => setNewInstallmentsCount(parseInt(e.target.value) || 12)}
                    placeholder="Ex: 48"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Valor Liberado (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    value={newReleasedValue}
                    onChange={(e) => setNewReleasedValue(e.target.value)}
                    placeholder="Ex: 15450.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Valor da Parcela (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={newInstallmentValue}
                    onChange={(e) => {
                      setNewInstallmentValue(e.target.value);
                      setUserHasEditedInstallment(true);
                    }}
                    placeholder="Ex: 450.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 bg-slate-150 hover:bg-slate-205 text-slate-600 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  Cadastrar & Gerar Link
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. MODAL/DRAWER: DIGITAL REPORT FOR PRINTING */}
      {showLegalReport && selectedContract && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs overflow-y-auto p-4 z-50 animate-fadeIn flex items-start justify-center">
          <div className="w-full">
            <LegalReport 
              contract={selectedContract} 
              auditLogs={selectedLogs} 
              onClose={() => setShowLegalReport(false)} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
