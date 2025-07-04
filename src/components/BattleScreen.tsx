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

import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';
import type { GameController } from '../controller/GameController';
import { InfoPanel } from './InfoPanel';
import { BattleLog } from './BattleLog';
import { GridCanvas } from './GridCanvas';
import { DiceTray } from './DiceTray';
import { ActionBar } from './ActionBar';

interface BattleScreenProps {
    state: GameState;
    controller: GameController;
}

export const BattleScreen = ({ state, controller }: BattleScreenProps) => {
    const [activeTab, setActiveTab] = useState('info');

    useEffect(() => {
        controller.startAnimationLoop();
        return () => {
            controller.stopAnimationLoop();
        };
    }, [controller]);

    const activeChar = state.characters.find(c => c.id === state.activeCharacterId);

    const handleBattleRoll = (dieType: number, _rolls: number[]) => {
        const { phase, multiDieRoll } = state;
        let numRolls = 1;

        if (phase === 'ROLLING_ATTACK') {
            numRolls = 2; // Always roll 2 for advantage/disadvantage
        } else if ((phase === 'AWAITING_MANUAL_DAMAGE_ROLL' || phase === 'ROLLING_HEAL') && multiDieRoll) {
            numRolls = multiDieRoll.total - multiDieRoll.rolled;
        }
        
        const finalRolls = Array.from({ length: numRolls }, () => Math.floor(Math.random() * dieType) + 1);
        controller.handleDiceRoll(dieType, finalRolls);
    };

    return (
        <div className="battle-screen">
            <div className="left-column">
                <div className="tab-buttons">
                    <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>Info</button>
                    <button className={activeTab === 'log' ? 'active' : ''} onClick={() => setActiveTab('log')}>Log</button>
                </div>
                <div className="tab-content">
                    {activeTab === 'info' && <InfoPanel item={state.inspectedItem} />}
                    {activeTab === 'log' && <BattleLog log={state.log} />}
                </div>
            </div>
            <div className="top-section-wrapper">
                <div className="center-column">
                    <h2 className="turn-display">
                        {state.phase === 'BATTLE_ENDED' ? 'BATTAGLIA TERMINATA' : `Turno di: ${activeChar?.name || '...'}`}
                    </h2>
                    <GridCanvas state={state} gridUtils={controller.gridUtils} onCanvasClick={(pos) => controller.handleCanvasClick(pos)} />
                    <DiceTray 
                        onRoll={handleBattleRoll}
                        phase={state.phase}
                        multiDieRoll={state.multiDieRoll}
                    />
                </div>
                <ActionBar state={state} onAction={(action) => controller.handleAction(action)} />
            </div>
        </div>
    );
};