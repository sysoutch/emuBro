export function bindLlmHandlers({
    modal,
    llmDraft,
    normalizeLlmMode,
    normalizeRelayPort,
    normalizeRelayAccessMode,
    normalizeRelayAddressList,
    emubro,
    render,
    refreshRelayHostData,
    setLlmRelayScanStatus,
    setLlmRelayScanResults
}) {
    const llmProviderSelect = modal.querySelector('[data-llm="provider"]');
    if (llmProviderSelect) {
        llmProviderSelect.addEventListener('change', () => {
            llmDraft.provider = llmProviderSelect.value;
            render();
        });
    }

    const llmModeSelect = modal.querySelector('[data-llm="mode"]');
    if (llmModeSelect) {
        llmModeSelect.addEventListener('change', () => {
            llmDraft.llmMode = normalizeLlmMode(llmModeSelect.value);
            render();
        });
    }

    const llmModelInput = modal.querySelector('[data-llm="model"]');
    if (llmModelInput) {
        llmModelInput.addEventListener('input', () => {
            llmDraft.models[llmDraft.provider] = llmModelInput.value;
        });
    }

    const llmModelSelect = modal.querySelector('[data-llm="model-select"]');
    if (llmModelSelect) {
        llmModelSelect.addEventListener('change', () => {
            const value = llmModelSelect.value;
            llmDraft.models[llmDraft.provider] = value;
            if (llmModelInput) llmModelInput.value = value;
        });
    }

    const llmBaseUrlInput = modal.querySelector('[data-llm="base-url"]');
    if (llmBaseUrlInput) {
        llmBaseUrlInput.addEventListener('input', () => {
            llmDraft.baseUrls[llmDraft.provider] = llmBaseUrlInput.value;
        });
    }

    const llmApiKeyInput = modal.querySelector('[data-llm="api-key"]');
    if (llmApiKeyInput) {
        llmApiKeyInput.addEventListener('input', () => {
            llmDraft.apiKeys[llmDraft.provider] = llmApiKeyInput.value;
        });
    }

    const llmRelayPortInput = modal.querySelector('[data-llm="relay-port"]');
    if (llmRelayPortInput) {
        llmRelayPortInput.addEventListener('input', () => {
            llmDraft.relay.port = normalizeRelayPort(llmRelayPortInput.value, 42141);
        });
    }

    const llmRelayEnabledInput = modal.querySelector('[data-llm="relay-enabled"]');
    if (llmRelayEnabledInput) {
        llmRelayEnabledInput.addEventListener('change', () => {
            llmDraft.relay.enabled = !!llmRelayEnabledInput.checked;
            render();
        });
    }

    const llmRelayAccessModeInput = modal.querySelector('[data-llm="relay-access-mode"]');
    if (llmRelayAccessModeInput) {
        llmRelayAccessModeInput.addEventListener('change', () => {
            llmDraft.relay.accessMode = normalizeRelayAccessMode(llmRelayAccessModeInput.value);
        });
    }

    const llmRelayTokenInput = modal.querySelector('[data-llm="relay-token"]');
    if (llmRelayTokenInput) {
        llmRelayTokenInput.addEventListener('input', () => {
            llmDraft.relay.authToken = String(llmRelayTokenInput.value || '').trim();
        });
    }

    const llmRelayWhitelistInput = modal.querySelector('[data-llm="relay-whitelist"]');
    if (llmRelayWhitelistInput) {
        llmRelayWhitelistInput.addEventListener('input', () => {
            llmDraft.relay.whitelist = normalizeRelayAddressList(llmRelayWhitelistInput.value);
        });
    }

    const llmRelayBlacklistInput = modal.querySelector('[data-llm="relay-blacklist"]');
    if (llmRelayBlacklistInput) {
        llmRelayBlacklistInput.addEventListener('input', () => {
            llmDraft.relay.blacklist = normalizeRelayAddressList(llmRelayBlacklistInput.value);
        });
    }

    const llmClientHostUrlInput = modal.querySelector('[data-llm="client-host-url"]');
    if (llmClientHostUrlInput) {
        llmClientHostUrlInput.addEventListener('input', () => {
            llmDraft.relay.hostUrl = String(llmClientHostUrlInput.value || '').trim();
        });
    }

    const llmRefreshBtn = modal.querySelector('[data-llm="refresh-models"]');
    if (llmRefreshBtn && llmModelSelect) {
        llmRefreshBtn.addEventListener('click', async () => {
            const statusEl = modal.querySelector('[data-llm="status"]');
            llmRefreshBtn.disabled = true;
            if (statusEl) statusEl.textContent = 'Fetching models...';
            try {
                const result = await emubro.invoke('suggestions:list-ollama-models', {
                    baseUrl: llmDraft.baseUrls.ollama,
                    llmMode: normalizeLlmMode(llmDraft.llmMode),
                    relayHostUrl: String(llmDraft.relay?.hostUrl || '').trim(),
                    relayAuthToken: String(llmDraft.relay?.authToken || '').trim(),
                    relayPort: normalizeRelayPort(llmDraft.relay?.port, 42141)
                });
                if (result?.success && Array.isArray(result.models)) {
                    const current = llmDraft.models.ollama || '';
                    const deduped = Array.from(new Set(result.models.map((value) => String(value).trim()).filter(Boolean)));
                    if (current && !deduped.includes(current)) deduped.unshift(current);

                    llmModelSelect.innerHTML = deduped.map((value) => (
                        `<option value="${value}"${value === current ? ' selected' : ''}>${value}</option>`
                    )).join('');

                    if (deduped.length > 0 && !current) {
                        llmDraft.models.ollama = deduped[0];
                        if (llmModelInput) llmModelInput.value = deduped[0];
                    }
                    if (statusEl) statusEl.textContent = `Found ${deduped.length} model(s).`;
                } else if (statusEl) {
                    statusEl.textContent = 'Failed to fetch models.';
                }
            } catch (_error) {
                if (statusEl) statusEl.textContent = 'Error fetching models.';
            } finally {
                llmRefreshBtn.disabled = false;
            }
        });
    }

    const llmScanNetworkBtn = modal.querySelector('[data-llm="scan-network"]');
    if (llmScanNetworkBtn) {
        llmScanNetworkBtn.addEventListener('click', async () => {
            llmScanNetworkBtn.disabled = true;
            setLlmRelayScanStatus('Scanning local network...');
            render();
            try {
                const result = await emubro.invoke('suggestions:relay:scan-network', {
                    port: normalizeRelayPort(llmDraft.relay?.port, 42141),
                    relayAuthToken: String(llmDraft.relay?.authToken || '').trim(),
                    timeoutMs: 280
                });
                if (!result?.success) {
                    setLlmRelayScanStatus(String(result?.message || 'Network scan failed.'));
                    setLlmRelayScanResults([]);
                    render();
                    return;
                }

                const foundHosts = Array.isArray(result.hosts) ? result.hosts : [];
                setLlmRelayScanResults(foundHosts);
                setLlmRelayScanStatus(
                    foundHosts.length
                        ? `Found ${foundHosts.length} host(s).`
                        : 'No emuBro hosts found on the local network.'
                );
                render();
            } catch (error) {
                setLlmRelayScanStatus(String(error?.message || error || 'Network scan failed.'));
                setLlmRelayScanResults([]);
                render();
            } finally {
                llmScanNetworkBtn.disabled = false;
            }
        });
    }

    const llmRefreshConnectionsBtn = modal.querySelector('[data-llm="refresh-connections"]');
    if (llmRefreshConnectionsBtn) {
        llmRefreshConnectionsBtn.addEventListener('click', async () => {
            llmRefreshConnectionsBtn.disabled = true;
            try {
                await refreshRelayHostData({ skipRender: false });
            } finally {
                llmRefreshConnectionsBtn.disabled = false;
            }
        });
    }

    modal.querySelectorAll('[data-llm-pick-host]').forEach((button) => {
        button.addEventListener('click', () => {
            const url = String(button.getAttribute('data-llm-pick-host') || '').trim();
            if (!url) return;
            llmDraft.relay.hostUrl = url;
            setLlmRelayScanStatus(`Selected host: ${url}`);
            render();
        });
    });
}
