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

import { produce } from 'immer';
import type { GameState, BattleData, Position, FloatingTextType } from '../types';
import { initialGameState } from '../types';
import { Character } from '../models/Character';
import { GridUtils } from '../services/GridUtils';
import { DEATH_FADE_DURATION_MS, FLOATING_TEXT_DURATION_MS } from '../constants';

import { TurnManager } from '../game-logic/TurnManager';
import { CombatManager } from '../game-logic/CombatManager';
import { MovementManager } from '../game-logic/MovementManager';
import { AIManager } from '../game-logic/AIManager';
import { ActionManager } from '../game-logic/ActionManager';

/**
 * GameController è l'orchestratore centrale del gioco.
 * Non contiene più la logica di business, ma delega le operazioni
 * a manager specializzati. Il suo ruolo è:
 * 1. Mantenere e aggiornare lo stato del gioco (`state`).
 * 2. Inizializzare e coordinare i vari manager.
 * 3. Fare da tramite tra l'input della UI e il manager appropriato.
 * 4. Gestire il ciclo di animazione principale.
 */
export class GameController {
    public state: GameState;
    public onStateUpdate: (newState: GameState) => void;
    public gridUtils: GridUtils;

    // Manager specializzati
    private turnManager: TurnManager;
    private combatManager: CombatManager;
    private movementManager: MovementManager;
    private aiManager: AIManager;
    private actionManager: ActionManager;

    private animationFrameId: number | null = null;
    private lastAnimationTime = 0;
    private isHandlingOAs = false;
    private rollPromiseResolver: ((rolls: number[]) => void) | null = null;

    constructor(onStateUpdate: (newState: GameState) => void) {
        this.state = initialGameState;
        this.onStateUpdate = onStateUpdate;
        
        // Inizializza GridUtils con accesso allo stato corrente
        this.gridUtils = new GridUtils(
            () => this.state.battleData?.grid_size.width ?? 0,
            () => this.state.battleData?.grid_size.height ?? 0,
            () => this.state.characters,
            () => this.state.battleData?.terrain_features ?? []
        );

        // Inizializza tutti i manager, passando loro un riferimento al controller
        // per permettere l'accesso a stato, utility e altri manager.
        this.turnManager = new TurnManager(this);
        this.combatManager = new CombatManager(this);
        this.movementManager = new MovementManager(this);
        this.aiManager = new AIManager(this);
        this.actionManager = new ActionManager(this);
        this.aiManager.registerManagers({ combatManager: this.combatManager, movementManager: this.movementManager, actionManager: this.actionManager });
    }

    // --- Metodi Pubblici (Interfaccia per la UI) ---

    public getState = (): GameState => this.state;

    public loadBattle = (data: BattleData) => {
        this.setState(draft => {
            const characters = [...data.player_characters, ...data.enemies].map(d => new Character(d));
            draft.battleData = data;
            draft.characters = characters;
            draft.phase = 'INITIATIVE_ROLL_PLAYER';
            draft.activeCharacterId = characters.find(c => c.type === 'player')?.id ?? null;
            this.addLog(draft, "La battaglia ha inizio! Tira per l'iniziativa.", 'info');
        });
    };
    
    public startNextTurn = async () => {
        const isEnemyTurn = await this.turnManager.startNextTurn();
        if (isEnemyTurn) {
            await this.aiManager.handleEnemyTurn();
        }
    }

    public restartGame = () => this.setState(() => initialGameState);

    public handleCanvasClick = (cell: Position) => {
        if (this.state.isAnimating || this.isHandlingOAs) return;

        const activeChar = this.getActiveCharacter();
        const targetChar = this.state.characters.find(c => c.x === cell.x && c.y === cell.y && c.isAlive());

        switch (this.state.phase) {
            case 'AWAITING_MOVE_TARGET':
                if (activeChar) this.movementManager.executeMove(activeChar, cell);
                break;
            case 'AWAITING_ATTACK_TARGET':
            case 'AWAITING_EXTRA_ATTACK':
                if (activeChar && targetChar && targetChar.type !== activeChar.type) this.combatManager.selectAttackTarget(activeChar, targetChar);
                break;
            case 'AWAITING_SPELL_TARGET':
                // Per ora, lancia il primo incantesimo disponibile
                if (activeChar && targetChar && targetChar.type !== activeChar.type && activeChar.spells[0]) {
                    this.combatManager.selectSpellTarget(activeChar, targetChar, activeChar.spells[0]);
                }
                break;
            case 'AWAITING_SHOVE_TARGET':
                 if (activeChar && targetChar && targetChar.type !== activeChar.type) this.combatManager.performShove(activeChar, targetChar);
                break;
            default:
                this.inspectCell(cell);
                break;
        }
    };
    
    public handleAction = (actionId: string) => {
        if (this.isHandlingOAs) return;
        this.actionManager.handleAction(actionId);
    };

    public handleDiceRoll = (dieType: number, rolls: number[]) => {
        if (this.state.isAnimating || this.isHandlingOAs) return;

        // Se c'è una promessa in attesa per un tiro (es. un TS del giocatore), risolvila.
        if (this.rollPromiseResolver) {
            this.rollPromiseResolver(rolls);
            this.rollPromiseResolver = null;
            return; // L'azione in attesa (es. l'attacco dell'IA) ora continuerà.
        }
        
        switch (this.state.phase) {
            case 'INITIATIVE_ROLL_PLAYER':
                this.turnManager.resolveInitiative(rolls[0]);
                break;
            case 'ROLLING_ATTACK':
                this.combatManager.resolveAttackRoll(rolls);
                break;
            case 'AWAITING_MANUAL_DAMAGE_ROLL':
                this.combatManager.resolveDamageRoll(rolls);
                break;
            case 'ROLLING_HEAL':
                this.combatManager.resolveHealingRoll(rolls);
                break;
            // AWAITING_SAVING_THROW è gestito dalla promessa qui sopra.
            default:
                 this.setState(draft => this.addLog(draft, `Lanciato D${dieType}: <b>${rolls.join(', ')}</b>`));
                break;
        }
    };
    
    public startAnimationLoop = () => {
        if (this.animationFrameId === null) {
            this.lastAnimationTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.animationLoop);
        }
    };
    
    public stopAnimationLoop = () => {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    };

    // --- Metodi Interni e Utility (Usati dai Manager) ---

    public setState = (updater: (draft: GameState) => void) => {
        const nextState = produce(this.state, updater);
        this.state = nextState;
        this.onStateUpdate(this.state);
    };

    public getCharacter = (id: string | null, state: GameState = this.state): Character | undefined => {
        return state.characters.find(c => c.id === id);
    }

    public getActiveCharacter = (state: GameState = this.state): Character | undefined => {
         return this.getCharacter(state.activeCharacterId, state);
    }

    public addLog = (draft: GameState, text: string, type = '') => {
        draft.log.push({ id: Date.now() + Math.random(), text, type });
    };

    public addFloatingText = (draft: GameState, text: string, pos: Position, type: FloatingTextType, delay = 0) => {
        const colors: Record<FloatingTextType, string> = { damage: '#ff4d4d', miss: 'white', info: '#00bfff', heal: '#4dff4d', critical: '#ffd700', error: '#ff4d4d', success: '#4dff4d' };
        draft.floatingTexts.push({
            id: Date.now() + Math.random(), text, x: pos.x, y: pos.y,
            life: 1.0, color: colors[type], type, delay
        });
    };

    public async requestPlayerRoll(): Promise<number[]> {
        return new Promise(resolve => {
            this.rollPromiseResolver = resolve;
        });
    }

    public updateTerrainConditions = (draft: GameState, characterId: string) => {
        const char = this.getCharacter(characterId, draft);
        if (!char || !char.isAlive()) return;
    
        const wasBlinded = char.hasCondition('blinded');
        const effects = this.gridUtils.getEffectsAtCell(char.x, char.y);
        const isInDarkness = effects.some(e => e.type === 'darkness');
        const hasDarkvision = char.hasFeature('darkvision');
        
        if (isInDarkness && !hasDarkvision) {
            if (!wasBlinded) {
                char.addCondition('blinded');
                this.addLog(draft, `<b>${char.name}</b> è avvolto dall'oscurità e diventa Accecato!`, 'info');
            }
        } else {
            // Rimuove la condizione solo se era presente, per evitare log inutili.
            // Questa logica assume che solo l'oscurità causi 'blinded'.
            if (wasBlinded) {
                char.removeCondition('blinded');
                this.addLog(draft, `<b>${char.name}</b> non è più nell'oscurità e recupera la vista.`, 'info');
            }
        }
    };

    private inspectCell = (cell: Position) => {
        const targetChar = this.state.characters.find(c => c.x === cell.x && c.y === cell.y && c.isAlive());
        const inspectedItem = targetChar || this.gridUtils.getTerrainFeatureAt(cell.x, cell.y) || { name: 'Terreno', description: 'Nessun effetto.' };
        this.setState(draft => {
            draft.inspectedCell = cell;
            // Usa .clone() per i personaggi e una copia profonda per gli altri oggetti
            if (inspectedItem instanceof Character) {
                draft.inspectedItem = inspectedItem.clone();
            } else {
                draft.inspectedItem = JSON.parse(JSON.stringify(inspectedItem));
            }
        });
    }

    private async handleOpportunityAttacks() {
        if (this.isHandlingOAs) return;
        this.isHandlingOAs = true;
    
        const attacksToProcess = this.state.opportunityAttacks ? [...this.state.opportunityAttacks] : [];
        
        this.setState(draft => {
            draft.opportunityAttacks = null;
        });
    
        for (const attack of attacksToProcess) {
            const attacker = this.getCharacter(attack.attackerId);
            const target = this.getCharacter(attack.targetId);
            if (attacker && target && attacker.isAlive() && target.isAlive()) {
                await this.combatManager.executeAIAttack(attacker, target, true);

                // Controlla la fine della battaglia subito dopo l'attacco
                this.setState(draft => {
                    this.turnManager.checkEndBattle(draft);
                });
                if (this.state.phase === 'BATTLE_ENDED') break;
            }
        }
    
        this.setState(draft => {
            if (draft.phase !== 'BATTLE_ENDED') {
                draft.phase = 'IDLE';
            }
        });
    
        this.isHandlingOAs = false;
    }

    // --- Ciclo di Animazione ---
    private animationLoop = (time: number) => {
        const deltaTime = time - this.lastAnimationTime;
        this.lastAnimationTime = time;

        let moveCompleted = false;
        
        this.setState(draft => {
            this.movementManager.updateAnimation(draft, time, deltaTime);
            
            // Animazione morte
            draft.characters.forEach(char => {
                if (char.animation.isDying) {
                    char.animation.deathFadeProgress = Math.min(1.0, char.animation.deathFadeProgress + (deltaTime / DEATH_FADE_DURATION_MS));
                }
            });

            // Animazione testi flottanti
            draft.floatingTexts = draft.floatingTexts
                .map(ft => {
                    if (ft.delay && ft.delay > 0) {
                        return { ...ft, delay: ft.delay - deltaTime };
                    }
                    return { ...ft, life: ft.life - (deltaTime / FLOATING_TEXT_DURATION_MS), y: ft.y - (deltaTime / 1000) * 1.5 };
                })
                .filter(ft => ft.life > 0);
            
            const isCharacterAnimating = draft.characters.some(c => c.animation.isMoving || (c.animation.isDying && c.animation.deathFadeProgress < 1.0));
            draft.isAnimating = isCharacterAnimating || draft.floatingTexts.length > 0;

            if (this.movementManager.lastMoveCompleted) {
                 const { mover } = this.movementManager.lastMoveCompleted;
                 this.updateTerrainConditions(draft, mover.id);
                 this.movementManager.lastMoveCompleted = null;
                 moveCompleted = true;
            }
        });
        
        if (moveCompleted && this.state.phase === 'HANDLING_OPPORTUNITY_ATTACK') {
            this.handleOpportunityAttacks();
        }

        this.animationFrameId = requestAnimationFrame(this.animationLoop);
    };
}