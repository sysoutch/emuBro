/**
 * Gamepad Testing Tool
 * Provides a comprehensive gamepad testing and mapping interface
 */

import { gamepadManager } from '../gamepad-manager.js';

export class GamepadTool {
    constructor() {
        this.toolName = 'gamepad-tester';
        this.toolTitle = 'Gamepad Tester';
        this.toolDescription = 'Test and map your gamepads for compatibility';
        this.isInitialized = false;
        this.currentTestGamepad = null;
        this.testResults = [];
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('Gamepad Tool initialized');
    }

    render(container) {
        this.init();
        
        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content gamepad-tool';
        toolContent.id = 'gamepad-tool-content';
        
        toolContent.innerHTML = `
            <h3>${this.toolTitle}</h3>
            <p>${this.toolDescription}</p>
            
            <div class="gamepad-tool-controls">
                <button id="start-test-btn" class="action-btn">Start Testing</button>
                <button id="stop-test-btn" class="action-btn remove-btn" disabled>Stop Testing</button>
                <button id="refresh-gamepads-btn" class="action-btn">Refresh Gamepads</button>
            </div>

            <div class="gamepad-status-section">
                <h4>Connected Gamepads</h4>
                <div id="gamepad-status-list" class="gamepad-status-list"></div>
            </div>

            <div class="gamepad-test-section">
                <h4>Test Results</h4>
                <div id="gamepad-test-results" class="gamepad-test-results"></div>
            </div>

            <div class="gamepad-mapping-section">
                <h4>Gamepad Mapping</h4>
                <div id="gamepad-mapping-display" class="gamepad-mapping-display"></div>
            </div>

            <div class="gamepad-info-section">
                <h4>Gamepad Information</h4>
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

    startTesting() {
        const startBtn = document.getElementById('start-test-btn');
        const stopBtn = document.getElementById('stop-test-btn');
        const testResults = document.getElementById('gamepad-test-results');

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;

        gamepadManager.startTesting((data) => {
            this.handleGamepadUpdate(data);
        });

        // Add initial test result
        if (testResults) {
            testResults.innerHTML = '<p>Testing started. Please move gamepad controls to see real-time updates...</p>';
        }
    }

    stopTesting() {
        const startBtn = document.getElementById('start-test-btn');
        const stopBtn = document.getElementById('stop-test-btn');
        const testResults = document.getElementById('gamepad-test-results');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;

        gamepadManager.stopTesting();
        if (testResults) {
            testResults.innerHTML = '<p>Testing stopped. Click "Start Testing" to begin again.</p>';
        }
    }

    handleGamepadUpdate(data) {
        const testResults = document.getElementById('gamepad-test-results');
        const mappingDisplay = document.getElementById('gamepad-mapping-display');
        const infoDisplay = document.getElementById('gamepad-info-display');

        switch (data.type) {
            case 'no-gamepads':
                if (testResults) {
                    testResults.innerHTML = `<p class="warning">${data.message}</p>`;
                }
                if (mappingDisplay) {
                    mappingDisplay.innerHTML = '';
                }
                if (infoDisplay) {
                    infoDisplay.innerHTML = '';
                }
                break;

            case 'gamepad-update':
                this.updateTestResults(data);
                this.updateMappingDisplay(data);
                this.updateInfoDisplay(data);
                break;

            case 'test-stopped':
                if (testResults) {
                    testResults.innerHTML = '<p>Testing stopped.</p>';
                }
                break;
        }
    }

    updateTestResults(data) {
        const testResults = document.getElementById('gamepad-test-results');
        const gamepad = gamepadManager.getGamepadState(data.index);
        
        if (!gamepad) return;

        // Create or update test result for this gamepad
        let resultElement = document.getElementById(`test-result-${data.index}`);
        if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.id = `test-result-${data.index}`;
            resultElement.className = 'test-result-item';
            testResults.appendChild(resultElement);
        }

        resultElement.innerHTML = `
            <h5>Gamepad ${data.index}: ${gamepad.id}</h5>
            <div class="test-result-content">
                <div class="test-result-section">
                    <h6>Buttons</h6>
                    <div class="buttons-grid" id="buttons-${data.index}"></div>
                </div>
                <div class="test-result-section">
                    <h6>Axes</h6>
                    <div class="axes-grid" id="axes-${data.index}"></div>
                </div>
            </div>
        `;

        // Update buttons display
        const buttonsGrid = document.getElementById(`buttons-${data.index}`);
        if (buttonsGrid) {
            buttonsGrid.innerHTML = '';
            data.buttons.forEach((button, index) => {
                const buttonElement = document.createElement('div');
                buttonElement.className = `button-item ${button.pressed ? 'pressed' : ''}`;
                buttonElement.innerHTML = `
                    <span class="button-value">${gamepadManager.formatButtonValue(button.value)}</span>
                    <span class="button-label">${gamepadManager.getButtonName(index, gamepad.id)}</span>
                `;
                buttonsGrid.appendChild(buttonElement);
            });
        }

        // Update axes display
        const axesGrid = document.getElementById(`axes-${data.index}`);
        if (axesGrid) {
            axesGrid.innerHTML = '';
            data.axes.forEach((axis, index) => {
                const axisElement = document.createElement('div');
                axisElement.className = 'axis-item';
                axisElement.innerHTML = `
                    <span class="axis-value">${gamepadManager.formatAxisValue(axis)}</span>
                    <span class="axis-label">${gamepadManager.getAxisName(index, gamepad.id)}</span>
                `;
                axesGrid.appendChild(axisElement);
            });
        }
    }

    updateMappingDisplay(data) {
        const mappingDisplay = document.getElementById('gamepad-mapping-display');
        const gamepad = gamepadManager.getGamepadState(data.index);
        
        if (!gamepad) return;

        mappingDisplay.innerHTML = `
            <div class="mapping-grid">
                <div class="mapping-item">
                    <span class="mapping-label">Gamepad Type:</span>
                    <span class="mapping-value">${gamepadManager.getGamepadType(gamepad.id)}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">Mapping:</span>
                    <span class="mapping-value">${gamepad.mapping || 'Unknown'}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">Connected:</span>
                    <span class="mapping-value">${gamepad.connected ? 'Yes' : 'No'}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">Buttons:</span>
                    <span class="mapping-value">${data.buttons.length}</span>
                </div>
                <div class="mapping-item">
                    <span class="mapping-label">Axes:</span>
                    <span class="mapping-value">${data.axes.length}</span>
                </div>
            </div>
        `;
    }

    updateInfoDisplay(data) {
        const infoDisplay = document.getElementById('gamepad-info-display');
        const gamepad = gamepadManager.getGamepadState(data.index);
        
        if (!gamepad) return;

        infoDisplay.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">ID:</span>
                    <span class="info-value">${gamepad.id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Index:</span>
                    <span class="info-value">${data.index}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Timestamp:</span>
                    <span class="info-value">${new Date(gamepad.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
        `;
    }

    updateGamepadStatus() {
        const statusList = document.getElementById('gamepad-status-list');
        const gamepads = gamepadManager.getConnectedGamepads();

        if (gamepads.length === 0) {
            statusList.innerHTML = '<p>No gamepads detected. Please connect a gamepad.</p>';
            return;
        }

        statusList.innerHTML = '';
        gamepads.forEach(gamepad => {
            const gamepadElement = document.createElement('div');
            gamepadElement.className = 'gamepad-status-item';
            gamepadElement.innerHTML = `
                <div class="gamepad-info">
                    <strong>Gamepad ${gamepad.index}</strong>: ${gamepad.id}
                    <span class="gamepad-type">(${gamepadManager.getGamepadType(gamepad.id)})</span>
                </div>
                <div class="gamepad-status-indicator connected">Connected</div>
            `;
            statusList.appendChild(gamepadElement);
        });
    }

    destroy() {
        this.stopTesting();
        this.isInitialized = false;
        console.log('Gamepad Tool destroyed');
    }
}

