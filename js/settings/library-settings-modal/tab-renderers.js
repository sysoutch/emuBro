export function renderPathList({ key, items = [], emptyLabel = 'No folders added yet.' }) {
    const canRelocate = key === 'gameFolders' || key === 'emulatorFolders';
    if (!items.length) return `<div style="opacity:0.7;font-size:0.92rem;">${emptyLabel}</div>`;
    return `<div style="display:flex;flex-direction:column;gap:8px;">${items.map((p, idx) => `
        <div data-row="${idx}" style="display:flex;gap:8px;align-items:center;">
            <div style="flex:1;font-family:monospace;font-size:12px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);word-break:break-all;">${p}</div>
            ${canRelocate ? `<button type="button" class="action-btn small" data-relocate-index="${idx}" data-relocate-key="${key}">Relocate</button>` : ''}
            <button type="button" class="action-btn remove-btn small" data-remove-index="${idx}">Remove</button>
        </div>
    `).join('')}</div>`;
}

export function renderPathSection({
    key,
    title,
    subtitle,
    placeholder,
    browseLabel,
    entries = [],
    renderList = renderPathList
}) {
    return `
        <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;">
            <div>
                <h3 style="margin:0 0 4px 0;font-size:1rem;">${title}</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">${subtitle}</p>
            </div>
            <div data-list="${key}">${renderList({ key, items: entries, emptyLabel: 'No folders added yet.' })}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" data-input="${key}" placeholder="${placeholder}" style="flex:1;min-width:260px;" />
                <button type="button" class="action-btn" data-add-manual="${key}">Add Path</button>
                <button type="button" class="action-btn launch-btn" data-add-browse="${key}">${browseLabel}</button>
            </div>
        </section>
    `;
}

export function renderGeneralTab({ generalDraft }) {
    return `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Library Defaults</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library Section</span>
                        <select data-setting="default-section">
                            <option value="all"${generalDraft.defaultSection === 'all' ? ' selected' : ''}>All Games</option>
                            <option value="favorite"${generalDraft.defaultSection === 'favorite' ? ' selected' : ''}>Favorite</option>
                            <option value="recent"${generalDraft.defaultSection === 'recent' ? ' selected' : ''}>Recently Played</option>
                            ${generalDraft.llmHelpersEnabled ? `<option value="suggested"${generalDraft.defaultSection === 'suggested' ? ' selected' : ''}>Suggested</option>` : ''}
                            <option value="emulators"${generalDraft.defaultSection === 'emulators' ? ' selected' : ''}>Emulators</option>
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library View</span>
                        <select data-setting="default-view">
                            <option value="cover"${generalDraft.defaultView === 'cover' ? ' selected' : ''}>Cover</option>
                            <option value="list"${generalDraft.defaultView === 'list' ? ' selected' : ''}>List</option>
                            <option value="table"${generalDraft.defaultView === 'table' ? ' selected' : ''}>Table</option>
                            <option value="slideshow"${generalDraft.defaultView === 'slideshow' ? ' selected' : ''}>Slideshow</option>
                            <option value="focus"${generalDraft.defaultView === 'focus' ? ' selected' : ''}>Focus</option>
                            <option value="random"${generalDraft.defaultView === 'random' ? ' selected' : ''}>Random</option>
                        </select>
                    </label>
                </div>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="show-load-indicator"${generalDraft.showLoadIndicator ? ' checked' : ''} />
                    <span>Show progressive load indicator when more games are appended</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="auto-open-footer"${generalDraft.autoOpenFooter ? ' checked' : ''} />
                    <span>Auto-open the bottom panel when selecting a game</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-helpers-enabled"${generalDraft.llmHelpersEnabled ? ' checked' : ''} />
                    <span>Show AI/LLM helpers in UI (Suggested view, AI tag buttons, global AI tagging)</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-allow-unknown-tags"${generalDraft.llmAllowUnknownTags ? ' checked' : ''}${generalDraft.llmHelpersEnabled ? '' : ' disabled'} />
                    <span>Allow AI to suggest new tags not in your current tag catalog</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Quick Access</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn" data-settings-open-theme>Open Theme Manager</button>
                    <button type="button" class="action-btn" data-settings-open-language>Open Language Manager</button>
                    <button type="button" class="action-btn launch-btn" data-settings-open-profile>Open Profile</button>
                </div>
            </section>
        </section>
    `;
}

export function renderImportTab({ importDraft }) {
    return `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Import Behavior</h3>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="prefer-copy-external"${importDraft.preferCopyExternal ? ' checked' : ''} />
                    <span>Prefer copy (instead of move) when importing from external drives</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="enable-network-scan"${importDraft.enableNetworkScan ? ' checked' : ''} />
                    <span>Allow network share scan targets in quick search</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Scan Shortcuts</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn launch-btn" data-settings-quick-search>Run Quick Search</button>
                    <button type="button" class="action-btn" data-settings-custom-search>Run Custom Search</button>
                    <button type="button" class="action-btn" data-settings-open-browse-tab>Open Browse Computer Tab</button>
                </div>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Launcher Imports</h3>
                <div style="display:grid;gap:8px;">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="steam"${importDraft.launcherStores.steam ? ' checked' : ''} />
                        <span>Steam</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="epic"${importDraft.launcherStores.epic ? ' checked' : ''} />
                        <span>Epic Games</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="gog"${importDraft.launcherStores.gog ? ' checked' : ''} />
                        <span>GOG Galaxy (experimental)</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <span style="min-width:130px;">Discovery Mode</span>
                        <select data-launcher-discovery>
                            <option value="filesystem"${importDraft.launcherDiscoveryMode === 'filesystem' ? ' selected' : ''}>Filesystem</option>
                            <option value="api"${importDraft.launcherDiscoveryMode === 'api' ? ' selected' : ''}>API (if available)</option>
                            <option value="both"${importDraft.launcherDiscoveryMode === 'both' ? ' selected' : ''}>Both</option>
                        </select>
                    </label>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <button type="button" class="action-btn launch-btn" data-launcher-scan>Scan Launchers</button>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        Imported launcher games will open through their official launcher (Steam/Epic/GOG).
                    </div>
                </div>
            </section>
        </section>
    `;
}

export function renderUpdatesTab({
    updateState,
    resourcesUpdateState,
    escapeAttr,
    renderUpdateStatusText,
    renderResourcesUpdateStatusText
}) {
    const status = escapeAttr(renderUpdateStatusText());
    const currentVersion = escapeAttr(updateState.currentVersion || '');
    const latestVersion = escapeAttr(updateState.latestVersion || '');
    const notes = String(updateState.releaseNotes || '').trim();
    const canDownload = !!updateState.available && !updateState.downloaded && !updateState.downloading && !updateState.installing;
    const canInstall = !!updateState.downloaded && !updateState.downloading && !updateState.installing;
    const resourcesStatus = escapeAttr(renderResourcesUpdateStatusText());
    const resourcesCurrentVersion = escapeAttr(resourcesUpdateState.currentVersion || '');
    const resourcesLatestVersion = escapeAttr(resourcesUpdateState.latestVersion || '');
    const resourcesManifestUrl = escapeAttr(resourcesUpdateState.manifestUrl || '');
    const resourcesStoragePath = escapeAttr(resourcesUpdateState.storagePath || '');
    const resourcesEffectiveStoragePath = escapeAttr(resourcesUpdateState.effectiveStoragePath || resourcesUpdateState.defaultStoragePath || '');
    const resourcesDefaultStoragePath = escapeAttr(resourcesUpdateState.defaultStoragePath || '');
    const missingResources = !!resourcesUpdateState.missingLocalResources;
    const canInstallResources = (!!resourcesUpdateState.available || missingResources) && !resourcesUpdateState.installing;
    const installResourcesLabel = missingResources ? 'Re-download Resources' : 'Install Resource Update';
    const autoCheckOnStartup = !!(updateState.autoCheckOnStartup && resourcesUpdateState.autoCheckOnStartup);
    const autoCheckIntervalMinutes = Math.max(
        5,
        Math.min(
            1440,
            Math.round(Number(updateState.autoCheckIntervalMinutes || resourcesUpdateState.autoCheckIntervalMinutes || 60))
        )
    );
    return `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Automatic Update Checks</h3>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-update-auto-check-startup${autoCheckOnStartup ? ' checked' : ''} />
                    <span>Check for app/resources updates automatically</span>
                </label>
                <div style="display:grid;grid-template-columns:minmax(160px,280px) auto;gap:8px;align-items:center;">
                    <input
                        type="number"
                        min="5"
                        max="1440"
                        step="1"
                        data-update-auto-check-interval
                        value="${autoCheckIntervalMinutes}"
                    />
                    <button type="button" class="action-btn" data-update-action="save-auto-config">Save Auto-Check Settings</button>
                </div>
                <div style="font-size:0.82rem;color:var(--text-secondary);">Interval is in minutes (5 - 1440).</div>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">App Updates</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
                    <div style="font-size:0.9rem;"><strong>Current:</strong> ${currentVersion || '-'}</div>
                    <div style="font-size:0.9rem;"><strong>Latest:</strong> ${latestVersion || '-'}</div>
                </div>
                <div style="font-size:0.9rem;color:var(--text-secondary);" data-update-status>${status}</div>
                <div style="font-size:0.82rem;color:var(--text-secondary);">${!updateState.currentVersion && !updateState.latestVersion ? 'If this app is not packaged or no GitHub release artifacts are published yet, check will report that directly.' : ''}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn" data-update-action="check"${(updateState.checking || updateState.downloading || updateState.installing) ? ' disabled' : ''}>Check for Updates</button>
                    <button type="button" class="action-btn" data-update-action="download"${canDownload ? '' : ' disabled'}>Download Update</button>
                    <button type="button" class="action-btn launch-btn" data-update-action="install"${canInstall ? '' : ' disabled'}>Install & Restart</button>
                </div>
                ${notes ? `<pre style="margin:0;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);white-space:pre-wrap;font-family:var(--font-body);font-size:0.85rem;">${escapeAttr(notes)}</pre>` : ''}
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">emubro-resources Updates</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
                    <div style="font-size:0.9rem;"><strong>Current:</strong> ${resourcesCurrentVersion || '-'}</div>
                    <div style="font-size:0.9rem;"><strong>Latest:</strong> ${resourcesLatestVersion || '-'}</div>
                </div>
                <div style="font-size:0.9rem;color:var(--text-secondary);" data-resource-update-status>${resourcesStatus}</div>
                <div style="display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:8px;align-items:center;">
                    <input
                        type="text"
                        data-resource-manifest-url
                        value="${resourcesManifestUrl}"
                        placeholder="https://.../manifest.json"
                        style="min-width:240px;"
                    />
                    <button type="button" class="action-btn" data-resource-update-action="save-config">Save URL + Path</button>
                </div>
                <div style="display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:8px;align-items:center;">
                    <input
                        type="text"
                        data-resource-storage-path
                        value="${resourcesStoragePath}"
                        placeholder="Leave empty to use default path"
                        style="min-width:240px;"
                    />
                    <button type="button" class="action-btn" data-resource-storage-action="browse">Browse...</button>
                    <button type="button" class="action-btn" data-resource-storage-action="use-default">Use Default</button>
                </div>
                <div style="font-size:0.82rem;color:var(--text-secondary);">
                    Active folder: ${resourcesEffectiveStoragePath || '-'}${resourcesDefaultStoragePath ? ` | Default: ${resourcesDefaultStoragePath}` : ''}
                </div>
                ${missingResources ? '<div style="font-size:0.82rem;color:#ff8f8f;">Resources folder or manifest is missing at the active path. Re-download is required.</div>' : ''}
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn" data-resource-update-action="check"${resourcesUpdateState.checking ? ' disabled' : ''}>Check Resource Updates</button>
                    <button type="button" class="action-btn launch-btn" data-resource-update-action="install"${canInstallResources ? '' : ' disabled'}>${installResourcesLabel}</button>
                </div>
            </section>
        </section>
    `;
}

export function renderGamepadTab({
    platformBindingRows = [],
    platformGamepadDraft = {},
    normalizeInputBindingProfile,
    escapeAttr,
    gamepadBindingActions = [],
    gamepadBindingLabels = {}
}) {
    const platformSections = platformBindingRows.map((row) => {
        const shortName = String(row?.shortName || '').trim().toLowerCase();
        if (!shortName) return '';
        const displayName = String(row?.platform || shortName.toUpperCase()).trim();
        const current = normalizeInputBindingProfile(platformGamepadDraft[shortName] || {});
        return `
            <details style="border:1px solid var(--border-color);border-radius:12px;padding:10px;background:color-mix(in srgb, var(--bg-primary), transparent 14%);">
                <summary style="cursor:pointer;font-weight:650;">${escapeAttr(displayName)} (${escapeAttr(shortName)})</summary>
                <div style="display:grid;gap:8px;margin-top:10px;">
                    <div style="display:grid;grid-template-columns:minmax(120px,220px) minmax(160px,1fr) minmax(160px,1fr);gap:8px;align-items:center;padding:0 0 4px 0;">
                        <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Action</span>
                        <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Keyboard</span>
                        <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Gamepad</span>
                    </div>
                    ${gamepadBindingActions.map((action) => `
                        <label style="display:grid;grid-template-columns:minmax(120px,220px) minmax(160px,1fr) minmax(160px,1fr);gap:8px;align-items:center;">
                            <span style="font-size:0.85rem;color:var(--text-secondary);">${gamepadBindingLabels[action] || action}</span>
                            <input
                                type="text"
                                data-platform-gamepad-input="${escapeAttr(shortName)}"
                                data-platform-gamepad-action="${escapeAttr(action)}"
                                data-platform-gamepad-channel="keyboard"
                                value="${escapeAttr(current?.keyboard?.[action] || '')}"
                                placeholder="e.g. key:Space, 37"
                            />
                            <input
                                type="text"
                                data-platform-gamepad-input="${escapeAttr(shortName)}"
                                data-platform-gamepad-action="${escapeAttr(action)}"
                                data-platform-gamepad-channel="gamepad"
                                value="${escapeAttr(current?.gamepad?.[action] || '')}"
                                placeholder="e.g. button0, axis1+, 32776"
                            />
                        </label>
                    `).join('')}
                    <div style="display:flex;justify-content:flex-end;">
                        <button type="button" class="action-btn remove-btn small" data-platform-gamepad-clear="${escapeAttr(shortName)}">Clear ${escapeAttr(displayName)}</button>
                    </div>
                </div>
            </details>
        `;
    }).join('');

    return `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Platform Gamepad Profiles</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">
                    These bindings apply to all emulators of a platform by default. Emulator-specific overrides can be set in Emulator Edit.
                </p>
                <div style="display:grid;gap:8px;">
                    ${platformSections || '<div style="opacity:0.7;font-size:0.92rem;">No platforms available yet.</div>'}
                </div>
            </section>
        </section>
    `;
}

export function renderLlmTab({
    llmDraft,
    llmRelayScanStatus,
    llmRelayScanResults,
    llmRelayHostStatus,
    llmRelayConnections,
    normalizeLlmMode,
    normalizeRelayPort,
    normalizeRelayAccessMode,
    normalizeRelayAddressList,
    escapeAttr
}) {
    const provider = llmDraft.provider;
    const model = llmDraft.models[provider] || '';
    const baseUrl = llmDraft.baseUrls[provider] || '';
    const apiKey = llmDraft.apiKeys[provider] || '';
    const isOllama = provider === 'ollama';
    const llmMode = normalizeLlmMode(llmDraft.llmMode);
    const relayPort = normalizeRelayPort(llmDraft.relay?.port, 42141);
    const relayHostUrl = String(llmDraft.relay?.hostUrl || '').trim();
    const relayAuthToken = String(llmDraft.relay?.authToken || '').trim();
    const relayEnabled = !!llmDraft.relay?.enabled;
    const relayAccessMode = normalizeRelayAccessMode(llmDraft.relay?.accessMode);
    const relayWhitelist = normalizeRelayAddressList(llmDraft.relay?.whitelist);
    const relayBlacklist = normalizeRelayAddressList(llmDraft.relay?.blacklist);
    const relayWhitelistText = escapeAttr(relayWhitelist.join('\n'));
    const relayBlacklistText = escapeAttr(relayBlacklist.join('\n'));
    const relayHostStatusText = llmRelayHostStatus?.status?.running
        ? `Incoming relay is running on port ${Number(llmRelayHostStatus?.status?.port || relayPort)}.`
        : 'Incoming relay is currently disabled.';
    const relayRows = (Array.isArray(llmRelayScanResults) ? llmRelayScanResults : [])
        .map((row) => {
            const url = escapeAttr(String(row?.url || '').trim());
            const host = escapeAttr(String(row?.hostname || row?.host || '').trim() || 'Unknown host');
            const version = escapeAttr(String(row?.version || '').trim());
            const latency = Number.isFinite(Number(row?.latencyMs)) ? `${Math.round(Number(row.latencyMs))} ms` : '';
            return `
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);">
                    <div style="min-width:0;">
                        <div style="font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${host}${version ? ` <span style="opacity:0.75;font-weight:500;">(${version})</span>` : ''}</div>
                        <div style="font-size:0.78rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${url}${latency ? ` - ${escapeAttr(latency)}` : ''}</div>
                    </div>
                    <button type="button" class="action-btn small" data-llm-pick-host="${url}">Use</button>
                </div>
            `;
        })
        .join('');
    const relayConnectionRows = (Array.isArray(llmRelayConnections) ? llmRelayConnections : [])
        .map((row) => {
            const remoteAddress = escapeAttr(String(row?.remoteAddress || '').trim() || 'unknown');
            const clientName = escapeAttr(String(row?.clientName || '').trim() || 'client');
            const lastPath = escapeAttr(String(row?.lastPath || '').trim() || '-');
            const lastSeen = Number.isFinite(Number(row?.lastSeenAt))
                ? new Date(Number(row.lastSeenAt)).toLocaleString()
                : '-';
            return `
                <div style="padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);display:grid;gap:2px;">
                    <div style="font-size:0.84rem;font-weight:600;">${remoteAddress} <span style="opacity:0.72;font-weight:500;">(${clientName})</span></div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">last: ${lastPath} | requests: ${Number(row?.requestCount || 0)} | denied: ${Number(row?.deniedCount || 0)} | auth fail: ${Number(row?.authFailCount || 0)}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">seen: ${escapeAttr(lastSeen)}</div>
                </div>
            `;
        })
        .join('');

    return `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">AI / LLM Configuration</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;">
                    Configure providers for game suggestions and automated tagging.
                </p>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Mode</span>
                        <select data-llm="mode">
                            <option value="host"${llmMode === 'host' ? ' selected' : ''}>Host (default)</option>
                            <option value="client"${llmMode === 'client' ? ' selected' : ''}>Client</option>
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Provider</span>
                        <select data-llm="provider">
                            <option value="ollama"${provider === 'ollama' ? ' selected' : ''}>Ollama (Local)</option>
                            <option value="openai"${provider === 'openai' ? ' selected' : ''}>ChatGPT (OpenAI)</option>
                            <option value="gemini"${provider === 'gemini' ? ' selected' : ''}>Gemini (Google)</option>
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Model Name</span>
                        ${isOllama ? `
                        <div style="display:grid;grid-template-columns:1fr auto;gap:6px;">
                            <select data-llm="model-select">
                                <option value="${model}" selected>${model || 'Select model...'}</option>
                            </select>
                            <button type="button" class="action-btn small" data-llm="refresh-models">Refresh</button>
                        </div>
                        <input type="text" data-llm="model" value="${model}" style="display:none;" />
                        ` : `
                        <input type="text" data-llm="model" value="${model}" placeholder="e.g. gpt-4o-mini" />
                        `}
                    </label>
                </div>
                <label style="display:flex;flex-direction:column;gap:6px;${llmMode === 'client' ? 'opacity:0.72;' : ''}">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">API Base URL</span>
                    <input type="text" data-llm="base-url" value="${baseUrl}" placeholder="${isOllama ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1'}"${llmMode === 'client' ? ' disabled' : ''} />
                </label>
                ${!isOllama ? `
                <label style="display:flex;flex-direction:column;gap:6px;${llmMode === 'client' ? 'opacity:0.72;' : ''}">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">API Key</span>
                    <input type="password" data-llm="api-key" value="${apiKey}" placeholder="sk-..." autocomplete="off"${llmMode === 'client' ? ' disabled' : ''} />
                </label>
                ` : `
                <div style="font-size:0.8rem;color:var(--text-secondary);opacity:0.8;" data-llm="status"></div>
                `}
                <div style="border-top:1px solid var(--border-color);padding-top:10px;display:grid;gap:10px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Relay Port</span>
                            <input type="number" min="1" max="65535" step="1" data-llm="relay-port" value="${relayPort}" />
                        </label>
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Shared Token (optional)</span>
                            <input type="password" data-llm="relay-token" value="${escapeAttr(relayAuthToken)}" placeholder="Leave empty for open LAN access" autocomplete="off" />
                        </label>
                    </div>
                    ${llmMode === 'client' ? `
                    <div style="display:grid;gap:8px;">
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Host URL</span>
                            <input type="text" data-llm="client-host-url" value="${escapeAttr(relayHostUrl)}" placeholder="http://192.168.1.40:42141" />
                        </label>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            <button type="button" class="action-btn small" data-llm="scan-network">Scan Network</button>
                        </div>
                        <div style="font-size:0.82rem;color:var(--text-secondary);" data-llm="scan-status">${escapeAttr(llmRelayScanStatus || 'Scan your local network for other running emuBro hosts.')}</div>
                        ${relayRows ? `<div style="display:grid;gap:6px;max-height:220px;overflow:auto;">${relayRows}</div>` : ''}
                    </div>
                    ` : `
                    <div style="display:grid;gap:8px;">
                        <label style="display:flex;align-items:center;gap:8px;">
                            <input type="checkbox" data-llm="relay-enabled"${relayEnabled ? ' checked' : ''} />
                            <span>Enable incoming client connections</span>
                        </label>
                        <label style="display:flex;flex-direction:column;gap:6px;${relayEnabled ? '' : 'opacity:0.72;'}">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Access Mode</span>
                            <select data-llm="relay-access-mode"${relayEnabled ? '' : ' disabled'}>
                                <option value="open"${relayAccessMode === 'open' ? ' selected' : ''}>Open LAN (token recommended)</option>
                                <option value="whitelist"${relayAccessMode === 'whitelist' ? ' selected' : ''}>Whitelist only</option>
                                <option value="blacklist"${relayAccessMode === 'blacklist' ? ' selected' : ''}>Blacklist</option>
                            </select>
                        </label>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;${relayEnabled ? '' : 'opacity:0.72;'}">
                            <label style="display:flex;flex-direction:column;gap:6px;">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Whitelist IP/Host (one per line)</span>
                                <textarea data-llm="relay-whitelist" rows="4"${relayEnabled ? '' : ' disabled'}>${relayWhitelistText}</textarea>
                            </label>
                            <label style="display:flex;flex-direction:column;gap:6px;">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Blacklist IP/Host (one per line)</span>
                                <textarea data-llm="relay-blacklist" rows="4"${relayEnabled ? '' : ' disabled'}>${relayBlacklistText}</textarea>
                            </label>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            <button type="button" class="action-btn small" data-llm="refresh-connections">Refresh Connected Devices</button>
                        </div>
                        <div style="font-size:0.82rem;color:var(--text-secondary);">${escapeAttr(relayHostStatusText)}</div>
                        ${relayConnectionRows
                            ? `<div style="display:grid;gap:6px;max-height:240px;overflow:auto;">${relayConnectionRows}</div>`
                            : '<div style="font-size:0.82rem;color:var(--text-secondary);">No connected devices recorded yet.</div>'}
                    </div>
                    `}
                </div>
            </section>
        </section>
    `;
}
