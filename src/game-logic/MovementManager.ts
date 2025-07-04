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
import type { GameState, Position } from '../types';
import type { Character } from '../models/Character';
import { MOVEMENT_ANIMATION_SPEED_MS } from '../constants';

/**
 * Gestisce la logica di movimento dei personaggi e le relative animazioni.
 */
export class MovementManager {
    private gc: GameController;
    public lastMoveCompleted: { mover: Character; oldPosition: Position } | null = null;

    constructor(controller: GameController) {
        this.gc = controller;
    }

    public calculateReachableCells = (character: Character): Position[] => {
        if (!this.gc.state.battleData) return [];
    
        const { width, height } = this.gc.state.battleData.grid_size;
        const openSet: { pos: Position; cost: number }[] = [{ pos: { x: character.x, y: character.y }, cost: 0 }];
        const reachable = new Map<string, number>();
        reachable.set(`${character.x},${character.y}`, 0);
    
        let head = 0;
        while (head < openSet.length) {
            const { pos, cost } = openSet[head++];
    
            // 8-directional movement
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
    
                    const nextX = pos.x + dx;
                    const nextY = pos.y + dy;
                    const nextKey = `${nextX},${nextY}`;
    
                    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
                    if (this.gc.gridUtils.isCellOccupied(nextX, nextY, character.id) || this.gc.gridUtils.isObstacle(nextX, nextY)) continue;
                    
                    const isDiagonal = dx !== 0 && dy !== 0;
                    const moveCost = this.gc.gridUtils.getMovementCost(nextX, nextY, isDiagonal, character);
                    const newCost = cost + moveCost;
    
                    if (newCost <= character.remainingMovement) {
                        if (!reachable.has(nextKey) || newCost < reachable.get(nextKey)!) {
                            reachable.set(nextKey, newCost);
                            openSet.push({ pos: { x: nextX, y: nextY }, cost: newCost });
                        }
                    }
                }
            }
        }
        
        const reachableCells: Position[] = [];
        reachable.forEach((cost, key) => {
            if (key !== `${character.x},${character.y}`) {
                const [x, y] = key.split(',').map(Number);
                reachableCells.push({ x, y });
            }
        });
    
        return reachableCells;
    };
    
    public executeMove = (mover: Character, targetCell: Position) => {
        if (this.gc.gridUtils.isCellOccupied(targetCell.x, targetCell.y, mover.id)) {
            this.gc.setState(draft => this.gc.addFloatingText(draft, "Occupata!", targetCell, 'error'));
            return;
        }
        const pathData = this.gc.gridUtils.findPath(mover.x, mover.y, targetCell.x, targetCell.y, mover);
        if (!pathData || pathData.cost > mover.remainingMovement) {
            this.gc.setState(draft => this.gc.addFloatingText(draft, "Troppo Lontano!", targetCell, 'info'));
            return;
        }

        let oaTriggerIndex = -1;
        const triggeringOpponents: Character[] = [];

        if (!mover.isDisengaging) {
            // Find the very first step in the path that provokes any opportunity attack.
            for (let i = 1; i < pathData.path.length; i++) {
                const prevPos = pathData.path[i - 1];
                const currentPos = pathData.path[i];

                const opponentsThisStep = this.gc.state.characters.filter(c => {
                    if (!c.isAlive() || c.type === mover.type || c.reactionsRemaining <= 0 || (c.weapon?.range || 1) > 1) {
                        return false;
                    }
                    const wasInRange = Math.max(Math.abs(prevPos.x - c.x), Math.abs(prevPos.y - c.y)) <= 1;
                    const isNowOutOfRange = Math.max(Math.abs(currentPos.x - c.x), Math.abs(currentPos.y - c.y)) > 1;
                    return wasInRange && isNowOutOfRange;
                });

                if (opponentsThisStep.length > 0) {
                    oaTriggerIndex = i;
                    triggeringOpponents.push(...opponentsThisStep.map(o => o.clone()));
                    // Found the first step with OAs, so we can stop checking the rest of the path.
                    break; 
                }
            }
        }

        if (oaTriggerIndex !== -1) {
            // --- OA Triggered ---
            const pathToAnimate = pathData.path.slice(0, oaTriggerIndex + 1);
            
            let partialCost = 0;
            for (let i = 1; i < pathToAnimate.length; i++) {
                const prev = pathToAnimate[i - 1];
                const curr = pathToAnimate[i];
                const isDiagonal = prev.x !== curr.x && prev.y !== curr.y;
                partialCost += this.gc.gridUtils.getMovementCost(curr.x, curr.y, isDiagonal, mover);
            }

            this.gc.setState(draft => {
                const char = this.gc.getCharacter(mover.id, draft);
                if (char) {
                    char.remainingMovement -= partialCost;
                    char.animation.isMoving = true;
                    char.animation.currentPath = pathToAnimate;
                    char.animation.pathProgress = 0;
                    char.animation.startTime = performance.now();
                    this.gc.addLog(draft, `<b>${char.name}</b> si muove e provoca un attacco di opportunità!`);
                }
                draft.phase = 'HANDLING_OPPORTUNITY_ATTACK';
                draft.opportunityAttacks = triggeringOpponents.map(opp => ({ attackerId: opp.id, targetId: mover.id }));
                if (mover.type === 'player') draft.highlightedCells = [];
                draft.isAnimating = true;
            });
        } else {
            // --- No OA, regular move ---
            this.gc.setState(draft => {
                const char = this.gc.getCharacter(mover.id, draft);
                if (char) {
                    char.remainingMovement -= pathData.cost;
                    char.animation.isMoving = true;
                    char.animation.currentPath = pathData.path;
                    char.animation.pathProgress = 0;
                    char.animation.startTime = performance.now();
                    this.gc.addLog(draft, `<b>${char.name}</b> si sposta.`);
                }
                if(mover.type === 'player') {
                    draft.phase = 'IDLE';
                    draft.highlightedCells = [];
                }
                draft.isAnimating = true;
            });
        }
    };
    
    public updateAnimation = (draft: GameState, time: number, deltaTime: number) => {
        let anyMoveCompleted = false;

        draft.characters.forEach(char => {
            if (char.animation.isMoving && char.animation.currentPath.length > 1) {
                const path = char.animation.currentPath;
                const totalDuration = (path.length - 1) * MOVEMENT_ANIMATION_SPEED_MS;
                const elapsed = time - char.animation.startTime;
                const progress = Math.min(1.0, elapsed / totalDuration);
                
                char.animation.pathProgress = progress;
    
                if (progress >= 1.0) {
                    const finalPos = path[path.length - 1];
                    const oldPosition = {x: char.x, y: char.y};
                    char.x = finalPos.x;
                    char.y = finalPos.y;
                    char.animation.displayX = finalPos.x;
                    char.animation.displayY = finalPos.y;
                    char.animation.isMoving = false;
                    char.animation.currentPath = [];
                    
                    // Segna che un movimento volontario è stato completato per controllare gli AdO
                    if (!char.animation.isForcedMove) {
                        this.lastMoveCompleted = { mover: char, oldPosition };
                    }
                    char.animation.isForcedMove = false; // Resetta sempre il flag
                    
                    anyMoveCompleted = true;

                } else {
                    const fullPathIndex = progress * (path.length - 1);
                    const segmentIndex = Math.floor(fullPathIndex);
                    const segmentProgress = fullPathIndex - segmentIndex;
                    
                    const from = path[segmentIndex];
                    const to = path[segmentIndex + 1];
                    
                    if (from && to) {
                        char.animation.displayX = from.x + (to.x - from.x) * segmentProgress;
                        char.animation.displayY = from.y + (to.y - from.y) * segmentProgress;
                    }
                }
            } else if (!char.animation.isMoving) {
                char.animation.displayX = char.x;
                char.animation.displayY = char.y;
            }
        });
        
        // Se nessun movimento è stato completato in questo frame, resetta il flag.
        if (!anyMoveCompleted) {
            this.lastMoveCompleted = null;
        }
    };
}
