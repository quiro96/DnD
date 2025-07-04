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

import React, { useMemo } from 'react';
import type { GameState } from '../types';

interface OutputScreenProps {
    state: GameState;
    onContinue: (report: string) => void;
}

export const OutputScreen = ({ state, onContinue }: OutputScreenProps) => {
    const outcome = useMemo(() => {
        const playersAlive = state.characters.some(c => c.type === 'player' && c.isAlive());
        const enemiesAlive = state.characters.some(c => c.type === 'enemy' && c.isAlive());
        if (!playersAlive) return 'Sconfitta';
        if (!enemiesAlive) return 'Vittoria';
        return 'Stallo';
    }, [state.characters]);

    const report = useMemo(() => {
        const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : '';
        
        return JSON.stringify({
            battle_id: state.battleData?.battle_id,
            outcome,
            duration_rounds: state.roundCount,
            final_status: state.characters.map(char => ({
                id: char.id, name: char.name, hp_remaining: char.hp_current,
                status: char.isAlive() ? "conscious" : "defeated",
                final_position: [char.x, char.y]
            })),
            battle_log: state.log.map(entry => ({
                type: entry.type,
                text: stripHtml(entry.text)
            }))
        }, null, 2)
    }, [state, outcome]);

    return (
        <div className="screen-overlay active">
            <div className="modal-content">
                <h1 id="outcome-title">{outcome}</h1>
                <h2 id="outcome-subtitle">Resoconto Finale</h2>
                <textarea id="battle-output-json" value={report} readOnly />
                <button onClick={() => navigator.clipboard.writeText(report)}><i className="fas fa-copy"></i> Copia Resoconto</button>
                <button onClick={() => onContinue(report)} style={{marginTop: '10px'}}><i className="fas fa-pen-fancy"></i> Continua la Narrazione</button>
            </div>
        </div>
    );
};