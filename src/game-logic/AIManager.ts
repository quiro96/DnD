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
import type { Character } from '../models/Character';
import type { CombatManager } from './CombatManager';
import type { MovementManager } from './MovementManager';
import type { ActionManager } from './ActionManager';
import { sleep } from '../utils';
import { AI_ACTION_DELAY_MS } from '../constants';
import type { Position } from '../types';

/**
 * Gestisce l'intelligenza artificiale dei personaggi non giocanti (NPC).
 */
export class AIManager {
    private gc: GameController;
    private combatManager!: CombatManager;
    private movementManager!: MovementManager;
    private actionManager!: ActionManager;


    constructor(controller: GameController) {
        this.gc = controller;
    }

    // Inietta le dipendenze degli altri manager dopo l'inizializzazione
    public registerManagers(managers: { combatManager: CombatManager; movementManager: MovementManager; actionManager: ActionManager; }) {
        this.combatManager = managers.combatManager;
        this.movementManager = managers.movementManager;
        this.actionManager = managers.actionManager;
    }

    private async _waitForAnimation() {
        while(this.gc.state.isAnimating) {
            await sleep(100);
        }
    }

    public handleEnemyTurn = async () => {
        await sleep(AI_ACTION_DELAY_MS);
        
        const enemy = this.gc.getActiveCharacter();
        if (!enemy || !enemy.isAlive()) {
            await this.gc.startNextTurn();
            return;
        }

        // Prima azione per un NPC prono: rialzarsi, con una % di fallimento.
        if (enemy.hasCondition('prone') && enemy.ai_profile !== 'still') {
            if (Math.random() > 0.15) { // 85% di probabilità di rialzarsi
                const cost = enemy.speedInCells / 2;
                if (enemy.remainingMovement >= cost) {
                    this.actionManager.performStandUp(enemy);
                    await sleep(AI_ACTION_DELAY_MS / 2);
                }
            } else {
                 this.gc.setState(draft => this.gc.addLog(draft, `<b>${enemy.name}</b> rimane prono per sfruttare la copertura.`, 'info'));
                 await sleep(AI_ACTION_DELAY_MS / 2);
            }
        }

        const players = this.gc.state.characters.filter(c => c.type === 'player' && c.isAlive());
        if (players.length === 0) {
            this.gc.setState(draft => { draft.phase = 'BATTLE_ENDED' });
            return;
        }

        // Scegli il bersaglio più vicino
        const target = players.sort((a, b) => enemy.getDistance(a.x, a.y) - enemy.getDistance(b.x, b.y))[0];

        switch (enemy.ai_profile) {
            case 'brute': await this.aiBrute(enemy, target); break;
            case 'ranged': await this.aiRanged(enemy, target); break;
            case 'defender': await this.aiDefender(enemy, target); break;
            case 'still':
            default:
                 this.gc.setState(draft => this.gc.addLog(draft, `<b>${enemy.name}</b> non fa nulla.`));
                 await sleep(AI_ACTION_DELAY_MS / 2);
                break;
        }

        await sleep(AI_ACTION_DELAY_MS / 2);
        await this.gc.startNextTurn();
    };
    
    // --- Comportamenti Specifici IA ---

    private aiBrute = async (enemy: Character, target: Character) => {
        let currentEnemy = this.gc.getCharacter(enemy.id)!;
        let currentTarget = this.gc.getCharacter(target.id)!;
        const weaponRange = currentEnemy.weapon.range || 1;
    
        // 1. Move if not in range and has movement
        if (currentEnemy.getDistance(currentTarget.x, currentTarget.y) > weaponRange && currentEnemy.remainingMovement > 0) {
            const targetCell = this.gc.gridUtils.findClosestEmptyAdjacentCell(currentTarget, currentEnemy);
            if (targetCell) {
                const pathData = this.gc.gridUtils.findPath(currentEnemy.x, currentEnemy.y, targetCell.x, targetCell.y, currentEnemy);
    
                if (pathData && pathData.path.length > 1) {
                    // Find how far along the path the character can move
                    let reachablePath = [pathData.path[0]];
                    let costSoFar = 0;
                    for (let i = 1; i < pathData.path.length; i++) {
                        const prev = pathData.path[i-1];
                        const curr = pathData.path[i];
                        const isDiagonal = prev.x !== curr.x && prev.y !== curr.y;
                        const stepCost = this.gc.gridUtils.getMovementCost(curr.x, curr.y, isDiagonal, currentEnemy);
                        if (costSoFar + stepCost > currentEnemy.remainingMovement) {
                            break;
                        }
                        costSoFar += stepCost;
                        reachablePath.push(curr);
                    }
    
                    // If it can move at least one step, execute the move
                    if (reachablePath.length > 1) {
                        const finalReachableCell = reachablePath[reachablePath.length - 1];
                        this.movementManager.executeMove(currentEnemy, finalReachableCell);
                        await this._waitForAnimation();
                        currentEnemy = this.gc.getCharacter(enemy.id)!;
                    }
                }
            }
        }
    
        // 2. Decide se attaccare o spingere
        currentTarget = this.gc.getCharacter(target.id)!;
        const inRange = currentEnemy.getDistance(currentTarget.x, currentTarget.y) <= weaponRange;
        
        if (currentTarget.isAlive() && currentEnemy.actionsRemaining > 0 && inRange) {
            // 20% di probabilità di spingere
            if (Math.random() < 0.2) {
                await this.combatManager.performShove(this.gc.getCharacter(enemy.id)!, currentTarget);
            } else {
                // 80% di probabilità di attaccare
                this.gc.setState(draft => {
                    const char = this.gc.getCharacter(enemy.id, draft);
                    if (char) { char.actionsRemaining--; }
                });
    
                for (let i = 0; i < currentEnemy.attacks_per_action; i++) {
                    if (!this.gc.getCharacter(target.id)?.isAlive() || this.gc.state.phase === 'BATTLE_ENDED') break;
                    
                    await this.combatManager.executeAIAttack(this.gc.getCharacter(enemy.id)!, this.gc.getCharacter(target.id)!);
                    await sleep(AI_ACTION_DELAY_MS / 2);
                }
            }
        }
    };
    
    private aiRanged = async (enemy: Character, target: Character) => {
        let hasUsedAction = false;
        const isEngaged = this.gc.state.characters.some(c => c.type === 'player' && c.isAlive() && enemy.getDistance(c.x, c.y) <= 1);
        let currentEnemyState = this.gc.getCharacter(enemy.id)!;

        if (isEngaged) {
            this.gc.setState(draft => this.gc.addLog(draft, `<b>${enemy.name}</b> è in mischia e si disimpegna.`));
            this.actionManager.performDisengage(currentEnemyState);
            currentEnemyState = this.gc.getCharacter(enemy.id)!;
            hasUsedAction = true;
            await this._moveAwayFrom(currentEnemyState, target);
        } else {
            const bestSpot = this._findOptimalRangedPosition(currentEnemyState, target);
            if (bestSpot && (bestSpot.x !== currentEnemyState.x || bestSpot.y !== currentEnemyState.y)) {
                 if (bestSpot.cost > currentEnemyState.remainingMovement && currentEnemyState.actionsRemaining > 0) {
                     this.gc.setState(draft => this.gc.addLog(draft, `<b>${currentEnemyState.name}</b> non ha abbastanza movimento e scatta.`, 'info'));
                     this.actionManager.performDash(currentEnemyState);
                     currentEnemyState = this.gc.getCharacter(enemy.id)!;
                     hasUsedAction = true;
                 }
                 this.movementManager.executeMove(currentEnemyState, bestSpot);
                 await this._waitForAnimation();
            }
        }

        const freshEnemy = this.gc.getCharacter(enemy.id)!;
        const freshTarget = this.gc.getCharacter(target.id)!;
        
        if (!hasUsedAction && freshEnemy.actionsRemaining > 0 && freshTarget.isAlive()) {
            const weaponRange = freshEnemy.weapon.range || 1;
            const inRange = freshEnemy.getDistance(freshTarget.x, freshTarget.y) <= weaponRange;
            const isAligned = freshEnemy.x === freshTarget.x || freshEnemy.y === freshTarget.y;

            if (inRange && isAligned && this.gc.gridUtils.hasLineOfSight(freshEnemy, freshTarget)) {
                this.gc.setState(draft => {
                    const char = this.gc.getCharacter(enemy.id, draft);
                    if(char) { char.actionsRemaining--; }
                });

                 for (let i = 0; i < freshEnemy.attacks_per_action; i++) {
                     if (!this.gc.getCharacter(target.id)?.isAlive() || this.gc.state.phase === 'BATTLE_ENDED') break;
                     await this.combatManager.executeAIAttack(this.gc.getCharacter(enemy.id)!, this.gc.getCharacter(target.id)!);
                     await sleep(AI_ACTION_DELAY_MS / 2);
                 }
            } else {
                this.gc.setState(draft => this.gc.addLog(draft, `<b>${enemy.name}</b> non ha una linea di tiro pulita e schiva.`, 'info'));
                this.actionManager.performDodge(freshEnemy);
            }
        }
    };

    private _moveAwayFrom = async (mover: Character, targetToFlee: Character) => {
        // Get all cells the character can move to. This is much more efficient
        // than checking every cell on the grid.
        const reachableCells = this.movementManager.calculateReachableCells(mover);
    
        if (reachableCells.length === 0) {
            return; // No place to move
        }
    
        let bestCell: Position | null = null;
        let maxDistance = -1;
    
        // Find the reachable cell that is furthest from the target
        for (const cell of reachableCells) {
            const dist = Math.max(Math.abs(cell.x - targetToFlee.x), Math.abs(cell.y - targetToFlee.y));
            if (dist > maxDistance) {
                maxDistance = dist;
                bestCell = cell;
            }
        }
    
        if (bestCell) {
            // executeMove will handle pathfinding internally.
            this.movementManager.executeMove(mover, bestCell);
            await this._waitForAnimation();
        }
    }
    
    private _findOptimalRangedPosition(attacker: Character, target: Character): ({ x: number; y: number; cost: number; distanceToTarget: number; } | null) {
        const weaponRange = attacker.weapon.range || 1;
        const reachableCells = this.movementManager.calculateReachableCells(attacker);
    
        // Add current position to check if staying put is the best option.
        reachableCells.push({ x: attacker.x, y: attacker.y });

        // 1. Evaluate all reachable spots
        const evaluatedSpots = reachableCells.map(spot => {
            const pathData = this.gc.gridUtils.findPath(attacker.x, attacker.y, spot.x, spot.y, attacker);
            
            // Create a temporary attacker at the potential spot to check LoS
            const tempAttacker = attacker.clone();
            tempAttacker.x = spot.x;
            tempAttacker.y = spot.y;
            
            return {
                ...spot,
                distanceToTarget: Math.max(Math.abs(spot.x - target.x), Math.abs(spot.y - target.y)),
                cost: (spot.x === attacker.x && spot.y === attacker.y) ? 0 : (pathData ? pathData.cost : Infinity),
                hasLoS: this.gc.gridUtils.hasLineOfSight(tempAttacker, target),
                isAligned: spot.x === target.x || spot.y === target.y
            }
        });
    
        // 2. Filter for only valid aligned spots
        const validAlignedSpots = evaluatedSpots.filter(spot => 
            spot.cost <= attacker.remainingMovement &&
            spot.distanceToTarget <= weaponRange &&
            spot.hasLoS &&
            spot.isAligned
        );
    
        // 3. If no such spots exist, don't move.
        if (validAlignedSpots.length === 0) {
            return null;
        }
    
        // 4. Sort to find the best aligned spot
        validAlignedSpots.sort((a, b) => {
            // Priority 1: Maximize distance to target (kiting behavior)
            if (b.distanceToTarget !== a.distanceToTarget) {
                return b.distanceToTarget - a.distanceToTarget;
            }
            // Priority 2: Minimize movement cost if distances are equal
            return a.cost - b.cost;
        });
    
        return validAlignedSpots[0];
    }

    private aiDefender = async (enemy: Character, target: Character) => {
        if (enemy.defense_area) {
            const isTargetInArea = target.isInsideArea(enemy.defense_area);
            if (isTargetInArea) {
                await this.aiBrute(enemy, target); 
            } else {
                this.gc.setState(draft => this.gc.addLog(draft, `<b>${enemy.name}</b> rimane a difesa della sua area e schiva.`));
                this.actionManager.performDodge(enemy);
            }
        } else {
            await this.aiBrute(enemy, target);
        }
    };
}