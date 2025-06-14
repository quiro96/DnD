import { CELL_SIZE, FLOATING_TEXT_DURATION_MS } from './config.js';

export class GridRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.floatingTexts = [];
        this.highlightedCells = [];
    }

    setHighlight(cells) {
        this.highlightedCells = cells || [];
    }

    initializeGrid(width, height) { this.gridWidth = width; this.gridHeight = height; this.canvas.width = width * CELL_SIZE; this.canvas.height = height * CELL_SIZE; }
    
    addFloatingText(text, x, y, type) {
        const colors = { damage: getComputedStyle(document.documentElement).getPropertyValue('--color-error'), miss: 'white', info: getComputedStyle(document.documentElement).getPropertyValue('--color-arcane-blue'), heal: getComputedStyle(document.documentElement).getPropertyValue('--color-success'), critical: getComputedStyle(document.documentElement).getPropertyValue('--color-gold') };
        this.floatingTexts.push({ text, x, y, color: colors[type] || 'white', life: 1.0 });
    }
    _drawFloatingTexts(deltaTime) {
        this.ctx.font = `bold ${CELL_SIZE * 0.4}px "Cinzel Decorative"`; this.ctx.textAlign = 'center';
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i]; ft.y -= (deltaTime / 1000) * 1.5; ft.life -= deltaTime / FLOATING_TEXT_DURATION_MS;
            if (ft.life <= 0) { this.floatingTexts.splice(i, 1); continue; }
            this.ctx.globalAlpha = ft.life > 0.5 ? 1 : ft.life * 2; this.ctx.fillStyle = ft.color; this.ctx.strokeStyle = 'black'; this.ctx.lineWidth = 2;
            const px = ft.x * CELL_SIZE + CELL_SIZE / 2; const py = ft.y * CELL_SIZE + CELL_SIZE / 2;
            this.ctx.strokeText(ft.text, px, py); this.ctx.fillText(ft.text, px, py);
        }
        this.ctx.globalAlpha = 1.0;
    }
    _drawCharacterToken(char, isActive, isInspected) {
        if (!char.isAlive() && char.animation.deathFadeProgress >= 1.0) return;
        let alpha = 1.0; if (char.animation.isDying) { alpha = 1.0 - char.animation.deathFadeProgress; }
        this.ctx.globalAlpha = alpha;
        const px = char.animation.displayX * CELL_SIZE + CELL_SIZE / 2; const py = char.animation.displayY * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE * 0.4;
        if (isActive) {
            this.ctx.beginPath(); this.ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
            this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-gold-glow');
            this.ctx.fill();
        } else if (isInspected) {
            this.ctx.beginPath(); this.ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
            this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-arcane-glow');
            this.ctx.fill();
        }
        this.ctx.beginPath(); this.ctx.arc(px, py, radius, 0, Math.PI * 2); this.ctx.fillStyle = char.type === 'player' ? 'var(--color-player)' : 'var(--color-enemy)'; this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.8)'; this.ctx.lineWidth = 2; this.ctx.stroke();
        this.ctx.font = `bold ${radius}px "Font Awesome 6 Free"`; this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(char.type === 'player' ? '\uf007' : '\uf6de', px, py);
        if (char.isDodging) { this.ctx.font = `bold ${radius * 0.5}px "Font Awesome 6 Free"`; this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; this.ctx.fillText('\uf3c5', px, py - radius * 0.9); }
        if (char.isAlive() || char.animation.deathFadeProgress < 1.0) {
            const hpPercentage = char.hp_max > 0 ? (char.hp_current / char.hp_max) : 0; const hpBarY = py + radius + 3;
            this.ctx.fillStyle = '#333'; this.ctx.fillRect(px - radius, hpBarY, radius * 2, 4);
            this.ctx.fillStyle = hpPercentage > 0.5 ? 'var(--color-success)' : hpPercentage > 0.25 ? 'var(--color-gold)' : 'var(--color-error)';
            this.ctx.fillRect(px - radius, hpBarY, (radius * 2) * hpPercentage, 4);
        }
        this.ctx.globalAlpha = 1.0;
    }
    
    draw(state, deltaTime, battleData) {
        if (!state || !Array.isArray(state.characters)) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); return; }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const { characters, phase, activeCharacter, inspectedCell } = state;

        for (let x = 0; x < this.gridWidth; x++) { for (let y = 0; y < this.gridHeight; y++) { this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)'; this.ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE); } }
        
        battleData?.terrain_features?.forEach(feature => {
            feature.positions.forEach(([x, y]) => {
                feature.effects.forEach(effect => {
                    let color = 'transparent';
                    if (effect.type === 'difficult_terrain') color = 'rgba(139, 69, 19, 0.2)';
                    else if (effect.type === 'hazardous_area') color = 'rgba(255, 69, 0, 0.2)';
                    else if (effect.type === 'darkness') color = 'rgba(0, 0, 0, 0.4)';
                    else if (effect.type === 'half_cover' || effect.type === 'three_quarters_cover') color = 'rgba(128, 128, 128, 0.3)';

                    if (color !== 'transparent') { this.ctx.fillStyle = color; this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
                });
            });
        });
        
        characters.forEach(char => {
            if (char.ai_profile === 'defender' && char.defense_area) {
                const [x1, y1, x2, y2] = char.defense_area;
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeRect(x1 * CELL_SIZE, y1 * CELL_SIZE, (x2 - x1 + 1) * CELL_SIZE, (y2 - y1 + 1) * CELL_SIZE);
                this.ctx.setLineDash([]);
            }
        });
        
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        this.highlightedCells.forEach(cell => {
            this.ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
        
        if (activeCharacter?.isAlive() && (phase === 'AWAITING_ATTACK_TARGET' || phase === 'AWAITING_EXTRA_ATTACK')) { characters.filter(c => c.type === 'enemy' && c.isAlive() && activeCharacter.getDistance(c.x, c.y) <= 1).forEach(char => { this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; this.ctx.fillRect(char.x * CELL_SIZE, char.y * CELL_SIZE, CELL_SIZE, CELL_SIZE); }); }
        
        characters.forEach(char => this._drawCharacterToken(char, char.id === activeCharacter?.id, state.inspectedCharacter?.id === char.id));

        if (inspectedCell) {
            this.ctx.strokeStyle = 'var(--color-gold)';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(inspectedCell.x * CELL_SIZE + 2, inspectedCell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        this._drawFloatingTexts(deltaTime);
    }
    
    getCellFromCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect(); const scaleX = this.canvas.width / rect.width; const scaleY = this.canvas.height / rect.height;
        const clientX = event.touches ? event.touches[0].clientX : event.clientX; const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        return { x: Math.floor((clientX - rect.left) * scaleX / CELL_SIZE), y: Math.floor((clientY - rect.top) * scaleY / CELL_SIZE) };
    }
}