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

import type { CharacterData, CharacterType, Stat, Condition, DamageType, Position, AttackData, Feature, Defenses, InventoryItem, Stats, SpellData, TemporaryEffect, Skill } from '../types';
import { FT_PER_CELL } from '../constants';
import { getModifier } from '../utils';
import { SKILL_TO_STAT_MAP } from '../types';

/**
 * Rappresenta un personaggio nel gioco, con tutte le sue statistiche, stato e capacità.
 * Questa classe incapsula la logica relativa a un singolo personaggio.
 */
export class Character implements CharacterData {
    // Dati di base
    id: string; name: string; type: CharacterType; race?: string; class?: string; level?: number; position: [number, number];
    proficiency_bonus: number; stats: Stats; hp_max: number; hp_current: number; ac: number; speed: number;
    saving_throw_proficiencies: Stat[]; conditions: Condition[]; attacks: AttackData[]; features: Feature[]; defenses: Defenses; inventory: InventoryItem[];
    spells: SpellData[];
    skill_proficiencies: Skill[];
    ai_profile?: 'still' | 'brute' | 'defender' | 'ranged'; defense_area?: [number, number, number, number];
    
    // Stato di gioco
    x: number; y: number; modifiers: Record<Stat, number>; speedInCells: number; initiative: number; weapon: any;
    attacks_per_action: number; remainingMovement: number; actionsRemaining: number; reactionsRemaining: number;
    isDisengaging: boolean; isDodging: boolean; used_features: Record<string, number>;
    temporaryEffects: TemporaryEffect[];
    
    // Stato di animazione
    animation: { displayX: number, displayY: number, isMoving: boolean, currentPath: Position[], pathProgress: number, startTime: number, isDying: boolean, deathFadeProgress: number, isForcedMove?: boolean };

    constructor(data: CharacterData) {
        // Assegna tutte le proprietà dai dati grezzi
        Object.assign(this, data);

        // Inizializza i valori di default per i campi opzionali
        this.inventory = data.inventory || [];
        this.features = data.features || [];
        this.conditions = data.conditions || [];
        this.defenses = data.defenses || { resistances: [], vulnerabilities: [], immunities: {} };
        this.spells = data.spells || [];
        this.saving_throw_proficiencies = data.saving_throw_proficiencies || [];
        this.skill_proficiencies = data.skill_proficiencies || [];
        this.temporaryEffects = data.temporaryEffects || [];
        
        // Imposta lo stato iniziale del gioco
        this.position = data.position || [0, 0];
        [this.x, this.y] = this.position;
        this.hp_current = data.hp_current ?? this.hp_max;
        this.speedInCells = Math.floor((data.speed || 0) / FT_PER_CELL);
        
        // Calcola i modificatori delle statistiche
        this.modifiers = {} as Record<Stat, number>;
        if (this.stats) {
            for (const stat in this.stats) {
                this.modifiers[stat as Stat] = getModifier(this.stats[stat as Stat]);
            }
        }
        
        this.initiative = 0;
        this.weapon = this.setupPrimaryAttack();
        this.attacks_per_action = this.hasFeature('extra_attack') ? 2 : 1;
        this.used_features = {};
        
        // Stato di animazione iniziale
        this.animation = { 
            displayX: this.x, 
            displayY: this.y, 
            isMoving: false, 
            currentPath: [], 
            pathProgress: 0, 
            startTime: 0, 
            isDying: false, 
            deathFadeProgress: 0,
            isForcedMove: false
        };
        
        this.resetForNewTurn();
    }
    
    public resetForNewTurn() {
        if (this.isAlive()) {
            let currentSpeedInCells = this.speedInCells;
            
            const speedReductionEffect = this.hasTemporaryEffect('speed_reduction');
            if (speedReductionEffect && typeof speedReductionEffect.value === 'number') {
                currentSpeedInCells = Math.max(0, currentSpeedInCells - speedReductionEffect.value);
            }
    
            this.remainingMovement = currentSpeedInCells;
            this.actionsRemaining = 1;
            this.reactionsRemaining = 1;
            this.isDisengaging = false;
            this.isDodging = false;
        }
    }

    /**
     * Crea una copia profonda di questo personaggio. Utile per la gestione
     * dello stato immutabile.
     */
    public clone(): Character {
        const cloned = new Character(JSON.parse(JSON.stringify(this)));
        // Ricopia le proprietà non JSON-serializzabili
        cloned.animation = {...this.animation};
        cloned.used_features = {...this.used_features};
        cloned.temporaryEffects = [...this.temporaryEffects];
        return cloned;
    }

    isAlive = () => this.hp_current > 0;
    hasCondition = (c: Condition) => this.conditions.includes(c);
    addCondition(c: Condition) { if (!this.hasCondition(c)) this.conditions.push(c); }
    removeCondition(c: Condition) { this.conditions = this.conditions.filter(cond => cond !== c); }
    hasFeature = (featureId: string) => this.features.some(f => f.id === featureId);
    hasItem = (itemName: string) => this.inventory.some(item => item.name.includes(itemName));
    getDistance = (targetX: number, targetY: number) => Math.max(Math.abs(this.x - targetX), Math.abs(this.y - targetY));
    isInsideArea = (area: [number, number, number, number]) => {
        if (!area || area.length !== 4) return false;
        const [x1, y1, x2, y2] = area;
        return this.x >= Math.min(x1, x2) && this.x <= Math.max(x1, x2) &&
               this.y >= Math.min(y1, y2) && this.y <= Math.max(y1, y2);
    }
    
    public getSkillModifier(skill: Skill): number {
        if (!SKILL_TO_STAT_MAP[skill]) return 0;

        const governingStat = SKILL_TO_STAT_MAP[skill];
        const statModifier = this.modifiers[governingStat] || 0;
        
        const isProficient = this.skill_proficiencies.includes(skill);
        const proficiencyBonus = isProficient ? this.proficiency_bonus : 0;
        
        return statModifier + proficiencyBonus;
    }
    
    addTemporaryEffect(effectId: string, sourceCasterId: string, value: any) {
        this.temporaryEffects.push({ id: `${effectId}-${Date.now()}`, effectId, sourceCasterId, value });
    }
    
    removeTemporaryEffectsFromCaster(casterId: string) {
        const effectsToKeep = ['disadvantage_on_next_attack'];

        this.temporaryEffects = this.temporaryEffects.filter(eff => 
            eff.sourceCasterId !== casterId || effectsToKeep.includes(eff.effectId)
        );
    }

    removeTemporaryEffect(id: string) {
        this.temporaryEffects = this.temporaryEffects.filter(eff => eff.id !== id);
    }
    
    hasTemporaryEffect(effectId: string): TemporaryEffect | undefined {
        return this.temporaryEffects.find(eff => eff.effectId === effectId);
    }

    canUseFeature(featureId: string): boolean {
        const feature = this.features.find(f => f.id === featureId);
        if (!feature) return false;
        if (feature.cost?.type === 'uses') {
            const usedCount = this.used_features[featureId] || 0;
            return usedCount < feature.cost.max_uses;
        }
        return true;
    }

    useFeature(featureId: string) {
        const feature = this.features.find(f => f.id === featureId);
        if (feature?.cost?.type === 'uses') {
            this.used_features[featureId] = (this.used_features[featureId] || 0) + 1;
        }
    }
    
    setupPrimaryAttack() {
        if (this.attacks && this.attacks.length > 0) {
            const mainAttack = this.attacks[0];
            return {
                ...mainAttack,
                attack_modifier: this.modifiers[mainAttack.attack_source_stat] + this.proficiency_bonus,
                damage_modifier: this.modifiers[mainAttack.damage_source_stat],
                range: mainAttack.range || 1,
                isSpell: false 
            };
        }
    
        if (this.spells && this.spells.length > 0) {
            const mainSpell = this.spells[0];
            const damageEffect = mainSpell.effects_on_hit.find(e => e.type === 'damage');

            if (mainSpell.resolution === 'attack_roll' && mainSpell.attack_source_stat) {
                return {
                    name: mainSpell.name,
                    type: mainSpell.range > 1 ? 'ranged' : 'melee',
                    range: mainSpell.range,
                    attack_source_stat: mainSpell.attack_source_stat,
                    attack_modifier: this.modifiers[mainSpell.attack_source_stat] + this.proficiency_bonus,
                    damage_dice: damageEffect?.dice || '0d0',
                    damage_type: damageEffect?.damage_type || 'force',
                    damage_modifier: 0,
                    isSpell: true,
                    spellData: mainSpell
                };
            }
             if (mainSpell.resolution === 'saving_throw' && mainSpell.saving_throw_ability) {
                return {
                    name: mainSpell.name,
                    type: 'ranged',
                    range: mainSpell.range,
                    damage_dice: damageEffect?.dice || '0d0',
                    damage_type: damageEffect?.damage_type || 'force',
                    damage_modifier: 0,
                    isSpell: true,
                    spellData: mainSpell,
                    save_dc: 8 + this.proficiency_bonus + this.modifiers[mainSpell.saving_throw_ability],
                    saving_throw_ability: mainSpell.saving_throw_ability
                };
            }
        }
    
        return { name: "Nessun Attacco", damage_dice: "0d0", attack_modifier: -5, damage_modifier: 0, range: 1, isSpell: false };
    }
    
    takeDamage(amount: number, type: DamageType) {
        let finalDamage = amount;
        let logType = 'damage';
        let preventedDeath = false;

        if (this.defenses.resistances?.includes(type)) {
            finalDamage = Math.floor(finalDamage / 2);
            logType = 'resistance';
        }
        if (this.defenses.vulnerabilities?.includes(type)) {
            finalDamage *= 2;
            logType = 'vulnerability';
        }
        if (this.defenses.immunities?.damage_types?.includes(type)) {
            finalDamage = 0;
            logType = 'info';
        }
        
        if (this.isAlive() && (this.hp_current - finalDamage) <= 0 && this.canUseFeature('relentless_endurance')) {
            this.useFeature('relentless_endurance');
            finalDamage = this.hp_current - 1;
            preventedDeath = true;
        }

        const initialHp = this.hp_current;
        this.hp_current = Math.max(0, this.hp_current - finalDamage);
        if (this.hp_current === 0 && initialHp > 0) {
            this.animation.isDying = true;
            this.animation.deathFadeProgress = 0;
        }
        
        return { actualDamage: initialHp - this.hp_current, logType, preventedDeath };
    }
    
    heal(amount: number) { this.hp_current = Math.min(this.hp_max, this.hp_current + amount); }

    removeItem(itemName: string): boolean {
        const index = this.inventory.findIndex(i => i.name.includes(itemName));
        if (index > -1) {
            this.inventory.splice(index, 1);
            return true;
        }
        return false;
    }
}