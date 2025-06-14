import { UIManager } from './uiManager.js';
import { GridRenderer } from './gridRenderer.js';
import { BattleSimulator } from './battleSimulator.js';

document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    const gridRenderer = new GridRenderer('battleCanvas');
    // Non è più necessario passare il simulatore al renderer
    const battleSim = new BattleSimulator(uiManager, gridRenderer);

    // --- Tab Switching Logic ---
    const infoTabBtn = document.getElementById('info-tab-btn');
    const logTabBtn = document.getElementById('log-tab-btn');
    const infoPanel = document.getElementById('info-panel');
    const logPanel = document.getElementById('log-panel');
    infoTabBtn.addEventListener('click', () => { infoTabBtn.classList.add('active'); logTabBtn.classList.remove('active'); infoPanel.classList.add('active'); logPanel.classList.remove('active'); });
    logTabBtn.addEventListener('click', () => { logTabBtn.classList.add('active'); infoTabBtn.classList.remove('active'); logPanel.classList.add('active'); infoPanel.classList.remove('active'); });

    // --- Standard Event Listeners ---
    uiManager.elements.loadBtn.addEventListener('click', () => { battleSim.loadBattle(uiManager.elements.battleInput.value); });
    uiManager.elements.copyBtn.addEventListener('click', () => { uiManager.elements.outputJson.select(); document.execCommand('copy'); alert('Resoconto JSON copiato!'); });
    
    gridRenderer.canvas.addEventListener('click', (event) => { battleSim.handleCanvasClick(gridRenderer.getCellFromCoordinates(event)); });
    gridRenderer.canvas.addEventListener('touchstart', (event) => { event.preventDefault(); battleSim.handleCanvasClick(gridRenderer.getCellFromCoordinates(event)); }, { passive: false });
    
    uiManager.elements.buttons.move.addEventListener('click', () => battleSim.toggleAction('move'));
    uiManager.elements.buttons.attack.addEventListener('click', () => battleSim.toggleAction('attack'));
    uiManager.elements.buttons.dash.addEventListener('click', () => battleSim.performDash());
    uiManager.elements.buttons.disengage.addEventListener('click', () => battleSim.performDisengage());
    uiManager.elements.buttons.dodge.addEventListener('click', () => battleSim.performDodge());
    uiManager.elements.buttons.usePotion.addEventListener('click', () => battleSim.performUsePotion());
    uiManager.elements.buttons.endTurn.addEventListener('click', () => battleSim.endTurn());

    Object.entries(uiManager.elements.dice).forEach(([key, button]) => {
        button.addEventListener('click', () => {
            if (button.disabled) return;
            const dieType = parseInt(key.substring(1));
            const rolls = [Math.floor(Math.random() * dieType) + 1];
            if (dieType === 20 && battleSim.state.phase === 'ROLLING_ATTACK') { rolls.push(Math.floor(Math.random() * 20) + 1); }
            if (dieType === 4 && battleSim.state.phase === 'ROLLING_HEAL') { 
                rolls.push(Math.floor(Math.random() * 4) + 1); 
            }
            battleSim.handleDiceRoll(dieType, rolls);
        });
    });
});