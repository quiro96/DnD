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

interface DiceTrayProps {
    onRoll: (dieType: number, rolls: number[]) => void;
    phase?: GameState['phase']; 
    multiDieRoll?: GameState['multiDieRoll'];
    skillCheckActive?: boolean; 
}

export const DiceTray = ({ onRoll, phase, multiDieRoll, skillCheckActive }: DiceTrayProps) => {
    const getActiveDie = () => {
        if (skillCheckActive) return 20;
        if (phase === 'INITIATIVE_ROLL_PLAYER' || phase === 'ROLLING_ATTACK' || phase === 'AWAITING_SAVING_THROW') return 20;
        if (phase === 'ROLLING_HEAL') return 4;
        if (phase === 'AWAITING_MANUAL_DAMAGE_ROLL') return multiDieRoll?.dieType;
        return null;
    }
    
    const activeDie = getActiveDie();

    const handleRoll = (dieType: number) => {
        if (dieType !== activeDie) return;
        // The onRoll callback is now responsible for determining the number of rolls.
        // This component just reports a single, fresh roll.
        const rolls = [Math.floor(Math.random() * dieType) + 1];
        onRoll(dieType, rolls);
    }
    
    return (
        <div className="dice-tray">
            {[4, 6, 8, 10, 12, 20, 100].map(d => (
                <button key={d} id={`d${d}-btn`} disabled={d !== activeDie} 
                        className={d === activeDie ? 'active-die' : ''}
                        onClick={() => handleRoll(d)}>
                    D{d}
                </button>
            ))}
        </div>
    );
};