import React, { useState, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, ShieldAlert, ArrowRight, Loader2, Key } from 'lucide-react';
import { supabase } from '../services/db';

interface SupabaseAuthProps {
  onAuthSuccess: (user: { email: string; id: string }) => void;
}

export default function SupabaseAuth({ onAuthSuccess }: SupabaseAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSupabaseConfigured = !!supabase;

  // Check active session on mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase!.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          onAuthSuccess({
            email: session.user.email || '',
            id: session.user.id
          });
        }
      });
    } else {
      // Check for local demo session
      const savedUser = localStorage.getItem('envio_link_demo_session');
      if (savedUser) {
        try {
          onAuthSuccess(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('envio_link_demo_session');
        }
      }
    }
  }, [isSupabaseConfigured, onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    // Real Supabase Flow
    if (isSupabaseConfigured) {
      try {
        if (isSignUp) {
          const { data, error: signUpError } = await supabase!.auth.signUp({
            email,
            password
          });
          if (signUpError) throw signUpError;
          if (data?.user) {
            setSuccessMsg('Cadastro realizado com sucesso! Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de entrada.');
            setError('');
            // If email confirmation is disabled on Supabase, they might be logged in directly:
            if (data.session) {
              setTimeout(() => {
                onAuthSuccess({
                  email: data.user!.email || '',
                  id: data.user!.id
                });
              }, 1500);
            }
          }
        } else {
          const { data, error: signInError } = await supabase!.auth.signInWithPassword({
            email,
            password
          });
          if (signInError) throw signInError;
          if (data?.user) {
            onAuthSuccess({
              email: data.user.email || '',
              id: data.user.id
            });
          }
        }
      } catch (err: any) {
        console.error('Erro de autenticação no Supabase:', err);
        setError(err.message || 'Erro ao realizar a operação no Supabase.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local demo mock flow
      setTimeout(() => {
        const demoUser = {
          email,
          id: `demo-user-${Date.now()}`
        };
        localStorage.setItem('envio_link_demo_session', JSON.stringify(demoUser));
        onAuthSuccess(demoUser);
        setLoading(false);
      }, 700);
    }
  };

  const handleDemoAccess = () => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      const demoUser = {
        email: 'auditor.demo@enviolink.corp',
        id: 'demo-user-admin'
      };
      localStorage.setItem('envio_link_demo_session', JSON.stringify(demoUser));
      onAuthSuccess(demoUser);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="max-w-md w-full mx-auto my-10 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 space-y-6">
      
      {/* Platform Branding */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-indigo-650 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
          <ShieldCheck className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-display font-extrabold text-slate-800 tracking-tight">
            EnvioLink Compliance
          </h2>
          <p className="text-xs text-slate-400">
            {isSignUp ? 'Crie sua conta administrativa corporativa' : 'Acesse o Painel Administrativo de Provas'}
          </p>
        </div>
      </div>

      {/* Supabase connection status info badge */}
      {isSupabaseConfigured ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-100">
          <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
          <span>AUTENTICADOR SUPABASE SEGURO ATIVO</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl text-[10px] text-slate-500 bg-amber-50/50 border border-amber-100 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>MODO DE TESTE LOCAL PRONTO</span>
          </div>
          <p className="leading-relaxed">
            Inicie no modo demonstrativo ou com qualquer e-mail para pré-visualizar. Para uso em produção no Vercel, basta adicionar as variáveis <code className="bg-slate-100 px-1 py-0.5 rounded text-mono font-bold">VITE_SUPABASE_URL</code> e <code className="bg-slate-100 px-1 py-0.5 rounded text-mono font-bold">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs leading-relaxed">
            ✓ {successMsg}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-slate-600 font-semibold text-[11px]">E-mail Corporativo</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: auditoria@promotora.com"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-600 font-semibold text-[11px]">Senha Privada</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-650 bg-indigo-600 text-white rounded-xl text-center font-bold text-xs shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isSignUp ? 'Criar Conta Administrativa' : 'Acessar Canal Seguro'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch auth mode or access without Supabase setup */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100 text-center text-[11px]">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-indigo-650 hover:text-indigo-700 font-bold hover:underline"
        >
          {isSignUp ? 'Já possui login? Acesse aqui' : 'Não tem conta? Cadastrar no Supabase'}
        </button>

        {!isSupabaseConfigured && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={loading}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition"
            >
              🚀 Entrar como Administrador Demonstrativo
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
