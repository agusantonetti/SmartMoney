
import React, { useState, useEffect, useRef } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface Props {
  currentProfile: FinancialProfile;
  allTransactions?: Transaction[]; // Para exportar
  onSave: (profile: FinancialProfile) => void;
  onImportData?: (data: { profile: FinancialProfile, transactions: Transaction[] }) => void;
  onBack: () => void;
  onLogout?: () => void; // Deprecated prop but kept for type compat, logic moved here
}

const AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX", // Original
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDki2jrf9k9JBi163dvJw7rLI-2jM6JCpBJVbATGUYTfmUJ1mx4xMilFkYoBMRXxvoLEodON35DcsHWJDvn1lESgqtRvGwsB3eakTAGIpmC0YwihR3lHJmb7OMjyVvu8g9TFqrxZS9dyB4Yf-fQHZH10hAD-I61S0oaorNwuewRHEWxKG4twslrqxUb_iTPTfyEK_JFtKwSsfKcKg7IwxmEbp6ryrZwBpeL8hZpV8h7ppyRkRsLSmGpa-kNrJyVlB4B3JSB5I4gFTz3", // Mujer 1
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDV2sttAGhZuPLXhzRsRHQNg5NzsPDd71U9BY3PhAjrz2NGZl7H37PGqE4SDz_V-5vG5c5RqF1MA5gBeL1env3jTphLXVVIq1ePUfZjGN8f64oOMVlPVNIDUh0pDtoXXNDyhLECQx3ohrjqyC4vw0M7i2gGFr9zoRwbqX-n--dsHsQpWNGdGI6ScXZS1PS3TTqN30aj9KvX1dk2vopY6br-BaOciI_k71nEol_fcGx_2m03bu8kVqE7OGwp7IYm7RRITmsnAi9mezcU", // Hombre 1
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYJ8hJ4SAty50dbu0Ucn_zp7HWE2rsfy6C07bvW12dDiN_0OQUoeeA7PZVP8IeT-1CVY7kyufDdvYjdu7JQ9EubkMD8tIk1WKwipb5XEU2dMuJ92TRxN_CIezY5i2AWFL2g7gNNGdtC8MoogZofXYSBMGCn38pMVqTdksH2-_7HnPrhrZ0Wqv5ajFrL-epuDvCBm8DpKsdbNvvd83IsMZY2JFbDlm2KKxNKwIGDL3L5DyrlUoVjo1Tbr3NujWzntGruI3XW1mkdUhV", // Hombre 2
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBeUujswHjYxqkon_wsCOH_banFMa5MVSMgs3QYUqTa8Ph1IiyA6Cg_LPRaKUOjZ7GiuDrEys1c0xnBGhMUWysP2MmqBbuFEEYRBBF8FRupKEwd2xgRMjDDSTBQvf7BnarMUAB3i41Xw86bvZpVuXGrmX4FZ-xFn_SQJWwrs1ZQGTCf7U4AD88XS7kelLR3aTTuUuRpJTqpMaTulDuMeIg6JvZR3NcHLMqHH26v85GdOzKKnov43L9SU5QCGflXKSgPjfi0b06-xgGw"  // Mujer 2
];

const ProfileSetup: React.FC<Props> = ({ currentProfile, allTransactions, onSave, onImportData, onBack }) => {
  const [balance, setBalance] = useState(currentProfile.initialBalance.toString());
  const [name, setName] = useState(currentProfile.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentProfile.avatar || AVATARS[0]);
  const [hourlyWage, setHourlyWage] = useState(currentProfile.hourlyWage ? currentProfile.hourlyWage.toString() : '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate estimated hourly wage from income sources if not set
  useEffect(() => {
    if (!hourlyWage && currentProfile.incomeSources && currentProfile.incomeSources.length > 0) {
        const totalMonthly = currentProfile.incomeSources.reduce((acc, src) => acc + src.amount, 0);
        if (totalMonthly > 0) {
            // Suggestion logic could go here
        }
    }
  }, []);

  const calculateHourlyFromMonthly = () => {
    const monthly = currentProfile.incomeSources?.reduce((acc, src) => acc + src.amount, 0) || 0;
    if (monthly > 0) {
        const calculated = (monthly / 160).toFixed(0);
        setHourlyWage(calculated);
    } else {
        alert("Primero configura tus Ingresos en el panel principal para calcular esto automáticamente.");
    }
  };

  const handleSave = () => {
    onSave({
      ...currentProfile,
      initialBalance: parseFloat(balance) || 0,
      name: name,
      avatar: selectedAvatar,
      hourlyWage: parseFloat(hourlyWage) || 0
    });
  };

  const handleLogoutAction = () => {
      signOut(auth).catch(err => console.error(err));
  };

  // --- EXPORT LOGIC ---
  const handleExport = () => {
    if (!allTransactions) return;
    const backupData = {
        profile: currentProfile,
        transactions: allTransactions,
        exportedAt: new Date().toISOString(),
        version: "1.0"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `smart_money_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- IMPORT LOGIC ---
  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (json.profile && json.transactions && onImportData) {
                if (window.confirm("⚠️ IMPORTANTE: Esto sobrescribirá todos tus datos actuales. ¿Estás seguro de restaurar este respaldo?")) {
                    onImportData({
                        profile: json.profile,
                        transactions: json.transactions
                    });
                }
            } else {
                alert("El archivo no tiene el formato correcto.");
            }
        } catch (error) {
            alert("Error al leer el archivo. Asegúrate de que sea un JSON válido.");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col items-center p-6 text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Editar Perfil</h2>
        <button onClick={handleLogoutAction} className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
            Cerrar Sesión
        </button>
      </div>

      <div className="w-full max-w-lg space-y-8 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Avatar Section */}
        <div className="text-center space-y-6 mb-8">
          <div className="relative inline-block group">
            <div className="size-28 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
               <img src={selectedAvatar} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-white text-xs font-bold">Cambiar</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-3">
             {AVATARS.map((avatar, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`size-10 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === avatar ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:border-slate-300 opacity-60 hover:opacity-100'}`}
                >
                   <img src={avatar} className="w-full h-full object-cover" />
                </button>
             ))}
          </div>
        </div>

        {/* Input: Name */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
           <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Tu Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 h-12 px-4 rounded-xl text-lg font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-slate-400"
                placeholder="Ej. Alex Doe"
              />
           </div>

           <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

           <div>
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-500">account_balance</span>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Patrimonio Neto (Manual)</label>
             </div>
             <p className="text-xs text-slate-400 mb-3">Tu riqueza total actual. Este número no cambia automáticamente.</p>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">$</span>
                <input 
                  type="number" 
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 h-14 pl-10 pr-4 rounded-xl text-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-slate-300"
                  placeholder="0.00"
                />
             </div>
           </div>

           <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

           {/* Cost of Living Section */}
           <div>
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-500">timelapse</span>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Valor de tu Hora</label>
             </div>
             <p className="text-xs text-slate-400 mb-3">
               Para la calculadora de "Costo de Vida". ¿Cuánto ganas por hora de trabajo?
             </p>
             <div className="flex gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">$</span>
                    <input 
                    type="number" 
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 h-14 pl-10 pr-4 rounded-xl text-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-300"
                    placeholder="0"
                    />
                </div>
                <button 
                    onClick={calculateHourlyFromMonthly}
                    className="px-4 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl text-xs font-bold leading-tight hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Calcular basado en ingresos mensuales / 160 horas"
                >
                    Calcular<br/>Automático
                </button>
             </div>
           </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-14 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Guardar Cambios</span>
          <span className="material-symbols-outlined">check_circle</span>
        </button>

        {/* DATA MANAGEMENT (NEW FEATURE 4) */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
             <h3 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Gestión de Datos</h3>
             <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                >
                    <div className="size-10 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">download</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Respaldo (Exportar)</span>
                </button>
                
                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                >
                    <div className="size-10 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">upload</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Restaurar (Importar)</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                />
             </div>
             <p className="text-center text-[10px] text-slate-400 mt-4 max-w-xs mx-auto">
                 Descarga tu copia de seguridad para no perder datos si borras la caché del navegador.
             </p>
        </div>

      </div>
    </div>
  );
};

export default ProfileSetup;
