import { Character } from './characters.js';
import { sleep } from './utils.js';
import { MAX_ROUNDS, MOVEMENT_ANIMATION_SPEED_MS, DEATH_FADE_DURATION_MS } from './config.js';

export class BattleSimulator {
    constructor(uiManager, gridRenderer) { this.ui = uiManager; this.renderer = gridRenderer; this.animationFrameId = null; this.lastFrameTime = 0; this.reset(); }
    reset() { if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); this.battleData = null; this.characters = []; this.currentTurnIndex = -1; this.roundCount = 0; this.state = { phase: 'IDLE', activeCharacter: null, selectedTarget: null, inspectedCharacter: null, inspectedCell: null, currentAttack: {}, isAnimating: false, characters: [], multiDieRoll: null, attacksMadeThisTurn: 0 }; }
    loadBattle(jsonString) {
        try {
            this.reset();
            this.battleData = JSON.parse(jsonString);
            this.characters = [...this.battleData.player_characters, ...this.battleData.enemies].map(data => new Character(data));
            this.renderer.initializeGrid(this.battleData.grid_size.width, this.battleData.grid_size.height);
            this.state.characters = this.characters; 
            this.ui.showScreen('battle'); this.ui.addLogEntry("La battaglia ha inizio!", "info"); this._startInitiativePhase();
            this.lastFrameTime = performance.now();
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
        } catch (e) { this.ui.elements.errorMsg.textContent = "Errore di parsing del JSON: " + e.message; console.error(e); }
    }
    _startInitiativePhase() {
        this.state.phase = 'INITIATIVE_ROLL_PLAYER';
        const player = this.characters.find(c => c.type === 'player');
        this.state.activeCharacter = player;
        this.state.inspectedCharacter = player;
        this.ui.addLogEntry(`Tocca a <b>${player.name}</b> tirare per l'iniziativa.`, 'info'); this._updateUI();
    }
    _resolveInitiative(playerRoll) {
        this.characters.forEach(char => {
            const roll = char.type === 'player' ? playerRoll : Math.floor(Math.random() * 20) + 1;
            char.initiative = roll + char.initiative_modifier;
            this.ui.addLogEntry(`${char.name} tira iniziativa: ${roll} + ${char.initiative_modifier} = <b>${char.initiative}</b>`);
        });
        this.characters.sort((a, b) => b.initiative - a.initiative);
        const order = this.characters.map(c => c.name).join(' → ');
        this.ui.addLogEntry(`Ordine di iniziativa: ${order}`, "info"); this.startNextTurn();
    }
    async startNextTurn() {
        if (this._checkBattleEnd()) return;
        this.renderer.setHighlight([]);
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.characters.length;
        if (this.currentTurnIndex === 0) { this.roundCount++; this.ui.addLogEntry(`--- Inizio Round ${this.roundCount} ---`, "turn-start"); }
        const activeCharacter = this.characters[this.currentTurnIndex];
        if (!activeCharacter.isAlive()) { this.startNextTurn(); return; }
        
        this._applyHazardousTerrainDamage(activeCharacter);
        if (!activeCharacter.isAlive()) { if(this._checkBattleEnd()) return; this.startNextTurn(); return; }

        this.state.activeCharacter = activeCharacter;
        this.state.activeCharacter.resetForNewTurn();
        this.state.attacksMadeThisTurn = 0;
        this.ui.elements.turnDisplay.innerHTML = `Turno di: <span style="color: var(--color-gold);">${this.state.activeCharacter.name}</span>`;
        this.state.inspectedCharacter = this.state.activeCharacter;
        this.state.phase = 'IDLE';
        this._updateUI();
        if (this.state.activeCharacter.type !== 'player') { await sleep(500); await this._handleEnemyTurn(this.state.activeCharacter); }
    }
    async _handleEnemyTurn(enemy) {
        this.ui.addLogEntry(`È il turno di <b>${enemy.name}</b>.`);
        const players = this.characters.filter(c => c.type === 'player' && c.isAlive());
        if (players.length === 0) { this.endTurn(); return; }
        
        const target = players.sort((a,b) => enemy.getDistance(a.x, a.y) - enemy.getDistance(b.x, b.y))[0];

        switch (enemy.ai_profile) {
            case 'still': break;
            case 'brute':
                if (enemy.getDistance(target.x, target.y) > enemy.speedInCells + 1) { this._performDashAction(enemy, false); }
                await this._moveTowards(enemy, target);
                if (enemy.getDistance(target.x, target.y) <= 1) {
                    for (let i = 0; i < enemy.attacks_per_action; i++) {
                        if (!target.isAlive() || this._checkBattleEnd()) break;
                        await this._performAttackAction(enemy, target);
                    }
                }
                break;
            case 'defender':
                const isTargetInArea = target.isInsideArea(enemy.defense_area);
                if (isTargetInArea) {
                    await this._moveTowards(enemy, target);
                    if (enemy.getDistance(target.x, target.y) <= 1) {
                        for (let i = 0; i < enemy.attacks_per_action; i++) {
                             if (!target.isAlive() || this._checkBattleEnd()) break;
                             await this._performAttackAction(enemy, target);
                        }
                    }
                } else { this._performDodgeAction(enemy, false); }
                break;
        }
        await sleep(500); this.endTurn();
    }
    endTurn() { if(this.state.isAnimating) return; if (this.state.activeCharacter) { this.renderer.setHighlight([]); this.ui.addLogEntry(`<b>${this.state.activeCharacter.name}</b> termina il suo turno.`); } this.startNextTurn(); }
    handleCanvasClick(cell) {
        if (this.state.isAnimating) return;
        this.state.inspectedCell = cell;
        const targetChar = this.characters.find(c => c.x === cell.x && c.y === cell.y && c.isAlive());
        if (this.state.activeCharacter?.type === 'player') {
            if (this.state.phase === 'AWAITING_MOVE_TARGET') { this._handleMoveAction(cell); return; }
            if (this.state.phase === 'AWAITING_ATTACK_TARGET' || this.state.phase === 'AWAITING_EXTRA_ATTACK') { this._handleAttackTargetSelection(targetChar); return; }
        }
        if (targetChar) { this.state.inspectedCharacter = targetChar; } 
        else { const terrainFeature = this._getTerrainFeatureAt(cell.x, cell.y); this.state.inspectedCharacter = terrainFeature || { name: 'Terreno Semplice', description: 'Nessun effetto particolare.' }; }
        this._updateUI();
    }
    toggleAction(action) { 
        if (this.state.isAnimating || this.state.activeCharacter?.type !== 'player') return;
        if (this.state.phase === 'AWAITING_EXTRA_ATTACK' && action !== 'attack') return;
        
        if (action === 'attack' && this.state.activeCharacter.actionsRemaining > 0) {
            this.state.phase = 'AWAITING_ATTACK_TARGET';
            this.renderer.setHighlight([]);
        } else if (action === 'move') {
            if (this.state.phase === 'AWAITING_MOVE_TARGET') {
                this.state.phase = 'IDLE';
                this.renderer.setHighlight([]);
            } else {
                this.state.phase = 'AWAITING_MOVE_TARGET';
                this.calculateAndSetMovementHighlight();
            }
        }
        this._updateUI();
    }
    calculateAndSetMovementHighlight() {
        const { activeCharacter } = this.state;
        const reachableCells = [];
        for (let x = 0; x < this.renderer.gridWidth; x++) {
            for (let y = 0; y < this.renderer.gridHeight; y++) {
                const path = this._findPath(activeCharacter.x, activeCharacter.y, x, y);
                if (path && path.cost <= activeCharacter.remainingMovement) {
                    reachableCells.push({ x, y });
                }
            }
        }
        this.renderer.setHighlight(reachableCells);
    }
    performDash() { if (this.state.activeCharacter.actionsRemaining > 0) { this.state.activeCharacter.actionsRemaining = 0; this._performDashAction(this.state.activeCharacter, true); this.state.phase = 'IDLE'; this._updateUI(); } }
    performDisengage() { if (this.state.activeCharacter.actionsRemaining > 0) { this.state.activeCharacter.actionsRemaining = 0; this._performDisengageAction(this.state.activeCharacter, true); this.state.phase = 'IDLE'; this._updateUI(); } }
    performDodge() { if (this.state.activeCharacter.actionsRemaining > 0) { this.state.activeCharacter.actionsRemaining = 0; this._performDodgeAction(this.state.activeCharacter, true); this.state.phase = 'IDLE'; this._updateUI(); } }
    performUsePotion() {
        const char = this.state.activeCharacter;
        if (char.actionsRemaining <= 0 || !char.hasItem("Pozione di Guarigione")) return;
        char.actionsRemaining = 0;
        char.removeItem("Pozione di Guarigione");
        this.state.phase = 'ROLLING_HEAL';
        this.ui.addLogEntry("Bevi una pozione di guarigione (2d4+2). Tira un d4.");
        this.state.multiDieRoll = { total: 2, dieType: 4, rolled: 0, results: [] };
        this._updateUI();
    }
    _performDashAction(char, updateUI = true) { char.remainingMovement += char.speedInCells; this.ui.addLogEntry(`<b>${char.name}</b> Scatta, guadagnando movimento extra.`, 'info'); if(updateUI) this._updateUI(); }
    _performDisengageAction(char, updateUI = true) { char.isDisengaging = true; this.ui.addLogEntry(`<b>${char.name}</b> si Disimpegna.`, 'info'); if(updateUI) this._updateUI(); }
    _performDodgeAction(char, updateUI = true) { char.isDodging = true; this.ui.addLogEntry(`<b>${char.name}</b> prende una posizione difensiva (Schivata).`, 'info'); if(updateUI) this._updateUI(); }
    
    async handleDiceRoll(dieType, rolls) {
        if (this.state.isAnimating) return;
        const chosenRoll = this._getRollFromAdvantage(rolls, this.state.currentAttack?.advantageState);

        if (this.state.phase === 'AWAITING_MANUAL_DAMAGE_ROLL') {
            const multiRoll = this.state.multiDieRoll;
            multiRoll.results.push(chosenRoll);
            multiRoll.rolled++;
            this.ui.addLogEntry(`Lanciato D${multiRoll.dieType}: ${chosenRoll} (${multiRoll.rolled}/${multiRoll.total})`, 'info');
            if (multiRoll.rolled >= multiRoll.total) { await this._resolveDamageRoll(multiRoll.results); }
            else { this._updateUI(); }
            return;
        }
        if (this.state.phase === 'ROLLING_HEAL') {
             const multiRoll = this.state.multiDieRoll;
             multiRoll.results.push(chosenRoll);
             multiRoll.rolled++;
             this.ui.addLogEntry(`Lancio per cura: ${chosenRoll} (${multiRoll.rolled}/${multiRoll.total})`, 'heal');
             if(multiRoll.rolled >= multiRoll.total) { this._resolveHealingRoll(multiRoll.results); }
             else { this._updateUI(); }
             return;
        }

        this.ui.addLogEntry(`Lanciato <i class="fas fa-dice"></i> D${dieType}: <b>${chosenRoll}</b>`);
        switch (this.state.phase) {
            case 'INITIATIVE_ROLL_PLAYER': this._resolveInitiative(chosenRoll); break;
            case 'ROLLING_ATTACK': this._resolveAttackRoll(chosenRoll, rolls); break;
        }
    }
    async _handleMoveAction(cell) {
        const mover = this.state.activeCharacter;
        const targetChar = this.characters.find(c => c.x === cell.x && c.y === cell.y && c.isAlive());
        if (targetChar && targetChar.id !== mover.id) { this.renderer.addFloatingText("Occupata!", cell.x, cell.y, 'info'); return; }
        const pathData = this._findPath(mover.x, mover.y, cell.x, cell.y);
        if (!pathData || pathData.path.length <= 1) return;
        if (pathData.cost > mover.remainingMovement) { this.renderer.addFloatingText("Lontano!", cell.x, cell.y, 'info'); return; }
        this.state.phase = 'IDLE';
        this.renderer.setHighlight([]);
        this.ui.updateControls(this.state);
        await this._executeMovement(mover, pathData);
    }
    async _executeMovement(mover, pathData) {
        mover.remainingMovement -= pathData.cost;
        this.ui.addLogEntry(`<b>${mover.name}</b> si muove di ${pathData.path.length - 1} caselle.`);
        const oldPos = {x: mover.x, y: mover.y};
        mover.animation.currentPath = pathData.path; mover.animation.isMoving = true; mover.animation.pathProgress = 0; mover.animation.startTime = performance.now();
        this.state.isAnimating = true; this._updateUI();
        await this._waitForAnimationCompletion(mover);
        this._applyHazardousTerrainDamage(mover, oldPos);
        await this._checkAndPerformOpportunityAttacks(mover, oldPos);
    }
    _handleAttackTargetSelection(target) {
        if (!target || target.type !== 'enemy' || !target.isAlive()) return;
        if (this.state.activeCharacter.getDistance(target.x, target.y) > 1) { this.renderer.addFloatingText("Fuori Portata!", target.x, target.y, 'info'); return; }
        if (this.state.attacksMadeThisTurn === 0) { this.state.activeCharacter.actionsRemaining = 0; }

        this.state.selectedTarget = target;
        const attacker = this.state.activeCharacter;
        const isAttackerInDarkness = this._isCharacterInDarkness(attacker);
        const isTargetInDarkness = this._isCharacterInDarkness(target);
        let advantageState = 'normal';
        if (isAttackerInDarkness && !attacker.hasFeature('darkvision')) advantageState = 'disadvantage';
        if (isTargetInDarkness && !target.hasFeature('darkvision')) advantageState = 'advantage';
        if (target.isDodging && advantageState !== 'advantage') { advantageState = 'disadvantage'; }

        this.state.currentAttack = { attacker, target, advantageState };
        this.state.phase = 'ROLLING_ATTACK';
        const advantageText = advantageState !== 'normal' ? ` (con ${advantageState})` : '';
        this.ui.addLogEntry(`<b>${attacker.name}</b> prende la mira su <b>${target.name}</b>${advantageText}... (lancia un D20)`);
        this._updateUI();
    }
    _resolveAttackRoll(roll, allRolls) {
        const { attacker, target, advantageState } = this.state.currentAttack;
        if (advantageState !== 'normal') { this.ui.addLogEntry(`Tiro con ${advantageState}: ${allRolls.join(', ')} -> usa <b>${roll}</b>`); }
        if (roll === 1) {
            this.ui.addLogEntry(`FALLIMENTO CRITICO!`, 'critical-miss'); this.renderer.addFloatingText("CRITICAL MISS!", target.x, target.y, 'error');
            this._handleAttackCompletion();
            return;
        }
        const coverBonus = this._getCoverBonus(attacker, target);
        const targetAC = target.ac + coverBonus;
        const acLog = coverBonus > 0 ? `vs CA ${targetAC} (${target.ac} + ${coverBonus} per copertura)` : `vs CA ${target.ac}`;
        const total = roll + attacker.weapon.attack_modifier;
        this.ui.addLogEntry(`Attacco: ${roll} + ${attacker.weapon.attack_modifier} = <b>${total}</b> ${acLog}.`);
        if (roll === 20 || total >= targetAC) {
            this.state.currentAttack.isCriticalHit = (roll === 20);
            if(this.state.currentAttack.isCriticalHit) { this.ui.addLogEntry(`CRITICO!`, 'critical-hit'); this.renderer.addFloatingText("CRITICAL HIT!", target.x, target.y, 'critical'); }
            else { this.renderer.addFloatingText("COLPITO!", target.x, target.y, 'damage'); }
            let [numDice, dieType] = attacker.weapon.damage_dice.split('d').map(Number);
            if (this.state.currentAttack.isCriticalHit) {
                numDice *= 2;
                if (attacker.hasFeature('savage_attacks')) { numDice += 1; this.ui.addLogEntry(`Attacchi Selvaggi! Aggiunto un dado di danno extra.`, 'info'); }
            }
            this.state.multiDieRoll = { total: numDice, dieType: dieType, rolled: 0, results: [] };
            this.state.phase = 'AWAITING_MANUAL_DAMAGE_ROLL';
            this.ui.addLogEntry(`Lancia ${numDice}d${dieType} per i danni.`);
        } else {
            this.renderer.addFloatingText("MANCATO!", target.x, target.y, 'miss');
            this._handleAttackCompletion();
        }
        this._updateUI();
    }
    _handleAttackCompletion() {
        const attacker = this.state.activeCharacter;
        this.state.attacksMadeThisTurn++;
        if (this.state.attacksMadeThisTurn >= attacker.attacks_per_action) {
            this.state.phase = 'IDLE';
        } else {
            this.state.phase = 'AWAITING_EXTRA_ATTACK';
        }
        this._updateUI();
    }
    async _resolveDamageRoll(rolls) {
        const { attacker, target } = this.state.currentAttack;
        const damageModifier = attacker.getDamageModifier();
        const totalDamage = rolls.reduce((sum, roll) => sum + roll, 0) + damageModifier;
        const damageLog = `(${rolls.join(' + ')}) + ${damageModifier}`;
        const { actualDamage, logType, preventedDeath } = target.takeDamage(totalDamage, attacker.weapon.damage_type);
        this.renderer.addFloatingText(`-${actualDamage}`, target.x, target.y, 'damage');
        this.ui.addLogEntry(`<b>${target.name}</b> subisce <b>${actualDamage}</b> danni! ${damageLog} -> HP: ${target.hp_current}/${target.hp_max}.`, logType);
        if (preventedDeath) { this.ui.addLogEntry(`<b>${target.name}</b> usa Tenacia Implacabile e rimane a 1 HP!`, 'heal'); }
        if (logType === 'resistance') this.ui.addLogEntry(`(Danno dimezzato per resistenza a ${attacker.weapon.damage_type})`, 'resistance');
        if (logType === 'vulnerability') this.ui.addLogEntry(`(Danno raddoppiato per vulnerabilità a ${attacker.weapon.damage_type})`, 'vulnerability');
        if (!target.isAlive()) {
            this.ui.addLogEntry(`<b>${target.name}</b> è stato sconfitto!`, "damage");
            await this._waitForDeathAnimation(target);
        }
        this.state.multiDieRoll = null;
        this._handleAttackCompletion();
        this._checkBattleEnd();
    }
    _resolveHealingRoll(rolls) {
        const char = this.state.activeCharacter;
        const healing = rolls.reduce((a, b) => a + b, 0) + 2;
        char.heal(healing);
        this.ui.addLogEntry(`<b>${char.name}</b> beve una pozione e recupera <b>${healing}</b> HP! (${rolls.join('+')} + 2)`, 'heal');
        this.renderer.addFloatingText(`+${healing}`, char.x, char.y, 'heal');
        this.state.phase = 'IDLE';
        this._updateUI();
    }
    async _performAttackAction(attacker, target, isOpportunityAttack = false) {
        if (!attacker.isAlive() || !target.isAlive()) return;
        if (isOpportunityAttack) {
            if (attacker.reactionsRemaining <= 0) return;
            attacker.reactionsRemaining--;
        }
        const actionTaker = isOpportunityAttack ? "Reazione" : "Azione";
        this.ui.addLogEntry(`<b>${attacker.name}</b> usa la sua ${actionTaker} per attaccare <b>${target.name}</b>.`);
        const isBlinded = this._isCharacterInDarkness(attacker) && !attacker.hasFeature('darkvision');
        const isTargetBlinded = this._isCharacterInDarkness(target) && !target.hasFeature('darkvision');
        let advantageState = 'normal';
        if (isBlinded) advantageState = 'disadvantage';
        if (isTargetBlinded) advantageState = 'advantage';
        if (target.isDodging && advantageState !== 'advantage') { advantageState = 'disadvantage'; }
        const attackRolls = [Math.floor(Math.random() * 20) + 1];
        if (advantageState !== 'normal') attackRolls.push(Math.floor(Math.random() * 20) + 1);
        const chosenAttackRoll = this._getRollFromAdvantage(attackRolls, advantageState);
        if (advantageState !== 'normal') this.ui.addLogEntry(`Tiro con ${advantageState}: ${attackRolls.join(', ')} -> <b>${chosenAttackRoll}</b>`);
        if (chosenAttackRoll === 1) {
            this.ui.addLogEntry(`FALLIMENTO CRITICO!`, 'critical-miss'); this.renderer.addFloatingText("CRITICAL MISS!", target.x, target.y, 'error');
            await sleep(500); return;
        }
        const coverBonus = this._getCoverBonus(attacker, target);
        const targetAC = target.ac + coverBonus;
        const acLog = coverBonus > 0 ? `vs CA ${targetAC} (${target.ac} + ${coverBonus} per copertura)` : `vs CA ${target.ac}`;
        const attackTotal = chosenAttackRoll + attacker.weapon.attack_modifier;
        this.ui.addLogEntry(`Attacco: ${chosenAttackRoll} + ${attacker.weapon.attack_modifier} = <b>${attackTotal}</b> ${acLog}.`);
        await sleep(500);
        const isCriticalHit = chosenAttackRoll === 20;
        if (isCriticalHit || attackTotal >= targetAC) {
            if (isCriticalHit) this.ui.addLogEntry(`CRITICO!`, 'critical-hit');
            this.renderer.addFloatingText("COLPITO!", target.x, target.y, 'damage');
            let [numDice, dieType] = attacker.weapon.damage_dice.split('d').map(Number);
            if (isCriticalHit) {
                numDice *= 2;
                if (attacker.hasFeature('savage_attacks')) { numDice += 1; this.ui.addLogEntry(`Attacchi Selvaggi! Aggiunto un dado di danno extra.`, 'info'); }
            }
            const damageRolls = [];
            for (let i = 0; i < numDice; i++) { damageRolls.push(Math.floor(Math.random() * dieType) + 1); }
            const damageModifier = attacker.getDamageModifier();
            const totalDamage = damageRolls.reduce((sum, roll) => sum + roll, 0) + damageModifier;
            const damageLog = `(${damageRolls.join(' + ')}) + ${damageModifier}`;
            const { actualDamage, logType, preventedDeath } = target.takeDamage(totalDamage, attacker.weapon.damage_type);
            await sleep(500);
            this.renderer.addFloatingText(`-${actualDamage}`, target.x, target.y, 'damage');
            this.ui.addLogEntry(`<b>${target.name}</b> subisce <b>${actualDamage}</b> danni. ${damageLog}`, logType);
            if (preventedDeath) this.ui.addLogEntry(`<b>${target.name}</b> usa Tenacia Implacabile e rimane a 1 HP!`, 'heal');
            if (logType === 'resistance') this.ui.addLogEntry(`(Danno dimezzato per resistenza a ${attacker.weapon.damage_type})`, 'resistance');
            if (logType === 'vulnerability') this.ui.addLogEntry(`(Danno raddoppiato per vulnerabilità a ${attacker.weapon.damage_type})`, 'vulnerability');
            if (!target.isAlive()) {
                this.ui.addLogEntry(`<b>${target.name}</b> è stato sconfitto!`, "damage");
                await this._waitForDeathAnimation(target);
            }
            if (this._checkBattleEnd()) return;
        } else {
            this.renderer.addFloatingText("MANCATO!", target.x, target.y, 'miss');
        }
        await sleep(500);
    }
    async _checkAndPerformOpportunityAttacks(mover, oldPos) {
        if (mover.isDisengaging) return;
        const opponents = this.characters.filter(c => c.isAlive() && c.id !== mover.id && c.type !== mover.type);
        for (const opponent of opponents) {
            const wasInRange = opponent.getDistance(oldPos.x, oldPos.y) <= 1; const isNowOutOfRange = opponent.getDistance(mover.x, mover.y) > 1;
            if (wasInRange && isNowOutOfRange && opponent.reactionsRemaining > 0) { await this._triggerOpportunityAttack(opponent, mover); }
        }
    }
    async _triggerOpportunityAttack(attacker, target) { this.ui.addLogEntry(`<b>${target.name}</b> provoca un Attacco di Opportunità da <b>${attacker.name}</b>!`, 'oa'); await this._performAttackAction(attacker, target, true); }
    _getTerrainFeatureAt(x, y) {
        return this.battleData.terrain_features?.find(f => f.positions.some(([px, py]) => px === x && py === y));
    }
    _getEffectsAtCell(x, y) {
        const feature = this._getTerrainFeatureAt(x, y);
        return feature ? feature.effects : [];
    }
    _isCharacterInDarkness(char) {
        const effects = this._getEffectsAtCell(char.x, char.y);
        return effects.some(e => e.type === 'darkness');
    }
    _applyHazardousTerrainDamage(char, previousPos = null) {
        const effects = this._getEffectsAtCell(char.x, char.y);
        const hazardEffect = effects.find(e => e.type === 'hazardous_area');
        if (!hazardEffect) return;
        if (previousPos) {
            const prevEffects = this._getEffectsAtCell(previousPos.x, previousPos.y);
            if (prevEffects.some(e => e.type === 'hazardous_area')) return;
        }
        this.ui.addLogEntry(`<b>${char.name}</b> si trova in un'area pericolosa!`, 'vulnerability');
        const [numDice, dieType] = hazardEffect.rules.damage_dice.split('d').map(Number);
        let totalDamage = 0;
        for (let i=0; i<numDice; i++) { totalDamage += Math.floor(Math.random() * dieType) + 1; }
        const { actualDamage } = char.takeDamage(totalDamage, hazardEffect.rules.damage_type);
        this.renderer.addFloatingText(`-${actualDamage}`, char.x, char.y, 'damage');
        this.ui.addLogEntry(`Subisce <b>${actualDamage}</b> danni da ${hazardEffect.rules.damage_type}!`, 'damage');
    }
    _getMovementCost(x, y, isDiagonal) {
        const effects = this._getEffectsAtCell(x, y);
        const isDifficult = effects.some(e => e.type === 'difficult_terrain');
        const baseCost = isDiagonal ? 1.5 : 1;
        return isDifficult ? baseCost * 2 : baseCost;
    }
    async _moveTowards(mover, target) {
        const targetCell = this._findClosestEmptyAdjacentCell(target, mover);
        if (!targetCell) {
            this.ui.addLogEntry(`<b>${mover.name}</b> non può avvicinarsi di più.`);
            return;
        }
        const pathData = this._findPath(mover.x, mover.y, targetCell.x, targetCell.y);
        if (!pathData || pathData.path.length <= 1) return;
        
        let finalPathData = pathData;
        if (pathData.cost > mover.remainingMovement) {
            let reachablePath = { path: [pathData.path[0]], cost: 0 };
            for(let i = 1; i < pathData.path.length; i++) {
                const step = pathData.path[i];
                const prevStep = pathData.path[i-1];
                const stepCost = this._getMovementCost(step.x, step.y, prevStep.x !== step.x && prevStep.y !== step.y);
                if(reachablePath.cost + stepCost > mover.remainingMovement) break;
                reachablePath.path.push(step);
                reachablePath.cost += stepCost;
            }
            finalPathData = reachablePath;
        }
        if (finalPathData.path.length > 1) await this._executeMovement(mover, finalPathData);
    }
    _findPath(startX, startY, endX, endY) {
        const grid = Array(this.renderer.gridHeight).fill(null).map(() => Array(this.renderer.gridWidth).fill(null));
        this.characters.forEach(c => { if(c.isAlive() && !(c.x === startX && c.y === startY)) grid[c.y][c.x] = 'occupied'; });
        if (grid[endY][endX] === 'occupied') return null;

        const q = [{ path: [{x: startX, y: startY}], cost: 0 }];
        const visited = new Map();
        visited.set(`${startX},${startY}`, 0);
        
        const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
        
        while (q.length > 0) {
            q.sort((a, b) => a.cost - b.cost);
            const { path, cost } = q.shift();
            const pos = path[path.length - 1];

            if (pos.x === endX && pos.y === endY) return { path, cost };

            for (const [dx, dy] of dirs) {
                const nX = pos.x + dx;
                const nY = pos.y + dy;
                const key = `${nX},${nY}`;

                if (nX >= 0 && nX < this.renderer.gridWidth && nY >= 0 && nY < this.renderer.gridHeight && grid[nY][nX] !== 'occupied') {
                    const moveCost = this._getMovementCost(nX, nY, dx !== 0 && dy !== 0);
                    const newCost = cost + moveCost;
                    
                    if (!visited.has(key) || newCost < visited.get(key)) {
                        visited.set(key, newCost);
                        q.push({ path: [...path, {x: nX, y: nY}], cost: newCost });
                    }
                }
            }
        }
        return null;
    }
    _findClosestEmptyAdjacentCell(targetChar, movingChar) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].sort(() => Math.random() - 0.5);
        let bestCell = null; let minDistance = Infinity;
        for (const [dx, dy] of dirs) {
            const x = targetChar.x + dx, y = targetChar.y + dy;
            if (x < 0 || y < 0 || x >= this.renderer.gridWidth || y >= this.renderer.gridHeight) continue;
            const isOccupied = this.characters.some(c => c.isAlive() && c.id !== movingChar.id && c.x === x && c.y === y);
            if (!isOccupied) { const dist = movingChar.getDistance(x, y); if (dist < minDistance) { minDistance = dist; bestCell = { x, y }; } }
        }
        return bestCell;
    }
    _getRollFromAdvantage(rolls, advantageState) {
        if (advantageState === 'advantage') { return Math.max(...rolls); }
        else if (advantageState === 'disadvantage') { return Math.min(...rolls); }
        return rolls[0];
    }
    _getLineOfSight(x0, y0, x1, y1) {
        const line = [];
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while(true) {
            line.push({x: x0, y: y0});
            if ((x0 === x1) && (y0 === y1)) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return line;
    }
    _hasLineOfSight(startChar, endChar) {
        const line = this._getLineOfSight(startChar.x, startChar.y, endChar.x, endChar.y);
        for (let i = 1; i < line.length - 1; i++) {
            const cell = line[i];
            const effects = this._getEffectsAtCell(cell.x, cell.y);
            if (effects.some(e => e.type === 'obstacle')) {
                return false;
            }
        }
        return true;
    }
    _getCoverBonus(attacker, target) {
        const line = this._getLineOfSight(attacker.x, attacker.y, target.x, target.y);
        let coverBonus = 0;
        
        for (let i = 1; i < line.length - 1; i++) {
             const cell = line[i];
             if (this.characters.some(c => c.isAlive() && c.id !== attacker.id && c.id !== target.id && c.x === cell.x && c.y === cell.y)) {
                 coverBonus = Math.max(coverBonus, 2);
             }
        }

        for (let i = 1; i < line.length - 1; i++) {
            const cell = line[i];
            const effects = this._getEffectsAtCell(cell.x, cell.y);
            if (effects.some(e => e.type === 'three_quarters_cover')) {
                coverBonus = Math.max(coverBonus, 5);
            } else if (effects.some(e => e.type === 'half_cover')) {
                coverBonus = Math.max(coverBonus, 2);
            }
        }
        
        return coverBonus;
    }
    _gameLoop(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = timestamp - this.lastFrameTime; this.lastFrameTime = timestamp;
        let anyAnimation = false;
        this.characters.forEach(char => {
            if (char.animation.isMoving) {
                anyAnimation = true; const path = char.animation.currentPath;
                if (Array.isArray(path) && path.length > 1) {
                    const totalDuration = (path.length - 1) * MOVEMENT_ANIMATION_SPEED_MS; const elapsed = timestamp - char.animation.startTime;
                    char.animation.pathProgress = Math.min(1.0, elapsed / totalDuration);
                    const fullPathIndex = char.animation.pathProgress * (path.length - 1); const segmentIndex = Math.floor(fullPathIndex); const segmentProgress = fullPathIndex - segmentIndex;
                    const fromIndex = Math.min(segmentIndex, path.length - 2); const toIndex = Math.min(segmentIndex + 1, path.length - 1);
                    if (path[fromIndex] && path[toIndex]) { const from = path[fromIndex]; const to = path[toIndex]; char.animation.displayX = from.x + (to.x - from.x) * segmentProgress; char.animation.displayY = from.y + (to.y - from.y) * segmentProgress; }
                }
            } else { char.animation.displayX = char.x; char.animation.displayY = char.y; }
            if (char.animation.isDying) { anyAnimation = true; char.animation.deathFadeProgress = Math.min(1.0, char.animation.deathFadeProgress + (deltaTime / DEATH_FADE_DURATION_MS)); }
        });
        this.state.isAnimating = anyAnimation;
        this.renderer.draw(this.state, deltaTime, this.battleData);
        this.ui.updateControls(this.state); this.ui.updateInspector(this.state.inspectedCharacter);
        this.animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
    }
    _checkBattleEnd() {
        const playersAlive = this.characters.some(c => c.type === 'player' && c.isAlive());
        const enemiesAlive = this.characters.some(c => c.type === 'enemy' && c.isAlive());
        let outcome = null;
        if (!playersAlive) outcome = "Sconfitta";
        else if (!enemiesAlive) outcome = "Vittoria";
        else if (this.roundCount >= MAX_ROUNDS) outcome = "Stallo";
        if (outcome) {
            this.state.phase = 'BATTLE_ENDED';
            this.ui.elements.outcomeTitle.textContent = outcome;
            this.ui.elements.outputJson.value = this._generateFinalReport(outcome);
            this.ui.showScreen('output');
            cancelAnimationFrame(this.animationFrameId);
            return true;
        }
        return false;
    }
    _generateFinalReport(outcome) {
        return JSON.stringify({
            battle_id: this.battleData.battle_id, outcome: outcome, duration_rounds: this.roundCount,
            final_status: this.characters.map(char => ({ id: char.id, name: char.name, hp_remaining: char.hp_current, status: char.isAlive() ? "conscious" : "defeated", final_position: [char.x, char.y] })),
        }, null, 2);
    }
    _waitForAnimationCompletion(char) {
        return new Promise(resolve => {
            const check = () => {
                if (!char.animation.isMoving || char.animation.pathProgress >= 1.0) {
                    const finalPos = char.animation.currentPath[char.animation.currentPath.length - 1];
                    char.x = finalPos.x; char.y = finalPos.y; char.animation.displayX = finalPos.x; char.animation.displayY = finalPos.y;
                    char.animation.isMoving = false; char.animation.currentPath = []; char.animation.pathProgress = 0;
                    this.renderer.draw(this.state, 0, this.battleData); resolve();
                } else { requestAnimationFrame(check); }
            };
            requestAnimationFrame(check);
        });
    }
    _waitForDeathAnimation(char) {
        return new Promise(resolve => {
            const check = () => {
                if (!char.animation.isDying || char.animation.deathFadeProgress >= 1.0) {
                    char.animation.isDying = false;
                    resolve();
                } else {
                    requestAnimationFrame(check);
                }
            };
            requestAnimationFrame(check);
        });
    }
    _updateUI() { this.ui.updateControls(this.state); this.ui.updateInspector(this.state.inspectedCharacter); }
}