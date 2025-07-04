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

import type { Character } from './models/Character';

export type CharacterType = 'player' | 'enemy';
export type GamePhase =
  | 'IDLE' | 'INITIATIVE_ROLL_PLAYER' | 'INITIATIVE_RESOLVED' | 'AWAITING_MOVE_TARGET' |
  'AWAITING_ATTACK_TARGET' | 'AWAITING_SPELL_TARGET' | 'AWAITING_EXTRA_ATTACK' | 'ROLLING_ATTACK' |
  'AWAITING_MANUAL_DAMAGE_ROLL' | 'AWAITING_SHOVE_TARGET' | 'ROLLING_HEAL' | 'AWAITING_SAVING_THROW' |
  'ENEMY_TURN' | 'BATTLE_ENDED' | 'AI_TURN_COMPLETE' | 'HANDLING_OPPORTUNITY_ATTACK';
export type AdvantageState = 'advantage' | 'disadvantage' | 'normal';
export type DamageType = 'bludgeoning' | 'piercing' | 'slashing' | 'fire' | 'cold' | 'lightning' | 'thunder' | 'acid' | 'poison' | 'radiant' | 'necrotic' | 'psychic' | 'force';
export type Condition = 'prone' | 'blinded';
export type Stat = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
export type FloatingTextType = 'damage' | 'miss' | 'info' | 'heal' | 'critical' | 'error' | 'success';

// --- NEW TYPES ---
export type AppPhase = 'MAIN_MENU' | 'COMBAT_SETUP' | 'NARRATIVE' | 'BATTLE' | 'BATTLE_ENDED';
export interface ChatMessage {
    id: number;
    role: 'user' | 'model' | 'roll';
    text: string;
}
export const SKILLS = [
    'acrobazia', 'addestrare_animali', 'arcano', 'atletica', 'furtivita',
    'inganno', 'intimidire', 'intrattenere', 'intuizione', 'investigare', 'medicina',
    'natura', 'percezione', 'persuasione', 'rapidita_di_mano', 'religione',
    'sopravvivenza', 'storia'
] as const;

export type Skill = typeof SKILLS[number];

export const SKILL_TO_STAT_MAP: Record<Skill, Stat> = {
    'acrobazia': 'dexterity',
    'addestrare_animali': 'wisdom',
    'arcano': 'intelligence',
    'atletica': 'strength',
    'furtivita': 'dexterity',
    'inganno': 'charisma',
    'intimidire': 'charisma',
    'intrattenere': 'charisma',
    'intuizione': 'wisdom',
    'investigare': 'intelligence',
    'medicina': 'wisdom',
    'natura': 'intelligence',
    'percezione': 'wisdom',
    'persuasione': 'charisma',
    'rapidita_di_mano': 'dexterity',
    'religione': 'intelligence',
    'sopravvivenza': 'wisdom',
    'storia': 'intelligence'
};

export interface SkillCheckRequest {
    skill: Skill;
}

// --- END NEW TYPES ---

export interface Position { x: number; y: number; }
export interface Stats { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number; }
export interface AttackData { name: string; type: 'melee' | 'ranged'; range?: number; attack_source_stat: Stat; damage_source_stat: Stat; damage_dice: string; damage_type: DamageType; }
export interface Feature { id: string; name: string; source: string; cost: { type: 'uses'; max_uses: number; } | null; }
export interface Defenses { resistances?: DamageType[]; vulnerabilities?: DamageType[]; immunities?: { damage_types?: DamageType[], conditions?: Condition[] }; }
export interface InventoryItem { id: string; name: string; }

export interface SpellEffect {
    type: 'damage' | 'speed_reduction' | 'disadvantage_on_next_attack';
    dice?: string;
    damage_type?: DamageType;
    reduction_cells?: number;
    duration_turns?: number;
}
export interface SpellData {
    id: string; name: string; level: number; range: number;
    resolution: 'attack_roll' | 'saving_throw';
    attack_source_stat?: Stat;
    saving_throw_ability?: Stat;
    effects_on_hit: SpellEffect[];
}

export interface CharacterData {
    id: string; name: string; type: CharacterType; race?: string; class?: string; level?: number; position: [number, number];
    proficiency_bonus: number; stats: Stats; hp_max: number; hp_current?: number; ac: number; speed: number;
    saving_throw_proficiencies?: Stat[];
    skill_proficiencies?: Skill[];
    conditions?: Condition[]; attacks: AttackData[]; features?: Feature[]; defenses?: Defenses; inventory?: InventoryItem[];
    spells?: SpellData[];
    temporaryEffects?: TemporaryEffect[];
    ai_profile?: 'still' | 'brute' | 'defender' | 'ranged'; defense_area?: [number, number, number, number];
}
export interface TerrainEffect { type: string; description: string; rules?: any; }
export interface TerrainFeature { id: string; name: string; color?: string; positions: [number, number][]; effects: TerrainEffect[]; }
export interface BattleData {
    battle_id: string; grid_size: { width: number; height: number; };
    environment_description: string; terrain_features: TerrainFeature[];
    player_characters: CharacterData[]; enemies: CharacterData[];
}
export interface FloatingText { id: number; text: string; x: number; y: number; color: string; life: number; type: FloatingTextType; delay?: number; }
export interface LogEntry { id: number; text: string; type: string; }
export interface TemporaryEffect { id: string; effectId: string; sourceCasterId: string; value: any; }

export interface SavingThrowData {
    characterId: string;
    ability: Stat;
    dc: number;
    sourceCasterId: string;
    sourceId: string; // spell or feature id
}
export interface GameState {
    phase: GamePhase; battleData: BattleData | null; characters: Character[];
    turnOrder: string[]; currentTurnIndex: number; roundCount: number;
    activeCharacterId: string | null; inspectedCell: Position | null;
    inspectedItem: Character | TerrainFeature | {name: string, description: string} | null;
    highlightedCells: Position[]; floatingTexts: FloatingText[];
    log: LogEntry[]; isAnimating: boolean;
    currentAttack: { 
        attackerId?: string; 
        targetId?: string; 
        advantageState?: AdvantageState; 
        isCriticalHit?: boolean;
        sourceType?: 'weapon' | 'spell';
        sourceId?: string; // id of the spell
    };
    currentSavingThrow: SavingThrowData | null;
    multiDieRoll: { total: number; dieType: number; rolled: number; results: number[]; } | null;
    attacksMadeThisTurn: number;
    opportunityAttacks: { attackerId: string, targetId: string }[] | null;
}

export const initialGameState: GameState = {
    phase: 'IDLE', battleData: null, characters: [], turnOrder: [], currentTurnIndex: -1,
    roundCount: 0, activeCharacterId: null, inspectedCell: null, inspectedItem: null,
    highlightedCells: [], floatingTexts: [], log: [], isAnimating: false,
    currentAttack: {}, multiDieRoll: null, attacksMadeThisTurn: 0, opportunityAttacks: null,
    currentSavingThrow: null,
};

export type GameAction =
  | { type: 'LOAD_BATTLE'; payload: BattleData }
  | { type: 'SET_STATE'; payload: Partial<GameState> }
  | { type: 'ADD_LOG'; payload: { text: string; type?: string } }
  | { type: 'ADD_FLOATING_TEXT'; payload: { text: string; x: number; y: number; type: FloatingTextType; } }
  | { type: 'UPDATE_FLOATING_TEXTS'; payload: FloatingText[] }
  | { type: 'UPDATE_CHARACTER'; payload: Partial<Character> & { id: string } }
  | { type: 'START_TURN'; payload: { turnOrder: string[]; currentTurnIndex: number; roundCount: number; activeCharacterId: string; } }
  | { type: 'END_BATTLE' }
  | { type: 'RESET_GAME' };