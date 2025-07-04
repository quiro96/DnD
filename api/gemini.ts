// api/gemini.ts (VERSIONE FINALE E CORRETTA)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("ERRORE: La variabile d'ambiente GEMINI_API_KEY non è impostata su Vercel.");
    return response.status(500).json({ message: "Configurazione del server incompleta. Controlla le variabili d'ambiente su Vercel." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  try {
    const { type, payload } = request.body;

    switch (type) {
      // +++ MODIFICA CHIAVE QUI +++
      // Semplifichiamo questo caso per essere più robusto
      case 'chat': {
        const { history, systemInstruction } = payload;
        // Il nuovo messaggio dell'utente è già l'ultimo elemento di `history`
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction, safetySettings });
        const result = await model.generateContent({ contents: history });
        return response.status(200).json(result.response);
      }

      case 'generateJson': {
        const { history, prompt } = payload;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const fullContents = [...history, { role: 'user', parts: [{ text: prompt }] }];
        const result = await model.generateContent({ contents: fullContents });
        return response.status(200).json(result.response);
      }
      
      default:
        return response.status(400).json({ message: `Tipo di richiesta non valido: ${type}` });
    }
  } catch (error: any) {
    // Questo log è FONDAMENTALE. Se ci sono altri errori, li vedrai qui nei log di Vercel.
    console.error('ERRORE GRAVE NELLA FUNZIONE:', error);
    return response.status(500).json({ message: error.message || 'Errore interno del server.' });
  }
}
