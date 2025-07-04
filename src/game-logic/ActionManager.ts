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

import type { GameController } from '../controller/GameController';
import type { GameState } from '../types';
import type { Character } from '../models/Character';

/**
 * Gestisce le azioni dei personaggi che non sono direttamente movimento o attacco.
 */
export class ActionManager {
    private gc: GameController;

    constructor(controller: GameController) {
        this.gc = controller;
    }

    public handleAction = async (actionId: string) => {
        const activeChar = this.gc.getActiveCharacter();
        if (!activeChar || this.gc.state.isAnimating) return;

        const targetingActions: Record<string, GameState['phase']> = {
            move: 'AWAITING_MOVE_TARGET',
            attack: 'AWAITING_ATTACK_TARGET',
            shove: 'AWAITING_SHOVE_TARGET',
            castspell: 'AWAITING_SPELL_TARGET',
        };

        if (actionId in targetingActions) {
            this.gc.setState(draft => {
                const targetPhase = targetingActions[actionId];
                if (draft.phase === targetPhase) {
                    draft.phase = 'IDLE';
                    draft.highlightedCells = [];
                } else {
                    draft.phase = targetPhase;
                    if (actionId === 'move') {
                        // Delega il calcolo al MovementManager
                        const movementManager = (this.gc as any).movementManager;
                        draft.highlightedCells = movementManager.calculateReachableCells(activeChar);
                    } else {
                        draft.highlightedCells = [];
                    }
                }
            });
            return;
        }
        
        switch (actionId) {
            case 'endturn':
                this.gc.startNextTurn();
                return;
            case 'dash': this.performDash(activeChar); break;
            case 'disengage': this.performDisengage(activeChar); break;
            case 'dodge': this.performDodge(activeChar); break;
            case 'standup': this.performStandUp(activeChar); break;
            case 'fallprone': this.performFallProne(activeChar); break;
            case 'usepotion':
                this.usePotion(activeChar);
                return;
        }

        // Se l'azione non richiede un bersaglio, torna a IDLE
        if (!(actionId in targetingActions)) {
            this.gc.setState(draft => {
                draft.phase = 'IDLE';
                draft.highlightedCells = [];
            });
        }
    };
    
    public performDash(character: Character) {
        if (character.actionsRemaining > 0) {
            this.gc.setState(draft => {
                const char = this.gc.getCharacter(character.id, draft);
                if(char) {
                   char.actionsRemaining -= 1;
                   char.remainingMovement += char.speedInCells;
                   this.gc.addLog(draft, `<b>${char.name}</b> scatta, raddoppiando il movimento.`);
                }
            });
        }
    }

    public performDisengage(character: Character) {
        if (character.actionsRemaining > 0) {
           this.gc.setState(draft => {
               const char = this.gc.getCharacter(character.id, draft);
               if(char){
                   char.actionsRemaining -= 1;
                   char.isDisengaging = true;
                   this.gc.addLog(draft, `<b>${char.name}</b> si disimpegna.`);
               }
           });
       }
    }

    public performDodge(character: Character) {
        if (character.actionsRemaining > 0) {
            this.gc.setState(draft => {
               const char = this.gc.getCharacter(character.id, draft);
               if(char) {
                   char.actionsRemaining -= 1;
                   char.isDodging = true;
                   this.gc.addLog(draft, `<b>${char.name}</b> schiva.`);
               }
           });
        }
    }

    public performStandUp(character: Character) {
        const cost = character.speedInCells / 2;
        if (character.remainingMovement >= cost) {
            this.gc.setState(draft => {
                const char = this.gc.getCharacter(character.id, draft);
                if(char) {
                    char.removeCondition('prone');
                    char.remainingMovement -= cost;
                    this.gc.addLog(draft, `<b>${char.name}</b> si rialza.`);
                }
            });
        } else {
            this.gc.setState(draft => this.gc.addLog(draft, `<b>${character.name}</b> non ha abbastanza movimento per rialzarsi.`, 'error'));
        }
    }

    public performFallProne(character: Character) {
        // Cadere prono non costa movimento né azione.
        this.gc.setState(draft => {
            const char = this.gc.getCharacter(character.id, draft);
            if(char) {
               char.addCondition('prone');
               this.gc.addLog(draft, `<b>${char.name}</b> si butta a terra (prono).`, 'info');
            }
        });
    }

    private usePotion(character: Character) {
        if (character.actionsRemaining > 0 && character.hasItem('Pozione di Guarigione')) {
             this.gc.setState(draft => {
                const char = this.gc.getCharacter(character.id, draft);
                if(char && char.removeItem('Pozione di Guarigione')) {
                    char.actionsRemaining -= 1;
                    draft.phase = 'ROLLING_HEAL';
                    draft.multiDieRoll = { total: 2, dieType: 4, rolled: 0, results: [] };
                    this.gc.addLog(draft, `<b>${char.name}</b> beve una pozione. Lancia 2d4+2.`);
                }
            });
        }
    }
}