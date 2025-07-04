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

import type { Character } from '../models/Character';
import type { TerrainFeature } from '../types';

/**
 * Una classe di servizio per tutte le operazioni relative alla griglia,
 * come il calcolo dei percorsi, la linea di vista e i costi di movimento.
 * Utilizza la dependency injection tramite il costruttore per accedere
 * allo stato attuale del gioco senza esserne direttamente accoppiata.
 */
export class GridUtils {
    constructor(
        public getGridWidth: () => number,
        public getGridHeight: () => number,
        public getCharacters: () => Character[],
        public getTerrainFeatures: () => TerrainFeature[]
    ) {}

    getTerrainFeatureAt = (x: number, y: number) => {
        // Cerca dall'indietro nell'array in modo che le caratteristiche più specifiche
        // definite successivamente nel JSON (es. un albero sopra la neve) abbiano la precedenza per l'ispezione.
        const reversedFeatures = this.getTerrainFeatures().slice().reverse();
        return reversedFeatures.find(f => f.positions.some(([px, py]) => px === x && py === y));
    };
    
    getEffectsAtCell = (x: number, y: number) => {
        // Raccoglie gli effetti da TUTTE le caratteristiche in una data cella.
        // Questo permette a una cella di essere, ad esempio, sia terreno difficile che copertura.
        return this.getTerrainFeatures()
            .filter(f => f.positions.some(([px, py]) => px === x && py === y))
            .flatMap(f => f.effects);
    };

    isCellOccupied = (x: number, y: number, ignoredCharId: string | null = null) => 
        this.getCharacters().some(c => c.isAlive() && c.id !== ignoredCharId && c.x === x && c.y === y);
    isCharacterInDarkness = (char: Character) => this.getEffectsAtCell(char.x, char.y).some(e => e.type === 'darkness');

    isObstacle = (x: number, y: number): boolean => {
        const effects = this.getEffectsAtCell(x, y);
        return effects.some(e => e.type === 'obstacle' || e.type === 'half_cover' || e.type === 'three_quarters_cover');
    }

    getMovementCost(x: number, y: number, isDiagonal: boolean, movingChar?: Character) {
        const baseCost = isDiagonal ? 1.5 : 1;
        let finalCost = baseCost;
    
        // D&D Rule: Difficult terrain costs 1 extra foot per foot moved. So double the cost.
        if (this.getEffectsAtCell(x, y).some(e => e.type === 'difficult_terrain')) {
            finalCost *= 2;
        }
    
        // D&D Rule: Crawling (prone) costs 1 extra foot per foot moved. This is additive.
        if (movingChar?.hasCondition('prone')) {
            finalCost += baseCost;
        }
        
        return finalCost;
    }
    
    /**
     * Implementazione dell'algoritmo A* per trovare il percorso più breve tra due punti.
     */
    findPath(startX: number, startY: number, endX: number, endY: number, movingChar?: Character) {
        const gridWidth = this.getGridWidth(); const gridHeight = this.getGridHeight();
        const openSet = [{ x: startX, y: startY, g: 0, h: 0, f: 0, parent: null as any }];
        const closedSet = new Set<string>();

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;
            const currentKey = `${current.x},${current.y}`;

            if (current.x === endX && current.y === endY) {
                const path = []; let temp = current;
                let cost = 0;
                while (temp.parent) {
                    path.unshift({x: temp.x, y: temp.y});
                    const p = temp.parent;
                    const isDiagonal = temp.x !== p.x && temp.y !== p.y;
                    cost += this.getMovementCost(temp.x, temp.y, isDiagonal, movingChar);
                    temp = p;
                }
                path.unshift({x: startX, y: startY});
                return { path, cost };
            }

            closedSet.add(currentKey);
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nX = current.x + dx; const nY = current.y + dy;
                    const neighborKey = `${nX},${nY}`;
                    
                    if (nX < 0 || nX >= gridWidth || nY < 0 || nY >= gridHeight || closedSet.has(neighborKey) || this.isCellOccupied(nX, nY, movingChar?.id) || this.isObstacle(nX, nY)) continue;
                    
                    const isDiagonal = dx !== 0 && dy !== 0;
                    const moveCost = this.getMovementCost(nX, nY, isDiagonal, movingChar);
                    const gScore = current.g + moveCost;

                    let neighbor = openSet.find(n => n.x === nX && n.y === nY);
                    if (!neighbor) {
                        neighbor = {
                            x: nX, y: nY, g: gScore, 
                            h: Math.abs(nX - endX) + Math.abs(nY - endY), 
                            f: 0, parent: current
                        };
                        neighbor.f = neighbor.g + neighbor.h;
                        openSet.push(neighbor);
                    } else if (gScore < neighbor.g) {
                        neighbor.parent = current;
                        neighbor.g = gScore;
                        neighbor.f = gScore + neighbor.h;
                    }
                }
            }
        }
        return null; // Nessun percorso trovato
    }
    
    getLineOfSight(x0: number, y0: number, x1: number, y1: number) {
        const line = []; let dx = Math.abs(x1 - x0); let dy = -Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1; let sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        while (true) {
            line.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return line;
    }
    
    hasLineOfSight(startChar: Character, endChar: Character) {
        const line = this.getLineOfSight(startChar.x, startChar.y, endChar.x, endChar.y);
        for (let i = 1; i < line.length - 1; i++) {
            const cell = line[i];
            if (this.getEffectsAtCell(cell.x, cell.y).some(e => e.type === 'obstacle')) return false;
            if (this.isCellOccupied(cell.x, cell.y) && this.isCellOccupied(cell.x, cell.y)) return false; // Copertura da creatura (semplificato)
        }
        return true;
    }
    
    getCoverBonus(attacker: Character, target: Character) {
        const line = this.getLineOfSight(attacker.x, attacker.y, target.x, target.y);
        let coverBonus = 0;
        for (let i = 1; i < line.length - 1; i++) {
            const cell = line[i];
            if (this.isCellOccupied(cell.x, cell.y, attacker.id) && this.isCellOccupied(cell.x, cell.y, target.id)) {
                coverBonus = Math.max(coverBonus, 2); // Mezza copertura da creature
            }
            const effects = this.getEffectsAtCell(cell.x, cell.y);
            if (effects.some(e => e.type === 'three_quarters_cover')) {
                coverBonus = Math.max(coverBonus, 5);
            } else if (effects.some(e => e.type === 'half_cover')) {
                coverBonus = Math.max(coverBonus, 2);
            }
        }
        
        // La condizione 'prono' non modifica la CA, ma dà svantaggio agli attacchi a distanza.
        // Questo viene gestito nel CombatManager. Rimuovere la logica errata da qui.
        return coverBonus;
    }
    
    findClosestEmptyAdjacentCell(targetChar: Character, movingChar: Character) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
            const x = targetChar.x + dx; const y = targetChar.y + dy;
            if (x >= 0 && x < this.getGridWidth() && y >= 0 && y < this.getGridHeight() && !this.isCellOccupied(x, y, movingChar.id) && !this.isObstacle(x,y)) {
                return { x, y };
            }
        }
        return null;
    }
}