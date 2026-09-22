import React, { useState } from 'react';
import { X, Sparkles, Zap, Gift, CheckCircle2, ShieldCheck, History, ArrowDownRight, ArrowUpRight, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount } from '../types';
import { claimDailyCredits, addCredits } from '../utils/storage';

interface CreditsModalProps {
  user: UserAccount;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
  user,
  onUpdateUser,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimDaily = () => {
    setIsClaiming(true);
    const result = claimDailyCredits();
    onUpdateUser(result.user);
    setClaimMessage(result.message);
    setIsClaiming(false);

    if (result.claimed) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff007f', '#a855f7', '#3b82f6'],
      });
    }
  };

  const handleSimulatePurchase = (amount: number, packName: string) => {
    const updated = addCredits(amount, `Recarga simulada: ${packName}`);
    onUpdateUser(updated);

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b'],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header with glowing gradient */}
        <div className="relative px-6 py-6 border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black">
                <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Bóveda de Créditos OPTIMUS
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Premium Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Potencia tus creaciones audiovisuales con videos cinematográficos en alta definición.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Balance card */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Balance Actual
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                  {user.credits}
                </span>
                <span className="text-sm font-semibold text-slate-300">Créditos</span>
              </div>
            </div>

            <button
              onClick={handleClaimDaily}
              disabled={isClaiming}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-cyan-500/20"
            >
              <Gift className="w-4 h-4" />
              Reclamar Bono Diario (+25)
            </button>
          </div>

          {claimMessage && (
            <div className="mt-3 text-xs px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
              {claimMessage}
            </div>
          )}
        </div>

        {/* Free Tier transparency badge */}
        <div className="px-6 py-2.5 bg-cyan-950/20 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Chat, Programación, Análisis de Imagen y Videos Simples son <b>100% GRATIS</b></span>
          </div>
          <span className="text-cyan-400 font-medium">Video Cinemático: 10 Créditos</span>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'plans'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planes y Paquetes de Créditos
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Movimientos ({user.transactions.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900/60">
          {activeTab === 'plans' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Pack 1 */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Pack Creador</span>
                    <h4 className="text-xl font-bold text-white mt-1">100 Créditos</h4>
                    <p className="text-xs text-slate-400 mt-2">
                      Ideal para 10 videos cinematográficos completos con audio épico.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">$4.99</span>
                    <button
                      onClick={() => handleSimulatePurchase(100, 'Pack Creador 100')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 rounded-lg text-xs font-bold transition-all"
                    >
                      Recargar
                    </button>
                  </div>
                </div>

                {/* Pack 2 - Highlighted */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-slate-950 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 flex flex-col justify-between relative">
                  <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Más Popular
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase">Pack Pro Cine</span>
                    <h4 className="text-xl font-bold text-white mt-1">300 Créditos</h4>
                    <p className="text-xs text-slate-400 mt-2">
                      30 producciones cinematográficas en 1080p/4K con directiva de cámara IA.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">$9.99</span>
                    <button
                      onClick={() => handleSimulatePurchase(300, 'Pack Pro 300')}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
                    >
                      Recargar
                    </button>
                  </div>
                </div>

                {/* Pack 3 */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-purple-400 uppercase">Pack Estudio VIP</span>
                    <h4 className="text-xl font-bold text-white mt-1">1000 Créditos</h4>
                    <p className="text-xs text-slate-400 mt-2">
                      Producción sin límites, múltiples formatos 16:9 y 9:16 reels/shorts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">$24.99</span>
                    <button
                      onClick={() => handleSimulatePurchase(1000, 'Pack Estudio VIP 1000')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-purple-500 hover:text-white text-purple-400 rounded-lg text-xs font-bold transition-all"
                    >
                      Recargar
                    </button>
                  </div>
                </div>
              </div>

              {/* Free credit simulation helper */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                <div>
                  <span className="font-semibold text-white block">¿Probando la aplicación?</span>
                  <span className="text-slate-400">Puedes simular una recarga de prueba con 50 créditos en cualquier momento.</span>
                </div>
                <button
                  onClick={() => handleSimulatePurchase(50, 'Recarga de Prueba Gratuita')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl font-medium transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  +50 Créditos Test
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {user.transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay transacciones registradas aún.
                </div>
              ) : (
                user.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.type === 'credit'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type === 'credit' ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">
                          {tx.reason}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-sm font-bold ${
                        tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'credit' ? `+${tx.amount}` : `-${tx.amount}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
