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

interface ErrorToastProps {
    message: string;
    onClose: () => void;
}

export const ErrorToast = ({ message, onClose }: ErrorToastProps) => {
    return (
        <div className="error-toast-overlay">
            <div className="error-toast-content">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{message}</p>
                <button onClick={onClose} className="close-btn" aria-label="Chiudi notifica">&times;</button>
            </div>
        </div>
    );
};
