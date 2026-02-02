/**
 * Gamepad Manager
 * Handles gamepad detection, mapping, and testing functionality using gamepad.js
 */

import { GamepadListener } from 'gamepad.js';

export class GamepadManager {
    constructor() {
        this.listener = new GamepadListener();
        this.connectedGamepads = new Map();
        
        this.setupEvents();
        this.listener.start();
    }

    setupEvents() {
        // Track connected gamepads
        this.listener.on('gamepad:connected', (event) => {
            // Handle both standard GamepadEvent (has .gamepad) and direct gamepad object
            const gamepad = event.gamepad || event;
            
            if (gamepad && typeof gamepad.index === 'number') {
                this.connectedGamepads.set(gamepad.index, gamepad);
                console.log(`Gamepad connected: ${gamepad.id} (${gamepad.index})`);
            } else {
                console.warn('Received invalid gamepad connection event:', event);
            }
        });

        this.listener.on('gamepad:disconnected', (event) => {
            const gamepad = event.gamepad || event;
            const index = gamepad.index;

            if (typeof index === 'number') {
                this.connectedGamepads.delete(index);
                console.log(`Gamepad disconnected: ${index}`);
            }
        });
    }

    /**
     * Get a list of currently connected gamepads
     * @returns {Array} List of gamepad objects
     */
    getConnectedGamepads() {
        this.syncWithNativeAPI();
        return Array.from(this.connectedGamepads.values())
            .filter(gp => gp)
            .map(gp => ({
                index: gp.index,
                id: gp.id,
                mapping: gp.mapping
            }));
    }

    /**
     * Sync internal state with native Gamepad API
     * Ensures we have the latest gamepad state and detects devices that might have been missed by events
     */
    syncWithNativeAPI() {
        if (!navigator.getGamepads) return;
        
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp && gp.connected) {
                // Always update to get latest state (snapshots)
                if (!this.connectedGamepads.has(gp.index)) {
                    console.log(`Gamepad detected via polling: ${gp.id} (${gp.index})`);
                }
                this.connectedGamepads.set(gp.index, gp);
            } else {
                // If we have a gamepad at this index but now it's null/disconnected
                if (this.connectedGamepads.has(i)) {
                    console.log(`Gamepad disconnected via polling: ${i}`);
                    this.connectedGamepads.delete(i);
                }
            }
        }
    }

    /**
     * Get the current state of a specific gamepad
     * @param {number} index Gamepad index
     * @returns {Object|null} Gamepad state object or null if not found
     */
    getGamepadState(index) {
        const gamepad = this.connectedGamepads.get(index);
        if (!gamepad) return null;

        return {
            id: gamepad.id,
            index: gamepad.index,
            connected: gamepad.connected,
            timestamp: gamepad.timestamp,
            axes: [...gamepad.axes],
            buttons: gamepad.buttons.map(button => ({
                pressed: button.pressed,
                value: button.value
            })),
            mapping: gamepad.mapping
        };
    }

    /**
     * Subscribe to gamepad events
     * @param {string} event Event name (e.g., 'gamepad:axis', 'gamepad:button')
     * @param {Function} callback Callback function
     */
    on(event, callback) {
        this.listener.on(event, callback);
    }

    /**
     * Unsubscribe from gamepad events
     * @param {string} event Event name
     * @param {Function} callback Callback function
     */
    off(event, callback) {
        this.listener.off(event, callback);
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
