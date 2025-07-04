// api/gemini.ts (NUOVO FILE DA CREARE)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/genai';

// Questa funzione viene eseguita SUL SERVER di Vercel, non nel browser.
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Accettiamo solo richieste di tipo POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. Leggiamo la chiave API in modo sicuro dalle variabili d'ambiente del SERVER
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La variabile d'ambiente GEMINI_API_KEY non è impostata.");
    }
    
    // 2. Prendiamo il prompt inviato dal frontend
    const { prompt } = request.body;
    if (!prompt) {
      return response.status(400).json({ message: 'Prompt mancante nel corpo della richiesta.' });
    }
    
    // 3. Usiamo la libreria @google/genai qui, nel backend!
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // o il modello che preferisci
    
    // 4. Facciamo la chiamata a Gemini dal server
    const result = await model.generateContent(prompt);
    const geminiResponse = result.response;

    // 5. Inviamo la risposta di Gemini (e solo quella) al frontend
    response.status(200).json(geminiResponse);

  } catch (error) {
    // Gestione degli errori
    console.error('Errore nella serverless function:', error);
    response.status(500).json({ message: 'Errore interno del server.' });
  }
}