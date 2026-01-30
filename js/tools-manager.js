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
                gamesContainer.innerHTML = '<p>Tool not implemented yet.</p>';
        }
    }
}

function renderMemoryCardTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Memory Card Reader</h3>
        <p>This tool allows you to read and write data to memory cards.</p>
        <div class="tool-controls">
            <button id="read-memory-btn" class="action-btn">Read Memory Card</button>
            <button id="write-memory-btn" class="action-btn">Write Memory Card</button>
        </div>
        <div id="memory-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('read-memory-btn').addEventListener('click', () => {
        alert('Memory card reading functionality would be implemented here.');
    });
    document.getElementById('write-memory-btn').addEventListener('click', () => {
        alert('Memory card writing functionality would be implemented here.');
    });
}

function renderRomRipperTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>ROM Ripper</h3>
        <p>This tool allows you to rip ROMs from optical media.</p>
        <div class="tool-controls">
            <button id="rip-rom-btn" class="action-btn">Start ROM Rip</button>
        </div>
        <div id="rom-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('rip-rom-btn').addEventListener('click', () => {
        alert('ROM ripping functionality would be implemented here.');
    });
}

function renderGameDatabaseTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Game Database</h3>
        <p>This tool allows you to search and manage your game database.</p>
        <div class="tool-controls">
            <input type="text" id="db-search" placeholder="Search games..." />
            <button id="search-db-btn" class="action-btn">Search</button>
        </div>
        <div id="db-results" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('search-db-btn').addEventListener('click', () => {
        alert('Database search functionality would be implemented here.');
    });
}

function renderCheatCodesTool() {
    const gamesContainer = document.getElementById('games-container');
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Cheat Codes</h3>
        <p>This tool allows you to manage and apply cheat codes to your games.</p>
        <div class="tool-controls">
            <select id="game-select">
                <option value="">Select a game</option>
                <option value="game1">Game 1</option>
                <option value="game2">Game 2</option>
                <option value="game3">Game 3</option>
            </select>
            <button id="apply-cheat-btn" class="action-btn">Apply Cheat</button>
        </div>
        <div id="cheat-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById('apply-cheat-btn').addEventListener('click', () => {
        alert('Cheat code functionality would be implemented here.');
    });
}

export function showMemoryCardReader() {
    let memoryCardReader = document.getElementById('memory-card-reader');
    
    if (!memoryCardReader) {
        memoryCardReader = document.createElement('div');
        memoryCardReader.id = 'memory-card-reader';
        memoryCardReader.className = 'tool-content';
        memoryCardReader.innerHTML = `
            <h2>Memory Card Reader</h2>
            <div class="memory-card-controls">
                <div class="drive-selector">
                    <label for="drive-selector-tools">Select Drive:</label>
                    <select id="drive-selector-tools">
                        <option value="">Select Drive</option>
                    </select>
                    <button id="search-memory-cards">Search for Memory Cards</button>
                </div>
                <div class="memory-card-list">
                    <h3>Found Memory Cards</h3>
                    <div id="memory-cards-container"></div>
                </div>
                <div class="memory-card-details">
                    <h3>Memory Card Details</h3>
                    <div id="memory-card-details-content"></div>
                </div>
            </div>
        `;
        
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.parentNode.insertBefore(memoryCardReader, gamesContainer.nextSibling);
    }
    
    memoryCardReader.style.display = 'block';
    setupMemoryCardReader();
}

async function setupMemoryCardReader() {
    const searchBtn = document.getElementById('search-memory-cards');
    if (searchBtn) searchBtn.addEventListener('click', searchMemoryCards);
    
    const drives = await ipcRenderer.invoke('get-drives');
    const driveSelector = document.getElementById('drive-selector-tools');
    if (driveSelector) {
        driveSelector.innerHTML = '<option value="">Select Drive</option>';
        drives.forEach(drive => {
            const option = document.createElement('option');
            option.value = drive;
            option.textContent = drive;
            driveSelector.appendChild(option);
        });
    }
}

async function searchMemoryCards() {
    const driveSelector = document.getElementById('drive-selector-tools');
    const selectedDrive = driveSelector.value;
    
    try {
        const result = await ipcRenderer.invoke('browse-memory-cards', selectedDrive);
        if (result.success) {
            displayMemoryCards(result.cards);
        } else {
            alert('Failed to search for memory cards: ' + result.message);
        }
    } catch (error) {
        log.error('Error searching for memory cards:', error);
    }
}

function displayMemoryCards(cards) {
    const container = document.getElementById('memory-cards-container');
    if (!container) return;

    if (cards.length === 0) {
        container.innerHTML = '<p>No memory cards found.</p>';
        return;
    }
    
    let html = '<ul class="memory-cards-list">';
    cards.forEach(card => {
        html += `
            <li class="memory-card-item" data-path="${card.path}">
                <h4>${card.name}</h4>
                <p>Size: ${card.size} bytes</p>
                <p>Modified: ${new Date(card.modified).toLocaleString()}</p>
                <button class="view-card-btn" data-path="${card.path}">View Details</button>
            </li>
        `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
    
    document.querySelectorAll('.view-card-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const cardPath = e.target.getAttribute('data-path');
            readMemoryCard(cardPath);
        });
    });
}

async function readMemoryCard(cardPath) {
    try {
        const result = await ipcRenderer.invoke('read-memory-card', cardPath);
        if (result.success) {
            displayMemoryCardDetails(result.data);
        } else {
            alert('Failed to read memory card: ' + result.message);
        }
    } catch (error) {
        log.error('Error reading memory card:', error);
    }
}

function displayMemoryCardDetails(data) {
    const container = document.getElementById('memory-card-details-content');
    if (!container) return;

    if (data.raw) {
        container.innerHTML = `<pre>${data.raw}</pre>`;
    } else {
        container.innerHTML = `
            <div class="memory-card-data">
                <h4>Memory Card Data</h4>
                <p><strong>Format:</strong> JSON</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    }
}
