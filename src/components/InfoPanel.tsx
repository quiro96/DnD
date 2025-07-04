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

import React from 'react';
import type { GameState, Stat, SpellEffect, TemporaryEffect } from '../types';
import { SKILLS, SKILL_TO_STAT_MAP } from '../types';

interface InfoPanelProps {
    item: GameState['inspectedItem'];
}

export const InfoPanel = ({ item }: InfoPanelProps) => {
    if (!item) return <div id="info-panel" className="tab-panel active"><div className="placeholder">Clicca su una casella per ispezionarla.</div></div>;

    const renderContent = () => {
        if ('stats' in item) { // It's a Character
            const hpPercentage = (item.hp_max > 0 ? (item.hp_current / item.hp_max) : 0) * 100;
            const statOrder: Stat[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
            const conditionsString = item.conditions && item.conditions.length > 0
                ? ` (${item.conditions.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')})`
                : '';

            const formatEffect = (effect: SpellEffect) => {
                switch (effect.type) {
                    case 'damage':
                        return `Danno ${effect.dice} ${effect.damage_type}`;
                    case 'speed_reduction':
                        return `Rallenta di ${effect.reduction_cells} caselle`;
                    case 'disadvantage_on_next_attack':
                        return 'Svantaggio al prossimo attacco';
                    default:
                        // This case should not be reachable with the current SpellEffect type
                        return `Effetto sconosciuto: ${effect['type']}`;
                }
            };
            
            const formatTemporaryEffect = (effect: TemporaryEffect) => {
                switch (effect.effectId) {
                    case 'disadvantage_on_next_attack':
                        return 'Svantaggio al prossimo Tiro per Colpire.';
                    case 'speed_reduction':
                        return `Velocità ridotta di ${effect.value} caselle.`;
                    default:
                        return `Effetto sconosciuto: ${effect.effectId}`;
                }
            };

            return (
                <>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h2 id="inspector-name">{item.name}{conditionsString}</h2>
                        <div id="inspector-class">{item.race || ''} {item.class || 'Creatura'}</div>
                    </div>
                    <div className="hp-bar-container"><div id="inspector-hp-bar" style={{ width: `${hpPercentage}%` }}></div></div>
                    <div id="inspector-hp-text">{item.hp_current} / {item.hp_max} HP</div>
                    <div className="inspector-stats-grid">
                        <div className="stat-box"><div className="value">{item.ac}</div><div className="label">AC</div></div>
                        <div className="stat-box"><div className="value">{item.speed}</div><div className="label">Velocità</div></div>
                        {statOrder.map(statKey => (
                            <div className="stat-box" key={statKey}>
                                <div className="label">{statKey.substring(0,3).toUpperCase()}</div>
                                <div className="value">{item.stats[statKey] || 10}</div>
                                <div className="mod">({(item.modifiers[statKey] >= 0 ? '+' : '')}{item.modifiers[statKey] || 0})</div>
                            </div>
                        ))}
                    </div>

                    <div className="inspector-section">
                        <h3>Abilità</h3>
                        <div className="skills-grid">
                            {SKILLS.map(skill => {
                                const modifier = item.getSkillModifier(skill);
                                const isProficient = item.skill_proficiencies.includes(skill);
                                const statAbbr = SKILL_TO_STAT_MAP[skill].substring(0, 3);
                                const skillName = skill.replace(/_/g, ' ');

                                return (
                                    <div key={skill} className="skill-entry" title={`${skillName} (${statAbbr.toUpperCase()})`}>
                                        <span className={`proficiency-dot ${isProficient ? 'proficient' : ''}`}></span>
                                        <span className="skill-modifier">{(modifier >= 0 ? '+' : '')}{modifier}</span>
                                        <span className="skill-name">{skillName}<span className="skill-stat">({statAbbr})</span></span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {item.temporaryEffects && item.temporaryEffects.length > 0 && (
                        <div className="inspector-section">
                            <h3>Effetti Temporanei</h3>
                            <div className="features-info">
                                {item.temporaryEffects.map(effect => (
                                    <span key={effect.id}>
                                        <i className="fas fa-hourglass-half" title="Effetto temporaneo"></i>
                                        {formatTemporaryEffect(effect)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {item.features && item.features.length > 0 && (
                        <div className="inspector-section">
                            <h3>Talenti</h3>
                            <div className="features-info">
                                {item.features.map(feature => (
                                    <span key={feature.id} title={feature.source}>
                                        <i className="fas fa-star"></i>
                                        {feature.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="inspector-section">
                        <h3>Attacco Principale</h3>
                        <div className="weapon-info">
                            <span><i className="fas fa-khanda"></i> {item.weapon?.name || 'Nessuno'}</span>
                            <span><i className="fas fa-bullseye"></i> Bonus Attacco: +{item.weapon?.attack_modifier || 0}</span>
                            <span><i className="fas fa-ruler-horizontal"></i> Portata: {item.weapon?.range || 0} caselle</span>
                            <span><i className="fas fa-dice-d6"></i> Danno: {item.weapon?.damage_dice || '0d0'}{item.weapon?.damage_modifier >= 0 ? '+' : ''}{item.weapon?.damage_modifier} ({item.weapon?.damage_type || 'nessuno'})</span>
                        </div>
                    </div>
                    
                    {item.spells && item.spells.length > 0 && (
                        <div className="inspector-section">
                            <h3>Incantesimi</h3>
                            <div className="spells-info">
                                {item.spells.map(spell => (
                                    <div key={spell.id} className="spell-details">
                                        <span className="spell-name">
                                            <i className="fas fa-wand-sparkles"></i>
                                            {spell.name} (Liv. {spell.level})
                                        </span>
                                        <span>
                                            <i className="fas fa-ruler-horizontal"></i>
                                            Portata: {spell.range} caselle
                                        </span>
                                        {spell.effects_on_hit.map((effect, index) => (
                                            <span key={index}>
                                                <i className="fas fa-bolt"></i>
                                                Effetto: {formatEffect(effect)}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    <div className="inspector-section">
                        <h3>Difese</h3>
                        <div className="defenses-info">
                            <div className="defense-category">
                                <strong>Vulnerabilità:</strong>
                                <span>{item.defenses?.vulnerabilities?.join(', ') || 'Nessuna'}</span>
                            </div>
                            <div className="defense-category">
                                <strong>Resistenze:</strong>
                                <span>{item.defenses?.resistances?.join(', ') || 'Nessuna'}</span>
                            </div>
                            <div className="defense-category">
                                <strong>Immunità Danno:</strong>
                                <span>{item.defenses?.immunities?.damage_types?.join(', ') || 'Nessuna'}</span>
                            </div>
                            <div className="defense-category">
                                <strong>Immunità Condizioni:</strong>
                                <span>{item.defenses?.immunities?.conditions?.join(', ') || 'Nessuna'}</span>
                            </div>
                        </div>
                    </div>
                </>
            );
        }
        if ('effects' in item) { // It's a TerrainFeature
            return (
                 <>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h2 id="inspector-name">{item.name}</h2>
                        <div id="inspector-class">Caratteristica del Terreno</div>
                    </div>
                    <ul style={{ listStylePosition: 'inside', padding: '0 10px', textAlign: 'left' }}>
                        {item.effects.map((effect, i) => <li key={i}><strong>{effect.type.replace(/_/g, ' ')}:</strong> {effect.description}</li>)}
                    </ul>
                 </>
            );
        }
        return ( // It's a generic description or empty cell
            <div style={{ textAlign: 'center', margin: '10px' }}>
                <h2>{item.name}</h2>
                <div>{item.description}</div>
            </div>
        );
    };

    return <div id="info-panel" className="tab-panel active">{renderContent()}</div>;
};