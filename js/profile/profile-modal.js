export async function openProfileModalView(options = {}) {
    const emubro = options.emubro;
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === "function"
        ? options.openLibraryPathSettingsModal
        : async () => {};
    if (!emubro) return;

    const STORAGE_KEY = "emuBro.profile";
    let userInfo = {
        displayName: "Bro",
        username: "bro",
        status: "online",
        statusMessage: "",
        bio: "",
        favoritePlatforms: "",
        avatar: "./logo.png",
        linkedSteam: "",
        linkedEpic: "",
        linkedGog: ""
    };
    let libraryStats = {
        totalGames: 0,
        installedGames: 0
    };

    try {
        const loaded = await emubro.invoke("get-user-info");
        if (loaded && typeof loaded === "object") {
            userInfo = { ...userInfo, ...loaded };
        }
    } catch (_e) {}

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === "object") {
                userInfo = { ...userInfo, ...parsed };
            }
        }
    } catch (_e) {}

    try {
        const games = await emubro.invoke("get-games");
        if (Array.isArray(games)) {
            libraryStats.totalGames = games.length;
            libraryStats.installedGames = games.filter((game) => game?.isInstalled).length;
        }
    } catch (_e) {}

    const overlay = document.createElement("div");
    overlay.className = "profile-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "glass profile-modal";

    const safeDisplayName = String(userInfo.displayName || userInfo.username || "Bro");
    const safeUsername = String(userInfo.username || "bro");

    modal.innerHTML = `
        <div class="profile-modal-header">
            <h2 class="profile-modal-title">Profile</h2>
            <button type="button" class="close-btn" data-close-profile>&times;</button>
        </div>
        <div class="profile-top">
            <img class="profile-avatar" src="${String(userInfo.avatar || "./logo.png")}" alt="Profile avatar" />
            <div class="profile-identity">
                <div class="profile-identity-name">${safeDisplayName}</div>
                <div class="profile-identity-meta">@${safeUsername}</div>
                <div class="profile-avatar-actions">
                    <button type="button" class="action-btn" data-profile-avatar>Change Avatar</button>
                    <button type="button" class="action-btn remove-btn" data-profile-avatar-clear>Reset</button>
                </div>
                <div class="profile-muted">Stored locally on this device.</div>
            </div>
        </div>
        <div class="profile-stats">
            <div class="profile-stat">
                <div class="profile-stat-label">Library Games</div>
                <div class="profile-stat-value">${Number(libraryStats.totalGames || 0)}</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-label">Installed</div>
                <div class="profile-stat-value">${Number(libraryStats.installedGames || 0)}</div>
            </div>
        </div>
        <div class="profile-section">
            <h3 class="profile-section-title">Profile Details</h3>
            <div class="profile-form-grid">
                <div class="profile-field">
                    <label for="profile-display-name">Display Name</label>
                    <input id="profile-display-name" type="text" value="${String(userInfo.displayName || "")}" />
                </div>
                <div class="profile-field">
                    <label for="profile-username">Username</label>
                    <input id="profile-username" type="text" value="${String(userInfo.username || "")}" />
                </div>
                <div class="profile-field">
                    <label for="profile-status">Status</label>
                    <select id="profile-status">
                        <option value="online"${String(userInfo.status || "").toLowerCase() === "online" ? " selected" : ""}>Online</option>
                        <option value="away"${String(userInfo.status || "").toLowerCase() === "away" ? " selected" : ""}>Away</option>
                        <option value="busy"${String(userInfo.status || "").toLowerCase() === "busy" ? " selected" : ""}>Busy</option>
                        <option value="invisible"${String(userInfo.status || "").toLowerCase() === "invisible" ? " selected" : ""}>Invisible</option>
                    </select>
                </div>
                <div class="profile-field">
                    <label for="profile-status-message">Status Message</label>
                    <input id="profile-status-message" type="text" value="${String(userInfo.statusMessage || "")}" />
                </div>
            </div>
            <div class="profile-field">
                <label for="profile-bio">Bio</label>
                <textarea id="profile-bio">${String(userInfo.bio || "")}</textarea>
            </div>
            <div class="profile-field">
                <label for="profile-platforms">Favorite Platforms (comma-separated)</label>
                <input id="profile-platforms" type="text" value="${String(userInfo.favoritePlatforms || "")}" />
            </div>
        </div>
        <div class="profile-section">
            <h3 class="profile-section-title">Linked Accounts</h3>
            <div class="profile-form-grid">
                <div class="profile-field">
                    <label for="profile-steam">Steam</label>
                    <input id="profile-steam" type="text" value="${String(userInfo.linkedSteam || "")}" placeholder="steam username" />
                </div>
                <div class="profile-field">
                    <label for="profile-epic">Epic Games</label>
                    <input id="profile-epic" type="text" value="${String(userInfo.linkedEpic || "")}" placeholder="epic account" />
                </div>
                <div class="profile-field">
                    <label for="profile-gog">GOG</label>
                    <input id="profile-gog" type="text" value="${String(userInfo.linkedGog || "")}" placeholder="gog username" />
                </div>
            </div>
        </div>
        <div class="profile-actions">
            <button type="button" class="action-btn" data-profile-save>Save</button>
            <button type="button" class="action-btn" data-open-settings>Settings</button>
            <button type="button" class="action-btn launch-btn" data-close-profile>Close</button>
        </div>
    `;

    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.style.display = "none";
    modal.appendChild(avatarInput);

    const saveProfile = () => {
        const payload = {
            displayName: String(modal.querySelector("#profile-display-name")?.value || "").trim(),
            username: String(modal.querySelector("#profile-username")?.value || "").trim(),
            status: String(modal.querySelector("#profile-status")?.value || "").trim().toLowerCase(),
            statusMessage: String(modal.querySelector("#profile-status-message")?.value || "").trim(),
            bio: String(modal.querySelector("#profile-bio")?.value || "").trim(),
            favoritePlatforms: String(modal.querySelector("#profile-platforms")?.value || "").trim(),
            linkedSteam: String(modal.querySelector("#profile-steam")?.value || "").trim(),
            linkedEpic: String(modal.querySelector("#profile-epic")?.value || "").trim(),
            linkedGog: String(modal.querySelector("#profile-gog")?.value || "").trim(),
            avatar: userInfo.avatar
        };
        userInfo = { ...userInfo, ...payload };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (_e) {}
    };

    const saveBtn = modal.querySelector("[data-profile-save]");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveProfile();
            overlay.remove();
        });
    }

    const avatarBtn = modal.querySelector("[data-profile-avatar]");
    if (avatarBtn) {
        avatarBtn.addEventListener("click", () => avatarInput.click());
    }

    const avatarClearBtn = modal.querySelector("[data-profile-avatar-clear]");
    if (avatarClearBtn) {
        avatarClearBtn.addEventListener("click", () => {
            userInfo.avatar = "./logo.png";
            const img = modal.querySelector(".profile-avatar");
            if (img) img.src = userInfo.avatar;
        });
    }

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                userInfo.avatar = reader.result;
                const img = modal.querySelector(".profile-avatar");
                if (img) img.src = userInfo.avatar;
            }
        };
        reader.readAsDataURL(file);
    });

    modal.querySelectorAll("[data-close-profile]").forEach((btn) => {
        btn.addEventListener("click", () => overlay.remove());
    });

    const openSettingsBtn = modal.querySelector("[data-open-settings]");
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener("click", async () => {
            saveProfile();
            overlay.remove();
            await openLibraryPathSettingsModal();
        });
    }

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
