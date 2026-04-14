import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, FinancialProfile, FinancialMetrics } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  metrics: FinancialMetrics;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const FinancialAssistant: React.FC<Props> = ({ profile, transactions, metrics, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      text: `Hola ${profile.name ? profile.name.split(' ')[0] : 'Viajero'} 👋. Soy tu asistente financiero personal. Puedes preguntarme cosas como:\n\n* "¿Cuánto gasté en comida el mes pasado?"\n* "¿Puedo permitirme una cena de $20,000 hoy?"\n* "Analiza mis gastos recientes y dame un consejo."` 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Preparar el contexto de datos (Optimizado para no exceder tokens)
      // Tomamos las últimas 50 transacciones para contexto reciente
      const recentTransactions = transactions.slice(0, 50).map(t => 
        `- ${t.date}: ${t.description} (${t.category}) -> $${t.amount} (${t.type})`
      ).join('\n');

      const dataContext = `
        CONTEXTO FINANCIERO DEL USUARIO:
        - Nombre: ${profile.name}
        - Balance Total: $${metrics.balance}
        - Gastos Fijos Mensuales: $${metrics.fixedExpenses}
        - Dinero Reservado (Apartados): $${metrics.totalReserved}
        - Disponible Real (Balance - Reservado): $${metrics.balance - metrics.totalReserved}
        - Health Score: ${metrics.healthScore}/100
        - Vida Útil (Runway): ${metrics.runway} meses
        
        TRANSACCIONES RECIENTES (Últimas 50):
        ${recentTransactions}
      `;

      const prompt = `
        Eres un asistente financiero experto, amable y conciso llamado "Smart AI".
        Tu objetivo es ayudar al usuario a entender sus finanzas, tomar mejores decisiones y calmar su ansiedad financiera.
        
        Responde a la siguiente pregunta del usuario basándote EXCLUSIVAMENTE en los datos proporcionados abajo.
        Si te preguntan algo que no puedes calcular con estos datos, dilo honestamente.
        Usa formato Markdown simple (negritas, listas) para que sea legible.
        Sé breve pero perspicaz. Si ves un gasto alto innecesario, señálalo con tacto.
        
        ${dataContext}
        
        PREGUNTA DEL USUARIO: "${userMsg.text}"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || "Lo siento, no pude procesar esa consulta. Intenta de nuevo."
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "Tuve un problema conectando con el cerebro financiero. Por favor intenta en un momento." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="size-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        </div>
        <div>
          <h2 className="text-sm font-bold leading-tight">Asistente IA</h2>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
             <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
             Online
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-4 overflow-y-auto pb-24">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}
            >
                {msg.role === 'model' ? (
                    // Simple parser for bold text in markdown (**text**)
                    msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                        part.startsWith('**') && part.endsWith('**') 
                        ? <strong key={i}>{part.slice(2, -2)}</strong> 
                        : part
                    )
                ) : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                 <div className="size-2 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="size-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                 <div className="size-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background-light dark:bg-background-dark p-4 border-t border-slate-200 dark:border-slate-800">
         <div className="max-w-2xl mx-auto relative flex items-end gap-2">
            <div className="relative flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm">
                <textarea 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregunta sobre tus gastos..."
                    className="w-full bg-transparent border-none outline-none text-sm p-3 min-h-[50px] max-h-[120px] resize-none text-slate-900 dark:text-white"
                    rows={1}
                />
            </div>
            <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="size-12 rounded-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
                <span className="material-symbols-outlined">send</span>
            </button>
         </div>
         <p className="text-center text-[10px] text-slate-400 mt-2">
            La IA puede cometer errores. Verifica los montos importantes.
         </p>
      </div>
    </div>
  );
};

export default FinancialAssistant;