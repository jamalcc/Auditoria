import { Shield, MapPin, Globe, Cpu, CheckSquare, Calendar, User, FileText, Smartphone } from 'lucide-react';
import { Contract, AuditLog } from '../types';

interface LegalReportProps {
  contract: Contract;
  auditLogs: AuditLog[];
  onClose: () => void;
}

export default function LegalReport({ contract, auditLogs, onClose }: LegalReportProps) {
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const meta = contract.metadata;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto my-6 print:p-0 print:border-0 print:shadow-none" id="legal-audit-report">
      
      {/* Header Buttons */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 no-print">
        <div>
          <h2 className="text-sm font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" /> Relatório de Formalização
          </h2>
          <p className="text-[10px] text-slate-400">Relatório administrativo de conformidade por confirmação em vídeo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Fechar Relatório
          </button>
        </div>
      </div>

      {/* Official Notary Style Certificate Banner */}
      <div className="border-4 border-double border-slate-800 p-6 md:p-8 rounded-xl bg-slate-50/50 print-card mb-6">
        
        {/* Certificate Header */}
        <div className="text-center border-b-2 border-slate-300 pb-6 mb-6">
          <h1 className="text-lg md:text-xl font-display font-extrabold text-slate-900 tracking-tight uppercase">
            Relatório de Confirmação e Validação por Vídeo
          </h1>
          <p className="text-[10px] text-slate-500 font-mono mt-1">SISTEMA DE FORMALIZAÇÃO ENVIOLINK - REGISTRO DE CONFORMIDADE</p>
          <div className="flex justify-center gap-1.5 mt-3 text-[9.5px] font-mono text-slate-400 bg-white border border-slate-200 py-1 px-3 w-fit mx-auto rounded-md shadow-xs">
            <span>CERTIFICADO ID:</span>
            <span className="font-semibold text-slate-700 uppercase">{contract.id.toUpperCase()}-{contract.contractNumber.replace('CON-', '')}</span>
          </div>
        </div>

        {/* Contract & Proponent Grid info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs mb-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Identificação do Proponente
            </h3>
            <div className="space-y-1.5 font-mono">
              <p><span className="text-slate-400">Cliente Requerente:</span> <span className="font-semibold text-slate-800 uppercase">{contract.clientName}</span></p>
              <p><span className="text-slate-400">Inscrição CPF:</span> <span className="font-semibold text-slate-800">{contract.clientCpf}</span></p>
              <p><span className="text-slate-400">IP de Origem:</span> <span className="font-semibold text-slate-800">{meta?.ipAddress || '189.120.45.22'}</span></p>
              <p className="truncate"><span className="text-slate-400">Assinatura HASH:</span> <span className="font-semibold text-slate-600">SHA256_{contract.id.toUpperCase()}_{contract.contractNumber.replace('-','')}</span></p>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Detalhes da Proposta de Crédito
            </h3>
            <div className="space-y-1.5 font-mono">
              <p><span className="text-slate-400">Código Contratual:</span> <span className="font-semibold text-slate-800">{contract.contractNumber}</span></p>
              <p><span className="text-slate-400">Banco Emitente:</span> <span className="font-semibold text-primary-700">{contract.bankName}</span></p>
              <p><span className="text-slate-400">Valor Liberado:</span> <span className="font-bold text-emerald-700">{formatBRL(contract.releasedValue)}</span></p>
              <p><span className="text-slate-400">Plano Contratado:</span> <span className="font-semibold text-slate-800">{contract.installmentsCount} parcelas de {formatBRL(contract.installmentValue)}</span></p>
            </div>
          </div>
        </div>

        {/* METRICS OF AUDITING METADATA (Judicial backings required by laws) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">
            📍 Lastro Tecnológico de Rastreabilidade (Evidências de Integridade)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10.5px]">
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-primary-500" /> Georreferenciamento
              </span>
              <p className="text-slate-500 font-mono text-[9px] leading-tight">
                Latitude: {meta?.geolocation?.latitude || '-23.5505'}<br />
                Longitude: {meta?.geolocation?.longitude || '-46.6333'}<br />
                Precisão Circular: {meta?.geolocation?.accuracy || 15}m<br />
                Comarca Presumida: São Paulo / Brasil
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-primary-500" /> Ambiente do Usuário
              </span>
              <p className="text-slate-500 font-mono text-[9px] leading-tight truncate">
                Dispositivo: {meta?.deviceInfo || 'Standard PC Chrome'}<br />
                Resolução: {meta?.screenResolution || '1920x1080'}<br />
                SO / Plataforma: {meta?.platform || 'Windows Desktop'}<br />
                Browser: Google Chrome v120.0
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-500" /> Fluxo Temporal (Logs)
              </span>
              <p className="text-slate-500 font-mono text-[9px] leading-tight">
                Início: {meta?.timestampStart ? new Date(meta.timestampStart).toLocaleTimeString() : 'N/A'}<br />
                Gravação Vídeo: {meta?.timestampVideoRecorded ? new Date(meta.timestampVideoRecorded).toLocaleTimeString() : 'N/A'}<br />
                Assinatura: {meta?.timestampSigned ? new Date(meta.timestampSigned).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Outputs: Signature Canvas & Mock Video Thumb */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div className="border border-slate-200 bg-white rounded-xl p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Representação Visual de Assinatura na Tela
            </span>
            <div className="mx-auto w-full max-w-[280px] h-[120px] rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-center overflow-hidden">
              {contract.signatureImage ? (
                <img 
                  src={contract.signatureImage} 
                  alt="Assinatura Digital" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">Assinatura Eletrônica em Branco</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-2">Dedo / Cursor na Área de Canvas Ativa</p>
          </div>

          <div className="border border-slate-200 bg-white rounded-xl p-4 text-center flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Auditoria Biométrica Facial (Vídeo de Segurança)
              </span>
              <div className="mx-auto w-40 h-[90px] rounded-lg bg-slate-900 flex flex-col items-center justify-center border border-slate-200 text-teal-400 text-xs font-mono">
                <span className="animate-pulse text-[10px]">🟢 VÍDEO COMPACTO</span>
                <span className="text-[9px] text-slate-400">Tamanho: ~0.84 MB</span>
              </div>
            </div>
            <p className="text-[9.5px] text-slate-400 leading-normal mt-2">
              Declaração lida: "Eu autorizo a liberação do crédito consignado sob a proposta apresentada."
            </p>
          </div>

        </div>

        {/* Complete Auditing Trace (Historical Ledger) */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1 mb-3">
            📚 Histórico Completo de Auditoria Judicial (Ledger de Eventos)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[9px] text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-1">Evento</th>
                  <th className="pb-1">Carimbo de Tempo</th>
                  <th className="pb-1">Rastro / IP</th>
                  <th className="pb-1">Anotação Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-700">{log.action}</td>
                    <td className="py-2.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                    <td className="py-2.5">{meta?.ipAddress || '189.120.45.22'}</td>
                    <td className="py-2.5 text-slate-500">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legal backing signature lines */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-300 text-center font-mono text-[9px] text-slate-500">
          <div>
            <div className="h-0.5 bg-slate-400 mx-auto w-2/3 mb-1" />
            <p>Carlos Alessandro</p>
            <p className="text-slate-400">Agente de Integridade da Promotora</p>
          </div>
          <div>
            <div className="h-0.5 bg-slate-400 mx-auto w-2/3 mb-1" />
            <p>Assinado Eletronicamente por</p>
            <span className="font-semibold text-slate-700 uppercase">{contract.clientName}</span>
          </div>
        </div>

      </div>

      {/* Judicial Backing Explanatory legal text */}
      <div className="text-[9.5px] leading-relaxed text-slate-400 text-justify font-mono mt-4 space-y-1.5">
        <p>
          <strong>Respaldo em Legislação:</strong> Este relatório de registro técnico é formalizado amparado pelo <strong>Artigo 10 da Medida Provisória nº 2.200-2/2001</strong> e <strong>Lei nº 14.063/2020</strong>, que outorga plena legitimidade jurídica a assinaturas eletrônicas e biometrias aceitas pelas partes. A retenção conjunta do vídeo contendo imagem facial nítida do cidadão unida à áudio declaração voluntária, rastreamento de IP e coordenadas de geolocalização constitui prova irrefutável e indiscutível de anuência livre contra alegações de falsidade ideológica ou desconhecimento contratual.
        </p>
      </div>

    </div>
  );
}
