import { useState, useEffect } from 'react';
import type { Product } from './types';
import { fetchProducts } from './lib/api';
import { CallView } from './components/CallView';
import { HistoryView } from './components/HistoryView';
import { Radio, History, PhoneCall, Cpu } from 'lucide-react';

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
    fetch('/health')
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
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070A11]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00F5A0] to-[#00D9F5] p-0.5 glow-mint">
              <div className="w-full h-full bg-[#070A11] rounded-[14px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#00F5A0] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold font-display tracking-tight text-white">
                  FlowDesk<span className="text-[#00F5A0]">.ai</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] font-semibold">
                  Voice v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-reading hidden sm:block">
                AI Voice Sales Specialist & Real-Time Intelligence Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Health Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900/60 p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('call')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-reading transition-all ${
                  activeTab === 'call'
                    ? 'bg-gradient-to-r from-[#00F5A0]/20 to-[#00D9F5]/20 text-white border border-[#00F5A0]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#00F5A0]" />
                Live Terminal
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-reading transition-all ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-[#00F5A0]/20 to-[#00D9F5]/20 text-white border border-[#00F5A0]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#00D9F5]" />
                Call Archives
              </button>
            </div>

            {/* Server Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]'
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500 font-reading">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#00F5A0]" />
            <span>Sankar Group AI Voice Sales Bot Assignment • Edge-TTS & Unified LLM</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>Client-side Audio Sync Mix</span>
            <span>•</span>
            <span>Deterministic Status Rubric</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
