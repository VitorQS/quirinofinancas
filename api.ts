
import { Transaction, SystemSettings, UserProfile } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL: string = 'https://tzrquuzieypxqvblisjb.supabase.co';
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6cnF1dXppZXlweHF2Ymxpc2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODA0MTgsImV4cCI6MjA3OTA1NjQxOH0.xne_MFgZdYw9pNbJ3ukypk91uzflOJsLSNVFDLxDFtU"; 

// Verifica se o Supabase está configurado corretamente
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "";

export let supabase: any = null;
if (isSupabaseConfigured) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- REAL IMPLEMENTATION (Supabase) ---
const SupabaseAPI = {
  
  // --- AUTHENTICATION ---
  
  login: async (email: string, password: string): Promise<UserProfile> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.email?.split('@')[0] || 'Usuário',
      token: data.session.access_token
    };
  },

  register: async (email: string, password: string): Promise<UserProfile> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Note: User might need to confirm email depending on Supabase settings
    return {
      id: data.user?.id || '',
      email: data.user?.email,
      name: data.user?.email?.split('@')[0] || 'Novo Usuário',
      token: data.session?.access_token
    };
  },

  resetPassword: async (email: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    // This sends a password reset email to the user
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirect back to the app
    });

    if (error) throw error;
  },

  signOut: async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  getCurrentSession: async (): Promise<UserProfile | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
       return {
        id: data.session.user.id,
        email: data.session.user.email,
        name: data.session.user.email?.split('@')[0] || 'Usuário',
        token: data.session.access_token
       };
    }
    return null;
  },

  // --- DATA OPERATIONS ---

  getTransactions: async (user: UserProfile): Promise<Transaction[]> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    // RLS (Row Level Security) on Supabase should handle filtering by user_id automatically based on the token,
    // but we explicitly query for safety/clarity in this context.
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id); // Using UUID now

    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }

    return data.map((row: any) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      type: row.type,
      userId: row.user_id
    }));
  },

  saveTransaction: async (user: UserProfile, transaction: Transaction): Promise<Transaction> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const payload = {
      id: transaction.id,
      user_id: user.id, // Using UUID
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type
    };

    const { error } = await supabase
      .from('transactions')
      .insert([payload]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }

    return transaction;
  },

  deleteTransaction: async (user: UserProfile, id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Security check
    
    if (error) throw error;
  },
  
  updateAllTransactions: async (user: UserProfile, transactions: Transaction[]): Promise<void> => {
      if (!supabase) throw new Error("Supabase not initialized");

      await supabase.from('transactions').delete().eq('user_id', user.id);
      
      if (transactions.length > 0) {
        const payload = transactions.map(t => ({
            id: t.id,
            user_id: user.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            type: t.type
        }));

        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
      }
  },

  getSettings: async (user: UserProfile): Promise<SystemSettings> => {
    if (!supabase) return { aiPersonality: '' };

    const { data } = await supabase
      .from('settings')
      .select('ai_personality')
      .eq('user_id', user.id)
      .single();

    if (data) {
      return { aiPersonality: data.ai_personality };
    }
    return { aiPersonality: '' };
  },

  saveSettings: async (user: UserProfile, settings: SystemSettings): Promise<void> => {
    if (!supabase) return;

    const { error } = await supabase
      .from('settings')
      .upsert({ 
        user_id: user.id, 
        ai_personality: settings.aiPersonality 
      });
      
    if (error) console.error("Error saving settings", error);
  }
};

export const api = SupabaseAPI;
