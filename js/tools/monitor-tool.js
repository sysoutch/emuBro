/**
 * Monitor Tool
 * Provides interface for managing multi-monitor configurations using MultiMonitorTool.exe
 */

const emubro = window.emubro;

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
        this.toolTitle = t('tools.monitorManager', 'Monitor Manager');
        this.toolDescription = t('tools.monitorManagerDesc', 'Manage displays and orientation.');

        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content monitor-tool';
        toolContent.id = 'monitor-tool-content';

        toolContent.innerHTML = `
            <h3>${this.toolTitle}</h3>
            <p>${this.toolDescription}</p>

            <div class="monitor-tool-controls">
                <button id="refresh-monitors-btn" class="action-btn">${t('tools.monitor.refreshMonitors', 'Refresh Monitors')}</button>
                <button id="detect-monitors-btn" class="action-btn">${t('tools.monitor.detectMonitors', 'Detect Monitors')}</button>
            </div>

            <div class="monitor-status-section">
                <h4>${t('tools.monitor.connectedMonitors', 'Connected Monitors')}</h4>
                <div id="monitor-status-list" class="monitor-status-list"></div>
            </div>

            <div class="monitor-controls-section">
                <h4>${t('tools.monitor.monitorControls', 'Monitor Controls')}</h4>
                <div id="monitor-controls" class="monitor-controls"></div>
            </div>

            <div class="monitor-actions-section">
                <h4>${t('tools.monitor.quickActions', 'Quick Actions')}</h4>
                <div id="monitor-actions" class="monitor-actions"></div>
            </div>
        `;

        container.appendChild(toolContent);

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
            const monitors = await emubro.invoke('get-monitor-info');
            this.displayMonitorStatus(monitors);
        } catch (error) {
            console.error('Failed to get monitor info:', error);
            const statusList = document.getElementById('monitor-status-list');
            if (statusList) {
                statusList.innerHTML = `<p class="error">${t('tools.monitor.failedRetrieveInfo', 'Failed to retrieve monitor information')}</p>`;
            }
        }
    }

    displayMonitorStatus(monitors) {
        const statusList = document.getElementById('monitor-status-list');
        const controls = document.getElementById('monitor-controls');
        const actions = document.getElementById('monitor-actions');
        if (!statusList || !controls || !actions) return;

        if (!monitors || monitors.length === 0) {
            statusList.innerHTML = `<p>${t('tools.monitor.noMonitorsDetected', 'No monitors detected')}</p>`;
            controls.innerHTML = '';
            actions.innerHTML = '';
            return;
        }

        statusList.innerHTML = `
            <div class="monitors-grid">
                ${monitors.map((monitor, index) => `
                    <div class="monitor-item" data-monitor-id="${index}">
                        <div class="monitor-header">
                            <h5>${t('tools.monitor.monitorN', 'Monitor {{number}}', { number: index + 1 })}</h5>
                            <span class="monitor-status ${monitor.connected ? 'connected' : 'disconnected'}">
                                ${monitor.connected ? t('tools.monitor.connected', 'Connected') : t('tools.monitor.disconnected', 'Disconnected')}
                            </span>
                        </div>
                        <div class="monitor-details">
                            <p><strong>${t('tools.monitor.deviceId', 'Device ID')}:</strong> ${monitor.deviceId || t('tools.monitor.notAvailable', 'N/A')}</p>
                            <p><strong>${t('tools.monitor.resolution', 'Resolution')}:</strong> ${monitor.width} x ${monitor.height}</p>
                            <p><strong>${t('tools.monitor.primary', 'Primary')}:</strong> ${monitor.isPrimary ? t('buttons.yes', 'Yes') : t('buttons.no', 'No')}</p>
                            <p><strong>${t('tools.monitor.orientation', 'Orientation')}:</strong> ${monitor.orientation || t('tools.monitor.normal', 'Normal')}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        controls.innerHTML = `
            <div class="monitor-controls-grid">
                ${monitors.map((monitor, index) => `
                    <div class="monitor-control-panel" data-monitor-id="${index}">
                        <h6>${t('tools.monitor.controlsForMonitor', 'Monitor {{number}} Controls', { number: index + 1 })}</h6>
                        <div class="control-group">
                            <label>${t('tools.monitor.orientation', 'Orientation')}:</label>
                            <select class="orientation-select" data-monitor="${index}">
                                <option value="0">${t('tools.monitor.orientationNormal', 'Normal (0deg)')}</option>
                                <option value="90">${t('tools.monitor.orientationLandscape', 'Landscape (90deg)')}</option>
                                <option value="180">${t('tools.monitor.orientationFlipped', 'Flipped (180deg)')}</option>
                                <option value="270">${t('tools.monitor.orientationPortrait', 'Portrait (270deg)')}</option>
                            </select>
                            <button class="action-btn" data-action="set-orientation" data-monitor="${index}">${t('tools.monitor.setOrientation', 'Set Orientation')}</button>
                        </div>
                        <div class="control-group">
                            <label>${t('tools.monitor.displayState', 'Display State')}:</label>
                            <select class="display-state-select" data-monitor="${index}">
                                <option value="enable">${t('tools.monitor.enable', 'Enable')}</option>
                                <option value="disable">${t('tools.monitor.disable', 'Disable')}</option>
                            </select>
                            <button class="action-btn" data-action="set-display-state" data-monitor="${index}">${t('tools.monitor.apply', 'Apply')}</button>
                        </div>
                        <div class="control-group">
                            <button class="action-btn" data-action="set-primary" data-monitor="${index}" ${monitor.isPrimary ? 'disabled' : ''}>
                                ${monitor.isPrimary ? t('tools.monitor.isPrimary', 'Is Primary') : t('tools.monitor.setAsPrimary', 'Set as Primary')}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('[data-action="set-orientation"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const monitorId = Number.parseInt(e.target.dataset.monitor, 10);
                const select = document.querySelector(`.orientation-select[data-monitor="${monitorId}"]`);
                this.setMonitorOrientation(monitorId, Number.parseInt(select.value, 10));
            });
        });

        document.querySelectorAll('[data-action="set-display-state"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const monitorId = Number.parseInt(e.target.dataset.monitor, 10);
                const select = document.querySelector(`.display-state-select[data-monitor="${monitorId}"]`);
                this.setMonitorDisplayState(monitorId, select.value);
            });
        });

        document.querySelectorAll('[data-action="set-primary"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const monitorId = Number.parseInt(e.target.dataset.monitor, 10);
                this.setPrimaryMonitor(monitorId);
            });
        });

        actions.innerHTML = `
            <div class="quick-actions-grid">
                <button class="action-btn" id="toggle-landscape">${t('tools.monitor.toggleLandscape', 'Toggle Landscape')}</button>
                <button class="action-btn" id="toggle-portrait">${t('tools.monitor.togglePortrait', 'Toggle Portrait')}</button>
                <button class="action-btn" id="disable-monitor-2">${t('tools.monitor.disableMonitor2', 'Disable Monitor 2')}</button>
                <button class="action-btn" id="enable-monitor-2">${t('tools.monitor.enableMonitor2', 'Enable Monitor 2')}</button>
                <button class="action-btn" id="set-primary-monitor">${t('tools.monitor.setPrimaryMonitor', 'Set Primary Monitor')}</button>
            </div>
        `;

        document.getElementById('toggle-landscape').addEventListener('click', () => this.toggleMonitorOrientation(1, 0));
        document.getElementById('toggle-portrait').addEventListener('click', () => this.toggleMonitorOrientation(1, 90));
        document.getElementById('disable-monitor-2').addEventListener('click', () => this.setMonitorDisplayState(1, 'disable'));
        document.getElementById('enable-monitor-2').addEventListener('click', () => this.setMonitorDisplayState(1, 'enable'));
        document.getElementById('set-primary-monitor').addEventListener('click', () => this.setPrimaryMonitor(0));
    }

    async detectMonitors() {
        try {
            const monitors = await emubro.invoke('detect-monitors');
            this.displayMonitorStatus(monitors);
            alert(t('tools.monitor.detectCompleted', 'Monitor detection completed successfully.'));
        } catch (error) {
            console.error('Failed to detect monitors:', error);
            alert(t('tools.monitor.detectFailed', 'Failed to detect monitors: {{message}}', { message: error.message }));
        }
    }

    async setMonitorOrientation(monitorId, orientation) {
        try {
            const result = await emubro.invoke('set-monitor-orientation', monitorId, orientation);
            if (result.success) {
                alert(t('tools.monitor.orientationSet', 'Monitor {{number}} orientation set to {{orientation}} deg', {
                    number: monitorId + 1,
                    orientation
                }));
                this.updateMonitorStatus();
            } else {
                alert(t('tools.monitor.orientationSetFailed', 'Failed to set monitor orientation: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error('Failed to set monitor orientation:', error);
            alert(t('tools.monitor.orientationSetFailed', 'Failed to set monitor orientation: {{message}}', { message: error.message }));
        }
    }

    async toggleMonitorOrientation(monitorId, targetOrientation) {
        try {
            const result = await emubro.invoke('toggle-monitor-orientation', monitorId, targetOrientation);
            if (result.success) {
                alert(t('tools.monitor.orientationToggleSuccess', 'Monitor {{number}} orientation toggled to {{orientation}} deg', {
                    number: monitorId + 1,
                    orientation: targetOrientation
                }));
                this.updateMonitorStatus();
            } else {
                alert(t('tools.monitor.orientationToggleFailed', 'Failed to toggle monitor orientation: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error('Failed to toggle monitor orientation:', error);
            alert(t('tools.monitor.orientationToggleFailed', 'Failed to toggle monitor orientation: {{message}}', { message: error.message }));
        }
    }

    async setMonitorDisplayState(monitorId, state) {
        try {
            const result = await emubro.invoke('set-monitor-display-state', monitorId, state);
            if (result.success) {
                alert(t('tools.monitor.stateSetSuccess', 'Monitor {{number}} {{state}}d successfully', {
                    number: monitorId + 1,
                    state
                }));
                this.updateMonitorStatus();
            } else {
                alert(t('tools.monitor.stateSetFailed', 'Failed to set monitor state: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error('Failed to set monitor display state:', error);
            alert(t('tools.monitor.stateSetFailed', 'Failed to set monitor state: {{message}}', { message: error.message }));
        }
    }

    async setPrimaryMonitor(monitorId) {
        try {
            const result = await emubro.invoke('set-primary-monitor', monitorId);
            if (result.success) {
                alert(t('tools.monitor.primarySetSuccess', 'Monitor {{number}} set as primary monitor', { number: monitorId + 1 }));
                this.updateMonitorStatus();
            } else {
                alert(t('tools.monitor.primarySetFailed', 'Failed to set primary monitor: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error('Failed to set primary monitor:', error);
            alert(t('tools.monitor.primarySetFailed', 'Failed to set primary monitor: {{message}}', { message: error.message }));
        }
    }

    destroy() {
        this.isInitialized = false;
        console.log('Monitor Tool destroyed');
    }
}
