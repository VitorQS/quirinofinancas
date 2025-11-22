
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, ChatMessage, ProcessingStatus, UserProfile, SystemSettings } from './types';
import { api, supabase } from './services/api';
import { processInputWithGemini } from './services/geminiService';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AudioRecorder from './components/AudioRecorder';
import LoginScreen from './components/LoginScreen';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ aiPersonality: '' });
  
  // UI State
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Navigation & Filters
  const [viewDate, setViewDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // INITIALIZE AUTH
  useEffect(() => {
    // Check active session
    const checkSession = async () => {
        try {
            const user = await api.getCurrentSession();
            if (user) setCurrentUser(user);
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsLoading(false);
        }
    };
    checkSession();

    // Listen for auth changes (e.g. password reset, logout in other tab)
    if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
            if (event === 'SIGNED_IN' && session?.user) {
                 setCurrentUser({
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.email?.split('@')[0] || 'Usuário',
                    token: session.access_token
                 });
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setTransactions([]);
                setChatHistory([]);
            }
        });
        return () => subscription.unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, []);

  // Load data when User Logs In
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        // Do not set global loading here to avoid flicker, just show local loading if needed
        try {
          const [loadedTransactions, loadedSettings] = await Promise.all([
            api.getTransactions(currentUser),
            api.getSettings(currentUser)
          ]);
          
          setTransactions(loadedTransactions);
          setSettings(loadedSettings);
          
          setChatHistory([{
            id: 'init',
            role: 'model',
            text: `Olá ${currentUser.name}! Sou o Quirino. Como estão suas finanças hoje?`
          }]);
        } catch (error) {
          console.error("Error loading data", error);
          // If error is due to table not existing or network, don't crash
        }
      }
    };
    loadData();
  }, [currentUser]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Month Navigation Handlers
  const nextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const prevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const currentMonthName = useMemo(() => {
    return viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  // Filter transactions (Date AND Type)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const matchesDate = tDate.getMonth() === viewDate.getMonth() && 
                          tDate.getFullYear() === viewDate.getFullYear();
      
      if (!matchesDate) return false;

      if (filterType === 'all') return true;
      return t.type === filterType;
    });
  }, [transactions, viewDate, filterType]);

  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser) return;
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      // Optimistic update
      const prevTransactions = [...transactions];
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      try {
        await api.deleteTransaction(currentUser, id);
      } catch (e) {
        // Revert if fails
        setTransactions(prevTransactions);
        alert("Erro ao excluir no servidor.");
      }
    }
  };

  // LOGIN / REGISTER HANDLER
  const handleAuth = async (email: string, pass: string, isRegister: boolean) => {
    try {
      if (isRegister) {
        const user = await api.register(email, pass);
        if (user) {
            alert("Conta criada com sucesso! Bem-vindo.");
            setCurrentUser(user);
        }
      } else {
        const user = await api.login(email, pass);
        if (user) setCurrentUser(user);
      }
    } catch (e: any) {
      console.error(e);
      throw new Error(e.message || "Erro na autenticação");
    }
  };
  
  const handleForgotPassword = async (email: string) => {
      try {
          await api.resetPassword(email);
      } catch(e: any) {
          throw new Error(e.message || "Erro ao enviar email");
      }
  }

  const handleLogout = async () => {
    await api.signOut();
    setCurrentUser(null);
    setTransactions([]);
    setChatHistory([]);
    setShowSettings(false);
  };

  const handleSettingsChange = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if(currentUser) {
        // Save in background
        api.saveSettings(currentUser, newSettings).catch(console.error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string);
        setSelectedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Backup Handlers
  const handleExportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quirino_backup_${currentUser?.name}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowSettings(false);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (Array.isArray(importedData) && importedData.every((t: any) => t.id && t.amount && t.date)) {
            if(confirm(`Importar ${importedData.length} registros? Os dados atuais serão substituídos.`)) {
                setIsLoading(true);
                await api.updateAllTransactions(currentUser, importedData);
                setTransactions(importedData);
                setIsLoading(false);
                alert("Dados restaurados com sucesso!");
                setShowSettings(false);
            }
        } else {
            alert("Arquivo inválido.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao ler arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const processSubmission = async (text: string | null, image: string | null, audio: string | null) => {
    if ((!text && !image && !audio) || !currentUser) return;

    setStatus(ProcessingStatus.PROCESSING);
    const userMsgId = uuidv4();
    
    const newMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: text || (audio ? '🎤 [Áudio enviado]' : '📷 [Imagem enviada]'),
      imageUri: image || undefined,
      isAudio: !!audio
    };
    setChatHistory(prev => [...prev, newMessage]);
    clearInputs();

    const result = await processInputWithGemini(
      text, 
      image ? image.split(',')[1] : null, 
      audio, 
      transactions,
      settings.aiPersonality
    );

    if (result.action === 'ADD_TRANSACTION' && result.transactionData) {
      const newTransaction: Transaction = {
        id: uuidv4(),
        date: new Date().toISOString(),
        description: result.transactionData.description || 'Geral',
        amount: result.transactionData.amount || 0,
        category: result.transactionData.category || 'Geral',
        type: result.transactionData.type,
        userId: currentUser.id
      };
      
      // Optimistic UI update
      setTransactions(prev => [...prev, newTransaction]);
      
      // Save to Backend
      api.saveTransaction(currentUser, newTransaction).catch(err => {
         console.error("Failed to save", err);
         alert("Erro ao salvar transação no servidor, mas está salva na memória.");
      });
      
      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        role: 'model',
        text: `✅ ${newTransaction.description} (R$ ${newTransaction.amount.toFixed(2)}) adicionado. ${result.replyMessage}`
      }]);
    } else {
      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        role: 'model',
        text: result.replyMessage
      }]);
    }

    setStatus(ProcessingStatus.SUCCESS);
    setTimeout(() => setStatus(ProcessingStatus.IDLE), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processSubmission(inputText, selectedImage, null);
  };

  const handleAudioRecorded = (base64Audio: string) => {
    processSubmission(null, null, base64Audio);
  };

  // MAIN RENDER
  
  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-emerald-600 text-white animate-pulse">Carregando Quirino...</div>;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleAuth} onForgotPassword={handleForgotPassword} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-gray-50 shadow-2xl overflow-hidden relative border-x border-gray-200 font-sans">
      
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-20 shadow-md flex justify-between items-center relative">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-2xl">💰</span> QUIRINO
          </h1>
          <span className="text-xs text-emerald-100 opacity-80 truncate max-w-[200px]">Olá, {currentUser.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
            {status === ProcessingStatus.PROCESSING && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-emerald-700 transition-colors focus:outline-none"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>

        {/* Settings Dropdown */}
        {showSettings && (
            <>
            <div className="fixed inset-0 z-30 bg-black bg-opacity-10" onClick={() => setShowSettings(false)}></div>
            <div className="absolute top-16 right-4 bg-white rounded-xl shadow-xl border border-gray-100 w-72 z-40 overflow-hidden animate-fade-in-down">
                <div className="p-4 border-b border-gray-50 bg-gray-50">
                    <h3 className="font-bold text-gray-700">Configurações</h3>
                </div>
                <div className="p-4 space-y-4">
                    
                    {/* Personality Config */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Personalidade do Quirino</label>
                        <textarea
                            value={settings.aiPersonality}
                            onChange={(e) => handleSettingsChange({...settings, aiPersonality: e.target.value})}
                            placeholder="Ex: Seja engraçado, fale como um pirata, seja muito formal..."
                            className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:border-emerald-500 outline-none resize-none h-20 bg-gray-50"
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                         <button onClick={handleExportData} className="w-full text-left py-2 text-sm text-gray-700 hover:text-emerald-600 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Baixar Backup
                        </button>
                        <label className="w-full text-left py-2 text-sm text-gray-700 hover:text-blue-600 flex items-center gap-2 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg>
                            Restaurar Backup
                            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                        </label>
                    </div>

                    <button onClick={handleLogout} className="w-full mt-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">
                        Sair da Conta
                    </button>
                </div>
            </div>
            </>
        )}
      </header>

      {/* Month Selector */}
      <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-2 sticky top-[68px] z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="font-semibold text-gray-800 capitalize text-sm md:text-base">{currentMonthName}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
            <button 
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
                Todos
            </button>
            <button 
                onClick={() => setFilterType('income')}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
                Entradas
            </button>
            <button 
                onClick={() => setFilterType('expense')}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}
            >
                Saídas
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-48 scrollbar-hide bg-gray-50">
        
        {/* Only show dashboard if viewing All, to avoid confusion with filtered lists */}
        {filterType === 'all' && <Dashboard transactions={filteredTransactions} />}
        
        <TransactionList transactions={filteredTransactions} onDelete={handleDeleteTransaction} />
        
        {/* Chat History */}
        <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Conversa</h3>
            <div ref={chatContainerRef} className="space-y-4 pb-4 px-1">
                {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-emerald-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}>
                            {msg.imageUri && (
                                <img src={msg.imageUri} alt="Upload" className="w-full h-32 object-cover rounded-lg mb-2" />
                            )}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {status === ProcessingStatus.PROCESSING && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-500 text-xs px-4 py-2 rounded-full border border-gray-200 animate-pulse shadow-sm">
                            Quirino está analisando... 🧠
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-30">
        {selectedImage && (
            <div className="relative inline-block mb-2 ml-2">
                <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-300 shadow-sm" />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-shrink-0">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*" 
                    onChange={handleImageSelect} 
                    className="hidden" 
                    id="file-upload"
                />
                <label 
                    htmlFor="file-upload"
                    className="cursor-pointer p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                    title="Enviar Foto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </label>
            </div>

            <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500 transition-all border border-transparent focus-within:bg-white">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ex: Gastei 30 na padaria hoje..."
                    className="bg-transparent border-none w-full focus:outline-none text-gray-800 placeholder-gray-500 text-sm md:text-base"
                    disabled={status === ProcessingStatus.PROCESSING}
                />
            </div>

            {inputText || selectedImage ? (
                <button
                    type="submit"
                    disabled={status === ProcessingStatus.PROCESSING}
                    className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg disabled:opacity-50 disabled:scale-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            ) : (
                <AudioRecorder 
                    onAudioRecorded={handleAudioRecorded} 
                    disabled={status === ProcessingStatus.PROCESSING}
                />
            )}
        </form>
      </div>
    </div>
  );
};

export default App;
