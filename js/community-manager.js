const emubro = window.emubro;

function makeCommunityCard({ name, blurb, url, cta }) {
    return `
        <article class="community-card">
            <h3 class="community-card-title">${name}</h3>
            <p class="community-card-blurb">${blurb}</p>
            <button class="action-btn community-link-btn" type="button" data-community-url="${url}">${cta}</button>
        </article>
    `;
}

async function openExternal(url) {
    const target = String(url || "").trim();
    if (!target) return;

    try {
        if (emubro && typeof emubro.invoke === "function") {
            const result = await emubro.invoke("open-external-url", target);
            if (result?.success) return;
        }
    } catch (_e) {}

    try {
        window.open(target, "_blank", "noopener,noreferrer");
    } catch (_e) {}
}

export function showCommunityView() {
    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    if (!gamesContainer) return;

    if (gamesHeader) gamesHeader.textContent = "Community";

    gamesContainer.className = "games-container community-view";
    gamesContainer.innerHTML = `
        <section class="community-view-shell">
            <div class="community-hero">
                <div class="community-hero-badge">Official Hub</div>
                <h2 class="community-hero-title">Join the emuBro Community</h2>
                <p class="community-hero-copy">
                    Discord is our main place for updates, feedback, quick support, and sharing setups.
                </p>
                <button class="action-btn launch-btn community-link-btn community-discord-btn" type="button" data-community-url="https://discord.gg/EtKvZ2F">
                    Join Discord
                </button>
            </div>

            <div class="community-grid">
                ${makeCommunityCard({
                    name: "Reddit",
                    blurb: "Long-form discussions, showcases, and community threads.",
                    url: "https://www.reddit.com/",
                    cta: "Open Reddit"
                })}
                ${makeCommunityCard({
                    name: "YouTube",
                    blurb: "Tutorials, updates, and previews from creators.",
                    url: "https://www.youtube.com/",
                    cta: "Open YouTube"
                })}
                ${makeCommunityCard({
                    name: "Bluesky",
                    blurb: "Follow short updates and announcements.",
                    url: "https://bsky.app/",
                    cta: "Open Bluesky"
                })}
                ${makeCommunityCard({
                    name: "Twitter",
                    blurb: "News drops, quick posts, and release callouts.",
                    url: "https://x.com/",
                    cta: "Open Twitter"
                })}
            </div>
        </section>
    `;

    gamesContainer.querySelectorAll(".community-link-btn").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await openExternal(btn.dataset.communityUrl);
        });
    });
}
