
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (email: string, password: string, isRegister: boolean) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onForgotPassword }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (view === 'forgot') {
        if (!email) throw new Error("Digite seu email");
        await onForgotPassword(email);
        setMessage({ type: 'success', text: 'Email de recuperação enviado! Verifique sua caixa de entrada.' });
        setTimeout(() => setView('login'), 3000);
      } else {
        if (!email || !password) throw new Error("Preencha todos os campos");
        await onLogin(email, password, view === 'register');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Ocorreu um erro." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">💰</div>
          <h1 className="text-2xl font-bold text-gray-800">QUIRINO FINANÇAS</h1>
          <p className="text-gray-500 text-sm mt-1">Seu assistente financeiro pessoal</p>
        </div>

        {/* Tabs */}
        {view !== 'forgot' && (
          <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => { setView('login'); setMessage(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'login' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setView('register'); setMessage(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'register' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
              Cadastrar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {view === 'forgot' && (
            <div className="text-center mb-4">
              <h3 className="font-bold text-gray-700">Recuperar Senha</h3>
              <p className="text-xs text-gray-500">Digite seu email para receber o link.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          {view !== 'forgot' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-xs text-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processando...' : (view === 'login' ? 'ENTRAR' : view === 'register' ? 'CRIAR CONTA' : 'ENVIAR LINK')}
          </button>
        </form>

        {view === 'login' && (
           <button 
             onClick={() => setView('forgot')}
             className="w-full text-center text-xs text-gray-500 hover:text-emerald-600 mt-4 underline"
           >
             Esqueci minha senha
           </button>
        )}

        {view === 'forgot' && (
           <button 
             onClick={() => setView('login')}
             className="w-full text-center text-xs text-gray-500 hover:text-emerald-600 mt-4"
           >
             Voltar para o Login
           </button>
        )}

      </div>
      <p className="text-emerald-200 text-xs mt-8 text-center opacity-70">
        Protegido pelo Supabase Auth
      </p>
    </div>
  );
};

export default LoginScreen;
