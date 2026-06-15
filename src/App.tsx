import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, HelpCircle as Help, Moon, Sun } from 'lucide-react';
import AdminPanel from './components/AdminPanel';
import ClientWizard from './components/ClientWizard';
import SupabaseAuth from './components/SupabaseAuth';
import { getContracts, supabase } from './services/db';

export default function App() {
  const [currentContractId, setCurrentContractId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'client'>('admin');
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [isDirectLink, setIsDirectLink] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('theme') === 'dark';
      }
      return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Parse real browser search query parameters on mount to mimic Netlify routing
  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const formalizarId = params.get('formalizar');
    
    if (formalizarId) {
      setCurrentContractId(formalizarId);
      setViewMode('client');
      setIsDirectLink(true);
    }
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('envio_link_demo_session');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans antialiased transition-colors duration-300">
      
      {/* Visual Header Banner for Platform Branding */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white shadow-md border-b border-slate-800 shrink-0 select-none transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-teal-600 rounded-xl shadow-inner text-white">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-base font-display font-extrabold tracking-tight uppercase flex items-center gap-1.5">
                EnvioLink
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
               onClick={() => setIsDarkMode(!isDarkMode)}
               title="Alternar Tema"
               className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center mr-2"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            {viewMode === 'admin' ? (
              <>
                {user && (
                  <div className="flex items-center gap-2.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700 text-xs">
                    <span className="text-slate-300 font-medium max-w-48 truncate">{user.email}</span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Sair do painel"
                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer font-bold text-[10.5px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
                <span className="text-indigo-400 font-mono text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  ● ADMIN PORTAL
                </span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1" />
                CONEXÃO CRIPTOGRAFADA SSL
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Core View Area render */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'admin' ? (
          <div className="space-y-6">
            {!user ? (
              <SupabaseAuth onAuthSuccess={(userData) => setUser(userData)} />
            ) : (
              <AdminPanel 
                onSelectContractForWizard={(id) => {
                  setCurrentContractId(id);
                  setViewMode('client');
                }}
              />
            )}
          </div>
        ) : (
          <div>
            {currentContractId ? (
              <ClientWizard 
                contractId={currentContractId}
                onBackToAdmin={isDirectLink ? undefined : () => setViewMode('admin')}
                onComplete={isDirectLink ? undefined : () => {
                  setViewMode('admin');
                  // Quick cleanup URL parameter
                  window.history.pushState({}, '', window.location.pathname);
                }}
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-2xl p-8 border border-slate-100 text-center max-w-md mx-auto my-12">
                <Help className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-display font-medium text-slate-800 dark:text-white text-sm">Selecione um Contrato Primero</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Vá ao Painel Adminstrativo, crie ou selecione uma proposta e clique no botão de Link de Formalização para fazer este teste.</p>
                <button
                  onClick={() => setViewMode('admin')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Ir ao Painel Admin
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Corporate compliant simple status footer */}
      <footer className="no-print bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 border-t border-slate-100 py-4 text-center text-[10.5px] text-slate-400 shrink-0 font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 EnvioLink. Todos os direitos reservados.</p>
          <div className="flex items-center gap-3 font-mono text-[9px]">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Servidor Ativo (Porta 3000)</span>
            <span>Estabilidade Jurídica MP 2200-2</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
