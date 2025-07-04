/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, SkillCheckRequest } from '../types';
import type { Character } from '../models/Character';
import { InfoPanel } from './InfoPanel';
import { DiceTray } from './DiceTray';

interface NarrativeScreenProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    isLoading: boolean;
    onStartBattle?: () => void;
    playerCharacter: Character | null;
    skillCheckRequest: SkillCheckRequest | null;
    onNarrativeRoll: (dieType: number, rolls: number[]) => void;
}

export const NarrativeScreen = ({ messages, onSend, isLoading, onStartBattle, playerCharacter, skillCheckRequest, onNarrativeRoll }: NarrativeScreenProps) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, onStartBattle]);

    const handleSend = () => {
        if (inputText.trim() && !isLoading) {
            onSend(inputText);
            setInputText('');
        }
    };
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const handleCopyStory = () => {
        if (!messages || messages.length === 0) return;

        const storyText = messages
            .filter(msg => msg.role === 'user' || msg.role === 'model')
            .map(msg => {
                const prefix = msg.role === 'model' ? 'DM' : (playerCharacter?.name || 'Tu');
                // Clean up the text a bit, removing the roll prompt for better story flow.
                const cleanText = msg.text.replace(/\n\n\*\((.*?)\)\*/, '').trim();
                return `${prefix}: "${cleanText}"`;
            })
            .join('\n\n');

        navigator.clipboard.writeText(storyText).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="narrative-layout">
            <div className="narrative-info-panel">
                {playerCharacter ? (
                     <div className="tab-panel active">
                         <InfoPanel item={playerCharacter} />
                     </div>
                ) : (
                    <div className="info-panel-placeholder">
                        <h2>Crea il tuo Eroe</h2>
                        <p>Descrivi il tuo personaggio nella chat per iniziare l'avventura. Il Dungeon Master darà vita alla tua creazione qui.</p>
                    </div>
                )}
            </div>
            <div className="narrative-screen">
                <h1 className="hidden">D&amp;D Narratore IA</h1>
                <div className="message-list">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                            {msg.text.split('\n').map((line, index) => <p key={index}>{line || '\u00A0'}</p>)}
                        </div>
                    ))}
                    {isLoading && (!messages.length || messages[messages.length-1]?.role !== 'model') && (
                         <div className="message model">
                            <div className="loading-indicator">
                               <div className="spinner"></div>
                               <span>Il DM sta pensando...</span>
                            </div>
                        </div>
                    )}
                    {onStartBattle && (
                        <div className="start-battle-container">
                            <button onClick={onStartBattle} className="start-battle-btn">
                                <i className="fas fa-khanda"></i> Inizia la Battaglia
                            </button>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-area">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Cosa fai?"
                        rows={1}
                        disabled={isLoading || !!onStartBattle || !!skillCheckRequest}
                        aria-label="Chat input"
                    />
                    <button onClick={handleCopyStory} disabled={isLoading || messages.length < 2} aria-label="Copy story" title="Copia la storia">
                        <i className="fas fa-copy"></i>
                    </button>
                    <button onClick={handleSend} disabled={isLoading || !inputText.trim() || !!onStartBattle || !!skillCheckRequest} aria-label="Send message">
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
             <div className="narrative-dice-panel">
                <DiceTray 
                    onRoll={onNarrativeRoll}
                    skillCheckActive={!!skillCheckRequest}
                />
            </div>
        </div>
    );
};