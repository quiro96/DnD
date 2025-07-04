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
import { getModifier } from '../utils';
import { sleep } from '../utils';
import { AI_ACTION_DELAY_MS } from '../constants';

/**
 * Gestisce l'ordine dei turni, l'iniziativa e l'avanzamento dei round.
 */
export class TurnManager {
    private gc: GameController;

    constructor(controller: GameController) {
        this.gc = controller;
    }

    public resolveInitiative = (playerRoll: number) => {
        this.gc.setState(draft => {
            const playerChar = this.gc.getActiveCharacter(draft);
            if (!playerChar) return;

            this.gc.addLog(draft, `<b>${playerChar.name}</b> tira per l'iniziativa...`, 'info');

            const charactersWithInitiative = draft.characters.map(char => {
                const roll = char.type === 'player' ? playerRoll : Math.floor(Math.random() * 20) + 1;
                const initiative = roll + getModifier(char.stats.dexterity);
                this.gc.addLog(draft, `${char.name} tira iniziativa: ${roll} + ${getModifier(char.stats.dexterity)} = <b>${initiative}</b>`);
                
                const newChar = char.clone();
                newChar.initiative = initiative;
                return newChar;
            });
            
            charactersWithInitiative.sort((a, b) => {
                if (b.initiative !== a.initiative) return b.initiative - a.initiative;
                return getModifier(b.stats.dexterity) - getModifier(a.stats.dexterity);
            });

            draft.characters = charactersWithInitiative;
            draft.turnOrder = charactersWithInitiative.map(c => c.id);
            const orderLog = charactersWithInitiative.map(c => c.name).join(' → ');
            this.gc.addLog(draft, `Ordine di iniziativa: ${orderLog}`, 'info');

            draft.currentTurnIndex = -1;
            draft.roundCount = 0;
            draft.phase = 'INITIATIVE_RESOLVED';
        });

        this.gc.startNextTurn();
    };

    private applyHazardousTerrainDamage = async (character: Character): Promise<boolean> => {
        const effects = this.gc.gridUtils.getEffectsAtCell(character.x, character.y);
        const hazard = effects.find(e => e.type === 'hazardous_area' && e.rules?.damage_dice);
        if (!hazard) return true;

        let wasDamaged = false;
        let isAlive = true;

        this.gc.setState(draft => {
            const char = this.gc.getCharacter(character.id, draft);
            if (!char || !char.isAlive()) return;
            
            const damageType = hazard.rules.damage_type;
            if (char.defenses?.immunities?.damage_types?.includes(damageType)) {
                 this.gc.addLog(draft, `<b>${char.name}</b> è immune a ${damageType} e non subisce danni dal terreno!`, 'info');
                 return;
            }

            this.gc.addLog(draft, `<b>${char.name}</b> si trova in un'area pericolosa!`, 'info');
            this.gc.addLog(draft, `Lancia ${hazard.rules.damage_dice} per i danni da terreno.`);

            const [numDice, dieType] = hazard.rules.damage_dice.split('d').map(Number);
            const damageRolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieType) + 1);
            const totalDamage = damageRolls.reduce((sum, r) => sum + r, 0);
            
            const { actualDamage, logType } = char.takeDamage(totalDamage, damageType);
            
            if (actualDamage > 0) {
                wasDamaged = true;
                this.gc.addFloatingText(draft, `-${actualDamage}`, {x: char.x, y: char.y}, 'damage');
                this.gc.addLog(draft, `Subisce <b>${actualDamage}</b> danni da terreno. (${damageRolls.join(' + ')})`, logType);
            }

            isAlive = char.isAlive();
            if (!isAlive) {
                this.gc.addLog(draft, `<b>${char.name}</b> è stato sconfitto dal terreno!`, 'error');
            }
        });
        
        if (wasDamaged) {
            await sleep(AI_ACTION_DELAY_MS);
        }

        return isAlive;
    }

    public startNextTurn = async (): Promise<boolean> => {
        await sleep(0);
        
        this.gc.setState(draft => {
            if (this.checkEndBattle(draft)) return;
            
            let nextTurnIndex = (draft.currentTurnIndex + 1) % draft.turnOrder.length;
            const startIndex = nextTurnIndex;

            while (true) {
                const nextCharId = draft.turnOrder[nextTurnIndex];
                const nextChar = this.gc.getCharacter(nextCharId, draft);
                if (nextChar && nextChar.isAlive()) break;

                nextTurnIndex = (nextTurnIndex + 1) % draft.turnOrder.length;
                if (nextTurnIndex === startIndex) { 
                    draft.phase = 'BATTLE_ENDED';
                    return;
                }
            }
            
            if (nextTurnIndex <= draft.currentTurnIndex || draft.currentTurnIndex === -1) {
                draft.roundCount++;
                this.gc.addLog(draft, `--- Inizio Round ${draft.roundCount} ---`, 'turn-start');
            }
            
            const activeCharId = draft.turnOrder[nextTurnIndex];

            // Rimuove gli effetti temporanei causati dal personaggio che sta per iniziare il turno
            draft.characters.forEach(char => {
                char.removeTemporaryEffectsFromCaster(activeCharId);
            });

            draft.currentTurnIndex = nextTurnIndex;
            draft.activeCharacterId = activeCharId;

            const activeChar = this.gc.getCharacter(activeCharId, draft);
            if(activeChar) {
                activeChar.resetForNewTurn();
                this.gc.updateTerrainConditions(draft, activeChar.id);
                this.gc.addLog(draft, `È il turno di <b>${activeChar.name}</b>.`, 'turn-start');
                
                draft.phase = 'IDLE'; // Fase temporanea
                draft.inspectedCell = { x: activeChar.x, y: activeChar.y };
                draft.inspectedItem = activeChar.clone();
                draft.attacksMadeThisTurn = 0;
                draft.highlightedCells = [];
            }
        });
        
        const activeChar = this.gc.getActiveCharacter();
        if (!activeChar || this.gc.state.phase === 'BATTLE_ENDED') {
            return false;
        }

        const isStillAlive = await this.applyHazardousTerrainDamage(activeChar);

        if (!isStillAlive) {
            let battleHasEnded = false;
            this.gc.setState(draft => {
                // This call is now safe, as it operates on the draft
                if (this.checkEndBattle(draft)) {
                    battleHasEnded = true;
                }
            });
    
            if (battleHasEnded) {
                return false; // La battaglia è finita, non continuare
            } else {
                return this.startNextTurn(); // Ricomincia per il prossimo personaggio
            }
        }
        
        const isEnemyTurn = activeChar.type === 'enemy';
        this.gc.setState(draft => {
            draft.phase = isEnemyTurn ? 'ENEMY_TURN' : 'IDLE';
        });
        
        return isEnemyTurn;
    };
    
    public checkEndBattle(draft: GameState): boolean {
        if (draft.phase === 'BATTLE_ENDED') return true;
        
        const livingPlayers = draft.characters.some(c => c.type === 'player' && c.isAlive());
        const livingEnemies = draft.characters.some(c => c.type === 'enemy' && c.isAlive());

        if (!livingPlayers || !livingEnemies) {
            draft.phase = 'BATTLE_ENDED';
            return true;
        }
        return false;
    }
}