import { useState, useEffect } from 'react';
import type { Product } from './types';
import { fetchProducts, API_BASE } from './lib/api';
import { CallView } from './components/CallView';
import { HistoryView } from './components/HistoryView';
import { History, PhoneCall, Cpu } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'call' | 'history'>('call');
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'flowdesk',
      name: 'FlowDesk',
      tagline: 'AI-Powered Customer Support Helpdesk',
      one_liner: 'FlowDesk resolves customer support tickets instantly with generative AI.',
      languages: ['en', 'hi'],
    },
  ]);
  const [selectedProduct, setSelectedProduct] = useState<string>('flowdesk');
  const [language, setLanguage] = useState<string>('en');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Warmup backend and load products
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => {
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      })
      .catch(() => setServerStatus('offline'));

    fetchProducts()
      .then((data) => {
        if (data.length > 0) {
          setProducts(data);
          setSelectedProduct(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load products', err));
  }, []);

  return (
    <div className="min-h-screen cyber-tactical-bg text-slate-100 flex flex-col selection:bg-[#FF2A55] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#06080D]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative p-0.5 rounded-xl bg-white/10">
              <img 
                src="/logo.png" 
                alt="FlowDesk AI Logo" 
                className="w-9 h-9 rounded-lg object-cover bg-black" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-orbitron font-extrabold tracking-wider text-white">
                  FLOWDESK<span className="text-[#FF2A55]">.AI</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-rajdhani font-semibold hidden sm:block tracking-wide">
                Autonomous Voice Sales Specialist & Support Helpdesk
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Health Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#0C101A] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('call')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'call'
                    ? 'bg-[#FF2A55] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Live Terminal
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Call Archives
              </button>
            </div>

            {/* Server Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]'
                    : serverStatus === 'checking'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-400">
                {serverStatus === 'online' ? 'Engine Ready' : serverStatus === 'checking' ? 'Connecting' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'call' ? (
          <CallView
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            language={language}
            onSelectLanguage={setLanguage}
          />
        ) : (
          <HistoryView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-xs text-slate-500 font-rajdhani">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#FF2A55]" />
            <span>FlowDesk AI • Enterprise Real-Time Voice Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>Sub-450ms Voice Cadence</span>
            <span>•</span>
            <span>Deterministic CSAT &amp; Escalation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
