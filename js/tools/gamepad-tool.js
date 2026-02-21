/**
 * Gamepad Testing Tool
 * Provides a comprehensive gamepad testing and mapping interface
 */

import { gamepadManager } from '../gamepad-manager.js';

function applyTemplate(input, data = {}) {
    let text = String(input ?? '');
    Object.keys(data || {}).forEach((key) => {
        const value = String(data[key] ?? '');
        text = text
            .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
            .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
    });
    return text;
}

function t(key, fallback, data = {}) {
    const i18nRef = (typeof i18n !== 'undefined' && i18n && typeof i18n.t === 'function')
        ? i18n
        : (window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null);
    if (i18nRef && typeof i18nRef.t === 'function') {
        const translated = i18nRef.t(key, data);
        if (translated && translated !== key) return String(translated);
    }
    return applyTemplate(String(fallback || key), data);
}

export class GamepadTool {
    constructor() {
        this.toolName = 'gamepad-tester';
        this.toolTitle = 'Gamepad Tester';
        this.toolDescription = 'Test and map your gamepads for compatibility';
        this.isInitialized = false;
        this.isTesting = false;
        this.animationFrameId = null;
        
        // Bind methods
        this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
        this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('Gamepad Tool initialized');

        // Listen for global connection events
        gamepadManager.on('gamepad:connected', this.handleGamepadConnected);
        gamepadManager.on('gamepad:disconnected', this.handleGamepadDisconnected);
    }

    render(container) {
        this.init();
        this.toolTitle = t('tools.gamepadTester', 'Gamepad Tester');
        this.toolDescription = t('tools.gamepadTesterDesc', 'Test and map your controllers.');
        
        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content gamepad-tool';
        toolContent.id = 'gamepad-tool-content';
        
        toolContent.innerHTML = `
            <h3>${this.toolTitle}</h3>
            <p>${this.toolDescription}</p>
            
            <div class="gamepad-tool-controls">
                <button id="start-test-btn" class="action-btn">${t('tools.gamepad.startTesting', 'Start Testing')}</button>
                <button id="stop-test-btn" class="action-btn remove-btn" disabled>${t('tools.gamepad.stopTesting', 'Stop Testing')}</button>
                <button id="refresh-gamepads-btn" class="action-btn">${t('tools.gamepad.refreshGamepads', 'Refresh Gamepads')}</button>
            </div>

            <div class="gamepad-status-section">
                <h4>${t('tools.gamepad.connectedGamepads', 'Connected Gamepads')}</h4>
                <div id="gamepad-status-list" class="gamepad-status-list"></div>
            </div>

            <div class="gamepad-test-section">
                <h4>${t('tools.gamepad.testResults', 'Test Results')}</h4>
                <div id="gamepad-test-results" class="gamepad-test-results"></div>
            </div>

            <div class="gamepad-mapping-section">
                <h4>${t('tools.gamepad.mapping', 'Gamepad Mapping')}</h4>
                <div id="gamepad-mapping-display" class="gamepad-mapping-display"></div>
            </div>

            <div class="gamepad-info-section">
                <h4>${t('tools.gamepad.information', 'Gamepad Information')}</h4>
                <div id="gamepad-info-display" class="gamepad-info-display"></div>
            </div>
        `;

        container.appendChild(toolContent);

        // Setup event listeners
        this.setupEventListeners();
        this.updateGamepadStatus();
    }

    setupEventListeners() {
        const startBtn = document.getElementById('start-test-btn');
        const stopBtn = document.getElementById('stop-test-btn');
        const refreshBtn = document.getElementById('refresh-gamepads-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startTesting();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopTesting();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateGamepadStatus();
            });
        }
    }

    handleGamepadConnected() {
        this.updateGamepadStatus();
    }

    handleGamepadDisconnected() {
        this.updateGamepadStatus();
        // If testing, clean up UI for disconnected gamepad?
        // The loop will handle it (getConnectedGamepads won't return it)
        // But we might want to clear the specific test result div
    }

    startTesting() {
        const startBtn = document.getElementById('start-test-btn');
        const stopBtn = document.getElementById('stop-test-btn');
        const testResults = document.getElementById('gamepad-test-results');

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;

        this.isTesting = true;
        
        if (testResults) {
            testResults.innerHTML = `<p>${t('tools.gamepad.testingStarted', 'Testing started. Please move gamepad controls to see real-time updates...')}</p>`;
        }

        this.testLoop();
    }

    stopTesting() {
        const startBtn = document.getElementById('start-test-btn');
        const stopBtn = document.getElementById('stop-test-btn');
        const testResults = document.getElementById('gamepad-test-results');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;

        this.isTesting = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (testResults) {
            testResults.innerHTML = `<p>${t('tools.gamepad.testingStopped', 'Testing stopped. Click "Start Testing" to begin again.')}</p>`;
        }
    }

    testLoop() {
        if (!this.isTesting) return;

        const gamepads = gamepadManager.getConnectedGamepads();
        
        if (gamepads.length === 0) {
            this.handleNoGamepads();
        } else {
            // Clear warning if gamepads found
            const testResults = document.getElementById('gamepad-test-results');
            if (testResults && testResults.querySelector('.warning')) {
                testResults.innerHTML = '';
            }

            gamepads.forEach(gp => {
                const state = gamepadManager.getGamepadState(gp.index);
                if (state) {
                    this.updateTestResults(state);
                    // Update info/mapping for the first gamepad found, or all?
                    // Let's stick to updating test results for all, 
                    // and maybe info/mapping for the one being interacted with? 
                    // For now, let's update info/mapping for the first one for simplicity 
                    // or maybe the one with recent timestamp?
                    // Let's just update for the first one to avoid UI flicker/race
                    if (gp.index === gamepads[0].index) {
                         this.updateMappingDisplay(state);
                         this.updateInfoDisplay(state);
                    }
                }
            });
        }

        this.animationFrameId = requestAnimationFrame(() => this.testLoop());
    }

    handleNoGamepads() {
        const testResults = document.getElementById('gamepad-test-results');
        const mappingDisplay = document.getElementById('gamepad-mapping-display');
        const infoDisplay = document.getElementById('gamepad-info-display');

        if (testResults && !testResults.querySelector('.warning')) {
            testResults.innerHTML = `<p class="warning">${t('tools.gamepad.noGamepadsDetected', 'No gamepads detected. Please connect a gamepad.')}</p>`;
        }
        if (mappingDisplay) mappingDisplay.innerHTML = '';
        if (infoDisplay) infoDisplay.innerHTML = '';
    }

    updateTestResults(data) {
        const testResults = document.getElementById('gamepad-test-results');
        if (!testResults) return;

        // Create or update test result for this gamepad
        let resultElement = document.getElementById(`test-result-${data.index}`);
        if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.id = `test-result-${data.index}`;
            resultElement.className = 'test-result-item';
            
            // If we had a placeholder message, clear it (unless it was a warning managed by handleNoGamepads)
            if (testResults.querySelector('p:not(.warning)')) {
                testResults.innerHTML = '';
            }
            
            testResults.appendChild(resultElement);
        }

        // Only rebuild structure if needed (optimization could be done here, but full innerHTML is easier)
        // To prevent losing focus or selection, we should ideally update values only.
        // But for a visualizer, full replacement is okay if performance is fine.
        // Let's try to keep the structure and only update if not created.
        
        if (!resultElement.querySelector('.test-result-content')) {
             resultElement.innerHTML = `
                <h5>${t('tools.gamepad.gamepadLabel', 'Gamepad {{index}}', { index: data.index })}: ${data.id}</h5>
                <div class="test-result-content">
                    <div class="test-result-section">
                        <h6>${t('tools.gamepad.buttons', 'Buttons')}</h6>
                        <div class="buttons-grid" id="buttons-${data.index}"></div>
                    </div>
                    <div class="test-result-section">
                        <h6>${t('tools.gamepad.axes', 'Axes')}</h6>
                        <div class="axes-grid" id="axes-${data.index}"></div>
                    </div>
                </div>
            `;
        }

        // Update buttons
        const buttonsGrid = document.getElementById(`buttons-${data.index}`);
        if (buttonsGrid) {
            // We can fully replace buttons content as it's simple spans
            buttonsGrid.innerHTML = data.buttons.map((button, index) => `
                <div class="button-item ${button.pressed ? 'pressed' : ''}">
                    <span class="button-value">${gamepadManager.formatButtonValue(button.value)}</span>
                    <span class="button-label">${gamepadManager.getButtonName(index, data.id)}</span>
                </div>
            `).join('');
        }

        // Update axes
        const axesGrid = document.getElementById(`axes-${data.index}`);
        if (axesGrid) {
            axesGrid.innerHTML = data.axes.map((axis, index) => `
                <div class="axis-item">
                    <span class="axis-value">${gamepadManager.formatAxisValue(axis)}</span>
                    <span class="axis-label">${gamepadManager.getAxisName(index, data.id)}</span>
                </div>
            `).join('');
        }
    }

    updateMappingDisplay(data) {
        const mappingDisplay = document.getElementById('gamepad-mapping-display');
        if (!mappingDisplay) return;

        mappingDisplay.innerHTML = `
            <div class="mapping-grid">
                <div class="mapping-item">
                    <span class="mapping-label">${t('tools.gamepad.type', 'Gamepad Type')}:</span>
                    <span class="mapping-value">${gamepadManager.getGamepadType(data.id)}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">${t('tools.gamepad.mappingLabel', 'Mapping')}:</span>
                    <span class="mapping-value">${data.mapping || t('tools.unknown', 'Unknown')}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">${t('tools.gamepad.connectedLabel', 'Connected')}:</span>
                    <span class="mapping-value">${data.connected ? t('buttons.yes', 'Yes') : t('buttons.no', 'No')}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">${t('tools.gamepad.buttons', 'Buttons')}:</span>
                    <span class="mapping-value">${data.buttons.length}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">${t('tools.gamepad.axes', 'Axes')}:</span>
                    <span class="mapping-value">${data.axes.length}</span>
                </div>
            </div>
        `;
    }

    updateInfoDisplay(data) {
        const infoDisplay = document.getElementById('gamepad-info-display');
        if (!infoDisplay) return;

        infoDisplay.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">${t('tools.gamepad.id', 'ID')}:</span>
                    <span class="info-value">${data.id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('tools.gamepad.index', 'Index')}:</span>
                    <span class="info-value">${data.index}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('tools.gamepad.timestamp', 'Timestamp')}:</span>
                    <span class="info-value">${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;
    }

    updateGamepadStatus() {
        const statusList = document.getElementById('gamepad-status-list');
        if (!statusList) return;
        
        const gamepads = gamepadManager.getConnectedGamepads();

        if (gamepads.length === 0) {
            statusList.innerHTML = `<p>${t('tools.gamepad.noGamepadsDetected', 'No gamepads detected. Please connect a gamepad.')}</p>`;
            return;
        }

        statusList.innerHTML = '';
        gamepads.forEach(gamepad => {
            const gamepadElement = document.createElement('div');
            gamepadElement.className = 'gamepad-status-item';
            gamepadElement.innerHTML = `
                <div class="gamepad-info">
                    <strong>${t('tools.gamepad.gamepadLabel', 'Gamepad {{index}}', { index: gamepad.index })}</strong>: ${gamepad.id}
                    <span class="gamepad-type">(${gamepadManager.getGamepadType(gamepad.id)})</span>
                </div>
                <div class="gamepad-status-indicator connected">${t('tools.gamepad.connectedState', 'Connected')}</div>
            `;
            statusList.appendChild(gamepadElement);
        });
    }

    destroy() {
        this.stopTesting();
        // Remove listeners
        gamepadManager.off('gamepad:connected', this.handleGamepadConnected);
        gamepadManager.off('gamepad:disconnected', this.handleGamepadDisconnected);
        
        this.isInitialized = false;
        console.log('Gamepad Tool destroyed');
    }
}
