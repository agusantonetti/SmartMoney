
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface Props {
  onLogin: () => void; // No need to pass email back, App listens to Auth state
}

const LandingPage: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!email || !password) return;

      setIsLoading(true);
      setErrorMsg('');

      try {
          // 1. Intentar iniciar sesión
          await signInWithEmailAndPassword(auth, email, password);
          // Si tiene éxito, el listener en App.tsx manejará el cambio de vista
      } catch (error: any) {
          // 2. Si el usuario no existe o credenciales inválidas, intentamos registrar
          // Nota: En una app real, distinguirías mejor los errores, pero para UX fluida aquí:
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
             try {
                 // Intentamos crear la cuenta
                 await createUserWithEmailAndPassword(auth, email, password);
             } catch (createError: any) {
                 if (createError.code === 'auth/email-already-in-use') {
                     setErrorMsg("Contraseña incorrecta para este correo.");
                 } else if (createError.code === 'auth/weak-password') {
                     setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
                 } else {
                     setErrorMsg("Error al crear cuenta: " + createError.message);
                 }
             }
          } else if (error.code === 'auth/wrong-password') {
               setErrorMsg("Contraseña incorrecta.");
          } else {
              setErrorMsg("Error: " + error.message);
          }
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200">
      {/* Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <div className="size-8 text-primary">
            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_543)">
                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fillRule="evenodd"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_543"><rect fill="white" height="48" width="48"></rect></clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">Smart Money</h2>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden sm:block text-slate-500 text-sm font-medium">¿Ya tienes cuenta?</p>
          <button 
            onClick={() => document.getElementById('login-form')?.scrollIntoView({behavior: 'smooth'})}
            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold leading-normal transition-colors"
          >
            <span className="truncate">Ingresar</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex grow flex-col lg:flex-row max-w-[1440px] mx-auto w-full">
        {/* Left Column: Value Proposition */}
        <div className="flex lg:w-1/2 flex-col justify-center p-6 lg:p-20 order-2 lg:order-1">
          <div className="flex flex-col gap-6 max-w-lg">
            <div className="space-y-4">
              <h1 className="text-slate-900 dark:text-white text-4xl lg:text-5xl font-black leading-[1.1] tracking-[-0.033em]">
                Comienza tu viaje hacia la libertad financiera
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-normal leading-relaxed">
                Crea tu cuenta para gestionar tu patrimonio inteligentemente. Sincroniza tus datos en la nube y accede desde cualquier dispositivo.
              </p>
            </div>
            
            {/* Abstract illustrative graphic */}
            <div className="relative w-full h-64 lg:h-80 rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-blue-200/20 dark:to-blue-900/20"></div>
              <img alt="Gráfico abstracto" className="w-full h-full object-cover mix-blend-overlay opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_9VTIxjiK06nWfPblKDggcfHfDH_hEgFk5---9ndcVSQTZGX_--0t-_OHFmR1njHFOiY4HWqqMbAx9lejHn81U7Q9p2RihrehNv2AUHsYkwaq9iJNgTqe85jwhs5O5hD-OzePQ4-49PfZHrUZc2bxp2wBuEDCztte0SNUSEKNzxwuHm0aXtEgorWJZdVd5hma2I4On909pFzdCc7NRtkqUcRMq-bKQkdQyOAvzGjhfX11ovxr19_XltgURjE_z0lovxg79xlHagGw" />
              <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-xl shadow-lg max-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-green-500">cloud_sync</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cloud Sync</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Datos Seguros</p>
                <p className="text-xs text-slate-500 font-medium">Accesible 24/7</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: Registration Form */}
        <div className="flex lg:w-1/2 flex-col items-center justify-center p-4 lg:p-10 order-1 lg:order-2" id="login-form">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Progress Header */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Acceso Seguro</span>
                <span className="text-sm text-slate-500 font-medium">Smart Money</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full rounded-full"></div>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Ingresa o Regístrate</h3>
              
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                    {errorMsg}
                </div>
              )}

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 group">
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold ml-1">Correo Electrónico</span>
                  <div className="relative">
                    <input 
                        className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400" 
                        placeholder="tu@ejemplo.com" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">mail</span>
                  </div>
                </label>
                
                <label className="flex flex-col gap-2">
                    <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold ml-1">Contraseña</span>
                    <input 
                        className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400" 
                        placeholder="••••••••" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                  Si no tienes cuenta, intentaremos registrarte automáticamente.
                </p>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="mt-2 w-full h-12 bg-primary hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isLoading ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                      <>
                        <span>Continuar</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 mt-2 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span className="text-xs font-medium">Datos encriptados por Google</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
