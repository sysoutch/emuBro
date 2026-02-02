/**
 * Monitor Tool
 * Provides interface for managing multi-monitor configurations using MultiMonitorTool.exe
 */

import { ipcRenderer } from 'electron';

export class MonitorTool {
    constructor() {
        this.toolName = 'monitor-tool';
        this.toolTitle = 'Monitor Tool';
        this.toolDescription = 'Manage multi-monitor configurations and display settings';
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('Monitor Tool initialized');
    }

    render(container) {
        this.init();
        
        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content monitor-tool';
        toolContent.id = 'monitor-tool-content';
        
        toolContent.innerHTML = `
            <h3>${this.toolTitle}</h3>
            <p>${this.toolDescription}</p>
            
            <div class="monitor-tool-controls">
                <button id="refresh-monitors-btn" class="action-btn">Refresh Monitors</button>
                <button id="detect-monitors-btn" class="action-btn">Detect Monitors</button>
            </div>

            <div class="monitor-status-section">
                <h4>Connected Monitors</h4>
                <div id="monitor-status-list" class="monitor-status-list"></div>
            </div>

            <div class="monitor-controls-section">
                <h4>Monitor Controls</h4>
                <div id="monitor-controls" class="monitor-controls"></div>
            </div>

            <div class="monitor-actions-section">
                <h4>Quick Actions</h4>
                <div id="monitor-actions" class="monitor-actions"></div>
            </div>
        `;

        container.appendChild(toolContent);

        // Setup event listeners
        this.setupEventListeners();
        this.updateMonitorStatus();
    }

    setupEventListeners() {
        document.getElementById('refresh-monitors-btn').addEventListener('click', () => {
            this.updateMonitorStatus();
        });

        document.getElementById('detect-monitors-btn').addEventListener('click', () => {
            this.detectMonitors();
        });
    }

    async updateMonitorStatus() {
        try {
            const monitors = await ipcRenderer.invoke('get-monitor-info');
            this.displayMonitorStatus(monitors);
        } catch (error) {
            console.error('Failed to get monitor info:', error);
            const statusList = document.getElementById('monitor-status-list');
            statusList.innerHTML = '<p class="error">Failed to retrieve monitor information</p>';
        }
    }

    displayMonitorStatus(monitors) {
        const statusList = document.getElementById('monitor-status-list');
        const controls = document.getElementById('monitor-controls');
        const actions = document.getElementById('monitor-actions');

        if (!monitors || monitors.length === 0) {
            statusList.innerHTML = '<p>No monitors detected</p>';
            controls.innerHTML = '';
            actions.innerHTML = '';
            return;
        }

        // Display monitor status
        statusList.innerHTML = `
            <div class="monitors-grid">
                ${monitors.map((monitor, index) => `
                    <div class="monitor-item" data-monitor-id="${index}">
                        <div class="monitor-header">
                            <h5>Monitor ${index + 1}</h5>
                            <span class="monitor-status ${monitor.connected ? 'connected' : 'disconnected'}">
                                ${monitor.connected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div class="monitor-details">
                            <p><strong>Device ID:</strong> ${monitor.deviceId || 'N/A'}</p>
                            <p><strong>Resolution:</strong> ${monitor.width} x ${monitor.height}</p>
                            <p><strong>Primary:</strong> ${monitor.isPrimary ? 'Yes' : 'No'}</p>
                            <p><strong>Orientation:</strong> ${monitor.orientation || 'Normal'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Display monitor controls
        controls.innerHTML = `
            <div class="monitor-controls-grid">
                ${monitors.map((monitor, index) => `
                    <div class="monitor-control-panel" data-monitor-id="${index}">
                        <h6>Monitor ${index + 1} Controls</h6>
                        <div class="control-group">
                            <label>Orientation:</label>
                            <select class="orientation-select" data-monitor="${index}">
                                <option value="0">Normal (0°)</option>
                                <option value="90">Landscape (90°)</option>
                                <option value="180">Flipped (180°)</option>
                                <option value="270">Portrait (270°)</option>
                            </select>
                            <button class="action-btn" data-action="set-orientation" data-monitor="${index}">Set Orientation</button>
                        </div>
                        <div class="control-group">
                            <label>Display State:</label>
                            <select class="display-state-select" data-monitor="${index}">
                                <option value="enable">Enable</option>
                                <option value="disable">Disable</option>
                            </select>
                            <button class="action-btn" data-action="set-display-state" data-monitor="${index}">Apply</button>
                        </div>
                        <div class="control-group">
                            <button class="action-btn" data-action="set-primary" data-monitor="${index}" ${monitor.isPrimary ? 'disabled' : ''}>
                                ${monitor.isPrimary ? 'Is Primary' : 'Set as Primary'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners to control buttons
        document.querySelectorAll('[data-action="set-orientation"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monitorId = parseInt(e.target.dataset.monitor);
                const select = document.querySelector(`.orientation-select[data-monitor="${monitorId}"]`);
                this.setMonitorOrientation(monitorId, parseInt(select.value));
            });
        });

        document.querySelectorAll('[data-action="set-display-state"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monitorId = parseInt(e.target.dataset.monitor);
                const select = document.querySelector(`.display-state-select[data-monitor="${monitorId}"]`);
                this.setMonitorDisplayState(monitorId, select.value);
            });
        });

        document.querySelectorAll('[data-action="set-primary"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monitorId = parseInt(e.target.dataset.monitor);
                this.setPrimaryMonitor(monitorId);
            });
        });

        // Display quick actions
        actions.innerHTML = `
            <div class="quick-actions-grid">
                <button class="action-btn" id="toggle-landscape">Toggle Landscape</button>
                <button class="action-btn" id="toggle-portrait">Toggle Portrait</button>
                <button class="action-btn" id="disable-monitor-2">Disable Monitor 2</button>
                <button class="action-btn" id="enable-monitor-2">Enable Monitor 2</button>
                <button class="action-btn" id="set-primary-monitor">Set Primary Monitor</button>
            </div>
        `;

        // Add event listeners to quick actions
        document.getElementById('toggle-landscape').addEventListener('click', () => this.toggleMonitorOrientation(1, 0));
        document.getElementById('toggle-portrait').addEventListener('click', () => this.toggleMonitorOrientation(1, 90));
        document.getElementById('disable-monitor-2').addEventListener('click', () => this.setMonitorDisplayState(1, 'disable'));
        document.getElementById('enable-monitor-2').addEventListener('click', () => this.setMonitorDisplayState(1, 'enable'));
        document.getElementById('set-primary-monitor').addEventListener('click', () => this.setPrimaryMonitor(0));
    }

    async detectMonitors() {
        try {
            const monitors = await ipcRenderer.invoke('detect-monitors');
            this.displayMonitorStatus(monitors);
            alert('Monitor detection completed successfully.');
        } catch (error) {
            console.error('Failed to detect monitors:', error);
            alert('Failed to detect monitors: ' + error.message);
        }
    }

    async setMonitorOrientation(monitorId, orientation) {
        try {
            const result = await ipcRenderer.invoke('set-monitor-orientation', monitorId, orientation);
            if (result.success) {
                alert(`Monitor ${monitorId + 1} orientation set to ${orientation}°`);
                this.updateMonitorStatus();
            } else {
                alert(`Failed to set monitor orientation: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to set monitor orientation:', error);
            alert('Failed to set monitor orientation: ' + error.message);
        }
    }

    async toggleMonitorOrientation(monitorId, targetOrientation) {
        try {
            const result = await ipcRenderer.invoke('toggle-monitor-orientation', monitorId, targetOrientation);
            if (result.success) {
                alert(`Monitor ${monitorId + 1} orientation toggled to ${targetOrientation}°`);
                this.updateMonitorStatus();
            } else {
                alert(`Failed to toggle monitor orientation: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to toggle monitor orientation:', error);
            alert('Failed to toggle monitor orientation: ' + error.message);
        }
    }

    async setMonitorDisplayState(monitorId, state) {
        try {
            const result = await ipcRenderer.invoke('set-monitor-display-state', monitorId, state);
            if (result.success) {
                alert(`Monitor ${monitorId + 1} ${state}d successfully`);
                this.updateMonitorStatus();
            } else {
                alert(`Failed to set monitor state: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to set monitor display state:', error);
            alert('Failed to set monitor display state: ' + error.message);
        }
    }

    async setPrimaryMonitor(monitorId) {
        try {
            const result = await ipcRenderer.invoke('set-primary-monitor', monitorId);
            if (result.success) {
                alert(`Monitor ${monitorId + 1} set as primary monitor`);
                this.updateMonitorStatus();
            } else {
                alert(`Failed to set primary monitor: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to set primary monitor:', error);
            alert('Failed to set primary monitor: ' + error.message);
        }
    }

    destroy() {
        this.isInitialized = false;
        console.log('Monitor Tool destroyed');
    }
}