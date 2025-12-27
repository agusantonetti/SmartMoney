import React from 'react';

interface Props {
  onBack: () => void;
}

const SuccessScreen: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#0d131b] dark:text-white transition-colors duration-200 relative flex h-screen w-full flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2636] px-10 py-4 z-20">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined filled text-3xl">savings</span>
          </div>
          <h2 className="text-[#0d131b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">Smart Money</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8 items-center">
          <div className="hidden md:flex items-center gap-9">
            <button className="text-[#0d131b] dark:text-slate-200 text-sm font-medium leading-normal hover:text-primary transition-colors bg-transparent cursor-pointer">Panel</button>
            <button className="text-[#0d131b] dark:text-slate-200 text-sm font-medium leading-normal hover:text-primary transition-colors bg-transparent cursor-pointer">Presupuesto</button>
            <button className="text-[#0d131b] dark:text-slate-200 text-sm font-medium leading-normal hover:text-primary transition-colors bg-transparent cursor-pointer">Metas</button>
            <button className="text-[#0d131b] dark:text-slate-200 text-sm font-medium leading-normal hover:text-primary transition-colors bg-transparent cursor-pointer">Educación</button>
          </div>
          <div className="flex gap-3">
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 text-[#0d131b] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 text-[#0d131b] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
            <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBeUujswHjYxqkon_wsCOH_banFMa5MVSMgs3QYUqTa8Ph1IiyA6Cg_LPRaKUOjZ7GiuDrEys1c0xnBGhMUWysP2MmqBbuFEEYRBBF8FRupKEwd2xgRMjDDSTBQvf7BnarMUAB3i41Xw86bvZpVuXGrmX4FZ-xFn_SQJWwrs1ZQGTCf7U4AD88XS7kelLR3aTTuUuRpJTqpMaTulDuMeIg6JvZR3NcHLMqHH26v85GdOzKKnov43L9SU5QCGflXKSgPjfi0b06-xgGw")' }}></div>
          </div>
        </div>
      </header>

      {/* Main Layout with Blurred Background */}
      <main className="flex-1 relative flex items-center justify-center p-4">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[20%] right-[15%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[40%] left-[60%] w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Overlay for Focus */}
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[2px] z-10"></div>
        
        {/* Micro-Celebration Card */}
        <div className="relative z-20 w-full max-w-lg animate-[zoomIn_0.3s_ease-out]">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] p-1 border border-white/20 dark:border-slate-700 overflow-hidden">
            {/* Confetti Decorative Header */}
            <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-[2rem] flex items-center justify-center overflow-hidden">
              <svg className="absolute w-full h-full opacity-60" fill="none" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="40" fill="#FFC107" r="4"></circle>
                <circle cx="350" cy="20" fill="#136dec" r="6"></circle>
                <rect fill="#10B981" height="8" transform="rotate(45 50 80)" width="8" x="50" y="80"></rect>
                <path d="M300 100L310 110L320 100" stroke="#EF4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
                <path d="M80 30 C 90 20, 110 20, 120 30" fill="none" stroke="#8B5CF6" strokeWidth="3"></path>
              </svg>
              {/* Central Animated Icon Container */}
              <div className="absolute -bottom-10 bg-white dark:bg-[#1e293b] p-2 rounded-full shadow-lg">
                <div className="size-20 bg-primary rounded-full flex items-center justify-center text-white shadow-inner border-4 border-white dark:border-[#1e293b]">
                  <span className="material-symbols-outlined text-4xl filled animate-bounce">emoji_events</span>
                </div>
              </div>
            </div>
            
            {/* Card Body */}
            <div className="pt-14 pb-8 px-8 text-center flex flex-col items-center">
              <h1 className="text-[#0d131b] dark:text-white text-3xl font-extrabold tracking-tight mb-2">¡Meta Superada!</h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-xs mx-auto mb-8">
                ¡Choca esos cinco! Te mantuviste dentro del presupuesto hoy. Eso son <span className="text-primary font-bold">$15 ahorrados</span> para tu Fondo de Vacaciones.
              </p>
              
              {/* Stats Row */}
              <div className="flex w-full gap-4 mb-8">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center gap-1 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ahorro</span>
                  <div className="flex items-center gap-1 text-emerald-500 font-bold text-xl">
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                    $15.00
                  </div>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center gap-1 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Racha</span>
                  <div className="flex items-center gap-1 text-orange-500 font-bold text-xl">
                    <span className="material-symbols-outlined filled text-lg">local_fire_department</span>
                    4 Días
                  </div>
                </div>
              </div>
              
              {/* Progress Section */}
              <div className="w-full mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Insignia de Ahorrador Semanal</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">80%</span>
                </div>
                <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: '80%' }}></div>
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-left">¡Solo 1 día más para desbloquear la insignia!</p>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={onBack} 
                  className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-14 rounded-full shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>Reclamar Recompensa</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button 
                  onClick={onBack}
                  className="w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium h-10 rounded-full transition-colors text-sm"
                >
                  No gracias, volver al panel
                </button>
              </div>
            </div>
            {/* Bottom Decorative Edge */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-400 via-primary to-purple-500"></div>
          </div>
          
          {/* Floating reaction bar below card */}
          <div className="mt-6 flex justify-center">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full px-6 py-2 shadow-sm border border-white/50 dark:border-slate-700 flex gap-6">
              <button className="group flex flex-col items-center gap-1 transition-transform hover:-translate-y-1">
                <div className="text-2xl group-hover:scale-110 transition-transform">🎉</div>
                <span className="text-[10px] font-bold text-slate-500">12</span>
              </button>
              <button className="group flex flex-col items-center gap-1 transition-transform hover:-translate-y-1">
                <div className="text-2xl group-hover:scale-110 transition-transform">🔥</div>
                <span className="text-[10px] font-bold text-slate-500">4</span>
              </button>
              <button className="group flex flex-col items-center gap-1 transition-transform hover:-translate-y-1">
                <div className="text-2xl group-hover:scale-110 transition-transform">💙</div>
                <span className="text-[10px] font-bold text-slate-500">8</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SuccessScreen;