/**
 * Tools Manager
 */

const { ipcRenderer } = require('electron');
const log = require('electron-log');

export function showToolView(tool) {
    const gamesContainer = document.getElementById('games-container');
    const gamesHeader = document.getElementById('games-header');
    
    document.querySelectorAll('[data-tool]').forEach(link => {
        link.classList.remove('active');
    });
    const toolLink = document.querySelector(`[data-tool="${tool}"]`);
    if (toolLink) toolLink.classList.add('active');
    
    if (gamesHeader) {
        gamesHeader.textContent = tool.charAt(0).toUpperCase() + tool.slice(1).replace('-', ' ');
    }
    
    if (gamesContainer) {
        gamesContainer.innerHTML = '';
        
        switch(tool) {
            case 'memory-card':
                renderMemoryCardTool();
                break;
            case 'rom-ripper':
                renderRomRipperTool();
                break;
            case 'game-database':
                renderGameDatabaseTool();
                break;
            case 'cheat-codes':
                renderCheatCodesTool();
                break;
            default:
                gamesContainer.innerHTML = `<p>${i18n.t('tools.notImplemented')}</p>`;
        }
    }
}

function renderMemoryCardTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content memory-card-editor';
    toolContent.innerHTML = `
        <div class="editor-layout">
            <!-- Left Card Slot -->
            <div class="card-slot" id="slot-1">
                <div class="slot-header">
                    <label>Memory Card 1:</label>
                    <div class="header-controls">
                        <select class="card-select"><option value="">Select Card...</option></select>
                        <button class="icon-btn add-btn" title="New Card"><i class="fas fa-plus-square"></i></button>
                        <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                    </div>
                </div>
                <div class="save-table-container">
                    <table class="save-table">
                        <thead>
                            <tr>
                                <th class="col-icon">Icon</th>
                                <th class="col-title">Title</th>
                                <th class="col-name">File Name</th>
                                <th class="col-blocks">Blocks</th>
                            </tr>
                        </thead>
                        <tbody class="save-list">
                            <!-- Saves will be injected here -->
                        </tbody>
                    </table>
                </div>
                <div class="slot-footer">
                    <button class="action-btn small">Format Card</button>
                    <button class="action-btn small">Import File...</button>
                    <button class="action-btn small">Import Card...</button>
                    <button class="action-btn small primary">Save</button>
                </div>
            </div>

            <!-- Central Controls -->
            <div class="central-controls">
                <button class="control-btn" disabled>Delete File</button>
                <button class="control-btn" disabled>Undelete File</button>
                <button class="control-btn" disabled>Rename File</button>
                <button class="control-btn" disabled>Export File</button>
                <button class="control-btn move-btn" disabled><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>
                <button class="control-btn move-btn" disabled><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>
            </div>

            <!-- Right Card Slot -->
            <div class="card-slot" id="slot-2">
                <div class="slot-header">
                    <label>Memory Card 2:</label>
                    <div class="header-controls">
                        <select class="card-select"><option value="">Select Card...</option></select>
                        <button class="icon-btn add-btn" title="New Card"><i class="fas fa-plus-square"></i></button>
                        <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                    </div>
                </div>
                <div class="save-table-container">
                    <table class="save-table">
                        <thead>
                            <tr>
                                <th class="col-icon">Icon</th>
                                <th class="col-title">Title</th>
                                <th class="col-name">File Name</th>
                                <th class="col-blocks">Blocks</th>
                            </tr>
                        </thead>
                        <tbody class="save-list">
                            <!-- Saves will be injected here -->
                        </tbody>
                    </table>
                </div>
                <div class="slot-footer">
                    <button class="action-btn small">Format Card</button>
                    <button class="action-btn small">Import File...</button>
                    <button class="action-btn small">Import Card...</button>
                    <button class="action-btn small primary">Save</button>
                </div>
            </div>
        </div>
        <input type="file" id="slot-1-input" hidden accept=".mcr,.mcd,.gme,.ps2,.max,.psu">
        <input type="file" id="slot-2-input" hidden accept=".mcr,.mcd,.gme,.ps2,.max,.psu">
    `;
    gamesContainer.appendChild(toolContent);
    
    setupEditorLogic();
}

function setupEditorLogic() {
    const slot1Open = document.querySelector('#slot-1 .open-btn');
    const slot2Open = document.querySelector('#slot-2 .open-btn');
    const slot1Input = document.getElementById('slot-1-input');
    const slot2Input = document.getElementById('slot-2-input');

    slot1Open.addEventListener('click', () => slot1Input.click());
    slot2Open.addEventListener('click', () => slot2Input.click());

    slot1Input.addEventListener('change', (e) => handleFileSelection(e, 'slot-1'));
    slot2Input.addEventListener('change', (e) => handleFileSelection(e, 'slot-2'));
}

async function handleFileSelection(e, slotId) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const result = await ipcRenderer.invoke('read-memory-card', file.path);
        if (result.success) {
            populateSlot(slotId, result.data);
        } else {
            alert(i18n.t('tools.readFailed', {message: result.message}));
        }
    } catch (error) {
        log.error('Error reading card for ' + slotId, error);
    }
}

function populateSlot(slotId, data) {
    const tbody = document.querySelector(`#${slotId} .save-list`);
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.format === 'PlayStation 1' && data.saves) {
        data.saves.forEach(save => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-icon"><i class="fas fa-save"></i></td>
                <td class="col-title">${save.title}</td>
                <td class="col-name">${save.productCode}</td>
                <td class="col-blocks">${Math.ceil(save.size / 8192)}</td>
            `;
            tr.addEventListener('click', () => {
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                tr.classList.add('selected');
                updateCentralControls();
            });
            tbody.appendChild(tr);
        });
    } else if (data.format === 'PlayStation 2') {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="centered">${data.message}</td>`;
        tbody.appendChild(tr);
    } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="centered">Empty or Unsupported Card</td>`;
        tbody.appendChild(tr);
    }
}

function updateCentralControls() {
    const hasSelection = !!document.querySelector('.save-list tr.selected');
    document.querySelectorAll('.central-controls .control-btn').forEach(btn => {
        btn.disabled = !hasSelection;
    });
}

function renderRomRipperTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>${i18n.t('tools.romRipper')}</h3>
        <p>${i18n.t('tools.romRipperDesc')}</p>
        <div class="tool-controls">
            <button id="rip-rom-btn" class="action-btn">${i18n.t('tools.startRip')}</button>
        </div>
        <div id="rom-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('rip-rom-btn').addEventListener('click', () => {
        alert(i18n.t('tools.placeholderAlert', {feature: i18n.t('tools.romRipper')}));
    });
}

function renderGameDatabaseTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>${i18n.t('tools.gameDatabase')}</h3>
        <p>${i18n.t('tools.gameDatabaseDesc')}</p>
        <div class="tool-controls">
            <input type="text" id="db-search" placeholder="${i18n.t('tools.searchGames')}" />
            <button id="search-db-btn" class="action-btn">${i18n.t('tools.search')}</button>
        </div>
        <div id="db-results" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('search-db-btn').addEventListener('click', () => {
        alert(i18n.t('tools.placeholderAlert', {feature: i18n.t('tools.gameDatabase')}));
    });
}

function renderCheatCodesTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>${i18n.t('tools.cheatCodes')}</h3>
        <p>${i18n.t('tools.cheatCodesDesc')}</p>
        <div class="tool-controls">
            <select id="game-select">
                <option value="">${i18n.t('tools.selectGame')}</option>
                <option value="game1">Game 1</option>
                <option value="game2">Game 2</option>
                <option value="game3">Game 3</option>
            </select>
            <button id="apply-cheat-btn" class="action-btn">${i18n.t('tools.applyCheat')}</button>
        </div>
        <div id="cheat-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('apply-cheat-btn').addEventListener('click', () => {
        alert(i18n.t('tools.placeholderAlert', {feature: i18n.t('tools.cheatCodes')}));
    });
}

export function showMemoryCardReader() {
    renderMemoryCardTool();
}
