// src/components/App.tsx (VERSIONE CORRETTA E DEBUGGATA)

import React, { useState, useMemo, useEffect } from 'react';
import { BattleScreen } from './BattleScreen';
import { OutputScreen } from './OutputScreen';
import { NarrativeScreen } from './NarrativeScreen';
import { MainMenuScreen } from './MainMenuScreen';
import { CombatSetupScreen } from './CombatSetupScreen';
import { ErrorToast } from './ErrorToast';
import { initialGameState } from '../types';
import type { GameState, AppPhase, ChatMessage, BattleData, CharacterData, SkillCheckRequest, Skill, History } from '../types';
import { GameController } from '../controller/GameController';
import { JSON_STRUCTURE_GUIDE } from '../docs/JSON_GUIDE';
import { Character } from '../models/Character';
import { SKILLS } from '../types';

const SYSTEM_INSTRUCTION = `Sei un Dungeon Master esperto per un gioco di ruolo testuale chiamato 'D&D Battle Simulator'. Il tuo obiettivo è creare un'esperienza di gioco collaborativa e avvincente in italiano.

Le tue responsabilità principali sono:
1.  **Storytelling Collaborativo**: La tua prima risposta DEVE essere narrativa. Basati sul prompt dell'utente per creare una scena, descrivere l'ambiente e impostare l'atmosfera. I primi scambi di messaggi servono a costruire la storia.
2.  **Creazione del Personaggio**: L'utente potrebbe descrivere un personaggio. Interpreta la sua descrizione per definirne le caratteristiche. Se l'utente è vago (es. "sono un guerriero nano"), riempi tu i dettagli mancanti (statistiche, equipaggiamento, competenze nelle abilità, etc.) in modo creativo e coerente.
3.  **Coerenza Narrativa**: Quando la storia sfocia in un combattimento, i nemici e l'ambiente che generi nel JSON di battaglia DEVONO essere coerenti con la narrazione che hai costruito. Esempi:
    - Se hai descritto dei banditi su un'impalcatura, genera nemici con profilo 'ranged'.
    - Se hai parlato di un artefatto custodito in un passaggio stretto, genera un nemico 'defender' a sua protezione.
4.  **Richiesta di Prove di Abilità**: Durante la narrazione, quando il giocatore tenta un'azione con un esito incerto (es. persuadere una guardia, scalare un muro, borseggiare qualcuno), DEVI richiedere una prova di abilità. Per farlo, termina la tua risposta con un oggetto JSON speciale: \`{"action": "REQUEST_ROLL", "skill": "skill_name"}\`. "skill_name" deve essere una delle abilità valide (es. "persuasione", "atletica", "rapidita_di_mano"). Non aggiungere altro testo dopo questo oggetto.
5.  **Innesco della Battaglia**: Quando la narrazione arriva a un punto di non ritorno e il combattimento è inevitabile, DEVI terminare la tua risposta e, nella riga successiva, generare solo ed esclusivamente l'oggetto JSON speciale: \`{"action": "START_BATTLE"}\`. Non aggiungere altro testo dopo questo oggetto.`;

const PLAYER_JSON_PROMPT = `Basandoti sulla conversazione precedente, genera il JSON solo per il personaggio del giocatore (player_characters).
DEVI seguire rigorosamente lo schema e le regole per un oggetto CharacterData definiti nella guida seguente.
Popola il campo 'skill_proficiencies' con 3-4 abilità appropriate basate sulla classe e sulla descrizione del personaggio.
Rispondi solo ed esclusivamente con l'array JSON grezzo (che contiene un singolo oggetto personaggio), senza alcun testo aggiuntivo, commenti, o blocchi di codice markdown (\`\`\`json).

--- GUIDA ALLO SCHEMA JSON ---
${JSON_STRUCTURE_GUIDE}
--- FINE GUIDA ---`;


const BATTLE_JSON_PROMPT = `Basandoti sulla conversazione precedente, genera il JSON completo per lo scenario di battaglia.
DEVI seguire rigorosamente lo schema e le regole definite nella guida seguente.

--- GUIDA ALLO SCHEMA JSON ---
${JSON_STRUCTURE_GUIDE}
--- FINE GUIDA ---

Rispondi solo ed esclusivamente con l'oggetto JSON grezzo, senza alcun testo aggiuntivo, commenti, o blocchi di codice markdown (\`\`\`json).`;


// +++ FUNZIONE HELPER ROBUSTA PER CHIAMARE LA NOSTRA API +++
async function callApi(type: 'chat' | 'generateJson', payload: any) {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
    });

    // Leggiamo la risposta come testo, SEMPRE.
    const responseText = await response.text();

    if (!response.ok) {
        // Se la risposta non è OK, lanciamo l'errore usando il testo della risposta.
        // Questo ci darà un messaggio di errore chiaro (es. "Internal Server Error").
        throw new Error(responseText || `Errore del server (${response.status})`);
    }

    try {
        // Solo se la risposta è OK, proviamo a fare il parse come JSON.
        return JSON.parse(responseText);
    } catch (e) {
        // Se il parse fallisce anche se la risposta era OK, è un problema serio.
        console.error("Risposta OK dal server ma non è un JSON valido:", responseText);
        throw new Error("Il server ha inviato una risposta in un formato inaspettato.");
    }
}

// +++ NUOVA FUNZIONE HELPER PER ESTRARRE IL TESTO DALLA RISPOSTA DELL'API +++
function getTextFromResponse(response: any): string {
    return response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export const App = () => {
    const [state, setState] = useState<GameState>(initialGameState);
    const [appPhase, setAppPhase] = useState<AppPhase>('MAIN_MENU');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [pendingBattleData, setPendingBattleData] = useState<BattleData | null>(null);
    const [playerCharacter, setPlayerCharacter] = useState<Character | null>(null);
    const [skillCheckRequest, setSkillCheckRequest] = useState<SkillCheckRequest | null>(null);

    const controller = useMemo(() => new GameController(setState), []);

    useEffect(() => {
        const welcomeMessage: ChatMessage = { id: Date.now(), role: 'model', text: 'Benvenuto, avventuriero! Sono il tuo Dungeon Master. Descrivi il tuo personaggio, lo scenario che desideri, o lascia che sia io a creare un\'avventura per te. Preferisci una storia ricca di dialoghi, un\'esplorazione misteriosa o azione immediata?' };
        setMessages([welcomeMessage]);
    }, []);

    useEffect(() => {
        if (state.phase === 'BATTLE_ENDED' && appPhase === 'BATTLE') {
            setAppPhase('BATTLE_ENDED');
        }
    }, [state.phase, appPhase]);
    
    const handleStartBattle = (data: BattleData) => {
        controller.loadBattle(data);
        setAppPhase('BATTLE');
    };
    
    const createPlayerCharacter = async (userMessage: ChatMessage) => {
        try {
            const history = messages
                .slice(0, 1)
                .concat(userMessage)
                .map(m => ({
                    role: m.role as 'user' | 'model',
                    parts: [{ text: m.text }]
                }));

            const response = await callApi('generateJson', { history, prompt: PLAYER_JSON_PROMPT });
            let jsonStr = getTextFromResponse(response);
            
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) jsonStr = match[2].trim();

            const playerDataArray: CharacterData[] = JSON.parse(jsonStr);
            if(playerDataArray && playerDataArray.length > 0) {
                playerDataArray[0].type = 'player';
                const character = new Character(playerDataArray[0]);
                setPlayerCharacter(character);
            }
        } catch(e) {
            console.error("Failed to parse or fetch Player Character JSON:", e);
            const errorText = e instanceof Error ? e.message : "Si è verificato un errore nella creazione del personaggio.";
            setApiError(errorText);
        }
    };

    const prepareBattle = async () => {
        setIsLoading(true);
        const preparingMessage: ChatMessage = {id: Date.now(), role: 'model', text: 'Il Dungeon Master sta preparando il campo di battaglia...'};
        setMessages(prev => [...prev, preparingMessage]);
    
        let jsonStr = '';
        try {
            const history = messages
                .filter(m => (m.role === 'user' || m.role === 'model'))
                .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            
            const response = await callApi('generateJson', { history, prompt: BATTLE_JSON_PROMPT });
            jsonStr = getTextFromResponse(response);

            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) jsonStr = match[2].trim();
    
            const battleData = JSON.parse(jsonStr);

            if (playerCharacter) {
                const pcIndex = battleData.player_characters.findIndex((p: CharacterData) => p.id === playerCharacter.id);
                const updatedPCData = JSON.parse(JSON.stringify(playerCharacter));
                if (pcIndex !== -1) {
                    battleData.player_characters[pcIndex] = updatedPCData;
                } else {
                    battleData.player_characters.unshift(updatedPCData);
                }
            }
            setPendingBattleData(battleData);
        } catch(e) {
            console.error("Failed to parse or fetch battle JSON:", e, "Received:", jsonStr);
            const errorText = e instanceof Error ? e.message : 'C\'è stato un errore nella generazione dello scenario.';
            setApiError(errorText);
        } finally {
            setMessages(prev => prev.filter(m => m.id !== preparingMessage.id));
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (text: string) => {
        if (isLoading) return;
    
        const isFirstUserMessage = messages.length === 1;
        setIsLoading(true);

        const userMessage: ChatMessage = { id: Date.now(), role: 'user', text };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        
        try {
            const historyForApi: History[] = updatedMessages
                .filter(m => m.role === 'user' || m.role === 'model')
                .map(m => ({ role: m.role, parts: [{ text: m.text }]}));

            const response = await callApi('chat', {
                history: historyForApi,
                // Non serve più 'newMessage' perché è già nello storico
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const fullResponse = getTextFromResponse(response);
            const modelResponseMessage: ChatMessage = { id: Date.now() + 1, role: 'model', text: fullResponse };
            
            setMessages(prev => [...prev, modelResponseMessage]);

            if (isFirstUserMessage) {
                await createPlayerCharacter(userMessage);
            }
            
            let actionProcessed = false;
            try {
                const jsonActionRegex = /(\{[\s\S]*?"action":\s*"(?:START_BATTLE|REQUEST_ROLL)"[\s\S]*?\})/;
                const match = fullResponse.match(jsonActionRegex);
                
                if (match && match[1] && match.index !== undefined) {
                    const jsonPayload = JSON.parse(match[1]);
                    const textWithoutAction = fullResponse.substring(0, match.index).trim();
    
                    if (jsonPayload.action === 'REQUEST_ROLL' && jsonPayload.skill && SKILLS.includes(jsonPayload.skill)) {
                        setSkillCheckRequest({ skill: jsonPayload.skill as Skill });
                        setMessages(prev => {
                            const updated = [...prev];
                            updated[updated.length - 1].text = textWithoutAction + `\n\n*(Tira un D20 per una prova di ${jsonPayload.skill.replace(/_/g, ' ')}.)*`;
                            return updated;
                        });
                        actionProcessed = true;
                    } else if (jsonPayload.action === 'START_BATTLE') {
                        setMessages(prev => {
                            const updated = [...prev];
                            updated[updated.length - 1].text = textWithoutAction;
                            return updated;
                        });
                        await prepareBattle();
                        actionProcessed = true;
                    }
                }
            } catch (e) {
                console.warn("Could not parse potential action JSON.", e);
            }
            
        } catch (e) {
            console.error("Errore in handleSendMessage:", e);
            const errorText = e instanceof Error ? e.message : 'Si è verificato un errore sconosciuto.';
            setApiError(errorText);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNarrativeRoll = async (_dieType: number, rolls: number[]) => {
        if (!skillCheckRequest || !playerCharacter || isLoading) return;
    
        const roll = rolls[0];
        const modifier = playerCharacter.getSkillModifier(skillCheckRequest.skill);
        const total = roll + modifier;
        const skillName = skillCheckRequest.skill.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
        const rollMessage: ChatMessage = { id: Date.now(), role: 'roll', text: `Prova di ${skillName}: ${total} (Dado: ${roll}, Mod: ${modifier >= 0 ? '+' : ''}${modifier})` };
        
        setSkillCheckRequest(null);
        setIsLoading(true);
        const updatedMessages = [...messages, rollMessage];
        setMessages(updatedMessages);
    
        const resultTextForAI = `Il risultato della prova di ${skillName} è ${total}.`;
        
        try {
            const historyForApi: History[] = updatedMessages
                .filter(m => m.role === 'user' || m.role === 'model' || m.role === 'roll')
                .map(m => ({ role: m.role, parts: [{ text: m.text }]}));

            const response = await callApi('chat', {
                history: historyForApi,
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const fullResponse = getTextFromResponse(response);
            const modelResponseMessage: ChatMessage = { id: Date.now() + 1, role: 'model', text: fullResponse };
            setMessages(prev => [...prev, modelResponseMessage]);
            
        } catch (e) {
             console.error(e);
             const errorText = e instanceof Error ? e.message : 'Errore nel processare il risultato del tiro.';
             setApiError(errorText);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueNarrative = async (report: string) => {
        const finalPlayerCharacter = controller.state.characters.find(c => c.type === 'player');
        if (finalPlayerCharacter) setPlayerCharacter(finalPlayerCharacter.clone());
    
        controller.restartGame();
        setAppPhase('NARRATIVE');
        setIsLoading(true);
        
        const reportMessageForAI = `Il combattimento è terminato. Ecco il resoconto: ${report}. Continua la narrazione.`;
        
        try {
            const historyForApi: History[] = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            
            const response = await callApi('chat', {
                history: historyForApi,
                newMessage: reportMessageForAI,
                systemInstruction: SYSTEM_INSTRUCTION
            });
            
            const fullResponse = getTextFromResponse(response);
            const modelResponseMessage: ChatMessage = { id: Date.now(), role: 'model', text: fullResponse };
            setMessages(prev => [...prev, modelResponseMessage]);

        } catch (e) {
            console.error(e);
            const errorText = e instanceof Error ? e.message : 'Errore nella continuazione della narrativa.';
            setApiError(errorText);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerStartBattle = () => {
        if (pendingBattleData) {
            handleStartBattle(pendingBattleData);
            setPendingBattleData(null);
        }
    };

    const renderScreen = () => {
        switch(appPhase) {
            case 'MAIN_MENU':
                return <MainMenuScreen onSelectPhase={setAppPhase} />;
            case 'COMBAT_SETUP':
                return <CombatSetupScreen onStartBattle={handleStartBattle} />;
            case 'NARRATIVE':
                return <NarrativeScreen 
                            messages={messages} 
                            onSend={handleSendMessage} 
                            isLoading={isLoading} 
                            onStartBattle={pendingBattleData ? triggerStartBattle : undefined} 
                            playerCharacter={playerCharacter}
                            skillCheckRequest={skillCheckRequest}
                            onNarrativeRoll={handleNarrativeRoll}
                        />;
            case 'BATTLE':
                 return <BattleScreen state={state} controller={controller} />;
            case 'BATTLE_ENDED':
                return <OutputScreen state={state} onContinue={handleContinueNarrative} />;
            default:
                return <div>Caricamento...</div>
        }
    };

    return (
        <div className="app-container">
            {apiError && <ErrorToast message={apiError} onClose={() => setApiError(null)} />}
            {renderScreen()}
        </div>
    );
};
