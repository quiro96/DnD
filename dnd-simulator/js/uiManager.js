export class UIManager {
    constructor() {
        this.elements = {
            inputScreen: document.getElementById('input-screen'),
            outputScreen: document.getElementById('output-screen'),
            battleView: document.querySelector('.battle-view-container'),
            battleInput: document.getElementById('battle-input-json'),
            loadBtn: document.getElementById('load-battle-btn'),
            copyBtn: document.getElementById('copy-output-btn'),
            errorMsg: document.getElementById('input-error-message'),
            outputJson: document.getElementById('battle-output-json'),
            outcomeTitle: document.getElementById('outcome-title'),
            inspectorPanel: document.getElementById('info-panel'),
            logContainer: document.getElementById('battle-log'),
            turnDisplay: document.getElementById('turn-display'),
            buttons: {
                move: document.getElementById('move-action-btn'),
                attack: document.getElementById('attack-action-btn'),
                dash: document.getElementById('dash-action-btn'),
                disengage: document.getElementById('disengage-action-btn'),
                dodge: document.getElementById('dodge-action-btn'),
                usePotion: document.getElementById('use-potion-btn'),
                endTurn: document.getElementById('end-turn-btn'),
            },
            dice: Object.fromEntries(['d4', 'd6', 'd8', 'd10', 'd20', 'd100'].map(d => [d, document.getElementById(`${d}-btn`)]))
        };
    }
    showScreen(screenName) {
        this.elements.inputScreen.classList.remove('active');
        this.elements.outputScreen.classList.remove('active');
        this.elements.battleView.style.display = 'none';
        if (screenName === 'input') { this.elements.inputScreen.classList.add('active'); }
        else if (screenName === 'output') { this.elements.outputScreen.classList.add('active'); }
        else if (screenName === 'battle') { this.elements.battleView.style.display = 'flex'; }
    }
    updateInspector(item) {
        if (!item) {
            this.elements.inspectorPanel.innerHTML = `<div class="placeholder">Clicca su una casella per ispezionarla.</div>`;
            return;
        }

        // Caso 1: È un personaggio (ha le statistiche)
        if (item.stats) {
            const hpPercentage = (item.hp_max > 0 ? (item.hp_current / item.hp_max) : 0) * 100;
            let statsHtml = '';
            const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
            statOrder.forEach(statKey => {
                const statName = statKey.substring(0,3).toUpperCase();
                const score = item.stats[statKey] || 10;
                const mod = item.modifiers[statKey] || 0;
                statsHtml += `<div class="stat-box"><div class="label">${statName}</div><div class="value">${score}</div><div class="mod">(${(mod >= 0 ? '+' : '')}${mod})</div></div>`;
            });
            this.elements.inspectorPanel.innerHTML = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h2 id="inspector-name">${item.name}</h2>
                    <div id="inspector-class">${item.race || ''} ${item.class || 'Creatura'}</div>
                </div>
                <div class="hp-bar-container"> <div id="inspector-hp-bar" style="width: ${hpPercentage}%;"></div> </div>
                <div id="inspector-hp-text">${item.hp_current} / ${item.hp_max} HP</div>
                <div class="inspector-stats-grid">
                    <div class="stat-box"><div class="value">${item.ac}</div><div class="label">AC</div></div>
                    <div class="stat-box"><div class="value">${item.speed}</div><div class="label">Velocità</div></div>
                    ${statsHtml}
                </div>`;
            return;
        }

        // Caso 2: È una caratteristica del terreno (ha la proprietà 'effects')
        if (item.effects) {
            let effectsHtml = item.effects.map(effect => `<li><strong>${effect.type.replace(/_/g, ' ')}:</strong> ${effect.description}</li>`).join('');
            this.elements.inspectorPanel.innerHTML = `
               <div style="text-align: center; margin-bottom: 10px;">
                   <h2 id="inspector-name">${item.name}</h2>
                   <div id="inspector-class">Caratteristica del Terreno</div>
               </div>
               <ul style="list-style-position: inside; padding: 0 10px; text-align: left;">${effectsHtml}</ul>
            `;
            return;
        }

        // Caso 3: Cella vuota o altro
        this.elements.inspectorPanel.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <h2 id="inspector-name">${item.name || 'Terreno'}</h2>
                <div id="inspector-class">${item.description || 'Nessun effetto particolare.'}</div>
            </div>`;
    }
    
    addLogEntry(text, type = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = text;
        this.elements.logContainer.appendChild(entry);
        this.elements.logContainer.parentElement.scrollTop = this.elements.logContainer.scrollHeight;
    }
    updateControls(state) {
        const { phase, activeCharacter, isAnimating } = state;
        Object.values(this.elements.buttons).forEach(b => {
            b.disabled = true;
            b.classList.remove('active-mode');
        });
        Object.values(this.elements.dice).forEach(b => {
            b.disabled = true;
            b.classList.remove('active-die');
        });
        if (isAnimating || phase === 'BATTLE_ENDED') return;
        
        const isPlayerTurn = activeCharacter?.type === 'player' && activeCharacter.isAlive();
        if (!isPlayerTurn) return;

        const rollPhases = ['INITIATIVE_ROLL_PLAYER', 'ROLLING_ATTACK', 'AWAITING_MANUAL_DAMAGE_ROLL', 'ROLLING_HEAL'];
        if (rollPhases.includes(phase)) {
            let dieToActivate = null;
            if (phase === 'INITIATIVE_ROLL_PLAYER' || phase === 'ROLLING_ATTACK') dieToActivate = 'd20';
            else if (phase === 'ROLLING_HEAL') dieToActivate = 'd4';
            else if (phase === 'AWAITING_MANUAL_DAMAGE_ROLL') dieToActivate = `d${state.multiDieRoll.dieType}`;
            
            if (dieToActivate && this.elements.dice[dieToActivate]) {
                this.elements.dice[dieToActivate].disabled = false;
                this.elements.dice[dieToActivate].classList.add('active-die');
            }
            return;
        }
        
        this.elements.buttons.endTurn.disabled = false;
        
        if (phase === 'AWAITING_EXTRA_ATTACK') {
            this.elements.buttons.attack.disabled = false;
            this.elements.buttons.attack.classList.add('active-mode');
            this.elements.buttons.move.disabled = activeCharacter.remainingMovement <= 0;
        } else if (phase === 'IDLE' && activeCharacter.actionsRemaining > 0) {
            this.elements.buttons.move.disabled = activeCharacter.remainingMovement <= 0;
            this.elements.buttons.attack.disabled = false;
            this.elements.buttons.dash.disabled = false;
            this.elements.buttons.disengage.disabled = false;
            this.elements.buttons.dodge.disabled = false;
            this.elements.buttons.usePotion.disabled = !activeCharacter.hasItem('Pozione di Guarigione');
        } else if (phase === 'IDLE' && activeCharacter.actionsRemaining === 0) {
            this.elements.buttons.move.disabled = activeCharacter.remainingMovement <= 0;
        }

        if (phase === 'AWAITING_MOVE_TARGET') this.elements.buttons.move.classList.add('active-mode');
        if (phase === 'AWAITING_ATTACK_TARGET') this.elements.buttons.attack.classList.add('active-mode');
    }
}