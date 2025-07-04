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

export const TEST_ARCHER_JSON = `{
  "battle_id": "TEST_ARCHER_01",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Un'arena di prova per un arciere.",
  "terrain_features": [],
  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 7],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12,
      "attacks": [{ "name": "Colpo senz'arma", "type": "melee", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [
        { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ]
    }
  ],
  "enemies": [
    {
      "id": "NPC-Goblin-Archer-1", "name": "Goblin Arciere", "type": "enemy", "position": [18, 7],
      "ai_profile": "ranged", "proficiency_bonus": 2,
      "stats": { "strength": 8, "dexterity": 14, "constitution": 10, "intelligence": 10, "wisdom": 8, "charisma": 8 },
      "hp_max": 7, "ac": 13, "speed": 9,
      "attacks": [ { "name": "Arco Corto", "type": "ranged", "range": 24, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "piercing" } ]
    }
  ]
}`;

export const TEST_BRUTE_JSON = `{
  "battle_id": "TEST_BRUTE_01",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Un'arena di prova per un bruto.",
  "terrain_features": [],
  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 7],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12,
      "attacks": [{ "name": "Colpo senz'arma", "type": "melee", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [
        { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ]
    }
  ],
  "enemies": [
    {
      "id": "NPC-Ork-Brute-1", "name": "Orco Bruto", "type": "enemy", "position": [10, 7],
      "ai_profile": "brute", "proficiency_bonus": 2,
      "stats": { "strength": 16, "dexterity": 12, "constitution": 16, "intelligence": 7, "wisdom": 11, "charisma": 9 },
      "hp_max": 15, "ac": 13, "speed": 9,
      "attacks": [ { "name": "Ascia", "type": "melee", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d12", "damage_type": "slashing" } ]
    }
  ]
}`;

export const TEST_DEFENDER_JSON = `{
  "battle_id": "TEST_DEFENDER_01",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Un'arena di prova per un difensore.",
  "terrain_features": [],
  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 7],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12,
      "attacks": [{ "name": "Colpo senz'arma", "type": "melee", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [
        { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ]
    }
  ],
  "enemies": [
    {
      "id": "NPC-Guardian-Statue-1", "name": "Statua Guardiana", "type": "enemy", "position": [15, 7],
      "ai_profile": "defender", "defense_area": [12, 4, 18, 10], "proficiency_bonus": 2,
      "stats": { "strength": 15, "dexterity": 8, "constitution": 15, "intelligence": 6, "wisdom": 10, "charisma": 5 },
      "hp_max": 25, "ac": 17, "speed": 6,
      "attacks": [ { "name": "Schianto", "type": "melee", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d8", "damage_type": "bludgeoning" } ]
    }
  ]
}`;

export const TEST_STILL_JSON = `{
  "battle_id": "TEST_STILL_01",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Un'arena di prova per un bersaglio fermo.",
  "terrain_features": [],
  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 7],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12,
      "attacks": [{ "name": "Colpo senz'arma", "type": "melee", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [
        { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ]
    }
  ],
  "enemies": [
    {
      "id": "NPC-Training-Dummy-1", "name": "Manichino", "type": "enemy", "position": [10, 7],
      "ai_profile": "still", "proficiency_bonus": 0,
      "stats": { "strength": 10, "dexterity": 10, "constitution": 10, "intelligence": 1, "wisdom": 1, "charisma": 1 },
      "hp_max": 30, "ac": 10, "speed": 0,
      "attacks": []
    }
  ]
}`;

export const COMPLEX_SCENARIO_1_JSON = `{
  "battle_id": "ARCHER_ALLEY_01",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Un vicolo stretto tra due edifici. Alcune casse offrono copertura, mentre una pozza di liquido verdastro ribolle al centro. La metà superiore è avvolta nell'oscurità.",
  
  "terrain_features": [
    {
        "id": "upper_darkness",
        "name": "Oscurità Superiore",
        "color": "rgba(0, 0, 0, 0.5)",
        "positions": [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[18,1],[19,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2],[18,2],[19,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[13,3],[14,3],[15,3],[16,3],[17,3],[18,3],[19,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],[14,4],[15,4],[16,4],[17,4],[18,4],[19,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[18,5],[19,5],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[15,6],[16,6],[17,6],[18,6],[19,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],[15,7],[16,7],[17,7],[18,7],[19,7]],
        "effects": [{ "type": "darkness", "description": "L'oscurità avvolge la parte superiore del vicolo." }]
    },
    {
      "id": "poison_pool",
      "name": "Pozza Velenosa",
      "color": "rgba(107, 142, 35, 0.4)",
      "positions": [ [8, 10], [9, 10], [10, 10], [8, 11], [9, 11], [10, 11], [8, 12], [9, 12], [10, 12] ],
      "effects": [
        { "type": "hazardous_area", "description": "Chi entra o inizia il turno qui subisce danni da veleno.", "rules": { "damage_dice": "1d4", "damage_type": "poison" } },
        { "type": "difficult_terrain", "description": "Il liquido denso rallenta il movimento." }
      ]
    },
    {
      "id": "crates_west",
      "name": "Casse",
      "color": "rgba(139, 69, 19, 0.4)",
      "positions": [ [2, 9], [2, 10], [2, 11] ],
      "effects": [ { "type": "half_cover", "description": "Fornisce +2 alla CA." } ]
    },
    {
      "id": "crates_east",
      "name": "Casse",
      "color": "rgba(139, 69, 19, 0.4)",
      "positions": [ [17, 9], [17, 10], [17, 11] ],
      "effects": [ { "type": "half_cover", "description": "Fornisce +2 alla CA." } ]
    }
  ],

  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 10],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12, "conditions": [],
      "attacks": [{ "name": "Colpo senz'arma", "type": "melee", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [ 
          { "id": "extra_attack", "name": "Attacco Extra", "source": "Monaco", "cost": null },
          { "id": "darkvision", "name": "Scurovisione", "source": "Mezzorco", "cost": null },
          { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
          { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
       ]
    }
  ],
  "enemies": [
    {
      "id": "NPC-Goblin-Archer-1", "name": "Goblin Arciere", "type": "enemy", "race": "Goblin", "level": 1, "position": [18, 5],
      "ai_profile": "ranged",
      "proficiency_bonus": 2,
      "stats": { "strength": 8, "dexterity": 14, "constitution": 10, "intelligence": 10, "wisdom": 8, "charisma": 8 },
      "hp_max": 7, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Corto", "type": "ranged", "range": 10, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "piercing" } ],
      "defenses": {}, "inventory": []
    },
    {
      "id": "NPC-Goblin-Archer-2", "name": "Goblin Arciere", "type": "enemy", "race": "Goblin", "level": 1, "position": [18, 2],
      "ai_profile": "ranged",
      "proficiency_bonus": 2,
      "stats": { "strength": 8, "dexterity": 14, "constitution": 10, "intelligence": 10, "wisdom": 8, "charisma": 8 },
      "hp_max": 7, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Corto", "type": "ranged", "range": 10, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "piercing" } ],
      "defenses": {}, "inventory": []
    }
  ]
}`;

export const COMPLEX_SCENARIO_2_JSON = `{
  "battle_id": "PLAGUE_KNIGHT_SEWER_01",
  "grid_size": { "width": 25, "height": 7 },
  "environment_description": "Le pareti umide di una stretta fogna trasudano un miasma verdastro. L'oscurità è quasi totale, rotta solo dal debole bagliore di liquami tossici che scorrono in pozze stagnanti. Muretti di mattoni crollati offrono una precaria protezione.",
  
  "terrain_features": [
    {
      "id": "darkness_overall",
      "name": "Oscurità Profonda",
      "color": "rgba(0, 0, 0, 0.3)",
      "positions": [], 
      "effects": [ { "type": "darkness", "description": "L'intero livello è avvolto nell'oscurità." } ]
    },
    {
      "id": "poison_pools",
      "name": "Pozze di Veleno",
      "color": "rgba(102, 0, 153, 0.4)",
      "positions": [ [8,1],[9,1], [14,5],[15,5],[16,5], [7,3],[8,3] ],
      "effects": [
        { "type": "hazardous_area", "description": "Chi entra o inizia il turno qui subisce 1d4 danni da veleno.", "rules": { "damage_dice": "1d4", "damage_type": "poison" } }
      ]
    },
    {
      "id": "cover_walls",
      "name": "Muretti",
      "color": "rgba(128, 128, 128, 0.4)",
      "positions": [ [5,2],[5,3],[5,4], [18,2],[18,3],[18,4] ],
      "effects": [
        { "type": "half_cover", "description": "Fornisce +2 alla CA." },
        { "type": "obstacle", "description": "Blocca il movimento." }
      ]
    }
  ],

  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Monaco", "level": 5, "position": [1, 3],
      "proficiency_bonus": 3,
      "stats": { "strength": 10, "dexterity": 16, "constitution": 14, "intelligence": 8, "wisdom": 15, "charisma": 12 },
      "hp_max": 40, "ac": 15, "speed": 12, "conditions": [],
      "attacks": [{ "name": "Colpo senz'arma", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "bludgeoning" }],
      "features": [
        { "id": "extra_attack", "name": "Attacco Extra", "source": "Monaco", "cost": null },
        { "id": "darkvision", "name": "Scurovisione", "source": "Mezzorco", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ],
      "defenses": { "resistances": [], "vulnerabilities": ["poison"], "immunities": {} }
    }
  ],
  "enemies": [
    {
      "id": "Plague-Knight", "name": "Cavaliere Appestato", "type": "enemy", "race": "Umano Corrotto", "level": 4, "position": [20, 3],
      "ai_profile": "defender", "defense_area": [18, 1, 23, 5],
      "proficiency_bonus": 2,
      "stats": { "strength": 16, "dexterity": 11, "constitution": 14, "intelligence": 10, "wisdom": 11, "charisma": 15 },
      "hp_max": 30, "ac": 18, "speed": 6, "conditions": [],
      "attacks": [ { "name": "Spada Lunga Pestilenziale", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d8", "damage_type": "slashing" } ],
      "features": [],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": { "damage_types": ["poison"] } }
    },
    {
      "id": "Skeleton-Archer-1", "name": "Arciere Scheletro", "type": "enemy", "race": "Non Morto", "level": 1, "position": [22, 1],
      "ai_profile": "ranged",
      "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 15, "intelligence": 6, "wisdom": 8, "charisma": 5 },
      "hp_max": 12, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Velenoso", "range": 8, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "poison" } ],
      "defenses": { "vulnerabilities": ["bludgeoning"], "immunities": {} }
    },
    {
      "id": "Skeleton-Archer-2", "name": "Arciere Scheletro", "type": "enemy", "race": "Non Morto", "level": 1, "position": [22, 5],
      "ai_profile": "ranged",
      "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 15, "intelligence": 6, "wisdom": 8, "charisma": 5 },
      "hp_max": 12, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Velenoso", "range": 8, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d6", "damage_type": "poison" } ],
      "defenses": { "vulnerabilities": ["bludgeoning"], "immunities": {} }
    },
     {
      "id": "Rock-Golem", "name": "Golem di Roccia", "type": "enemy", "race": "Costrutto", "level": 3, "position": [12, 3],
      "ai_profile": "brute",
      "proficiency_bonus": 2,
      "stats": { "strength": 15, "dexterity": 8, "constitution": 16, "intelligence": 3, "wisdom": 10, "charisma": 1 },
      "hp_max": 45, "ac": 16, "speed": 6, "conditions": [],
      "attacks": [ { "name": "Schianto Potente", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d8", "damage_type": "bludgeoning" } ],
      "features": [],
      "defenses": { "resistances": ["bludgeoning", "piercing", "slashing"], "vulnerabilities": [], "immunities": { "damage_types": ["poison", "psychic"] } }
    }
  ]
}`;

export const COMPLEX_SCENARIO_3_JSON = `{
  "battle_id": "ASHEN_KNIGHT_FORGE_02",
  "grid_size": { "width": 24, "height": 18 },
  "environment_description": "Il pavimento di una vasta forgia abbandonata è crepato e instabile. Una gigantesca pozza di lava domina il centro, illuminando sinistramente un labirinto di muretti fatiscenti. Un intero quadrante della sala è avvolto da un'oscurità magica impenetrabile.",
  
  "terrain_features": [
    {
      "id": "central_lava_pit",
      "name": "Pozza di Lava Centrale",
      "color": "rgba(255, 100, 0, 0.3)",
      "positions": [
        [8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],
        [8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[15,6],
        [8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],[15,7],
        [8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[15,8],
        [8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],
        [8,10],[9,10],[10,10],[11,10],[12,10],[13,10],[14,10],[15,10],
        [8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[14,11],[15,11],
        [8,12],[9,12],[10,12],[11,12],[12,12],[13,12],[14,12],[15,12]
      ],
      "effects": [
        { "type": "hazardous_area", "description": "Chi entra o inizia il turno qui subisce 2d6 danni da fuoco.", "rules": { "damage_dice": "2d6", "damage_type": "fire" } },
        { "type": "difficult_terrain", "description": "Il calore intenso e il terreno instabile rallentano il movimento." }
      ]
    },
    {
      "id": "darkness_nest",
      "name": "Nido dei Cecchini",
      "positions": [
        [16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0],
        [16,1],[17,1],[18,1],[19,1],[20,1],[21,1],[22,1],[23,1],
        [16,2],[17,2],[18,2],[19,2],[20,2],[21,2],[22,2],[23,2],
        [16,3],[17,3],[18,3],[19,3],[20,3],[21,3],[22,3],[23,3],
        [16,4],[17,4],[18,4],[19,4],[20,4],[21,4],[22,4],[23,4],
        [16,5],[17,5],[18,5],[19,5],[20,5],[21,5],[22,5],[23,5],
        [16,6],[17,6],[18,6],[19,6],[20,6],[21,6],[22,6],[23,6],
        [16,7],[17,7],[18,7],[19,7],[20,7],[21,7],[22,7],[23,7]
      ],
      "effects": [ { "type": "darkness", "description": "Un'oscurità magica protegge quest'area." } ]
    },
    {
      "id": "cover_walls_maze",
      "name": "Labirinto di Muri",
      "color": "rgba(54, 69, 79, 0.5)",
      "positions": [
        [4,2],[4,3],[4,4],[4,5],  [4,10],[4,11],[4,12],[4,13],[4,14],
        [7,2],[7,3],[7,4], [7,13],[7,14],[7,15],
        [16,10],[16,11],[16,12],[16,13],
        [19,10],[19,11],[19,12],[19,13],[19,14]
      ],
      "effects": [
        { "type": "three_quarters_cover", "description": "Fornisce +5 alla CA." },
        { "type": "obstacle", "description": "Blocca il movimento." }
      ]
    }
  ],

  "player_characters": [
    {
      "id": "PC-Kaelen", "name": "Kaelen", "type": "player", "race": "Umano", "class": "Paladino", "level": 5, "position": [1, 8],
      "proficiency_bonus": 3,
      "stats": { "strength": 16, "dexterity": 10, "constitution": 14, "intelligence": 10, "wisdom": 13, "charisma": 15 },
      "hp_max": 45, "ac": 18, "speed": 9, "conditions": [],
      "attacks": [{ "name": "Spada Lunga", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d8", "damage_type": "slashing" }],
      "features": [ 
          { "id": "extra_attack", "name": "Attacco Extra", "source": "Paladino", "cost": null },
          { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null },
          { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": { "type": "uses", "max_uses": 1 } },
          { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null }
      ],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {} },
      "inventory": [ { "id": "potion_1", "name": "Pozione di Guarigione" } ]
    }
  ],
  "enemies": [
    {
      "id": "Fire-Elemental-1", "name": "Elementale di Fuoco", "type": "enemy", "race": "Elementale", "level": 2, "position": [10, 8], "ai_profile": "brute",
      "proficiency_bonus": 2, "stats": { "strength": 10, "dexterity": 17, "constitution": 12, "intelligence": 6, "wisdom": 10, "charisma": 7 },
      "hp_max": 20, "ac": 13, "speed": 15, "conditions": [],
      "attacks": [ { "name": "Tocco Infuocato", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "2d6", "damage_type": "fire" } ],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": { "damage_types": ["fire", "poison"] } }
    },
    {
      "id": "Fire-Elemental-2", "name": "Elementale di Fuoco", "type": "enemy", "race": "Elementale", "level": 2, "position": [13, 9], "ai_profile": "brute",
      "proficiency_bonus": 2, "stats": { "strength": 10, "dexterity": 17, "constitution": 12, "intelligence": 6, "wisdom": 10, "charisma": 7 },
      "hp_max": 20, "ac": 13, "speed": 15, "conditions": [],
      "attacks": [ { "name": "Tocco Infuocato", "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "2d6", "damage_type": "fire" } ],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": { "damage_types": ["fire", "poison"] } }
    },
    {
      "id": "Skeleton-Archer-1", "name": "Arciere Scheletro", "type": "enemy", "race": "Non Morto", "level": 1, "position": [22, 2], "ai_profile": "ranged",
      "proficiency_bonus": 2, "stats": { "strength": 10, "dexterity": 14, "constitution": 15, "intelligence": 6, "wisdom": 8, "charisma": 5 },
      "hp_max": 12, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Lungo", "range": 8, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d8", "damage_type": "piercing" } ],
      "defenses": { "resistances": ["poison"], "vulnerabilities": ["bludgeoning"], "immunities": {} }
    },
    {
      "id": "Skeleton-Archer-2", "name": "Arciere Scheletro", "type": "enemy", "race": "Non Morto", "level": 1, "position": [22, 6], "ai_profile": "ranged",
      "proficiency_bonus": 2, "stats": { "strength": 10, "dexterity": 14, "constitution": 15, "intelligence": 6, "wisdom": 8, "charisma": 5 },
      "hp_max": 12, "ac": 13, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Arco Lungo", "range": 8, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d8", "damage_type": "piercing" } ],
      "defenses": { "resistances": ["poison"], "vulnerabilities": ["bludgeoning"], "immunities": {} }
    },
    {
      "id": "Ashen-Knight", "name": "Cavaliere Cinereo", "type": "enemy", "race": "Non Morto", "level": 6, "position": [17, 3], "ai_profile": "defender", "defense_area": [16, 0, 23, 7],
      "proficiency_bonus": 3, "stats": { "strength": 18, "dexterity": 11, "constitution": 16, "intelligence": 10, "wisdom": 12, "charisma": 15 },
      "hp_max": 50, "ac": 18, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Spadone Cinereo", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "2d6", "damage_type": "slashing" } ],
      "features": [ { "id": "extra_attack", "name": "Attacco Extra", "source": "Classe", "cost": null } ],
      "defenses": { "resistances": ["necrotic"], "vulnerabilities": ["bludgeoning"], "immunities": { "damage_types": ["poison"] } }
    },
    {
      "id": "Flame-Archer", "name": "Arciere di Fuoco", "type": "enemy", "race": "Elementale", "level": 3, "position": [11, 16], "ai_profile": "ranged",
      "proficiency_bonus": 2, "stats": { "strength": 12, "dexterity": 18, "constitution": 13, "intelligence": 11, "wisdom": 14, "charisma": 11 },
      "hp_max": 20, "ac": 14, "speed": 9, "conditions": [],
      "attacks": [ { "name": "Dardo di Fuoco", "range": 4, "attack_source_stat": "dexterity", "damage_source_stat": "dexterity", "damage_dice": "1d10", "damage_type": "fire" } ],
      "features": [],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": { "damage_types": ["fire", "poison"] } }
    }
  ]
}`;

export const COMPLEX_SCENARIO_4_JSON = `{
  "battle_id": "FRONTIER_OF_FROST_01",
  "grid_size": { "width": 30, "height": 20 },
  "environment_description": "Un'ampia pianura spazzata dal vento e coperta da una fitta coltre di neve. La neve profonda rallenta ogni passo, mentre sparuti pini offrono l'unica fragile copertura contro le raffiche gelide e le minacce in agguato.",
  
  "terrain_features": [
    {
      "id": "deep_snow_terrain",
      "name": "Neve Profonda",
      "color": "rgba(240, 248, 255, 0.5)",
      "positions": [
        [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[18,0],[19,0],[20,0],[21,0],[22,0],[23,0],[24,0],[25,0],[26,0],[27,0],[28,0],[29,0],
        [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[18,1],[19,1],[20,1],[21,1],[22,1],[23,1],[24,1],[25,1],[26,1],[27,1],[28,1],[29,1],
        [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2],[18,2],[19,2],[20,2],[21,2],[22,2],[23,2],[24,2],[25,2],[26,2],[27,2],[28,2],[29,2],
        [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[13,3],[14,3],[15,3],[16,3],[17,3],[18,3],[19,3],[20,3],[21,3],[22,3],[23,3],[24,3],[25,3],[26,3],[27,3],[28,3],[29,3],
        [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],[14,4],[15,4],[16,4],[17,4],[18,4],[19,4],[20,4],[21,4],[22,4],[23,4],[24,4],[25,4],[26,4],[27,4],[28,4],[29,4],
        [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[18,5],[19,5],[20,5],[21,5],[22,5],[23,5],[24,5],[25,5],[26,5],[27,5],[28,5],[29,5],
        [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[15,6],[16,6],[17,6],[18,6],[19,6],[20,6],[21,6],[22,6],[23,6],[24,6],[25,6],[26,6],[27,6],[28,6],[29,6],
        [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],[15,7],[16,7],[17,7],[18,7],[19,7],[20,7],[21,7],[22,7],[23,7],[24,7],[25,7],[26,7],[27,7],[28,7],[29,7],
        [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[15,8],[16,8],[17,8],[18,8],[19,8],[20,8],[21,8],[22,8],[23,8],[24,8],[25,8],[26,8],[27,8],[28,8],[29,8],
        [0,9],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9],[18,9],[19,9],[20,9],[21,9],[22,9],[23,9],[24,9],[25,9],[26,9],[27,9],[28,9],[29,9],
        [0,10],[1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],[14,10],[15,10],[16,10],[17,10],[18,10],[19,10],[20,10],[21,10],[22,10],[23,10],[24,10],[25,10],[26,10],[27,10],[28,10],[29,10],
        [0,11],[1,11],[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[14,11],[15,11],[16,11],[17,11],[18,11],[19,11],[20,11],[21,11],[22,11],[23,11],[24,11],[25,11],[26,11],[27,11],[28,11],[29,11],
        [0,12],[1,12],[2,12],[3,12],[4,12],[5,12],[6,12],[7,12],[8,12],[9,12],[10,12],[11,12],[12,12],[13,12],[14,12],[15,12],[16,12],[17,12],[18,12],[19,12],[20,12],[21,12],[22,12],[23,12],[24,12],[25,12],[26,12],[27,12],[28,12],[29,12],
        [0,13],[1,13],[2,13],[3,13],[4,13],[5,13],[6,13],[7,13],[8,13],[9,13],[10,13],[11,13],[12,13],[13,13],[14,13],[15,13],[16,13],[17,13],[18,13],[19,13],[20,13],[21,13],[22,13],[23,13],[24,13],[25,13],[26,13],[27,13],[28,13],[29,13],
        [0,14],[1,14],[2,14],[3,14],[4,14],[5,14],[6,14],[7,14],[8,14],[9,14],[10,14],[11,14],[12,14],[13,14],[14,14],[15,14],[16,14],[17,14],[18,14],[19,14],[20,14],[21,14],[22,14],[23,14],[24,14],[25,14],[26,14],[27,14],[28,14],[29,14],
        [0,15],[1,15],[2,15],[3,15],[4,15],[5,15],[6,15],[7,15],[8,15],[9,15],[10,15],[11,15],[12,15],[13,15],[14,15],[15,15],[16,15],[17,15],[18,15],[19,15],[20,15],[21,15],[22,15],[23,15],[24,15],[25,15],[26,15],[27,15],[28,15],[29,15],
        [0,16],[1,16],[2,16],[3,16],[4,16],[5,16],[6,16],[7,16],[8,16],[9,16],[10,16],[11,16],[12,16],[13,16],[14,16],[15,16],[16,16],[17,16],[18,16],[19,16],[20,16],[21,16],[22,16],[23,16],[24,16],[25,16],[26,16],[27,16],[28,16],[29,16],
        [0,17],[1,17],[2,17],[3,17],[4,17],[5,17],[6,17],[7,17],[8,17],[9,17],[10,17],[11,17],[12,17],[13,17],[14,17],[15,17],[16,17],[17,17],[18,17],[19,17],[20,17],[21,17],[22,17],[23,17],[24,17],[25,17],[26,17],[27,17],[28,17],[29,17],
        [0,18],[1,18],[2,18],[3,18],[4,18],[5,18],[6,18],[7,18],[8,18],[9,18],[10,18],[11,18],[12,18],[13,18],[14,18],[15,18],[16,18],[17,18],[18,18],[19,18],[20,18],[21,18],[22,18],[23,18],[24,18],[25,18],[26,18],[27,18],[28,18],[29,18],
        [0,19],[1,19],[2,19],[3,19],[4,19],[5,19],[6,19],[7,19],[8,19],[9,19],[10,19],[11,19],[12,19],[13,19],[14,19],[15,19],[16,19],[17,19],[18,19],[19,19],[20,19],[21,19],[22,19],[23,19],[24,19],[25,19],[26,19],[27,19],[28,19],[29,19]
      ],
      "effects": [
        { "type": "difficult_terrain", "description": "Muoversi attraverso la neve profonda costa il doppio del movimento." }
      ]
    },
    { 
      "id": "pine_trees", 
      "name": "Pino Innevato", 
      "color": "rgba(34, 139, 34, 0.7)", 
      "positions": [ [10, 5], [20, 15], [5, 12], [25, 8], [8, 16], [18, 3], [2, 4], [27, 17], [22, 12], [13, 18] ], 
      "effects": [ 
        { "type": "three_quarters_cover", "description": "Fornisce +5 alla CA." },
        { "type": "obstacle", "description": "Blocca il movimento e la linea di tiro." }
      ] 
    }
  ],

  "player_characters": [
    {
      "id": "PC-Garanzia", "name": "Garanzia", "type": "player", "race": "Mezzorco", "class": "Barbaro", "level": 5, "position": [15, 10],
      "proficiency_bonus": 3,
      "stats": { "strength": 18, "dexterity": 14, "constitution": 16, "intelligence": 8, "wisdom": 12, "charisma": 10 },
      "saving_throw_proficiencies": ["strength", "constitution"],
      "hp_max": 52, "ac": 15, "speed": 12, 
      "conditions": [],
      "inventory": [{ "id": "potion_1", "name": "Pozione di Guarigione" }],
      "attacks": [{ "name": "Ascia Bipenne", "type": "melee", "attack_source_stat": "strength", "damage_source_stat": "strength", "damage_dice": "1d12", "damage_type": "slashing" }],
      "features": [ 
        { "id": "extra_attack", "name": "Attacco Extra", "source": "Classe", "cost": null },
        { "id": "savage_attacks", "name": "Attacchi Selvaggi", "source": "Razza", "cost": null },
        { "id": "relentless_endurance", "name": "Tenacia Implacabile", "source": "Razza", "cost": {"type": "uses", "max_uses": 1} },
        { "id": "darkvision", "name": "Scurovisione", "source": "Razza", "cost": null }
      ],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {} }
    }
  ],
  "enemies": [
    {
      "id": "NPC-Ice-Sorcerer-1", "name": "Stregone Glaciale", "type": "enemy", "race": "Non Morto", "level": 3, "position": [9, 4],
      "ai_profile": "ranged", "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 16, "wisdom": 12, "charisma": 6 },
      "hp_max": 35, "ac": 13, "speed": 10, "conditions": [],
      "attacks": [],
      "spells": [{
        "id": "frostbite", "name": "Rompighiaccio", "level": 0, "range": 12, "resolution": "saving_throw",
        "saving_throw_ability": "constitution",
        "effects_on_hit": [
          { "type": "damage", "dice": "1d6", "damage_type": "cold" },
          { "type": "disadvantage_on_next_attack", "duration_turns": 1 }
        ]
      }],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {"damage_types": ["poison"], "conditions": ["poisoned"]} }
    },
    {
      "id": "NPC-Ice-Mage-2", "name": "Mago Glaciale", "type": "enemy", "race": "Non Morto", "level": 3, "position": [4, 13],
      "ai_profile": "ranged", "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 16, "wisdom": 12, "charisma": 6 },
      "hp_max": 15, "ac": 13, "speed": 12, "conditions": [],
      "attacks": [],
      "spells": [{
        "id": "ray_of_frost", "name": "Raggio di Gelo", "level": 0, "range": 12, "resolution": "attack_roll",
        "attack_source_stat": "intelligence",
        "effects_on_hit": [
          { "type": "damage", "dice": "1d8", "damage_type": "cold" },
          { "type": "speed_reduction", "reduction_cells": 2 }
        ]
      }],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {"damage_types": ["poison"], "conditions": ["poisoned"]} }
    },
    {
      "id": "NPC-Ice-Mage-3", "name": "Mago Glaciale", "type": "enemy", "race": "Non Morto", "level": 3, "position": [26, 7],
      "ai_profile": "ranged", "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 16, "wisdom": 12, "charisma": 6 },
      "hp_max": 15, "ac": 13, "speed": 12, "conditions": [],
      "attacks": [],
      "spells": [{
        "id": "ray_of_frost", "name": "Raggio di Gelo", "level": 0, "range": 12, "resolution": "attack_roll",
        "attack_source_stat": "intelligence",
        "effects_on_hit": [
          { "type": "damage", "dice": "1d8", "damage_type": "cold" },
          { "type": "speed_reduction", "reduction_cells": 2 }
        ]
      }],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {"damage_types": ["poison"], "conditions": ["poisoned"]} }
    },
    {
      "id": "NPC-Ice-Mage-4", "name": "Mago Glaciale", "type": "enemy", "race": "Non Morto", "level": 3, "position": [23, 12],
      "ai_profile": "ranged", "proficiency_bonus": 2,
      "stats": { "strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 16, "wisdom": 12, "charisma": 6 },
      "hp_max": 15, "ac": 13, "speed": 12, "conditions": [],
      "attacks": [],
      "spells": [{
        "id": "ray_of_frost", "name": "Raggio di Gelo", "level": 0, "range": 12, "resolution": "attack_roll",
        "attack_source_stat": "intelligence",
        "effects_on_hit": [
          { "type": "damage", "dice": "1d8", "damage_type": "cold" },
          { "type": "speed_reduction", "reduction_cells": 2 }
        ]
      }],
      "defenses": { "resistances": [], "vulnerabilities": [], "immunities": {"damage_types": ["poison"], "conditions": ["poisoned"]} }
    }
  ]
}`;