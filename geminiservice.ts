
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, GeminiAnalysisResult } from '../types';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GEMINI_3_MODEL = 'gemini-3-pro-preview';
const GEMINI_AUDIO_MODEL = 'gemini-2.5-flash'; 

// Schema for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ['ADD_TRANSACTION', 'CHAT_ONLY'],
      description: "Determine if the user wants to add a financial record or just chat."
    },
    transactionData: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        description: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        category: { type: Type.STRING, description: "Category e.g., Alimentação, Transporte, Lazer, Casa, Salário" },
        type: { type: Type.STRING, enum: ['income', 'expense'] }
      }
    },
    replyMessage: {
      type: Type.STRING,
      description: "A friendly, short response to the user in Portuguese."
    }
  },
  required: ['action', 'replyMessage']
};

/**
 * Main function to process user input (Text, Image, or Audio)
 */
export const processInputWithGemini = async (
  text: string | null,
  imageBase64: string | null,
  audioBase64: string | null,
  currentHistory: Transaction[],
  customPersonality: string = ""
): Promise<GeminiAnalysisResult> => {

  const historyContext = JSON.stringify(currentHistory.slice(-10)); 
  const currentDateTime = new Date().toLocaleString('pt-BR');
  
  let personalityInstruction = "Você é um assistente financeiro pessoal inteligente e amigável.";
  if (customPersonality && customPersonality.trim() !== "") {
      personalityInstruction = `IMPORTANTE - PERSONALIDADE: ${customPersonality}. Aja conforme esta personalidade.`;
  }

  const systemInstruction = `
    Você é o QUIRINO.
    ${personalityInstruction}
    
    DATA/HORA ATUAL: ${currentDateTime}
    
    Contexto Recente (Últimas transações): ${historyContext}

    Instruções:
    1. Analise a entrada do usuário.
    2. Se for gasto/ganho, preencha 'transactionData'.
    3. Se for conversa/dúvida, use 'CHAT_ONLY'.
    4. Categorize automaticamente.
    5. Responda sempre em Português do Brasil.
  `;

  try {
    const parts: any[] = [];

    // Prioritize Audio model if audio is present
    let modelName = GEMINI_3_MODEL;

    if (audioBase64) {
      modelName = GEMINI_AUDIO_MODEL;
      parts.push({
        inlineData: {
          mimeType: "audio/wav", 
          data: audioBase64
        }
      });
      parts.push({ text: "Analise este áudio. O usuário está relatando uma despesa ou receita? Ou fazendo uma pergunta?" });
    } else if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
      if (text) parts.push({ text });
      else parts.push({ text: "Analise esta imagem (recibo/nota) e extraia os dados financeiros." });
    } else if (text) {
      parts.push({ text });
    }

    if (parts.length === 0) {
      throw new Error("No input provided");
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2 
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from Gemini");

    return JSON.parse(responseText) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      action: 'CHAT_ONLY',
      replyMessage: "Desculpe, tive um problema ao processar sua solicitação. Tente novamente."
    };
  }
};
