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

import React from 'react';
import type { GameState } from '../types';

interface ActionBarProps {
    state: GameState;
    onAction: (actionId: string) => void;
}

export const ActionBar = ({ state, onAction }: ActionBarProps) => {
    const { phase, activeCharacterId, characters } = state;
    const activeChar = characters.find(c => c.id === activeCharacterId);

    if (!activeChar || activeChar.type !== 'player' || state.isAnimating || phase === 'ENEMY_TURN' || phase === 'BATTLE_ENDED' || phase === 'INITIATIVE_ROLL_PLAYER') {
        return (
            <div className="right-column">
                <button disabled title="In attesa..."><i className="fas fa-hourglass-half"></i><span className="action-text">In attesa...</span></button>
            </div>
        );
    }
    
    const hasAction = activeChar.actionsRemaining > 0;
    const canMove = activeChar.remainingMovement > 0;
    const isProne = activeChar.hasCondition('prone');
    const canStandUp = activeChar.remainingMovement >= (activeChar.speedInCells / 2);
    const hasPotion = activeChar.hasItem('Pozione di Guarigione');
    const hasSpells = Array.isArray(activeChar.spells) && activeChar.spells.length > 0;

    const proneOrStandButton = isProne
        ? { id: 'standup', icon: 'arrow-up', text: 'Rialzati', disabled: !canStandUp }
        : { id: 'fallprone', icon: 'person-falling', text: 'Prono', disabled: false };

    const buttonMap = [
        { id: 'move', icon: 'shoe-prints', text: 'Sposta', disabled: !canMove, active: phase === 'AWAITING_MOVE_TARGET' },
        { id: 'attack', icon: 'khanda', text: 'Attacca', disabled: !(hasAction || phase === 'AWAITING_EXTRA_ATTACK'), active: phase === 'AWAITING_ATTACK_TARGET' || phase === 'AWAITING_EXTRA_ATTACK' },
        { id: 'castspell', icon: 'wand-sparkles', text: 'Incantesimo', disabled: !hasAction || !hasSpells, active: phase === 'AWAITING_SPELL_TARGET'},
        { id: 'shove', icon: 'hand-rock', text: 'Spingi', disabled: !hasAction || isProne, active: phase === 'AWAITING_SHOVE_TARGET' },
        { id: 'dash', icon: 'running', text: 'Scatta', disabled: !hasAction || isProne, active: false },
        { id: 'disengage', icon: 'reply', text: 'Disimpegno', disabled: !hasAction || isProne, active: false },
        { id: 'dodge', icon: 'shield-alt', text: 'Schiva', disabled: !hasAction, active: false },
        { ...proneOrStandButton, active: false },
        { id: 'usepotion', icon: 'prescription-bottle', text: 'Bevi Pozione', disabled: !hasAction || !hasPotion, active: false },
        { id: 'endturn', icon: 'hourglass-end', text: 'Termina', disabled: false, active: false },
    ];

    return (
        <div className="right-column">
            {buttonMap.map(btn => (
                 <button key={btn.id} id={`${btn.id}-action-btn`} title={btn.text}
                    onClick={() => onAction(btn.id)}
                    disabled={btn.disabled || false}
                    className={`${btn.active ? 'active-mode' : ''} ${btn.id === 'standup' ? 'stand-up-btn' : ''}`}
                 >
                    <i className={`fas fa-${btn.icon}`}></i>
                    <span className="action-text">{btn.text}</span>
                 </button>
            ))}
        </div>
    );
};
