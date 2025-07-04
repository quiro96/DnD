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

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const getModifier = (score: number) => Math.floor(((score || 10) - 10) / 2);

// A helper hook to get the previous value of a prop or state.
export function usePrevious<T>(value: T): T | undefined {
    const ref = React.useRef<T | undefined>(undefined);
    React.useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}