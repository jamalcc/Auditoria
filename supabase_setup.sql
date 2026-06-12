-- ====================================================================
-- INSTRUÇÕES DE INSTALAÇÃO NO SUPABASE (SQL EDITOR)
-- Execute este script no Query Editor do seu projeto Supabase para criar
-- a estrutura de tabelas que sincroniza perfeitamente com o EnvioLink.
-- ====================================================================

-- 1. Tabela de Contratos
CREATE TABLE IF NOT EXISTS public.contracts (
    id TEXT PRIMARY KEY,
    contract_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_cpf TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    released_value NUMERIC(15, 2) NOT NULL,
    installment_value NUMERIC(15, 2) NOT NULL,
    installments_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL,
    rejection_reason TEXT,
    video_blob_key TEXT,
    signature_image TEXT, -- Armazena a assinatura em formato Base64 ou URL
    metadata JSONB,       -- Armazena IP, agentes, geolocalização e resoluções
    verified_at TIMESTAMPTZ
);

-- Habilitar Row Level Security (RLS) se necessário ou desabilitar para simplicidade
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso rápido de leitura/escrita pública prontas para teste
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.contracts;
CREATE POLICY "Permitir leitura pública" ON public.contracts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização pública" ON public.contracts;
CREATE POLICY "Permitir inserção e atualização pública" ON public.contracts FOR ALL USING (true) WITH CHECK (true);


-- 2. Tabela de Registros de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    description TEXT NOT NULL
);

-- Habilitar RLS para logs de auditoria
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas públicas para os logs de auditoria
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.audit_logs;
CREATE POLICY "Permitir leitura pública" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização pública" ON public.audit_logs;
CREATE POLICY "Permitir inserção e atualização pública" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);


-- 3. Índices úteis para performance
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_cpf ON public.contracts(client_cpf);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract_id ON public.audit_logs(contract_id);
