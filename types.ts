
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  userId?: string; // Link to the user in DB
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUri?: string; // For display purposes
  isAudio?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  name: string;
  token?: string; // For real authentication
}

export interface SystemSettings {
  aiPersonality: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

// Gemini Response Schema Structure
export interface GeminiAnalysisResult {
  action: 'ADD_TRANSACTION' | 'CHAT_ONLY';
  transactionData?: {
    description: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
  };
  replyMessage: string;
}
