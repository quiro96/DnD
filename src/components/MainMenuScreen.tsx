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
import type { AppPhase } from '../types';

interface MainMenuScreenProps {
    onSelectPhase: (phase: AppPhase) => void;
}

export const MainMenuScreen = ({ onSelectPhase }: MainMenuScreenProps) => {
    return (
        <div className="main-menu-screen">
            <h1>D&amp;D Battle Simulator</h1>
            <button onClick={() => onSelectPhase('NARRATIVE')}>
                <i className="fas fa-book-open"></i> Inizia avventura
            </button>
            <button onClick={() => onSelectPhase('COMBAT_SETUP')}>
                <i className="fas fa-swords"></i> Simula combattimento
            </button>
        </div>
    );
};