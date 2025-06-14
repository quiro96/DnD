import { getModifier } from './utils.js';
import { FT_PER_CELL } from './config.js';

export class Character {
    constructor(data) {
        Object.assign(this, data);
        
        this.x = data.position?.[0] || 0;
        this.y = data.position?.[1] || 0;
        
        this.hp_current = data.hp_current ?? this.hp_max;
        this.speedInCells = Math.floor(this.speed / FT_PER_CELL);
        
        this.modifiers = {};
        if (this.stats) {
            for (const stat in this.stats) {
                this.modifiers[stat] = getModifier(this.stats[stat]);
            }
        }

        this.initiative_modifier = this.modifiers.dexterity || 0;
        this.initiative = 0;

        this.weapon = this.setupPrimaryAttack();
        
        this.attacks_per_action = this.hasFeature('extra_attack') ? 2 : 1;

        this.used_features = {};
        this.animation = { displayX: this.x, displayY: this.y, isMoving: false, currentPath: [], pathProgress: 0, startTime: 0, isDying: false, deathFadeProgress: 0 };
        this.resetForNewTurn();
    }
    
    setupPrimaryAttack() {
        if (!this.attacks || this.attacks.length === 0) {
            return { name: "Nessun Attacco", damage_dice: "0d0", attack_modifier: -5, damage_modifier: 0 };
        }
        
        const mainAttackData = this.attacks[0];
        const proficiency = this.proficiency_bonus || 0;

        const attackStatMod = this.modifiers[mainAttackData.attack_source_stat] || 0;
        const damageStatMod = this.modifiers[mainAttackData.damage_source_stat] || 0;

        return {
            name: mainAttackData.name,
            damage_dice: mainAttackData.damage_dice,
            attack_modifier: attackStatMod + proficiency,
            damage_modifier: damageStatMod,
            damage_type: mainAttackData.damage_type || 'physical'
        };
    }

    getDamageModifier() { return this.weapon.damage_modifier || 0; }
    
    hasFeature(featureId) { return this.features?.some(f => f.id === featureId); }
    
    canUseFeature(featureId) {
        const feature = this.features?.find(f => f.id === featureId);
        if (!feature) return false;
        if (feature.cost?.type === 'uses') {
            const usedCount = this.used_features[featureId] || 0;
            return usedCount < feature.cost.max_uses;
        }
        return true;
    }

    useFeature(featureId) {
        const feature = this.features?.find(f => f.id === featureId);
        if (feature?.cost?.type === 'uses') {
            if (!this.used_features[featureId]) {
                this.used_features[featureId] = 0;
            }
            this.used_features[featureId]++;
        }
    }

    isAlive() { return this.hp_current > 0; }
    
    takeDamage(amount, damageType) {
        let finalDamage = amount;
        let logType = "damage";
        let preventedDeath = false;

        if ((this.hp_current - finalDamage) <= 0 && this.canUseFeature('relentless_endurance')) {
            this.useFeature('relentless_endurance');
            finalDamage = this.hp_current - 1;
            preventedDeath = true;
        }
        
        if (this.defenses?.resistances?.includes(damageType)) {
            finalDamage = Math.floor(finalDamage / 2);
            logType = "resistance";
        }
        if (this.defenses?.vulnerabilities?.includes(damageType)) {
            finalDamage = finalDamage * 2;
            logType = "vulnerability";
        }

        const initialHp = this.hp_current;
        this.hp_current = Math.max(0, this.hp_current - finalDamage);
        if (this.hp_current === 0) { this.animation.isDying = true; }
        
        const actualDamage = initialHp - this.hp_current;
        return { actualDamage, logType, preventedDeath };
    }
    
    heal(amount) { this.hp_current = Math.min(this.hp_max, this.hp_current + amount); }

    hasItem(itemName) {
        return this.inventory.some(item => item.name.includes(itemName));
    }

    removeItem(itemName) {
        const itemIndex = this.inventory.findIndex(item => item.name.includes(itemName));
        if (itemIndex > -1) { this.inventory.splice(itemIndex, 1); return true; }
        return false;
    }

    resetForNewTurn() {
        if (this.isAlive()) {
            this.remainingMovement = this.speedInCells;
            this.actionsRemaining = 1; // Always 1 action
            this.reactionsRemaining = 1;
            this.isDisengaging = false; this.isDodging = false;
        }
    }
    
    getDistance(targetX, targetY) { return Math.max(Math.abs(this.x - targetX), Math.abs(this.y - targetY)); }

    // --- FUNZIONE AGGIUNTA QUI ---
    isInsideArea(area) {
        if (!area || area.length !== 4) return false;
        const [x1, y1, x2, y2] = area;
        return this.x >= Math.min(x1, x2) && this.x <= Math.max(x1, x2) &&
               this.y >= Math.min(y1, y2) && this.y <= Math.max(y1, y2);
    }
}