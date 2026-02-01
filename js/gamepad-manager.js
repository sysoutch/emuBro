/**
 * Gamepad Manager
 * Handles gamepad detection, mapping, and testing functionality
 */

export class GamepadManager {
    constructor() {
        this.gamepads = new Map();
        this.gamepadState = new Map();
        this.isTesting = false;
        this.testInterval = null;
        this.gamepadCallback = null;
        this.init();
    }

    init() {
        // Initialize gamepad support
        if (navigator.getGamepads) {
            console.log("Gamepad API supported");
            this.setupGamepadEvents();
        } else if (navigator.webkitGetGamepads) {
            console.log("Gamepad API (webkit) supported");
            this.setupGamepadEvents();
        } else {
            console.warn("Gamepad API not supported");
        }
    }

    setupGamepadEvents() {
        // Gamepad connected event
        window.addEventListener('gamepadconnected', (event) => {
            this.handleGamepadConnected(event);
        });

        // Gamepad disconnected event
        window.addEventListener('gamepaddisconnected', (event) => {
            this.handleGamepadDisconnected(event);
        });

        // Regular polling for gamepad state
        setInterval(() => {
            this.updateGamepadStates();
        }, 16); // ~60fps
    }

    handleGamepadConnected(event) {
        const gamepad = event.gamepad;
        this.gamepads.set(gamepad.index, gamepad);
        console.log(`Gamepad connected: ${gamepad.id} (${gamepad.index})`);
        this.updateGamepadStates();
    }

    handleGamepadDisconnected(event) {
        const gamepad = event.gamepad;
        this.gamepads.delete(gamepad.index);
        console.log(`Gamepad disconnected: ${gamepad.id} (${gamepad.index})`);
        this.updateGamepadStates();
    }

    updateGamepadStates() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        gamepads.forEach((gamepad, index) => {
            if (gamepad) {
                this.gamepadState.set(index, {
                    id: gamepad.id,
                    index: gamepad.index,
                    connected: gamepad.connected,
                    timestamp: gamepad.timestamp,
                    axes: [...gamepad.axes],
                    buttons: gamepad.buttons.map(button => ({
                        pressed: button.pressed,
                        touched: button.touched,
                        value: button.value
                    })),
                    mapping: gamepad.mapping
                });
            }
        });
    }

    getConnectedGamepads() {
        const connected = [];
        this.gamepadState.forEach((state, index) => {
            if (state.connected) {
                connected.push({
                    index: index,
                    id: state.id,
                    mapping: state.mapping
                });
            }
        });
        return connected;
    }

    getGamepadState(index) {
        return this.gamepadState.get(index) || null;
    }

    startTesting(callback = null) {
        this.isTesting = true;
        this.gamepadCallback = callback;
        this.updateTestDisplay();
        this.testInterval = setInterval(() => {
            this.updateTestDisplay();
        }, 100);
    }

    stopTesting() {
        this.isTesting = false;
        if (this.testInterval) {
            clearInterval(this.testInterval);
            this.testInterval = null;
        }
        this.clearTestDisplay();
    }

    updateTestDisplay() {
        if (!this.isTesting) return;

        const gamepads = this.getConnectedGamepads();
        if (gamepads.length === 0) {
            if (this.gamepadCallback) {
                this.gamepadCallback({
                    type: 'no-gamepads',
                    message: 'No gamepads detected. Please connect a gamepad.'
                });
            }
            return;
        }

        gamepads.forEach(gamepad => {
            const state = this.getGamepadState(gamepad.index);
            if (state && this.gamepadCallback) {
                this.gamepadCallback({
                    type: 'gamepad-update',
                    index: gamepad.index,
                    id: state.id,
                    axes: state.axes,
                    buttons: state.buttons,
                    connected: state.connected
                });
            }
        });
    }

    clearTestDisplay() {
        if (this.gamepadCallback) {
            this.gamepadCallback({
                type: 'test-stopped'
            });
        }
    }

    // Button mapping for common gamepad types
    getButtonName(buttonIndex, gamepadId = '') {
        // Check for specific gamepad mappings
        if (gamepadId.includes('Xbox') || gamepadId.includes('Xbox Wireless Controller')) {
            const xboxButtons = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'DPad Up', 'DPad Down', 'DPad Left', 'DPad Right'];
            return xboxButtons[buttonIndex] || `Button ${buttonIndex}`;
        } else if (gamepadId.includes('DualShock') || gamepadId.includes('PlayStation')) {
            const psButtons = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'PS', 'Touchpad'];
            return psButtons[buttonIndex] || `Button ${buttonIndex}`;
        } else if (gamepadId.includes('Nintendo') || gamepadId.includes('Switch')) {
            const nintendoButtons = ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', 'Minus', 'Plus', 'L3', 'R3', 'Home', 'Capture'];
            return nintendoButtons[buttonIndex] || `Button ${buttonIndex}`;
        } else {
            // Generic mapping
            const genericButtons = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS'];
            return genericButtons[buttonIndex] || `Button ${buttonIndex}`;
        }
    }

    // Axis mapping for common gamepad types
    getAxisName(axisIndex, gamepadId = '') {
        if (gamepadId.includes('Xbox') || gamepadId.includes('Xbox Wireless Controller')) {
            const xboxAxes = ['Left Stick X', 'Left Stick Y', 'Right Stick X', 'Right Stick Y', 'LT', 'RT'];
            return xboxAxes[axisIndex] || `Axis ${axisIndex}`;
        } else if (gamepadId.includes('DualShock') || gamepadId.includes('PlayStation')) {
            const psAxes = ['Left Stick X', 'Left Stick Y', 'Right Stick X', 'Right Stick Y', 'L2', 'R2'];
            return psAxes[axisIndex] || `Axis ${axisIndex}`;
        } else if (gamepadId.includes('Nintendo') || gamepadId.includes('Switch')) {
            const nintendoAxes = ['Left Stick X', 'Left Stick Y', 'Right Stick X', 'Right Stick Y', 'L', 'R'];
            return nintendoAxes[axisIndex] || `Axis ${axisIndex}`;
        } else {
            return `Axis ${axisIndex}`;
        }
    }

    // Get gamepad type from ID
    getGamepadType(gamepadId) {
        if (gamepadId.includes('Xbox') || gamepadId.includes('Xbox Wireless Controller')) {
            return 'Xbox';
        } else if (gamepadId.includes('DualShock') || gamepadId.includes('PlayStation')) {
            return 'PlayStation';
        } else if (gamepadId.includes('Nintendo') || gamepadId.includes('Switch')) {
            return 'Nintendo';
        } else if (gamepadId.includes('Logitech')) {
            return 'Logitech';
        } else if (gamepadId.includes('SteelSeries')) {
            return 'SteelSeries';
        } else {
            return 'Generic';
        }
    }

    // Format button value for display
    formatButtonValue(value) {
        return Math.round(value * 100) / 100;
    }

    // Format axis value for display
    formatAxisValue(value) {
        return Math.round(value * 100) / 100;
    }
}

// Create global instance
export const gamepadManager = new GamepadManager();