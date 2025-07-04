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
import type { GameState, AdvantageState, Position, SpellData } from '../types';
import type { Character } from '../models/Character';
import { sleep, getModifier } from '../utils';
import { AI_ACTION_DELAY_MS } from '../constants';

/**
 * Gestisce tutta la logica di combattimento: attacchi, danni, spinte, ecc.
 */
export class CombatManager {
    private gc: GameController;

    constructor(controller: GameController) {
        this.gc = controller;
    }

    private _getAdvantageState(attacker: Character, target: Character, isRanged: boolean): AdvantageState {
        let advantages = 0;
        let disadvantages = 0;
    
        // Condizioni dell'attaccante
        if (attacker.hasCondition('blinded') || attacker.hasCondition('prone')) {
            disadvantages++;
        }
    
        // Effetti temporanei (es. da Rompighiaccio/Frostbite)
        if (attacker.hasTemporaryEffect('disadvantage_on_next_attack')) {
            disadvantages++;
        }

        // Condizioni e azioni del bersaglio
        if (target.isDodging) {
            disadvantages++;
        }
        if (target.hasCondition('blinded')) {
            advantages++;
        }
        if (target.hasCondition('prone')) {
            if (!isRanged) {
                advantages++; // Mischia contro prono ha vantaggio
            } else {
                disadvantages++; // Distanza contro prono ha svantaggio
            }
        }
        
        // Attacchi a distanza mentre si è in mischia
        if (isRanged) {
            const isEngaged = this.gc.state.characters.some(c => 
                c.type !== attacker.type &&
                c.isAlive() && 
                attacker.getDistance(c.x, c.y) <= 1
            );
            if (isEngaged) {
                disadvantages++;
            }
        }
    
        // Determina lo stato finale
        if (advantages > 0 && disadvantages > 0) return 'normal';
        if (advantages > 0) return 'advantage';
        if (disadvantages > 0) return 'disadvantage';
        
        return 'normal';
    }

    public selectAttackTarget = (attacker: Character, target: Character) => {
        if (attacker.getDistance(target.x, target.y) > (attacker.weapon?.range || 1)) {
            this.gc.setState(draft => this.gc.addFloatingText(draft, "Fuori Portata!", {x: target.x, y: target.y}, 'info'));
            return;
        }

        const isRanged = (attacker.weapon?.range || 1) > 1;
        const advantageState = this._getAdvantageState(attacker, target, isRanged);
        
        this.gc.setState(draft => {
            const attackActionCost = draft.attacksMadeThisTurn === 0 ? 1 : 0;
            const att = this.gc.getCharacter(attacker.id, draft);
            if(att) att.actionsRemaining -= attackActionCost;
            
            draft.phase = 'ROLLING_ATTACK';
            draft.currentAttack = { attackerId: attacker.id, targetId: target.id, advantageState, sourceType: 'weapon' };
            this.gc.addLog(draft, `<b>${attacker.name}</b> attacca <b>${target.name}</b> con ${attacker.weapon.name}. Tira un D20.`, 'info');
            
            // Consuma l'effetto di svantaggio se presente
            const disadvEffect = att?.hasTemporaryEffect('disadvantage_on_next_attack');
            if (disadvEffect) {
                att.removeTemporaryEffect(disadvEffect.id);
                this.gc.addLog(draft, `(Svantaggio applicato da un effetto precedente)`, 'info');
            }
        });
    };

    public selectSpellTarget = (caster: Character, target: Character, spell: SpellData) => {
        if (caster.getDistance(target.x, target.y) > spell.range) {
            this.gc.setState(draft => this.gc.addFloatingText(draft, "Fuori Portata!", {x: target.x, y: target.y}, 'info'));
            return;
        }

        if (spell.resolution === 'saving_throw') {
            this.resolveSavingThrow(caster, target, spell);
            return;
        }
        
        // Se è un tiro per colpire
        const isRanged = spell.range > 1;
        const advantageState = this._getAdvantageState(caster, target, isRanged);

        this.gc.setState(draft => {
            const char = this.gc.getCharacter(caster.id, draft);
            if(char) char.actionsRemaining -= 1;
            
            draft.phase = 'ROLLING_ATTACK';
            draft.currentAttack = { attackerId: caster.id, targetId: target.id, advantageState, sourceType: 'spell', sourceId: spell.id };
            this.gc.addLog(draft, `<b>${caster.name}</b> lancia <b>${spell.name}</b> su <b>${target.name}</b>. Tira un D20.`, 'info');
        });
    };

    public resolveSavingThrow = (caster: Character, target: Character, spell: SpellData) => {
        this.gc.setState(draft => {
            const cas = this.gc.getCharacter(caster.id, draft);
            const tar = this.gc.getCharacter(target.id, draft);
            if (!cas || !tar || !spell.saving_throw_ability) return;

            cas.actionsRemaining -= 1;
            draft.phase = 'IDLE';

            const dc = 8 + cas.proficiency_bonus + cas.modifiers[spell.saving_throw_ability];
            this.gc.addLog(draft, `<b>${cas.name}</b> lancia <b>${spell.name}</b> su <b>${tar.name}</b> (Tiro Salvezza su Costituzione CD ${dc}).`);

            const roll = Math.floor(Math.random() * 20) + 1;
            let modifier = tar.modifiers[spell.saving_throw_ability];
            if (tar.saving_throw_proficiencies.includes(spell.saving_throw_ability)) {
                modifier += tar.proficiency_bonus;
            }
            const total = roll + modifier;

            this.gc.addLog(draft, `<b>${tar.name}</b> tira ${total} (${roll} + ${modifier})`);
            
            if (total < dc) {
                this.gc.addLog(draft, 'Tiro salvezza fallito!', 'error');
                this._applySpellEffects(draft, cas, tar, spell);
            } else {
                this.gc.addLog(draft, 'Tiro salvezza superato!', 'success');
                this.gc.addFloatingText(draft, 'SALVATO!', {x: tar.x, y: tar.y}, 'success');
            }
        });
    };

    public resolveAttackRoll = (rolls: number[]) => {
        this.gc.setState(draft => {
            const { attackerId, targetId, advantageState, sourceType, sourceId } = draft.currentAttack;
            const attacker = this.gc.getCharacter(attackerId, draft);
            const target = this.gc.getCharacter(targetId, draft);
            if (!attacker || !target) return;
            
            const roll = advantageState === 'advantage' ? Math.max(...rolls) : advantageState === 'disadvantage' ? Math.min(...rolls) : rolls[0];

            if (advantageState !== 'normal') {
                this.gc.addLog(draft, `Tiro con ${advantageState}: ${rolls.join(', ')} -> usa <b>${roll}</b>`);
            }
            
            let attackModifier = 0;
            let damageDice = '1d4';
            let critSavageAttacks = false;

            if (sourceType === 'spell') {
                const spell = attacker.spells.find(s => s.id === sourceId);
                if (spell && spell.attack_source_stat) {
                    attackModifier = attacker.modifiers[spell.attack_source_stat] + attacker.proficiency_bonus;
                    const damageEffect = spell.effects_on_hit.find(e => e.type === 'damage');
                    if (damageEffect) damageDice = damageEffect.dice || '0d0';
                }
            } else { // 'weapon'
                attackModifier = attacker.weapon.attack_modifier;
                damageDice = attacker.weapon.damage_dice;
                critSavageAttacks = attacker.hasFeature('savage_attacks');
            }

            const coverBonus = this.gc.gridUtils.getCoverBonus(attacker, target);
            const targetAC = target.ac + coverBonus;
            const totalToHit = roll + attackModifier;
            const isCriticalHit = roll === 20;
            const isCriticalMiss = roll === 1;

            const acLog = coverBonus > 0 ? `vs CA <b>${targetAC}</b> (${target.ac} + ${coverBonus} copertura)` : `vs CA <b>${targetAC}</b>`;
            this.gc.addLog(draft, `Tiro per colpire: ${roll} + ${attackModifier} = <b>${totalToHit}</b> ${acLog}`);

            if (isCriticalMiss || totalToHit < targetAC) {
                const message = isCriticalMiss ? 'FALLIMENTO CRITICO!' : 'Mancato!';
                this.gc.addLog(draft, message, 'critical-miss');
                this.gc.addFloatingText(draft, 'MISS', {x: target.x, y: target.y}, 'miss');
                this.handleAttackCompletion(draft);
            } else {
                const message = isCriticalHit ? 'COLPO CRITICO!' : 'Colpito!';
                this.gc.addLog(draft, message, 'critical-hit');
                this.gc.addFloatingText(draft, 'HIT', {x: target.x, y: target.y}, 'damage');
                
                let [numDice, dieType] = damageDice.split('d').map(Number);
                if (isCriticalHit) {
                    numDice *= 2;
                    if (critSavageAttacks) {
                        numDice++;
                        this.gc.addLog(draft, `Attacchi Selvaggi: <b>${attacker.name}</b> lancia un dado danno aggiuntivo!`, 'info');
                    }
                }

                draft.phase = 'AWAITING_MANUAL_DAMAGE_ROLL';
                if(draft.currentAttack) draft.currentAttack.isCriticalHit = isCriticalHit;
                draft.multiDieRoll = { total: numDice, dieType, rolled: 0, results: [] };
                this.gc.addLog(draft, `Lancia ${numDice}d${dieType} per i danni.`);
            }
        });
    };

    private _applySpellEffects(draft: GameState, caster: Character, target: Character, spell: SpellData) {
        spell.effects_on_hit.forEach(effect => {
            switch(effect.type) {
                case 'damage':
                    if (effect.dice) {
                        const [numDice, dieType] = effect.dice.split('d').map(Number);
                        const rolls = Array.from({length: numDice}, () => Math.floor(Math.random() * dieType) + 1);
                        const rawDamage = rolls.reduce((sum, r) => sum + r, 0);
                        const { actualDamage, logType, preventedDeath } = target.takeDamage(rawDamage, effect.damage_type || 'force');
                        
                        if (actualDamage > 0) {
                            this.gc.addFloatingText(draft, `-${actualDamage}`, {x: target.x, y: target.y}, 'damage', 250);
                            this.gc.addLog(draft, `<b>${target.name}</b> subisce <b>${actualDamage}</b> danni da ${effect.damage_type}. (${rolls.join(' + ')})`, logType);
                        }
                        if (preventedDeath) this.gc.addLog(draft, `<b>${target.name}</b> usa la sua Tenacia Implacabile!`, 'heal');
                    }
                    break;
                case 'speed_reduction':
                    target.addTemporaryEffect('speed_reduction', caster.id, effect.reduction_cells || 0);
                    this.gc.addLog(draft, `La velocità di <b>${target.name}</b> è ridotta!`, 'info');
                    break;
                case 'disadvantage_on_next_attack':
                    target.addTemporaryEffect('disadvantage_on_next_attack', caster.id, true);
                    this.gc.addLog(draft, `<b>${target.name}</b> ha svantaggio al prossimo attacco!`, 'info');
                    break;
            }
        });
         if (!target.isAlive()) {
            this.gc.addLog(draft, `<b>${target.name}</b> è stato sconfitto.`, 'error');
        }
    }

    private _applyWeaponHit(
        draft: GameState, 
        attacker: Character,
        target: Character,
        rawDamage: number, 
        rolls: number[], 
    ) {
        const weapon = attacker.weapon;
        const damageModifier = weapon.damage_modifier;
        const totalDamage = rawDamage + damageModifier;
        const { actualDamage, logType, preventedDeath } = target.takeDamage(totalDamage, weapon.damage_type);

        if (actualDamage > 0) {
            const damageLog = `(${rolls.join(' + ')}) + ${damageModifier} = ${totalDamage}`;
            this.gc.addFloatingText(draft, `-${actualDamage}`, {x: target.x, y: target.y}, 'damage', 250);
            this.gc.addLog(draft, `<b>${target.name}</b> subisce <b>${actualDamage}</b> danni. ${damageLog}`, logType);
        }

        if (preventedDeath) {
            this.gc.addLog(draft, `<b>${target.name}</b> usa la sua Tenacia Implacabile e rimane a 1 HP!`, 'heal');
        }
        if (logType === 'resistance') this.gc.addLog(draft, `(Danno dimezzato per resistenza a ${weapon.damage_type})`, 'resistance');
        if (logType === 'vulnerability') this.gc.addLog(draft, `(Danno raddoppiato per vulnerabilità a ${weapon.damage_type})`, 'vulnerability');
        if (logType === 'info' && actualDamage === 0) this.gc.addLog(draft, `<b>${target.name}</b> è immune al danno di tipo ${weapon.damage_type}!`, 'info');
    
        if (!target.isAlive()) {
            this.gc.addLog(draft, `<b>${target.name}</b> è stato sconfitto.`, 'error');
        }
    }

    public resolveDamageRoll = (rolls: number[]) => {
        this.gc.setState(draft => {
            const { multiDieRoll, currentAttack } = draft;
            if (!multiDieRoll || !currentAttack) return;
    
            rolls.forEach(roll => {
                this.gc.addLog(draft, `Lanciato d${multiDieRoll.dieType}: <b>${roll}</b>`);
            });
    
            const newRolls = [...multiDieRoll.results, ...rolls];
            multiDieRoll.results = newRolls;
            multiDieRoll.rolled = newRolls.length;
            
            if (multiDieRoll.rolled < multiDieRoll.total) {
                return;
            }
    
            const { attackerId, targetId, sourceType, sourceId } = currentAttack;
            const attacker = this.gc.getCharacter(attackerId, draft);
            const target = this.gc.getCharacter(targetId, draft);
            if (!attacker || !target) return;
            const rawDamage = newRolls.reduce((sum, r) => sum + r, 0);

            if(sourceType === 'spell') {
                const spell = attacker.spells.find(s => s.id === sourceId);
                if(spell) this._applySpellEffects(draft, attacker, target, spell);
            } else {
                this._applyWeaponHit(draft, attacker, target, rawDamage, newRolls);
            }
            
            this.handleAttackCompletion(draft);
        });
    };

    private handleAttackCompletion = (draft: GameState) => {
        const attacker = this.gc.getActiveCharacter(draft);
        if (!attacker || !attacker.isAlive()) {
            draft.phase = 'IDLE';
            return;
        }
        
        if (draft.currentAttack?.sourceType === 'spell') {
            draft.attacksMadeThisTurn = 0; 
            draft.phase = 'IDLE';
        } else { 
            draft.attacksMadeThisTurn++;
            if (attacker.hasFeature('extra_attack') && draft.attacksMadeThisTurn < attacker.attacks_per_action) {
                draft.phase = 'AWAITING_EXTRA_ATTACK';
                this.gc.addLog(draft, 'Puoi fare un attacco extra.', 'info');
            } else {
                draft.attacksMadeThisTurn = 0;
                draft.phase = 'IDLE';
            }
        }
        
        draft.currentAttack = {};
        draft.highlightedCells = [];
        draft.multiDieRoll = null;
    };

    public resolveHealingRoll = (rolls: number[]) => {
        this.gc.setState(draft => {
            const activeChar = this.gc.getActiveCharacter(draft);
            if(!activeChar || draft.phase !== 'ROLLING_HEAL') return;
            
            const healingAmount = rolls.reduce((sum, r) => sum + r, 0) + 2; // Pozione base
            activeChar.heal(healingAmount);
            
            this.gc.addFloatingText(draft, `+${healingAmount}`, {x: activeChar.x, y: activeChar.y}, 'heal');
            this.gc.addLog(draft, `Recupera <b>${healingAmount}</b> HP. (${rolls.join(' + ')} + 2)`, 'heal');
            draft.phase = 'IDLE';
            draft.multiDieRoll = null;
        });
    };
    
    public performShove = async (attacker: Character, target: Character) => {
        if (attacker.getDistance(target.x, target.y) > 1) {
            this.gc.setState(draft => this.gc.addFloatingText(draft, 'Fuori Portata!', {x: target.x, y: target.y}, 'info'));
            return;
        }

        this.gc.setState(draft => {
            const att = this.gc.getCharacter(attacker.id, draft);
            if (att) att.actionsRemaining--;
            this.gc.addLog(draft, `<b>${attacker.name}</b> tenta di spingere <b>${target.name}</b>.`);
        });
        
        await sleep(300);

        const attackerRollRaw = Math.floor(Math.random() * 20) + 1;
        const attackerModifier = getModifier(attacker.stats.strength);
        const attackerTotal = attackerRollRaw + attackerModifier;
        
        const targetRollRaw = Math.floor(Math.random() * 20) + 1;
        const targetModifier = getModifier(target.stats.strength);
        const targetTotal = targetRollRaw + targetModifier;
        
        this.gc.setState(draft => {
            this.gc.addLog(draft, `Prova contrapposta (Forza): <b>${attacker.name}</b> tira ${attackerTotal} (${attackerRollRaw} + ${attackerModifier}), <b>${target.name}</b> tira ${targetTotal} (${targetRollRaw} + ${targetModifier})`);

            let winner: Character | undefined;
            let loser: Character | undefined;
            let winnerTotal: number;
            let loserTotal: number;

            if (attackerTotal > targetTotal) {
                winner = this.gc.getCharacter(attacker.id, draft);
                loser = this.gc.getCharacter(target.id, draft);
                winnerTotal = attackerTotal;
                loserTotal = targetTotal;
                this.gc.addLog(draft, `<b>${attacker.name}</b> vince la contesa!`, 'success');
            } else if (targetTotal > attackerTotal) {
                winner = this.gc.getCharacter(target.id, draft);
                loser = this.gc.getCharacter(attacker.id, draft);
                winnerTotal = targetTotal;
                loserTotal = attackerTotal;
                this.gc.addLog(draft, `<b>${target.name}</b> vince la contesa!`, 'success');
            } else {
                this.gc.addLog(draft, 'Pareggio! Nessuno si muove.', 'info');
                draft.phase = 'IDLE';
                return;
            }

            if (!winner || !loser) {
                draft.phase = 'IDLE';
                return;
            }
            
            const loserToUpdate = this.gc.getCharacter(loser.id, draft);
            if (loserToUpdate) {
                loserToUpdate.addCondition('prone');
                this.gc.addLog(draft, `<b>${loserToUpdate.name}</b> cade a terra (prono).`, 'info');
            }

            const pushDistance = Math.ceil((winnerTotal - loserTotal) / 4);
             if (pushDistance <= 0) {
                 this.gc.addLog(draft, `La differenza è troppo piccola, <b>${loser.name}</b> non viene spinto.`);
                 draft.phase = 'IDLE';
                 return;
            }
            this.gc.addLog(draft, `<b>${loser.name}</b> viene spinto indietro di <b>${pushDistance}</b> caselle.`);

            const dx = Math.sign(loser.x - winner.x);
            const dy = Math.sign(loser.y - winner.y);

            let currentPos = { x: loser.x, y: loser.y };
            let cellsPushed = 0;
            
            for (let i = 0; i < pushDistance; i++) {
                const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy };
                
                const gridWidth = draft.battleData?.grid_size.width ?? 0;
                const gridHeight = draft.battleData?.grid_size.height ?? 0;

                // Controlla bordi, ostacoli e altri personaggi (ignorando quello spinto)
                if (nextPos.x < 0 || nextPos.x >= gridWidth || nextPos.y < 0 || nextPos.y >= gridHeight || 
                    this.gc.gridUtils.isObstacle(nextPos.x, nextPos.y) ||
                    this.gc.gridUtils.isCellOccupied(nextPos.x, nextPos.y, loser.id) 
                ) {
                    this.gc.addLog(draft, `La spinta di <b>${loser.name}</b> è bloccata da un ostacolo.`);
                    break;
                }
                
                currentPos = nextPos;
                cellsPushed++;
            }

            if (cellsPushed > 0) {
                const finalLoserToUpdate = this.gc.getCharacter(loser.id, draft);
                if (finalLoserToUpdate) {
                    const path = [{ x: loser.x, y: loser.y }];
                    let lastPos = path[0];
                    for (let i = 0; i < cellsPushed; i++) {
                        lastPos = { x: lastPos.x + dx, y: lastPos.y + dy };
                        path.push(lastPos);
                    }
            
                    finalLoserToUpdate.animation.isMoving = true;
                    finalLoserToUpdate.animation.currentPath = path;
                    finalLoserToUpdate.animation.pathProgress = 0;
                    finalLoserToUpdate.animation.startTime = performance.now();
                    finalLoserToUpdate.animation.isForcedMove = true;

                    this.gc.addFloatingText(draft, 'Spinto!', currentPos, 'info');
                }
            }
            
            draft.phase = 'IDLE';
        });
    }

    private _resolveManualSavingThrow = (roll: number) => {
        this.gc.setState(draft => {
            const context = draft.currentSavingThrow;
            if (!context) return;
    
            const target = this.gc.getCharacter(context.characterId, draft);
            const caster = this.gc.getCharacter(context.sourceCasterId, draft);
            if (!target || !caster) return;

            const spell = caster.spells.find(s => s.id === context.sourceId) || caster.weapon?.spellData;
            if (!spell) return;
    
            let modifier = target.modifiers[context.ability];
            if (target.saving_throw_proficiencies.includes(context.ability)) {
                modifier += target.proficiency_bonus;
            }
            const total = roll + modifier;
    
            this.gc.addLog(draft, `<b>${target.name}</b> tira per il Salvezza: ${total} (${roll} + ${modifier})`);
            
            if (total < context.dc) {
                this.gc.addLog(draft, 'Tiro salvezza fallito!', 'error');
                this._applySpellEffects(draft, caster, target, spell);
            } else {
                this.gc.addLog(draft, 'Tiro salvezza superato!', 'success');
                this.gc.addFloatingText(draft, 'SALVATO!', {x: target.x, y: target.y}, 'success');
            }
    
            // Cleanup
            draft.phase = 'ENEMY_TURN'; // Ripristina la fase per la continuazione del turno IA
            draft.currentSavingThrow = null;
        });
    }

    public executeAIAttack = async (attacker: Character, target: Character, isOpportunityAttack = false) => {
        if (!attacker.isAlive() || !target.isAlive()) return;
        
        if (isOpportunityAttack) {
            const att = this.gc.getCharacter(attacker.id);
            if (!att || att.reactionsRemaining <= 0) {
                this.gc.setState(draft => {
                    this.gc.addLog(draft, `<b>${attacker.name}</b> non ha una reazione per l'attacco di opportunità.`);
                });
                return;
            }
            this.gc.setState(draft => {
                const attToUpdate = this.gc.getCharacter(attacker.id, draft);
                if (attToUpdate) {
                    attToUpdate.reactionsRemaining--;
                    this.gc.addLog(draft, `<b>${attacker.name}</b> usa la sua Reazione per un attacco di opportunità!`, 'oa');
                }
            });
        } else {
             this.gc.setState(draft => {
                 this.gc.addLog(draft, `<b>${attacker.name}</b> attacca <b>${target.name}</b> con <b>${attacker.weapon.name}</b>!`, 'info');
            });
        }
    
        await sleep(AI_ACTION_DELAY_MS);

        const att = this.gc.getCharacter(attacker.id)!;
        const t = this.gc.getCharacter(target.id)!;
        const weaponOrSpell = att.weapon;

        // --- SAVING THROW LOGIC ---
        if (weaponOrSpell.isSpell && weaponOrSpell.spellData.resolution === 'saving_throw') {
            const dc = weaponOrSpell.save_dc;
            const saveAbility = weaponOrSpell.saving_throw_ability;
            
            // Se il bersaglio è il giocatore, attendi il suo tiro
            if (t.type === 'player') {
                this.gc.setState(draft => {
                    draft.phase = 'AWAITING_SAVING_THROW';
                    draft.currentSavingThrow = {
                        characterId: t.id,
                        ability: saveAbility,
                        dc: dc,
                        sourceCasterId: att.id,
                        sourceId: weaponOrSpell.spellData.id
                    };
                    this.gc.addLog(draft, `<b>${t.name}</b> deve superare un Tiro Salvezza su ${saveAbility} con CD ${dc}. Tira un D20.`);
                });
                const rolls = await this.gc.requestPlayerRoll();
                this._resolveManualSavingThrow(rolls[0]);

            } else { // Altrimenti, il tiro del nemico è automatico
                 this.gc.setState(draft => {
                    this.gc.addLog(draft, `<b>${t.name}</b> deve superare un Tiro Salvezza su ${saveAbility} con CD ${dc}.`);
                    const roll = Math.floor(Math.random() * 20) + 1;
                    let modifier = t.modifiers[saveAbility];
                    if (t.saving_throw_proficiencies.includes(saveAbility)) {
                        modifier += t.proficiency_bonus;
                    }
                    const total = roll + modifier;
                    this.gc.addLog(draft, `<b>${t.name}</b> tira ${total} (${roll} + ${modifier})`);
                    if (total < dc) {
                        this.gc.addLog(draft, 'Tiro salvezza fallito!', 'error');
                        this._applySpellEffects(draft, att, t, weaponOrSpell.spellData);
                    } else {
                        this.gc.addLog(draft, 'Tiro salvezza superato!', 'success');
                        this.gc.addFloatingText(draft, 'SALVATO!', {x: t.x, y: t.y}, 'success');
                    }
                });
            }
            return;
        }

        // --- ATTACK ROLL LOGIC ---
        this.gc.setState(draft => {
            const att = this.gc.getCharacter(attacker.id, draft)!;
            const t = this.gc.getCharacter(target.id, draft)!;
            const isRanged = (weaponOrSpell?.range || 1) > 1;
            const advantageState = this._getAdvantageState(att, t, isRanged);
            const rolls = [Math.floor(Math.random() * 20) + 1];
            if (advantageState !== 'normal') rolls.push(Math.floor(Math.random() * 20) + 1);
            const roll = advantageState === 'advantage' ? Math.max(...rolls) : advantageState === 'disadvantage' ? Math.min(...rolls) : rolls[0];
    
            // Consuma l'effetto di svantaggio se usato
            const disadvEffect = att.hasTemporaryEffect('disadvantage_on_next_attack');
            if (disadvEffect) {
                att.removeTemporaryEffect(disadvEffect.id);
                this.gc.addLog(draft, `(Svantaggio applicato da un effetto precedente)`, 'info');
            }

            if (advantageState !== 'normal') {
                this.gc.addLog(draft, `Tiro con ${advantageState}: ${rolls.join(', ')} -> usa <b>${roll}</b>`);
            }

            const coverBonus = this.gc.gridUtils.getCoverBonus(att, t);
            const targetAC = t.ac + coverBonus;
            const totalToHit = roll + weaponOrSpell.attack_modifier;
            const isCrit = roll === 20;
            const isMiss = roll === 1;

            const acLog = coverBonus > 0 ? `vs CA <b>${targetAC}</b> (${t.ac} + ${coverBonus} copertura)` : `vs CA <b>${targetAC}</b>`;
            this.gc.addLog(draft, `Tiro per colpire: ${roll} + ${weaponOrSpell.attack_modifier} = <b>${totalToHit}</b> ${acLog}`);

            if (isMiss || totalToHit < targetAC) {
                const message = isMiss ? 'FALLIMENTO CRITICO!' : 'Mancato!';
                this.gc.addLog(draft, message, 'critical-miss');
                this.gc.addFloatingText(draft, 'MISS', {x: t.x, y: t.y}, 'miss');
                return;
            }
    
            const message = isCrit ? 'COLPO CRITICO!' : 'Colpito!';
            this.gc.addLog(draft, message, 'critical-hit');
            this.gc.addFloatingText(draft, 'HIT', {x: t.x, y: t.y}, 'damage');
            
            let [numDice, dieType] = weaponOrSpell.damage_dice.split('d').map(Number);
            if (isCrit) {
                numDice *= 2;
                if (att.hasFeature('savage_attacks')) {
                    numDice++;
                    this.gc.addLog(draft, `Attacchi Selvaggi: <b>${att.name}</b> lancia un dado danno aggiuntivo!`, 'info');
                }
            }

            this.gc.addLog(draft, `Lancia ${numDice}d${dieType} per i danni.`);
            const damageRolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieType) + 1);
            const rawDamage = damageRolls.reduce((sum, r) => sum + r, 0);
            
            if (weaponOrSpell.isSpell) {
                this._applySpellEffects(draft, att, t, weaponOrSpell.spellData);
            } else {
                this._applyWeaponHit(draft, att, t, rawDamage, damageRolls);
            }
        });
    }
}