
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

export const JSON_STRUCTURE_GUIDE = `
# Guida alla Creazione di Scenari per D&D Battle Simulator v3

## 1. Introduzione

Benvenuto nella guida per la creazione di scenari per la versione 3 del D&D Battle Simulator. Questa versione, basata su React e TypeScript, introduce nuove potenti funzionalità come un sistema di magia più robusto, effetti temporanei e una logica di gioco più strutturata.

Questo documento ti guiderà passo dopo passo nella creazione del file JSON che definisce ogni aspetto della battaglia, dalla mappa ai combattenti, fino alle regole speciali.

---

## 2. Struttura di Base del File (\`BattleData\`)

Lo scenario è un singolo oggetto JSON con le seguenti proprietà principali:

\`\`\`json
{
  "battle_id": "identificativo-unico-battaglia",
  "grid_size": { "width": 20, "height": 15 },
  "environment_description": "Una breve descrizione testuale dell'ambiente.",
  "terrain_features": [ /* ... */ ],
  "player_characters": [ /* ... */ ],
  "enemies": [ /* ... */ ]
}
\`\`\`

-   **\`battle_id\`**: (Stringa) Un nome identificativo per la tua battaglia.
-   **\`grid_size\`**: (Oggetto) Le dimensioni della griglia di gioco.
-   **\`environment_description\`**: (Stringa) Testo descrittivo per l'atmosfera.
-   **\`terrain_features\`**: (Array) Elementi speciali sulla mappa come ostacoli, trappole, ecc.
-   **\`player_characters\`**: (Array) La lista dei personaggi controllati dal giocatore.
-   **\`enemies\`**: (Array) La lista dei nemici controllati dall'IA.

---

## 3. Ambiente di Battaglia

### 3.1. \`grid_size\` (Obbligatorio)

Imposta le dimensioni della mappa in numero di caselle.

-   **\`width\`**: Larghezza della griglia.
-   **\`height\`**: Altezza della griglia.

### 3.2. \`terrain_features\` (Opzionale)

Un array di oggetti, dove ogni oggetto definisce una zona con effetti speciali.

-   \`id\` e \`name\`: (Stringa) Identificativi.
-   \`color\`: (Stringa, Opzionale) Un colore in formato CSS (es. \`rgba(100, 200, 50, 0.4)\`) per rappresentare visivamente l'area.
-   \`positions\`: (Array) Un array di coordinate \`[x, y]\` che compongono la zona.
-   \`effects\`: (Array) Un array di oggetti che descrivono gli effetti attivi in quelle caselle.

#### Indice degli Effetti di Terreno Implementati:

| Tipo (\`type\`)            | Descrizione                                                                 | Campi Aggiuntivi (\`rules\`)                                   |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| \`obstacle\`               | Blocca completamente il movimento e la linea di vista.                      | -                                                            |
| \`difficult_terrain\`      | Raddoppia il costo del movimento per chi attraversa la casella.             | -                                                            |
| \`half_cover\`             | Fornisce +2 alla CA contro attacchi a distanza e da mischia.                | -                                                            |
| \`three_quarters_cover\`   | Fornisce +5 alla CA contro attacchi a distanza e da mischia.                | -                                                            |
| \`hazardous_area\`         | Infligge danni a chi inizia o entra nel suo turno nell'area.                | \`damage_dice\`: "XdY" <br> \`damage_type\`: (Vedi Appendice) |
| \`darkness\`               | Rende l'area oscurata. Causa la condizione \`blinded\` a chi non ha \`darkvision\`. | -                                                            |

**Esempio di \`terrain_feature\`:**
\`\`\`json
{
  "id": "poison_pool",
  "name": "Pozza Velenosa",
  "color": "rgba(107, 142, 35, 0.4)",
  "positions": [ [8, 10], [9, 10], [10, 10] ],
  "effects": [
    { 
      "type": "hazardous_area", 
      "description": "Chi entra o inizia il turno qui subisce danni da veleno.",
      "rules": { "damage_dice": "1d4", "damage_type": "poison" } 
    },
    { 
      "type": "difficult_terrain", 
      "description": "Il liquido denso rallenta il movimento." 
    }
  ]
}
\`\`\`
---

## 4. Creare un Combattente (\`CharacterData\`)

Sia i personaggi in \`player_characters\` che in \`enemies\` usano questa struttura.

### 4.1. Dati Anagrafici
-   \`id\`: (Stringa) ID unico per il token (es. \`"pc_gandalf"\`, \`"goblin_3"\`).
-   \`name\`: (Stringa) Nome visualizzato.
-   \`type\`: (Stringa) **Fondamentale**: \`"player"\` o \`"enemy"\`.
-   \`race\`, \`class\`, \`level\`: (Stringa/Numero) Descrittivi.
-   \`position\`: (Array di 2 numeri) Coordinate di partenza \`[x, y]\`.

### 4.2. Statistiche e Competenze
-   \`proficiency_bonus\`: (Numero) Il bonus di competenza.
-   \`stats\`: (Oggetto) Contiene i punteggi delle sei caratteristiche: \`strength\`, \`dexterity\`, \`constitution\`, \`intelligence\`, \`wisdom\`, \`charisma\`.
-   \`saving_throw_proficiencies\`: (Array di Stringhe, Opzionale) Le caratteristiche in cui si è competenti nei Tiri Salvezza (es. \`["strength", "constitution"]\`).
-   \`skill_proficiencies\`: (Array di Stringhe, Opzionale) Le abilità in cui si è competenti (es. \`["atletica", "furtivita"]\`). Vedi Appendice per la lista completa.

### 4.3. Statistiche di Combattimento
-   \`hp_max\`: (Numero) Punti Ferita massimi.
-   \`hp_current\`: (Numero, Opzionale) Punti Ferita iniziali. Se omesso, è uguale a \`hp_max\`.
-   \`ac\`: (Numero) Classe Armatura.
-   \`speed\`: (Numero) Velocità in metri (convertita a 1.5m per casella).

### 4.4. Difese
-   \`defenses\`: (Oggetto, Opzionale)
    -   \`resistances\`: (Array di Stringhe) Tipi di danno a cui si è resistenti (danno dimezzato).
    -   \`vulnerabilities\`: (Array di Stringhe) Tipi di danno a cui si è vulnerabili (danno raddoppiato).
    -   \`immunities\`: (Oggetto) Contiene \`damage_types\` (danno azzerato) e \`conditions\` (immunità a stati).

\`\`\`json
"defenses": { 
  "resistances": ["fire", "poison"], 
  "vulnerabilities": ["bludgeoning"], 
  "immunities": { 
    "damage_types": ["psychic"], 
    "conditions": ["prone"] 
  } 
}
\`\`\`

### 4.5. Attacchi con Arma (\`attacks\` array)
Array che definisce gli attacchi con armi. **Nota:** Il sistema usa principalmente il **primo attacco** della lista.
-   \`name\`: (Stringa) Nome dell'attacco.
-   \`type\`: (Stringa) \`'melee'\` o \`'ranged'\`.
-   \`range\`: (Numero, Opzionale) Portata in numero di caselle. Default è 1.
-   \`attack_source_stat\`: (Stringa) La caratteristica per il tiro per colpire (vedi Appendice \`Stat\`).
-   \`damage_source_stat\`: (Stringa) La caratteristica per il bonus al danno.
-   \`damage_dice\`: (Stringa) Formato "XdY" (es. "1d8", "2d6").
-   \`damage_type\`: (Stringa) Il tipo di danno (vedi Appendice \`DamageType\`).

### 4.6. Incantesimi (\`spells\` array)
Array che definisce gli incantesimi.
-   \`id\`: (Stringa) ID unico per l'incantesimo.
-   \`name\`: (Stringa) Nome dell'incantesimo.
-   \`level\`: (Numero) Livello dell'incantesimo.
-   \`range\`: (Numero) Portata in numero di caselle.
-   \`resolution\`: (Stringa) Come si risolve l'incantesimo:
    -   \`'attack_roll'\`: Richiede un tiro per colpire. Necessita di \`attack_source_stat\`.
    -   \`'saving_throw'\`: Richiede un Tiro Salvezza al bersaglio. Necessita di \`saving_throw_ability\`.
-   \`attack_source_stat\`: (Stringa, Opzionale) La caratteristica per il tiro per colpire.
-   \`saving_throw_ability\`: (Stringa, Opzionale) La caratteristica su cui il bersaglio deve fare il TS.
-   \`effects_on_hit\`: (Array) Lista di effetti applicati in caso di successo.

#### Indice degli Effetti degli Incantesimi (\`SpellEffect\`):
| Tipo (\`type\`)                      | Descrizione                               | Campi Aggiuntivi                   |
| ---------------------------------- | ----------------------------------------- | ---------------------------------- |
| \`damage\`                           | Infligge danni.                           | \`dice\`: "XdY", \`damage_type\`       |
| \`speed_reduction\`                  | Riduce la velocità del bersaglio.         | \`reduction_cells\`: Numero caselle |
| \`disadvantage_on_next_attack\`      | Dà svantaggio al prossimo attacco.        | -                                  |

**Esempio di \`spells\`:**
\`\`\`json
"spells": [{
  "id": "ray_of_frost", "name": "Raggio di Gelo", "level": 0, "range": 12, 
  "resolution": "attack_roll",
  "attack_source_stat": "intelligence",
  "effects_on_hit": [
    { "type": "damage", "dice": "1d8", "damage_type": "cold" },
    { "type": "speed_reduction", "reduction_cells": 2 }
  ]
}]
\`\`\`

### 4.7. Abilità Speciali (\`features\` array)
-   \`id\`: (Stringa) L'identificatore che il codice riconosce.
-   \`name\`: (Stringa) Nome visualizzato.
-   \`source\`: (Stringa) Origine dell'abilità (es. "Classe", "Razza").
-   \`cost\`: (Oggetto o \`null\`)
    -   Per abilità passive/sempre attive: \`null\`.
    -   Per abilità a uso limitato: \`{ "type": "uses", "max_uses": 1 }\`.

#### Indice delle \`features\` Implementate:
| ID (\`id\`)                 | Effetto                                                               | \`cost\` Tipico                                        |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| \`extra_attack\`            | Permette un secondo attacco con l'azione di Attacco.                  | \`null\`                                               |
| \`savage_attacks\`          | Tira un dado di danno dell'arma in più sui colpi critici.             | \`null\`                                               |
| \`relentless_endurance\`    | Se scende a 0 HP, può scendere invece a 1 HP.                         | \`{ "type": "uses", "max_uses": 1 }\`                   |
| \`darkvision\`              | Ignora l'effetto \`darkness\`.                                          | \`null\`                                               |

### 4.8. Inventario (\`inventory\` array)
-   \`id\` e \`name\`: (Stringa) Identificativi dell'oggetto.
-   **Nota:** Attualmente, solo l'oggetto con \`"name": "Pozione di Guarigione"\` ha un effetto meccanico (azione per curarsi di 2d4+2 HP).

### 4.9. Profili di IA (\`ai_profile\`)
Assegna un comportamento ai nemici.
-   **\`still\`**: Il nemico non si muove e non agisce.
-   **\`brute\`**: Si muove verso il bersaglio più vicino per attaccarlo in mischia. Se è prono, tenta di rialzarsi. Può decidere di spingere invece di attaccare.
-   **\`ranged\`**: Cerca di mantenere la distanza. Se ingaggiato in mischia, usa l'azione Disimpegno per allontanarsi prima di attaccare. Cerca posizioni allineate e con linea di vista.
-   **\`defender\`**: Difende un'area specifica.
    -   **Richiede il campo \`defense_area\`**: Un array di 4 numeri \`[x1, y1, x2, y2]\` che definisce un rettangolo.
    -   Se il bersaglio è nell'area, si comporta come un \`brute\`. Altrimenti, usa l'azione Schivata.

---

## 5. Appendici

#### Indice dei Tipi di Danno (\`DamageType\`)
\`bludgeoning\`, \`piercing\`, \`slashing\`, \`fire\`, \`cold\`, \`lightning\`, \`thunder\`, \`acid\`, \`poison\`, \`radiant\`, \`necrotic\`, \`psychic\`, \`force\`.

#### Indice delle Condizioni (\`Condition\`)
\`prone\`, \`blinded\`. (Altre condizioni possono essere definite ma non hanno ancora effetti meccanici implementati).

#### Indice delle Statistiche (\`Stat\`)
\`strength\`, \`dexterity\`, \`constitution\`, \`intelligence\`, \`wisdom\`, \`charisma\`.

#### Indice delle Abilità (\`Skill\`) e loro Caratteristica Associata
- \`acrobazia\` (dexterity)
- \`addestrare_animali\` (wisdom)
- \`arcano\` (intelligence)
- \`atletica\` (strength)
- \`furtivita\` (dexterity)
- \`inganno\` (charisma)
- \`intimidire\` (charisma)
- \`intrattenere\` (charisma)
- \`intuizione\` (wisdom)
- \`investigare\` (intelligence)
- \`medicina\` (wisdom)
- \`natura\` (intelligence)
- \`percezione\` (wisdom)
- \`persuasione\` (charisma)
- \`rapidita_di_mano\` (dexterity)
- \`religione\` (intelligence)
- \`sopravvivenza\` (wisdom)
- \`storia\` (intelligence)
`;
