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

import React, { useRef, useEffect } from 'react';
import type { LogEntry } from '../types';

interface BattleLogProps {
    log: LogEntry[];
}

export const BattleLog = ({ log }: BattleLogProps) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [log]);

    return (
        <div id="log-panel" className="tab-panel active">
            <div id="battle-log">
                {log.map(entry => <div key={entry.id} className={`log-entry ${entry.type}`} dangerouslySetInnerHTML={{ __html: entry.text }} />)}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};
