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

import React, { useState } from 'react';
import type { BattleData } from '../types';
import { 
    TEST_BRUTE_JSON, 
    TEST_ARCHER_JSON, 
    TEST_DEFENDER_JSON, 
    TEST_STILL_JSON,
    COMPLEX_SCENARIO_1_JSON,
    COMPLEX_SCENARIO_2_JSON,
    COMPLEX_SCENARIO_3_JSON,
    COMPLEX_SCENARIO_4_JSON
} from '../scenarios';

interface CombatSetupScreenProps {
    onStartBattle: (data: BattleData) => void;
}

export const CombatSetupScreen = ({ onStartBattle }: CombatSetupScreenProps) => {
    const [jsonText, setJsonText] = useState('');

    const handleStartFromJson = () => {
        if (!jsonText.trim()) {
            alert('Per favore, carica o incolla uno scenario JSON prima di avviare.');
            return;
        }
        try {
            const data = JSON.parse(jsonText);
            onStartBattle(data);
        } catch (error) {
            console.error('Errore nel parsing del JSON:', error);
            alert('Il testo inserito non è un JSON valido.');
        }
    };
    
    const handlePresetClick = (presetJson: string) => {
        if (!presetJson) return; // For disabled buttons
        try {
            // Parse and then stringify with indentation for readability
            const formattedJson = JSON.stringify(JSON.parse(presetJson), null, 2);
            setJsonText(formattedJson);
        } catch (error) {
            console.error('Errore nel parsing del JSON predefinito:', error);
            setJsonText('// Si è verificato un errore nel caricamento di questo scenario.');
        }
    };
    
    const presets = [
        { label: "TEST FERMO", json: TEST_STILL_JSON },
        { label: "TEST BRUTO", json: TEST_BRUTE_JSON },
        { label: "TEST DIFENSORE", json: TEST_DEFENDER_JSON },
        { label: "TEST ARCIERE", json: TEST_ARCHER_JSON },
        { label: "VUOTO", json: "", disabled: true },
        { label: "VICOLO", json: COMPLEX_SCENARIO_1_JSON },
        { label: "FOGNE", json: COMPLEX_SCENARIO_2_JSON },
        { label: "FORGIA", json: COMPLEX_SCENARIO_3_JSON },
        { label: "TUNDRA", json: COMPLEX_SCENARIO_4_JSON },
        { label: "VUOTO", json: "", disabled: true },
    ];

    return (
        <div className="combat-setup-screen">
            <div className="json-input-container">
                <textarea
                    placeholder="Incolla qui il JSON dello scenario o carica uno scenario di test."
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    aria-label="JSON Scenario Input"
                />
            </div>
            
            <button onClick={handleStartFromJson} className="load-battle-button">
                <i className="fas fa-clone"></i> CARICA BATTAGLIA
            </button>
            
            <div className="preset-buttons-grid">
                {presets.map((preset, index) => (
                    <button 
                        key={`${preset.label}-${index}`} 
                        onClick={() => handlePresetClick(preset.json)}
                        disabled={preset.disabled}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="scenario-generator-container">
                <button 
                    disabled 
                    title="Prossimamente: un editor visuale per creare e modificare scenari di battaglia."
                >
                    Generatore di scenario
                </button>
            </div>
        </div>
    );
};