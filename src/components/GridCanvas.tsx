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

import React, { useRef, useEffect } from 'react';
import type { GameState, Position, FloatingText } from '../types';
import { CELL_SIZE } from '../constants';
import type { Character } from '../models/Character';
import type { GridUtils } from '../services/GridUtils';

interface GridCanvasProps {
    state: GameState;
    gridUtils: GridUtils;
    onCanvasClick: (position: Position) => void;
}

// --- Funzioni di disegno ausiliarie ---

const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
};

const drawTerrain = (ctx: CanvasRenderingContext2D, state: GameState) => {
    state.battleData?.terrain_features?.forEach(feature => {
        // Non disegnare le aree di oscurità qui; saranno disegnate sopra tutto il resto.
        if (feature.effects.some(e => e.type === 'darkness')) {
            return;
        }
        const color = feature.color || 'rgba(128, 128, 128, 0.2)';
        if (color !== 'transparent') {
            ctx.fillStyle = color;
            feature.positions.forEach(([x, y]) => ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
        }
    });
};

const drawHighlights = (ctx: CanvasRenderingContext2D, state: GameState) => {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    state.highlightedCells.forEach(cell => ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
};

const drawDefenderArea = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { inspectedItem } = state;

    // Mostra l'area di difesa solo se un difensore è ispezionato
    if (inspectedItem && 'ai_profile' in inspectedItem && inspectedItem.ai_profile === 'defender' && inspectedItem.defense_area) {
        const area = inspectedItem.defense_area as [number, number, number, number];
        const [x1, y1, x2, y2] = area;

        const startX = Math.min(x1, x2) * CELL_SIZE;
        const startY = Math.min(y1, y2) * CELL_SIZE;
        const width = (Math.abs(x2 - x1) + 1) * CELL_SIZE;
        const height = (Math.abs(y2 - y1) + 1) * CELL_SIZE;

        ctx.strokeStyle = 'rgba(255, 30, 30, 0.9)'; // Rosso più acceso
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]); // Pattern tratteggio diverso
        ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        
        ctx.strokeRect(startX, startY, width, height);

        // Resetta lo stile della linea e l'ombra per i disegni successivi
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }
};

const drawCharacters = (ctx: CanvasRenderingContext2D, state: GameState, gridUtils: GridUtils) => {
    const activeChar = state.characters.find(c => c.id === state.activeCharacterId);

    state.characters.forEach(char => {
        if (!char.isAlive() && char.animation.deathFadeProgress >= 1.0) return;

        const px = char.animation.displayX * CELL_SIZE + CELL_SIZE / 2;
        const py = char.animation.displayY * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE * 0.4;
        
        ctx.globalAlpha = 1.0 - char.animation.deathFadeProgress;

        // Active/Inspected glow
        if (char.id === state.activeCharacterId) {
            ctx.beginPath(); ctx.arc(px, py, radius + 4, 0, Math.PI * 2); ctx.fillStyle = 'var(--color-gold-glow)'; ctx.fill();
        } else if (state.inspectedItem && 'id' in state.inspectedItem && char.id === state.inspectedItem.id) {
            ctx.beginPath(); ctx.arc(px, py, radius + 3, 0, Math.PI * 2); ctx.fillStyle = 'var(--color-arcane-glow)'; ctx.fill();
        }
        
        // Token
        ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fillStyle = char.type === 'player' ? 'var(--color-player)' : 'var(--color-enemy)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        
        // Icon
        ctx.font = `bold ${radius}px "Font Awesome 6 Free"`; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(char.type === 'player' ? '\uf007' : '\uf6de', px, py);
        
        // HP Bar
        if (char.isAlive() || char.animation.deathFadeProgress < 1.0) {
            const hpPercentage = char.hp_max > 0 ? (char.hp_current / char.hp_max) : 0;
            const hpBarY = py + radius + 3;
            ctx.fillStyle = '#333'; ctx.fillRect(px - radius, hpBarY, radius * 2, 4);
            ctx.fillStyle = hpPercentage > 0.5 ? 'var(--color-success)' : hpPercentage > 0.25 ? 'var(--color-gold)' : 'var(--color-error)';
            ctx.fillRect(px - radius, hpBarY, (radius * 2) * hpPercentage, 4);
        }

        // --- Status Icons (Cover & Dodge) ---
        const coverBonus = activeChar ? gridUtils.getCoverBonus(activeChar, char) : 0;
        const hasCover = coverBonus > 0;

        const drawCoverIcon = (iconX: number, iconY: number, bonus: number) => {
            const shieldIcon = '\uf132'; // fa-shield
    
            // Draw shield
            ctx.font = `900 ${radius * 0.8}px "Font Awesome 6 Free"`;
            ctx.fillStyle = 'rgba(200, 200, 200, 0.95)';
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.fillText(shieldIcon, iconX, iconY);
    
            // Draw text inside
            ctx.font = `bold ${radius * 0.45}px "Roboto"`;
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0; // remove shadow for text for clarity
            ctx.fillText(`+${bonus}`, iconX, iconY + (radius * 0.05));
            
            ctx.shadowBlur = 0;
        };

        const drawDodgeIcon = (iconX: number, iconY: number) => {
            ctx.font = `bold ${radius * 0.6}px "Font Awesome 6 Free"`;
            ctx.fillStyle = 'rgba(0, 191, 255, 0.95)';
            ctx.shadowColor = "black"; ctx.shadowBlur = 4;
            ctx.fillText('\uf505', iconX, iconY);
            ctx.shadowBlur = 0;
        };
        
        const topY = py - radius * 0.65;
        if (char.isDodging && hasCover) {
            drawDodgeIcon(px + radius * 0.4, topY);
            drawCoverIcon(px + radius * 0.8, topY, coverBonus);
        } else if (char.isDodging) {
            drawDodgeIcon(px + radius * 0.65, topY);
        } else if (hasCover) {
            drawCoverIcon(px + radius * 0.65, topY, coverBonus);
        }
        
        ctx.globalAlpha = 1.0;
    });
};

const drawInspectedCell = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (state.inspectedCell) {
        ctx.strokeStyle = 'var(--color-gold)'; ctx.lineWidth = 4;
        ctx.strokeRect(state.inspectedCell.x * CELL_SIZE + 2, state.inspectedCell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
};

const drawDarknessOverlay = (ctx: CanvasRenderingContext2D, state: GameState) => {
    state.battleData?.terrain_features?.forEach(feature => {
        if (feature.effects.some(e => e.type === 'darkness')) {
            // Usa il colore definito nello scenario o un default.
            const color = feature.color || 'rgba(0, 0, 0, 0.5)';
            ctx.fillStyle = color;
            feature.positions.forEach(([x, y]) => {
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            });
        }
    });
};

const drawFloatingTexts = (ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) => {
    ctx.font = `bold ${CELL_SIZE * 0.4}px "Cinzel Decorative"`;
    ctx.textAlign = 'center';
    floatingTexts.forEach(ft => {
        if (ft.delay && ft.delay > 0) return; // Non disegnare se il testo è in ritardo

        ctx.globalAlpha = ft.life > 0.5 ? 1 : ft.life * 2;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        const fpx = ft.x * CELL_SIZE + CELL_SIZE / 2;
        const fpy = ft.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.strokeText(ft.text, fpx, fpy);
        ctx.fillText(ft.text, fpx, fpy);
    });
    ctx.globalAlpha = 1.0;
};

// --- Componente Principale ---

export const GridCanvas = ({ state, gridUtils, onCanvasClick }: GridCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { battleData } = state;
    const gridWidth = battleData?.grid_size.width || 0;
    const gridHeight = battleData?.grid_size.height || 0;

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const cellX = Math.floor((x / rect.width) * gridWidth);
        const cellY = Math.floor((y / rect.height) * gridHeight);
        
        onCanvasClick({ x: cellX, y: cellY });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        // Imposta le dimensioni reali del canvas per una resa ad alta definizione
        canvas.width = gridWidth * CELL_SIZE;
        canvas.height = gridHeight * CELL_SIZE;
        
        // Pulisce il canvas prima di ogni ridisegno
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Esegue la sequenza di disegno in ordine logico
        drawGrid(ctx, gridWidth, gridHeight);
        drawTerrain(ctx, state); // Disegna prima il terreno solido
        drawHighlights(ctx, state);
        drawDefenderArea(ctx, state);
        drawCharacters(ctx, state, gridUtils);
        drawInspectedCell(ctx, state);
        drawDarknessOverlay(ctx, state); // Poi disegna l'oscurità sopra tutto
        drawFloatingTexts(ctx, state.floatingTexts); // I testi flottanti sono sempre in cima

    }, [state, gridWidth, gridHeight, gridUtils]); // Ridisegna ogni volta che lo stato del gioco cambia

    return <canvas id="battle-canvas" ref={canvasRef} onClick={handleCanvasClick} />;
};