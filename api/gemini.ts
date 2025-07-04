// api/gemini.ts (NUOVO FILE DA CREARE)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// Questa è la nostra unica API sicura.
// Distinguiamo le azioni tramite `request.body.type`.
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY non trovata.");
    return response.status(500).json({ message: "Configurazione del server incompleta." });
  }

  const genAI = new GoogleGenAI(apiKey);
  
  // Impostazioni di sicurezza per Gemini
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  try {
    const { type, payload } = request.body;

    // Usiamo uno switch per gestire i diversi tipi di chiamata
    switch (type) {
      // Caso per la chat narrativa
      case 'chat': {
        const { history, newMessage } = payload;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: payload.systemInstruction, safetySettings });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(newMessage);
        return response.status(200).json(result.response);
      }

      // Caso per generare JSON (personaggio o battaglia)
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
    console.error('Errore nella Serverless Function:', error);
    return response.status(500).json({ message: error.message || 'Errore interno del server.' });
  }
}
