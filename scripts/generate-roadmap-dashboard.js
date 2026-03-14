const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const roadmapPath = path.join(repoRoot, 'docs', 'project-roadmap.json');
const packagePath = path.join(repoRoot, 'package.json');
const outputPath = path.join(repoRoot, 'docs', 'project-roadmap.html');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderList(items = [], className = '') {
    const cls = className ? ` class="${className}"` : '';
    return `<ul${cls}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function toTitleCase(value) {
    return String(value || '')
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function stateLabel(state) {
    if (state === 'current') return 'Current';
    if (state === 'up-next') return 'Up Next';
    if (state === 'past') return 'Past';
    return 'Future';
}

function getMilestoneDomId(milestone, index) {
    return `milestone-${escapeHtml(milestone.id || `step-${index + 1}`)}`;
}

function getDerivedMilestones(milestones = []) {
    return milestones.map((milestone, index) => {
        const previous = index > 0 ? milestones[index - 1] : null;
        const next = index < milestones.length - 1 ? milestones[index + 1] : null;
        return {
            ...milestone,
            step: index + 1,
            domId: getMilestoneDomId(milestone, index),
            milestoneKey: milestone.id || `step-${index + 1}`,
            blockerCount: Array.isArray(milestone.blockers) ? milestone.blockers.length : 0,
            workstream: milestone.workstream || 'Core',
            icon: milestone.icon || `M${index + 1}`,
            workstreamClass: `workstream-${slugify(milestone.workstream || 'Core')}`,
            dependsOn: previous ? [previous.title] : [],
            unlocks: next ? [next.title] : []
        };
    });
}

function renderMilestoneJumpButton(milestone, label = 'Open milestone') {
    if (!milestone) return '';
    return `<button class="mini-action" type="button" data-milestone-jump="${milestone.domId}">${escapeHtml(label)}</button>`;
}

function renderTimelineShowcase(milestones) {
    const derivedMilestones = getDerivedMilestones(milestones);
    return `
        <div class="timeline-scroll">
            <div class="timeline-scene timeline-scene-count-${derivedMilestones.length}">
                ${derivedMilestones.map((milestone, index) => {
                    const orientation = index % 2 === 0 ? 'top' : 'bottom';
                    return `
                        <div class="timeline-stop ${orientation} ${escapeHtml(milestone.state)} risk-${escapeHtml(milestone.risk || 'medium')} ${escapeHtml(milestone.workstreamClass)}" data-milestone-id="${escapeHtml(milestone.milestoneKey)}">
                            <div class="timeline-stop-card">
                                <span class="timeline-stop-chip">${escapeHtml(stateLabel(milestone.state))} · ${escapeHtml(String(milestone.completion ?? 0))}%</span>
                                <strong data-milestone-title="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.title)}</strong>
                                <span class="timeline-stop-window" data-milestone-window="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.targetWindow || 'Date TBD')}</span>
                                <span class="timeline-stop-track">${escapeHtml(milestone.workstream)}</span>
                            </div>
                            <div class="timeline-stop-stem" aria-hidden="true"></div>
                            <button class="timeline-stop-node" type="button" data-milestone-jump="${milestone.domId}" aria-controls="${milestone.domId}" aria-label="Open ${escapeHtml(milestone.title)} details">
                                <span class="timeline-stop-node-core" title="${escapeHtml(milestone.workstream)}">${escapeHtml(milestone.icon)}</span>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderMetricBadges(milestone) {
    const milestoneKeyAttr = milestone.milestoneKey ? ` data-milestone-completion="${escapeHtml(milestone.milestoneKey)}"` : '';
    const milestoneRiskAttr = milestone.milestoneKey ? ` data-milestone-risk="${escapeHtml(milestone.milestoneKey)}"` : '';
    const milestoneConfidenceAttr = milestone.milestoneKey ? ` data-milestone-confidence="${escapeHtml(milestone.milestoneKey)}"` : '';
    return `
        <div class="metric-badges">
            <span class="metric-badge risk-${escapeHtml(milestone.risk || 'medium')}"${milestoneRiskAttr}>Risk: ${escapeHtml(toTitleCase(milestone.risk || 'medium'))}</span>
            <span class="metric-badge confidence-${escapeHtml(milestone.confidence || 'medium')}"${milestoneConfidenceAttr}>Confidence: ${escapeHtml(toTitleCase(milestone.confidence || 'medium'))}</span>
            <span class="metric-badge completion"${milestoneKeyAttr}>Completion: ${escapeHtml(String(milestone.completion ?? 0))}%</span>
        </div>
    `;
}

function renderMarkdownTools(targetId, label = 'Markdown') {
    const safeTargetId = escapeHtml(targetId);
    return `
        <div class="markdown-tools" data-markdown-tools="${safeTargetId}">
            <label class="markdown-upload-btn" for="${safeTargetId}-input">Import ${escapeHtml(label)} (.md)</label>
            <input id="${safeTargetId}-input" type="file" accept=".md,.markdown,text/markdown,text/plain" data-markdown-input="${safeTargetId}" />
            <button class="markdown-reset-btn" type="button" data-markdown-reset="${safeTargetId}">Reset</button>
        </div>
    `;
}

function renderDependencySummary(milestones) {
    const derivedMilestones = getDerivedMilestones(milestones);
    return `
        <div class="dependency-strip">
            ${derivedMilestones.map((milestone, index) => `
                <article class="dependency-card state-${escapeHtml(milestone.state)} risk-${escapeHtml(milestone.risk || 'medium')} ${escapeHtml(milestone.workstreamClass)}" data-milestone-id="${escapeHtml(milestone.milestoneKey)}">
                    <div class="dependency-card-head">
                        <span class="dependency-step">Step ${milestone.step}</span>
                        <span class="dependency-state">${escapeHtml(milestone.workstream)}</span>
                    </div>
                    <h3 data-milestone-title="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.title)}</h3>
                    <p data-milestone-dependency-summary="${escapeHtml(milestone.milestoneKey)}">${milestone.dependsOn.length ? `Depends on ${escapeHtml(milestone.dependsOn.join(', '))}.` : 'Starting point for the current roadmap.'}</p>
                    <div class="dependency-card-meta">
                        <span class="metric-badge completion" data-milestone-blockers="${escapeHtml(milestone.milestoneKey)}">Blockers: ${escapeHtml(String(milestone.blockerCount))}</span>
                        <span class="metric-badge" data-milestone-window-label="${escapeHtml(milestone.milestoneKey)}">Window: ${escapeHtml(milestone.targetWindow || 'TBD')}</span>
                    </div>
                    ${renderMilestoneJumpButton(milestone, 'Open details')}
                </article>
                ${index < derivedMilestones.length - 1 ? '<div class="dependency-arrow" aria-hidden="true">→</div>' : ''}
            `).join('')}
        </div>
    `;
}

function renderRecentChanges(history = []) {
    const latestEntries = history.slice(0, 3);
    return `
        <div class="recent-change-list">
            ${latestEntries.map((entry, index) => `
                <article class="recent-change-card ${index === 0 ? 'is-latest' : ''}">
                    <div class="recent-change-date">${escapeHtml(entry.date)}</div>
                    <h3>${escapeHtml(entry.title)}</h3>
                    <p>${escapeHtml(entry.summary)}</p>
                </article>
            `).join('')}
        </div>
    `;
}

function renderFocusWorkspace(roadmap) {
    const milestones = getDerivedMilestones(roadmap.milestones);
    const current = milestones.find((milestone) => milestone.state === 'current') || milestones[0];
    const next = milestones.find((milestone) => milestone.state === 'up-next') || milestones[1] || milestones[0];
    const later = milestones.filter((milestone) => milestone.state === 'future');
    const risky = milestones
        .filter((milestone) => milestone.blockerCount > 0 || milestone.risk === 'high')
        .sort((a, b) => b.blockerCount - a.blockerCount || a.step - b.step);

    return `
        <section class="panel focus-workspace">
            <div class="panel-head">
                <div>
                    <h2 class="section-title" style="margin-bottom:6px;">Focus Mode</h2>
                    <span class="minor-label">Switch between the immediate plan, the next phase, later milestones, and the real blockers.</span>
                </div>
                <div class="focus-chipbar" role="tablist" aria-label="Focus modes">
                    <button class="focus-chip is-active" type="button" data-focus-view="now">Now</button>
                    <button class="focus-chip" type="button" data-focus-view="next">Next</button>
                    <button class="focus-chip" type="button" data-focus-view="later">Later</button>
                    <button class="focus-chip" type="button" data-focus-view="risks">Risks</button>
                </div>
            </div>
            <div class="focus-panes">
                <section class="focus-pane is-active" data-focus-pane="now">
                    <div class="focus-hero-card current ${escapeHtml(current.workstreamClass)}" data-milestone-id="${escapeHtml(current.milestoneKey)}">
                        <div class="focus-hero-top">
                            <span class="focus-eyebrow">${escapeHtml(current.workstream)}</span>
                            <span class="metric-badge completion" data-milestone-completion-plain="${escapeHtml(current.milestoneKey)}">${escapeHtml(String(current.completion ?? 0))}% complete</span>
                        </div>
                        <h3 data-milestone-title="${escapeHtml(current.milestoneKey)}">${escapeHtml(current.title)}</h3>
                        <p data-milestone-goal="${escapeHtml(current.milestoneKey)}">${escapeHtml(current.goal || '')}</p>
                        <div class="focus-list-shell">
                            <h4>Priority focus</h4>
                            ${renderList((current.focus || []).slice(0, 3))}
                        </div>
                        <div class="focus-cta-row">
                            ${renderMilestoneJumpButton(current, 'Open current milestone')}
                            <span class="subtle-inline-note" data-milestone-window="${escapeHtml(current.milestoneKey)}">${escapeHtml(current.targetWindow || '')}</span>
                        </div>
                    </div>
                </section>
                <section class="focus-pane" data-focus-pane="next">
                    <div class="focus-hero-card up-next ${escapeHtml(next.workstreamClass)}" data-milestone-id="${escapeHtml(next.milestoneKey)}">
                        <div class="focus-hero-top">
                            <span class="focus-eyebrow">${escapeHtml(next.workstream)}</span>
                            <span class="metric-badge" data-current-milestone-title>Blocked by: ${escapeHtml(current.title)}</span>
                        </div>
                        <h3 data-milestone-title="${escapeHtml(next.milestoneKey)}">${escapeHtml(next.title)}</h3>
                        <p data-milestone-goal="${escapeHtml(next.milestoneKey)}">${escapeHtml(next.goal || '')}</p>
                        <div class="focus-grid-two">
                            <div class="focus-list-shell">
                                <h4>What needs to clear first</h4>
                                ${renderList((next.dependsOn || []).concat((next.blockers || []).slice(0, 2)))}
                            </div>
                            <div class="focus-list-shell">
                                <h4>What this phase should deliver</h4>
                                ${renderList((next.focus || []).slice(0, 3))}
                            </div>
                        </div>
                        <div class="focus-cta-row">
                            ${renderMilestoneJumpButton(next, 'Open next milestone')}
                            <span class="subtle-inline-note" data-milestone-window="${escapeHtml(next.milestoneKey)}">${escapeHtml(next.targetWindow || '')}</span>
                        </div>
                    </div>
                </section>
                <section class="focus-pane" data-focus-pane="later">
                    <div class="focus-card-grid">
                        ${later.map((milestone) => `
                            <article class="focus-summary-card state-${escapeHtml(milestone.state)} ${escapeHtml(milestone.workstreamClass)}" data-milestone-id="${escapeHtml(milestone.milestoneKey)}">
                                <div class="focus-summary-head">
                                    <span class="focus-eyebrow">${escapeHtml(milestone.workstream)}</span>
                                    <span class="metric-badge" data-milestone-window="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.targetWindow || 'TBD')}</span>
                                </div>
                                <h3 data-milestone-title="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.title)}</h3>
                                <p data-milestone-goal="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.goal || '')}</p>
                                ${renderMilestoneJumpButton(milestone, 'Open milestone')}
                            </article>
                        `).join('')}
                    </div>
                </section>
                <section class="focus-pane" data-focus-pane="risks">
                    <div class="focus-card-grid">
                        ${risky.map((milestone) => `
                            <article class="focus-summary-card risk-${escapeHtml(milestone.risk || 'medium')} ${escapeHtml(milestone.workstreamClass)}" data-milestone-id="${escapeHtml(milestone.milestoneKey)}">
                                <div class="focus-summary-head">
                                    <span class="focus-eyebrow">${escapeHtml(milestone.workstream)}</span>
                                    <span class="metric-badge risk-${escapeHtml(milestone.risk || 'medium')}" data-milestone-blockers="${escapeHtml(milestone.milestoneKey)}">Blockers: ${escapeHtml(String(milestone.blockerCount))}</span>
                                </div>
                                <h3 data-milestone-title="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.title)}</h3>
                                <div data-milestone-blocker-list="${escapeHtml(milestone.milestoneKey)}">${renderList((milestone.blockers || []).slice(0, 3))}</div>
                                ${renderMilestoneJumpButton(milestone, 'Inspect blockers')}
                            </article>
                        `).join('')}
                    </div>
                </section>
            </div>
        </section>
    `;
}

function renderMilestoneCards(milestones) {
    const derivedMilestones = getDerivedMilestones(milestones);
    return derivedMilestones.map((milestone, index) => {
        const criteria = milestone.exitCriteria || milestone.startCriteria || [];
        const heading = milestone.state === 'current' || milestone.state === 'up-next' ? 'Exit Criteria' : 'Start Criteria';
        const blockerMarkup = milestone.blockers?.length
            ? `<section><h4>Blockers</h4><div data-milestone-blocker-list="${escapeHtml(milestone.milestoneKey)}">${renderList(milestone.blockers, 'danger-list')}</div></section>`
            : '';
        const detailsOpenAttr = milestone.state === 'current' ? ' open' : '';
        const dependencyMarkup = milestone.dependsOn.length || milestone.unlocks.length
            ? `
                <div class="dependency-pill-row">
                    <span data-milestone-dependency-pills="${escapeHtml(milestone.milestoneKey)}">${milestone.dependsOn.map((title) => `<span class="dependency-pill">Depends on ${escapeHtml(title)}</span>`).join('')}${milestone.unlocks.map((title) => `<span class="dependency-pill unlocks">Unlocks ${escapeHtml(title)}</span>`).join('')}</span>
                </div>
              `
            : '';
        const milestoneNotesId = `${milestone.domId}-notes`;

        return `
            <details id="${milestone.domId}" class="milestone-card ${escapeHtml(milestone.state)} risk-${escapeHtml(milestone.risk || 'medium')} confidence-${escapeHtml(milestone.confidence || 'medium')} ${escapeHtml(milestone.workstreamClass)}" data-milestone-id="${escapeHtml(milestone.milestoneKey)}"${detailsOpenAttr}>
                <summary class="milestone-toggle">
                    <div class="milestone-toggle-left">
                        <div class="milestone-step">${index + 1}</div>
                        <div class="milestone-head">
                            <span class="milestone-state">${escapeHtml(milestone.workstream)} · ${escapeHtml(stateLabel(milestone.state))}</span>
                            <h3 data-milestone-title="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.title)}</h3>
                            <div class="milestone-date" data-milestone-window="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.targetWindow || 'Date TBD')}</div>
                        </div>
                    </div>
                    <span class="milestone-chevron" aria-hidden="true">+</span>
                </summary>

                <div class="milestone-body">
                    ${renderMetricBadges(milestone)}
                    ${dependencyMarkup}
                    <div class="completion-bar" aria-label="Completion ${escapeHtml(String(milestone.completion ?? 0))}%">
                        <div class="completion-fill" data-milestone-completion-fill="${escapeHtml(milestone.milestoneKey)}" style="width:${escapeHtml(String(milestone.completion ?? 0))}%"></div>
                    </div>
                    <p class="milestone-goal" data-milestone-goal="${escapeHtml(milestone.milestoneKey)}">${escapeHtml(milestone.goal)}</p>
                    <div class="milestone-columns">
                        <section>
                            <h4>Focus</h4>
                            ${renderList(milestone.focus)}
                        </section>
                        <section>
                            <h4>${escapeHtml(heading)}</h4>
                            ${renderList(criteria)}
                        </section>
                        ${blockerMarkup}
                    </div>
                    <div class="markdown-slot-shell markdown-slot-shell-inline">
                        <div class="markdown-slot-head">
                            <h4>Custom Notes</h4>
                            ${renderMarkdownTools(milestoneNotesId, 'Milestone Notes')}
                        </div>
                        <div id="${milestoneNotesId}" class="markdown-slot markdown-slot-empty markdown-slot-inline" data-markdown-slot="${milestoneNotesId}">
                            <p class="markdown-empty-state">Import an optional Markdown file to add milestone-specific notes, links, or commentary.</p>
                        </div>
                    </div>
                </div>
            </details>
        `;
    }).join('');
}

function renderHistory(history = []) {
    return history.map((entry) => `
        <article class="history-entry">
            <div class="history-date">${escapeHtml(entry.date)}</div>
            <div class="history-content">
                <h3>${escapeHtml(entry.title)}</h3>
                <p>${escapeHtml(entry.summary)}</p>
            </div>
        </article>
    `).join('');
}

function renderContentSection({ title, slotId, contentHtml }) {
    return `
      <section>
        <div class="section-head-with-tools">
          <h2 class="section-title">${escapeHtml(title)}</h2>
          ${renderMarkdownTools(slotId, title)}
        </div>
        <div id="${escapeHtml(slotId)}" class="markdown-slot" data-markdown-slot="${escapeHtml(slotId)}">
          ${contentHtml}
        </div>
      </section>
    `;
}

function renderRoadmapTools(roadmap) {
    const milestoneOptions = roadmap.milestones.map((milestone) => `
        <option value="${escapeHtml(milestone.id)}">${escapeHtml(milestone.title)}</option>
    `).join('');

    return `
      <section class="panel roadmap-tools-panel">
        <div class="panel-head">
          <div>
            <h2 class="section-title" style="margin-bottom:6px;">Roadmap Tools</h2>
            <span class="minor-label">Import note bundles, tweak milestone drafts locally, and export the current roadmap JSON.</span>
          </div>
          <div class="roadmap-tools-actions">
            <label class="markdown-upload-btn" for="roadmap-bundle-input">Import Markdown Bundle</label>
            <input id="roadmap-bundle-input" type="file" multiple accept=".md,.markdown,text/markdown,text/plain" data-markdown-bundle />
            <button class="markdown-reset-btn" type="button" data-roadmap-copy-json>Copy JSON</button>
            <button class="markdown-reset-btn" type="button" data-roadmap-download-json>Download JSON</button>
          </div>
        </div>
        <div class="roadmap-dropzone" data-roadmap-dropzone>
          Drop a Markdown bundle here or use the import button. Filenames can target sections like <code>where-we-are.md</code> or milestones like <code>migration-recovery.md</code>.
        </div>
        <details class="roadmap-editor-shell">
          <summary class="roadmap-editor-toggle">Milestone Draft Editor</summary>
          <div class="roadmap-editor-grid">
            <label class="editor-field">
              <span>Title</span>
              <input type="text" data-roadmap-editor-title />
            </label>
            <label class="editor-field">
              <span>Milestone</span>
              <select data-roadmap-editor-select>
                ${milestoneOptions}
              </select>
            </label>
            <label class="editor-field">
              <span>Target Window</span>
              <input type="text" data-roadmap-editor-window />
            </label>
            <label class="editor-field">
              <span>Completion</span>
              <input type="number" min="0" max="100" step="1" data-roadmap-editor-completion />
            </label>
            <label class="editor-field">
              <span>Risk</span>
              <select data-roadmap-editor-risk>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="editor-field">
              <span>Confidence</span>
              <select data-roadmap-editor-confidence>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="editor-field editor-field-wide">
              <span>Goal</span>
              <textarea rows="4" data-roadmap-editor-goal></textarea>
            </label>
            <label class="editor-field editor-field-wide">
              <span>Blockers (one per line)</span>
              <textarea rows="6" data-roadmap-editor-blockers></textarea>
            </label>
          </div>
          <div class="roadmap-editor-actions">
            <button class="mini-action" type="button" data-roadmap-editor-save>Apply local draft</button>
            <button class="mini-action" type="button" data-roadmap-editor-reset>Reset milestone draft</button>
            <span class="subtle-inline-note" data-roadmap-editor-status>Local drafts are stored in this browser only.</span>
          </div>
        </details>
        <details class="roadmap-editor-shell">
          <summary class="roadmap-editor-toggle">History Editor</summary>
          <div class="roadmap-editor-grid">
            <label class="editor-field">
              <span>Date</span>
              <input type="text" placeholder="2026-03-14" data-roadmap-history-date />
            </label>
            <label class="editor-field">
              <span>Title</span>
              <input type="text" placeholder="What changed" data-roadmap-history-title />
            </label>
            <label class="editor-field editor-field-wide">
              <span>Summary</span>
              <textarea rows="4" data-roadmap-history-summary></textarea>
            </label>
          </div>
          <div class="roadmap-editor-actions">
            <button class="mini-action" type="button" data-roadmap-history-add>Add History Entry</button>
            <button class="mini-action" type="button" data-roadmap-history-reset>Reset Local History Drafts</button>
            <span class="subtle-inline-note" data-roadmap-history-status>History entries added here stay local until you export the JSON.</span>
          </div>
        </details>
      </section>
    `;
}

function buildHtml({ roadmap, pkg }) {
    const updatedAt = new Date().toLocaleString('en-CH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `<!doctype html>
<html lang="en" data-layout="vertical">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>emuBro Roadmap</title>
  <style>
    :root {
      --bg: #08111b;
      --bg-panel: #0d1925;
      --bg-panel-soft: #122233;
      --text: #eaf2fb;
      --muted: #97aabe;
      --line: rgba(127, 180, 255, 0.2);
      --accent: #66ccff;
      --accent-strong: #44b7ff;
      --warn: #f7b955;
      --ok: #55d7a0;
      --danger: #ff6b79;
      --shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      --radius: 18px;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Inter, system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(68, 183, 255, 0.18), transparent 26%),
        radial-gradient(circle at top right, rgba(132, 255, 214, 0.12), transparent 22%),
        linear-gradient(180deg, #071019 0%, #09131f 50%, #08111b 100%);
      min-height: 100vh;
    }

    .page {
      width: min(1320px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }

    .hero,
    .panel {
      background: linear-gradient(180deg, rgba(17, 31, 45, 0.96), rgba(11, 22, 34, 0.96));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
    }

    .hero { padding: 24px 26px; margin-bottom: 16px; }
    .panel { padding: 18px; margin-top: 16px; }

    .hero-top,
    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
    }

    h1, h2, h3, h4, p { margin: 0; }

    h1 {
      margin-top: 10px;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1;
    }

    .summary {
      margin-top: 12px;
      max-width: 860px;
      color: var(--muted);
      font-size: 0.96rem;
      line-height: 1.5;
    }

    .hero-meta {
      display: grid;
      gap: 0;
      min-width: 260px;
    }

    .meta-chip {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(102, 204, 255, 0.05);
    }

    .hero-meta-card {
      display: grid;
      gap: 0;
      overflow: hidden;
    }

    .hero-meta-row {
      display: grid;
      gap: 4px;
      padding: 10px 0;
    }

    .hero-meta-row + .hero-meta-row {
      border-top: 1px solid rgba(127, 180, 255, 0.12);
    }

    .meta-chip strong,
    .minor-label {
      display: block;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .meta-chip span {
      font-size: 1rem;
      font-weight: 700;
    }

    .section-title {
      font-size: 1.08rem;
      margin-bottom: 12px;
    }

    .section-head-with-tools,
    .markdown-slot-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .markdown-slot-head h4 {
      margin: 0;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .grid-two,
    .grid-three {
      display: grid;
      gap: 18px;
    }

    .grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 10px;
      color: var(--muted);
      line-height: 1.5;
    }

    .danger-list li { color: #f4b7bf; }

    .current-phase-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      background: rgba(255, 255, 255, 0.03);
    }

    .risk-low { border-color: rgba(85, 215, 160, 0.4); }
    .risk-medium { border-color: rgba(247, 185, 85, 0.42); }
    .risk-high { border-color: rgba(255, 107, 121, 0.42); }

    .confidence-low { box-shadow: inset 0 0 0 1px rgba(255, 107, 121, 0.12); }
    .confidence-medium { box-shadow: inset 0 0 0 1px rgba(247, 185, 85, 0.12); }
    .confidence-high { box-shadow: inset 0 0 0 1px rgba(85, 215, 160, 0.12); }

    .toolbar {
      display: inline-flex;
      gap: 8px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
    }

    .toolbar input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .toolbar label {
      border: 0;
      border-radius: 999px;
      padding: 8px 12px;
      background: transparent;
      color: var(--muted);
      font-weight: 700;
      cursor: pointer;
      user-select: none;
    }

    #layout-vertical:checked + label,
    #layout-horizontal:checked + label {
      background: rgba(102, 204, 255, 0.15);
      color: var(--text);
    }

    .workspace-panel {
      padding: 0;
      overflow: hidden;
    }

    .workspace-head {
      padding: 18px 18px 0;
      margin-bottom: 12px;
    }

    .workspace-body {
      padding: 0 18px 18px;
    }

    .roadmap-tabbar {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.035);
    }

    .roadmap-tab-btn {
      border: 0;
      border-radius: 999px;
      padding: 9px 14px;
      background: transparent;
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
    }

    .roadmap-tab-btn:hover {
      color: var(--text);
      transform: translateY(-1px);
    }

    .roadmap-tab-btn.is-active {
      background: rgba(102, 204, 255, 0.14);
      color: var(--text);
      box-shadow: 0 0 0 1px rgba(102, 204, 255, 0.16) inset;
    }

    .roadmap-pane {
      display: none;
      gap: 16px;
      animation: roadmap-pane-fade 180ms ease;
    }

    .roadmap-pane.is-active {
      display: grid;
    }

    @keyframes roadmap-pane-fade {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .mini-action,
    .focus-chip {
      border: 1px solid rgba(127, 180, 255, 0.18);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.035);
      color: var(--text);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
    }

    .mini-action {
      padding: 8px 12px;
      width: fit-content;
    }

    .mini-action:hover,
    .focus-chip:hover {
      transform: translateY(-1px);
      border-color: rgba(102, 204, 255, 0.34);
      background: rgba(102, 204, 255, 0.1);
    }

    .subtle-inline-note {
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .focus-workspace {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .focus-chipbar {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .focus-chip {
      padding: 9px 14px;
      text-transform: uppercase;
    }

    .focus-chip.is-active {
      background: rgba(102, 204, 255, 0.14);
      border-color: rgba(102, 204, 255, 0.28);
      box-shadow: 0 0 0 1px rgba(102, 204, 255, 0.16) inset;
    }

    .focus-panes {
      display: grid;
    }

    .focus-pane {
      display: none;
      animation: roadmap-pane-fade 180ms ease;
    }

    .focus-pane.is-active {
      display: grid;
    }

    .focus-hero-card,
    .focus-summary-card,
    .dependency-card,
    .recent-change-card {
      border: 1px solid rgba(127, 180, 255, 0.16);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15, 28, 40, 0.96), rgba(11, 22, 34, 0.92));
      box-shadow: 0 12px 26px rgba(0, 0, 0, 0.14);
    }

    .focus-hero-card {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .focus-hero-card.current {
      border-color: rgba(102, 204, 255, 0.24);
    }

    .focus-hero-card.up-next {
      border-color: rgba(247, 185, 85, 0.28);
    }

    .focus-hero-top,
    .focus-summary-head,
    .dependency-card-head,
    .focus-cta-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .focus-eyebrow,
    .dependency-step,
    .dependency-state {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .focus-grid-two,
    .focus-card-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .focus-list-shell {
      display: grid;
      gap: 8px;
      padding: 14px;
      border: 1px solid rgba(127, 180, 255, 0.12);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.02);
    }

    .focus-list-shell h4 {
      margin: 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .focus-summary-card {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .recent-change-list {
      display: grid;
      gap: 10px;
    }

    .recent-change-card {
      display: grid;
      gap: 8px;
      padding: 14px;
    }

    .recent-change-card.is-latest {
      border-color: rgba(102, 204, 255, 0.26);
      background: linear-gradient(180deg, rgba(17, 35, 50, 0.98), rgba(11, 23, 36, 0.94));
    }

    .recent-change-date {
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .dependency-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
      align-items: stretch;
    }

    .dependency-card {
      display: grid;
      gap: 10px;
      padding: 14px;
    }

    .dependency-card h3,
    .focus-hero-card h3,
    .focus-summary-card h3 {
      font-size: 1rem;
      line-height: 1.25;
    }

    .dependency-card p,
    .focus-hero-card p,
    .focus-summary-card p {
      color: var(--muted);
      line-height: 1.5;
    }

    .dependency-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dependency-arrow {
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 1.2rem;
      font-weight: 900;
    }

    .roadmap-tools-panel {
      display: grid;
      gap: 14px;
    }

    .roadmap-tools-actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .roadmap-tools-actions input[type="file"] {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .roadmap-editor-shell {
      border: 1px solid rgba(127, 180, 255, 0.12);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.025);
      padding: 14px;
    }

    .roadmap-editor-toggle {
      cursor: pointer;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .roadmap-editor-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 14px;
    }

    .editor-field {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .editor-field-wide {
      grid-column: 1 / -1;
    }

    .editor-field span {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .editor-field input,
    .editor-field select,
    .editor-field textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(127, 180, 255, 0.16);
      background: rgba(6, 15, 24, 0.55);
      color: var(--text);
      font: inherit;
    }

    .roadmap-editor-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 14px;
    }

    .roadmap-dropzone {
      padding: 14px 16px;
      border: 1px dashed rgba(127, 180, 255, 0.22);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--muted);
      line-height: 1.5;
      transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
    }

    .roadmap-dropzone.is-active {
      border-color: rgba(102, 204, 255, 0.42);
      background: rgba(102, 204, 255, 0.08);
      color: var(--text);
    }

    .timeline-stop-track {
      display: inline-flex;
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 700;
    }

    .workstream-ui-parity .timeline-stop-card,
    .workstream-ui-parity.focus-summary-card,
    .workstream-ui-parity.focus-hero-card,
    .workstream-ui-parity.dependency-card,
    .workstream-ui-parity.milestone-card {
      box-shadow: 0 0 0 1px rgba(102, 204, 255, 0.16);
    }

    .workstream-runtime-hardening .timeline-stop-card,
    .workstream-runtime-hardening.focus-summary-card,
    .workstream-runtime-hardening.focus-hero-card,
    .workstream-runtime-hardening.dependency-card,
    .workstream-runtime-hardening.milestone-card {
      box-shadow: 0 0 0 1px rgba(247, 185, 85, 0.16);
    }

    .workstream-beta-validation .timeline-stop-card,
    .workstream-beta-validation.focus-summary-card,
    .workstream-beta-validation.focus-hero-card,
    .workstream-beta-validation.dependency-card,
    .workstream-beta-validation.milestone-card {
      box-shadow: 0 0 0 1px rgba(173, 132, 255, 0.18);
    }

    .workstream-release-quality .timeline-stop-card,
    .workstream-release-quality.focus-summary-card,
    .workstream-release-quality.focus-hero-card,
    .workstream-release-quality.dependency-card,
    .workstream-release-quality.milestone-card {
      box-shadow: 0 0 0 1px rgba(85, 215, 160, 0.18);
    }

    .markdown-tools {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .markdown-tools input[type="file"] {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .markdown-upload-btn,
    .markdown-reset-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid rgba(127, 180, 255, 0.18);
      background: rgba(255, 255, 255, 0.03);
      color: var(--muted);
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.16s ease, color 0.16s ease, background-color 0.16s ease;
    }

    .markdown-upload-btn:hover,
    .markdown-reset-btn:hover {
      border-color: rgba(102, 204, 255, 0.34);
      color: var(--text);
      background: rgba(102, 204, 255, 0.08);
    }

    .markdown-slot-shell {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    .markdown-slot {
      display: grid;
      gap: 10px;
      color: var(--muted);
      line-height: 1.55;
    }

    .markdown-slot h1,
    .markdown-slot h2,
    .markdown-slot h3,
    .markdown-slot h4 {
      color: var(--text);
      line-height: 1.2;
      margin: 0;
    }

    .markdown-slot p {
      color: var(--muted);
      margin: 0;
    }

    .markdown-slot ul,
    .markdown-slot ol {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
    }

    .markdown-slot a {
      color: var(--accent);
    }

    .markdown-slot blockquote {
      margin: 0;
      padding: 10px 12px;
      border-left: 3px solid rgba(102, 204, 255, 0.38);
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      color: var(--text);
    }

    .markdown-slot code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.9em;
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 5px;
      border-radius: 6px;
    }

    .markdown-slot pre {
      margin: 0;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.2);
      overflow: auto;
    }

    .markdown-slot hr {
      width: 100%;
      height: 1px;
      border: 0;
      background: rgba(127, 180, 255, 0.16);
      margin: 6px 0;
    }

    .markdown-image-wrap {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    .markdown-image-wrap img {
      width: 100%;
      max-height: 320px;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid rgba(127, 180, 255, 0.16);
      background: rgba(255, 255, 255, 0.03);
    }

    .markdown-image-wrap figcaption {
      color: var(--muted);
      font-size: 0.82rem;
    }

    .markdown-frontmatter {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid rgba(127, 180, 255, 0.16);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.025);
      margin-bottom: 12px;
    }

    .markdown-slot[data-markdown-theme="warning"] .markdown-frontmatter {
      border-color: rgba(247, 185, 85, 0.26);
      background: rgba(247, 185, 85, 0.08);
    }

    .markdown-slot[data-markdown-theme="success"] .markdown-frontmatter {
      border-color: rgba(85, 215, 160, 0.26);
      background: rgba(85, 215, 160, 0.08);
    }

    .markdown-slot[data-markdown-theme="danger"] .markdown-frontmatter {
      border-color: rgba(255, 107, 121, 0.26);
      background: rgba(255, 107, 121, 0.08);
    }

    .markdown-slot pre code {
      background: transparent;
      padding: 0;
    }

    .markdown-slot-empty {
      padding: 12px 14px;
      border: 1px dashed rgba(127, 180, 255, 0.18);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
    }

    .markdown-slot-inline {
      margin-top: 0;
    }

    .markdown-empty-state {
      color: var(--muted);
      font-size: 0.88rem;
    }

    .timeline-stage {
      padding: 20px 20px 18px;
      overflow: hidden;
    }

    .timeline-scroll {
      overflow-x: auto;
      overflow-y: visible;
      padding: 12px 2px 6px;
    }

    .timeline-scene {
      --timeline-node-size: 78px;
      --timeline-line-thickness: 22px;
      position: relative;
      min-width: max(960px, calc(240px * 4));
      display: grid;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      gap: 10px;
      align-items: center;
      padding: 120px 18px 130px;
    }

    .timeline-scene-count-1 { grid-template-columns: repeat(1, minmax(180px, 1fr)); min-width: 280px; }
    .timeline-scene-count-2 { grid-template-columns: repeat(2, minmax(180px, 1fr)); min-width: 520px; }
    .timeline-scene-count-3 { grid-template-columns: repeat(3, minmax(180px, 1fr)); min-width: 760px; }
    .timeline-scene-count-4 { grid-template-columns: repeat(4, minmax(180px, 1fr)); min-width: 980px; }
    .timeline-scene-count-5 { grid-template-columns: repeat(5, minmax(180px, 1fr)); min-width: 1180px; }
    .timeline-scene-count-6 { grid-template-columns: repeat(6, minmax(180px, 1fr)); min-width: 1380px; }

    .timeline-scene::before {
      content: "";
      position: absolute;
      left: 24px;
      right: 24px;
      top: 50%;
      height: var(--timeline-line-thickness);
      transform: translateY(-50%);
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02) 44%, rgba(0, 0, 0, 0.12)),
        linear-gradient(90deg, rgba(102, 204, 255, 0.92), rgba(68, 183, 255, 0.78));
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        inset 0 -3px 0 rgba(0, 0, 0, 0.18);
    }

    .timeline-scene::after {
      content: "";
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      border-left: 20px solid rgba(68, 183, 255, 0.84);
      filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.18));
    }

    .timeline-stop {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-self: stretch;
      z-index: 1;
    }

    .timeline-stop.top {
      padding-bottom: 54px;
    }

    .timeline-stop.bottom {
      padding-top: 54px;
      flex-direction: column-reverse;
    }

    .timeline-stop-card {
      width: min(200px, 100%);
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(127, 180, 255, 0.18);
      background: linear-gradient(180deg, rgba(20, 36, 52, 0.94), rgba(12, 23, 36, 0.94));
      box-shadow:
        0 14px 24px rgba(0, 0, 0, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      display: grid;
      gap: 5px;
      text-align: left;
    }

    .timeline-stop-chip {
      display: inline-flex;
      width: fit-content;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(102, 204, 255, 0.12);
      color: var(--accent);
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .timeline-stop-card strong {
      font-size: 0.96rem;
      line-height: 1.2;
    }

    .timeline-stop-window {
      color: var(--muted);
      font-size: 0.75rem;
      line-height: 1.35;
    }

    .timeline-stop-stem {
      width: 3px;
      height: 62px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(102, 204, 255, 0.42), rgba(255, 255, 255, 0.08));
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
    }

    .timeline-stop-node {
      width: var(--timeline-node-size);
      height: var(--timeline-node-size);
      border: 0;
      padding: 10px;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.04)),
        linear-gradient(135deg, rgba(102, 204, 255, 0.2), rgba(68, 183, 255, 0.08));
      box-shadow:
        0 16px 24px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      display: grid;
      place-items: center;
      cursor: pointer;
      transform: rotate(45deg);
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }

    .timeline-stop-node:hover {
      transform: rotate(45deg) translateY(-2px);
      box-shadow:
        0 18px 28px rgba(0, 0, 0, 0.24),
        0 0 0 1px rgba(102, 204, 255, 0.18) inset;
    }

    .timeline-stop-node-core {
      width: 100%;
      height: 100%;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, rgba(68, 183, 255, 0.92), rgba(57, 160, 224, 0.88));
      color: #04111b;
      font-size: 1.15rem;
      font-weight: 900;
      transform: rotate(-45deg);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.26),
        inset 0 -4px 0 rgba(0, 0, 0, 0.12);
    }

    .timeline-stop.current .timeline-stop-node-core {
      background: linear-gradient(180deg, rgba(102, 204, 255, 1), rgba(82, 197, 255, 0.9));
    }

    .timeline-stop.up-next .timeline-stop-node-core {
      background: linear-gradient(180deg, rgba(247, 185, 85, 0.98), rgba(230, 155, 52, 0.92));
    }

    .timeline-stop.future .timeline-stop-node-core {
      background: linear-gradient(180deg, rgba(109, 147, 189, 0.86), rgba(81, 112, 147, 0.82));
      color: #eaf2fb;
    }

    .timeline-stop.risk-high .timeline-stop-card {
      border-color: rgba(255, 107, 121, 0.24);
    }

    .layout-switch {
      display: grid;
      gap: 12px;
    }

    .overview-grid,
    .release-grid {
      display: grid;
      gap: 16px;
    }

    .overview-grid {
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
      align-items: start;
    }

    .release-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .stack-panel {
      display: grid;
      gap: 16px;
    }

    .milestones {
      display: grid;
      gap: 12px;
    }

    #layout-horizontal:checked ~ .layout-switch .milestones {
      grid-auto-flow: column;
      grid-auto-columns: minmax(340px, 1fr);
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .milestone-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(17, 31, 45, 0.92), rgba(11, 22, 34, 0.92));
      overflow: hidden;
    }

    .milestone-card.current { box-shadow: 0 0 0 1px rgba(102, 204, 255, 0.2); }
    .milestone-card.up-next { box-shadow: inset 0 0 0 1px rgba(247, 185, 85, 0.12); }
    .milestone-card.risk-high { border-color: rgba(255, 107, 121, 0.4); }
    .milestone-card.risk-medium { border-color: rgba(247, 185, 85, 0.32); }
    .milestone-card.risk-low { border-color: rgba(85, 215, 160, 0.32); }

    .milestone-toggle {
      width: 100%;
      background: transparent;
      border: 0;
      color: inherit;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      padding: 14px 16px;
      cursor: pointer;
      text-align: left;
      list-style: none;
    }

    .milestone-toggle::-webkit-details-marker {
      display: none;
    }

    .milestone-toggle-left {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      min-width: 0;
    }

    .milestone-step {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-weight: 800;
      background: rgba(102, 204, 255, 0.12);
      color: var(--accent);
      flex: 0 0 auto;
    }

    .milestone-head {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .milestone-state {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      font-weight: 800;
    }

    .milestone-head h3 {
      font-size: 1.05rem;
    }

    .milestone-date {
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .milestone-chevron {
      font-size: 1.4rem;
      color: var(--accent);
      line-height: 1;
      flex: 0 0 auto;
    }

    .milestone-card[open] .milestone-chevron { transform: rotate(45deg); }
    .milestone-body { display: none; padding: 0 16px 16px; }
    .milestone-card[open] .milestone-body { display: grid; gap: 12px; }

    .dependency-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .dependency-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(127, 180, 255, 0.14);
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .dependency-pill.unlocks {
      border-color: rgba(85, 215, 160, 0.2);
      color: #b6eacf;
    }

    .completion-bar {
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .completion-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-strong));
      border-radius: inherit;
    }

    .milestone-goal {
      color: var(--text);
      font-weight: 600;
      line-height: 1.45;
    }

    .milestone-columns {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .milestone-columns section {
      padding: 12px 12px 10px;
      border: 1px solid rgba(127, 180, 255, 0.12);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.025);
    }

    .milestone-columns h4 {
      margin-bottom: 8px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .history-strip {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .history-entry {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr);
      gap: 14px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.025);
    }

    .history-date {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .history-content {
      display: grid;
      gap: 6px;
    }

    .history-content p { color: var(--muted); line-height: 1.5; }
    .footer-note { margin-top: 16px; color: var(--muted); font-size: 0.76rem; }

    @media (max-width: 980px) {
      .grid-two,
      .grid-three,
      .milestone-columns,
      .overview-grid,
      .release-grid,
      .focus-grid-two,
      .focus-card-grid,
      .roadmap-editor-grid {
        grid-template-columns: 1fr;
      }

      .history-entry {
        grid-template-columns: 1fr;
      }

      .dependency-strip {
        grid-template-columns: 1fr;
      }

      .timeline-scene,
      .timeline-scene-count-1,
      .timeline-scene-count-2,
      .timeline-scene-count-3,
      .timeline-scene-count-4,
      .timeline-scene-count-5,
      .timeline-scene-count-6 {
        min-width: 760px;
      }

      #layout-horizontal:checked ~ .layout-switch .milestones {
        grid-auto-flow: row;
        grid-auto-columns: auto;
        overflow-x: visible;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="hero-top">
        <div>
          <div class="eyebrow">emuBro roadmap</div>
          <h1>${escapeHtml(roadmap.currentPhase.label)}</h1>
          <p class="summary">${escapeHtml(roadmap.currentPhase.summary)}</p>
          <div class="current-phase-metrics">
            <span class="metric-badge risk-${escapeHtml(roadmap.currentPhase.risk)}">Risk: ${escapeHtml(toTitleCase(roadmap.currentPhase.risk))}</span>
            <span class="metric-badge confidence-${escapeHtml(roadmap.currentPhase.confidence)}">Confidence: ${escapeHtml(toTitleCase(roadmap.currentPhase.confidence))}</span>
            <span class="metric-badge">Target Window: ${escapeHtml(roadmap.currentPhase.targetWindow)}</span>
          </div>
        </div>
        <div class="hero-meta">
          <div class="meta-chip hero-meta-card">
            <div class="hero-meta-row">
              <strong>Version</strong>
              <span>${escapeHtml(pkg.version)}</span>
            </div>
            <div class="hero-meta-row">
              <strong>Roadmap Date</strong>
              <span>${escapeHtml(roadmap.currentPhase.date)}</span>
            </div>
            <div class="hero-meta-row">
              <strong>Dashboard Updated</strong>
              <span>${escapeHtml(updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel workspace-panel">
      <div class="panel-head workspace-head">
        <div>
          <h2 class="section-title" style="margin-bottom:6px;">Roadmap Workspace</h2>
          <span class="minor-label">Focus on the layer you want right now instead of scanning one long page.</span>
        </div>
        <div class="roadmap-tabbar" role="tablist" aria-label="Roadmap sections">
          <button class="roadmap-tab-btn is-active" type="button" data-roadmap-tab="overview">Overview</button>
          <button class="roadmap-tab-btn" type="button" data-roadmap-tab="milestones">Milestones</button>
          <button class="roadmap-tab-btn" type="button" data-roadmap-tab="gates">Release Gates</button>
          <button class="roadmap-tab-btn" type="button" data-roadmap-tab="history">History</button>
        </div>
      </div>
      <div class="workspace-body">
        <section class="roadmap-pane is-active" data-roadmap-pane="overview">
          ${renderFocusWorkspace(roadmap)}

          <section class="panel timeline-stage compact">
            <div class="panel-head">
              <div>
                <h2 class="section-title" style="margin-bottom:6px;">Roadmap Timeline</h2>
                <span class="minor-label">Select a milestone stop to jump straight into milestone details.</span>
              </div>
            </div>
            ${renderTimelineShowcase(roadmap.milestones)}
          </section>

          <div class="overview-grid">
            <section class="panel stack-panel">
              ${renderContentSection({
                  title: 'Where We Are',
                  slotId: 'section-where-we-are',
                  contentHtml: renderList(roadmap.whereWeAre)
              })}
              ${renderContentSection({
                  title: 'Where We Are Going',
                  slotId: 'section-where-we-are-going',
                  contentHtml: renderList(roadmap.whereWeAreGoing)
              })}
              <section>
                <div class="section-head-with-tools">
                  <h2 class="section-title">What Changed Since Last Update</h2>
                </div>
                <div data-history-recent>${renderRecentChanges(roadmap.history)}</div>
              </section>
            </section>

            <section class="panel stack-panel">
              <section>
                <h2 class="section-title">Beta Target</h2>
                <div class="meta-chip">
                  <strong>Target Window</strong>
                  <span>${escapeHtml(roadmap.releaseTargets.beta.targetWindow)}</span>
                  <p class="summary" style="margin-top:8px;font-size:0.92rem;">${escapeHtml(roadmap.releaseTargets.beta.note)}</p>
                </div>
              </section>
              <section>
                <h2 class="section-title">Stable Target</h2>
                <div class="meta-chip">
                  <strong>Target Window</strong>
                  <span>${escapeHtml(roadmap.releaseTargets.stable.targetWindow)}</span>
                  <p class="summary" style="margin-top:8px;font-size:0.92rem;">${escapeHtml(roadmap.releaseTargets.stable.note)}</p>
                </div>
              </section>
              <section>
                <h2 class="section-title">Dependencies And Blockers</h2>
                <p class="summary" style="margin-top:0;">See what each milestone is waiting on before it can move cleanly.</p>
                ${renderDependencySummary(roadmap.milestones)}
              </section>
            </section>
          </div>
        </section>

        <section class="roadmap-pane" data-roadmap-pane="milestones">
          <div class="panel-head">
            <div>
              <h2 class="section-title" style="margin-bottom:6px;">Milestones</h2>
              <span class="minor-label">Open one milestone at a time and keep the details focused.</span>
            </div>
            <div class="toolbar" role="group" aria-label="Layout toggle">
              <input type="radio" name="layout-mode" id="layout-vertical" value="vertical" checked />
              <label for="layout-vertical">Vertical</label>
              <input type="radio" name="layout-mode" id="layout-horizontal" value="horizontal" />
              <label for="layout-horizontal">Horizontal</label>
            </div>
          </div>
          ${renderRoadmapTools(roadmap)}
          <div class="layout-switch">
            <div class="milestones">
              ${renderMilestoneCards(roadmap.milestones)}
            </div>
          </div>
        </section>

        <section class="roadmap-pane" data-roadmap-pane="gates">
          <div class="release-grid">
            <section class="panel stack-panel">
              ${renderContentSection({
                  title: 'Beta Means',
                  slotId: 'section-beta-means',
                  contentHtml: renderList(roadmap.betaDefinition)
              })}
              ${renderContentSection({
                  title: 'Near-Term Tasks',
                  slotId: 'section-near-term-tasks',
                  contentHtml: renderList(roadmap.nearTermTasks)
              })}
            </section>

            <section class="panel stack-panel">
              ${renderContentSection({
                  title: 'Stable Means',
                  slotId: 'section-stable-means',
                  contentHtml: renderList(roadmap.stableDefinition)
              })}
              ${renderContentSection({
                  title: 'Future Update Tracks',
                  slotId: 'section-future-update-tracks',
                  contentHtml: renderList(roadmap.futureUpdateTracks)
              })}
            </section>
          </div>
        </section>

        <section class="roadmap-pane" data-roadmap-pane="history">
          <section class="panel">
            <div class="section-head-with-tools">
              <h2 class="section-title">Changelog / History Strip</h2>
              ${renderMarkdownTools('section-history-strip', 'History')}
            </div>
            <div id="section-history-strip" class="markdown-slot" data-markdown-slot="section-history-strip">
              <div class="history-strip" data-history-strip>
                ${renderHistory(roadmap.history)}
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>

    <p class="footer-note">Source: docs/project-roadmap.json. Rebuild with <code>npm run roadmap:build</code>.</p>
  </main>

  <script>
    (function () {
      const storageKey = 'emubro.roadmap.layout';
      const activeTabStorageKey = 'emubro.roadmap.activeTab';
      const activeFocusStorageKey = 'emubro.roadmap.focus';
      const markdownStoragePrefix = 'emubro.roadmap.markdown.';
      const verticalInput = document.getElementById('layout-vertical');
      const horizontalInput = document.getElementById('layout-horizontal');
      if (!verticalInput || !horizontalInput) return;
      const baseRoadmap = ${JSON.stringify(roadmap).replace(/</g, '\\u003c')};
      const draftStorageKey = 'emubro.roadmap.draft';
      const tabButtons = Array.from(document.querySelectorAll('[data-roadmap-tab]'));
      const tabPanes = Array.from(document.querySelectorAll('[data-roadmap-pane]'));
      const focusButtons = Array.from(document.querySelectorAll('[data-focus-view]'));
      const focusPanes = Array.from(document.querySelectorAll('[data-focus-pane]'));

      const savedLayout = localStorage.getItem(storageKey);
      if (savedLayout === 'horizontal') {
        horizontalInput.checked = true;
      } else {
        verticalInput.checked = true;
      }

      [verticalInput, horizontalInput].forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) {
            localStorage.setItem(storageKey, input.value);
          }
        });
      });

      const activateRoadmapTab = (tabId) => {
        const resolvedTabId = tabPanes.some((pane) => pane.getAttribute('data-roadmap-pane') === tabId)
          ? tabId
          : 'overview';
        tabButtons.forEach((button) => {
          button.classList.toggle('is-active', button.getAttribute('data-roadmap-tab') === resolvedTabId);
        });
        tabPanes.forEach((pane) => {
          pane.classList.toggle('is-active', pane.getAttribute('data-roadmap-pane') === resolvedTabId);
        });
        localStorage.setItem(activeTabStorageKey, resolvedTabId);
      };

      const savedTab = localStorage.getItem(activeTabStorageKey) || 'overview';
      activateRoadmapTab(savedTab);

      const activateFocusPane = (focusId) => {
        const resolvedFocusId = focusPanes.some((pane) => pane.getAttribute('data-focus-pane') === focusId)
          ? focusId
          : 'now';
        focusButtons.forEach((button) => {
          button.classList.toggle('is-active', button.getAttribute('data-focus-view') === resolvedFocusId);
        });
        focusPanes.forEach((pane) => {
          pane.classList.toggle('is-active', pane.getAttribute('data-focus-pane') === resolvedFocusId);
        });
        localStorage.setItem(activeFocusStorageKey, resolvedFocusId);
      };

      const savedFocus = localStorage.getItem(activeFocusStorageKey) || 'now';
      activateFocusPane(savedFocus);

      tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
          activateRoadmapTab(button.getAttribute('data-roadmap-tab') || 'overview');
        });
      });

      focusButtons.forEach((button) => {
        button.addEventListener('click', () => {
          activateFocusPane(button.getAttribute('data-focus-view') || 'now');
        });
      });

      const cloneJson = (value) => JSON.parse(JSON.stringify(value));
      const stateLabel = (state) => {
        if (state === 'current') return 'Current';
        if (state === 'up-next') return 'Up Next';
        if (state === 'past') return 'Past';
        return 'Future';
      };
      const getDraftOverrides = () => {
        try {
          return JSON.parse(localStorage.getItem(draftStorageKey) || '{"milestones":{},"historyAppend":[]}');
        } catch (error) {
          return { milestones: {}, historyAppend: [] };
        }
      };

      const mergeRoadmapDrafts = (base, draft) => {
        const merged = cloneJson(base);
        const milestoneDrafts = draft && draft.milestones ? draft.milestones : {};
        merged.milestones = merged.milestones.map((milestone) => ({
          ...milestone,
          ...(milestoneDrafts[milestone.id] || {})
        }));
        if (Array.isArray(draft && draft.historyAppend) && draft.historyAppend.length) {
          merged.history = draft.historyAppend.concat(merged.history || []);
        }
        return merged;
      };

      const deriveMilestones = (milestones) => milestones.map((milestone, index) => {
        const previous = index > 0 ? milestones[index - 1] : null;
        const next = index < milestones.length - 1 ? milestones[index + 1] : null;
        return {
          ...milestone,
          dependsOn: previous ? [previous.title] : [],
          unlocks: next ? [next.title] : []
        };
      });

      let currentRoadmap = mergeRoadmapDrafts(baseRoadmap, getDraftOverrides());

      const updateBadgeText = (node, classPrefix, value, label) => {
        if (!node) return;
        node.classList.remove(classPrefix + '-low', classPrefix + '-medium', classPrefix + '-high');
        node.classList.add(classPrefix + '-' + value);
        node.textContent = label + ': ' + value.charAt(0).toUpperCase() + value.slice(1);
      };

      const escapeInline = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const renderListMarkup = (items, className) => {
        const cls = className ? ' class="' + className + '"' : '';
        return '<ul' + cls + '>' + items.map((item) => '<li>' + escapeInline(item) + '</li>').join('') + '</ul>';
      };

      const renderHistoryMarkup = (history) => (history || []).map((entry) =>
        '<article class="history-entry"><div class="history-date">' + escapeInline(entry.date || '') + '</div><div class="history-content"><h3>' + escapeInline(entry.title || '') + '</h3><p>' + escapeInline(entry.summary || '') + '</p></div></article>'
      ).join('');

      const renderRecentChangesMarkup = (history) => (history || []).slice(0, 3).map((entry, index) =>
        '<article class="recent-change-card' + (index === 0 ? ' is-latest' : '') + '"><div class="recent-change-date">' + escapeInline(entry.date || '') + '</div><h3>' + escapeInline(entry.title || '') + '</h3><p>' + escapeInline(entry.summary || '') + '</p></article>'
      ).join('');

      const applyRoadmapToDom = (roadmapData) => {
        const derivedMilestones = deriveMilestones(roadmapData.milestones || []);
        const currentMilestone = derivedMilestones.find((milestone) => milestone.state === 'current') || derivedMilestones[0];
        document.querySelectorAll('[data-current-milestone-title]').forEach((node) => {
          node.textContent = 'Blocked by: ' + (currentMilestone ? currentMilestone.title : 'Current milestone');
        });
        derivedMilestones.forEach((milestone) => {
          const key = milestone.id;
          const blockerItems = Array.isArray(milestone.blockers) ? milestone.blockers : [];
          document.querySelectorAll('[data-milestone-id="' + key + '"]').forEach((node) => {
            node.classList.remove('risk-low', 'risk-medium', 'risk-high');
            node.classList.add('risk-' + (milestone.risk || 'medium'));
          });
          document.querySelectorAll('[data-milestone-title="' + key + '"]').forEach((node) => {
            node.textContent = milestone.title || '';
          });
          document.querySelectorAll('[data-milestone-goal="' + key + '"]').forEach((node) => {
            node.textContent = milestone.goal || '';
          });
          document.querySelectorAll('[data-milestone-window="' + key + '"]').forEach((node) => {
            node.textContent = milestone.targetWindow || 'Date TBD';
          });
          document.querySelectorAll('[data-milestone-window-label="' + key + '"]').forEach((node) => {
            node.textContent = 'Window: ' + (milestone.targetWindow || 'TBD');
          });
          document.querySelectorAll('[data-milestone-completion="' + key + '"]').forEach((node) => {
            const isTimeline = node.classList.contains('timeline-stop-chip');
            node.textContent = (isTimeline ? stateLabel(milestone.state) + ' · ' : 'Completion: ') + String(milestone.completion ?? 0) + '%';
          });
          document.querySelectorAll('[data-milestone-completion-plain="' + key + '"]').forEach((node) => {
            node.textContent = String(milestone.completion ?? 0) + '% complete';
          });
          document.querySelectorAll('[data-milestone-completion-fill="' + key + '"]').forEach((node) => {
            node.style.width = String(milestone.completion ?? 0) + '%';
          });
          document.querySelectorAll('[data-milestone-blockers="' + key + '"]').forEach((node) => {
            node.textContent = 'Blockers: ' + String(blockerItems.length);
          });
          document.querySelectorAll('[data-milestone-risk="' + key + '"]').forEach((node) => {
            updateBadgeText(node, 'risk', milestone.risk || 'medium', 'Risk');
          });
          document.querySelectorAll('[data-milestone-confidence="' + key + '"]').forEach((node) => {
            updateBadgeText(node, 'confidence', milestone.confidence || 'medium', 'Confidence');
          });
          document.querySelectorAll('[data-milestone-dependency-summary="' + key + '"]').forEach((node) => {
            node.textContent = milestone.dependsOn.length ? 'Depends on ' + milestone.dependsOn.join(', ') + '.' : 'Starting point for the current roadmap.';
          });
          document.querySelectorAll('[data-milestone-dependency-pills="' + key + '"]').forEach((node) => {
            node.innerHTML =
              milestone.dependsOn.map((title) => '<span class="dependency-pill">Depends on ' + escapeInline(title) + '</span>').join('') +
              milestone.unlocks.map((title) => '<span class="dependency-pill unlocks">Unlocks ' + escapeInline(title) + '</span>').join('');
          });
          document.querySelectorAll('[data-milestone-blocker-list="' + key + '"]').forEach((node) => {
            const listClass = node.closest('.milestone-columns') ? 'danger-list' : '';
            node.innerHTML = renderListMarkup(blockerItems, listClass);
          });
        });
        const historyStrip = document.querySelector('[data-history-strip]');
        if (historyStrip) {
          historyStrip.innerHTML = renderHistoryMarkup(roadmapData.history || []);
        }
        const historyRecent = document.querySelector('[data-history-recent]');
        if (historyRecent) {
          historyRecent.innerHTML = renderRecentChangesMarkup(roadmapData.history || []);
        }
      };

      applyRoadmapToDom(currentRoadmap);

      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const parseMarkdownFrontmatter = (markdown) => {
        const source = String(markdown || '');
        if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
          return { meta: {}, body: source };
        }
        const normalized = source.replace(/\r\n/g, '\n');
        const endIndex = normalized.indexOf('\n---\n', 4);
        if (endIndex === -1) {
          return { meta: {}, body: source };
        }
        const rawMeta = normalized.slice(4, endIndex).split('\n');
        const meta = {};
        rawMeta.forEach((line) => {
          const separatorIndex = line.indexOf(':');
          if (separatorIndex <= 0) return;
          const key = line.slice(0, separatorIndex).trim().toLowerCase();
          const value = line.slice(separatorIndex + 1).trim();
          if (key) meta[key] = value;
        });
        return {
          meta,
          body: normalized.slice(endIndex + 5)
        };
      };

      const renderInlineMarkdown = (value) => escapeHtml(value)
        .replace(/!\\[([^\\]]*)\\]\\((https?:\\/\\/[^)\\s]+)\\)/g, (_, alt, src) => '<figure class="markdown-image-wrap"><img src="' + src + '" alt="' + alt + '" loading="lazy" />' + (alt ? '<figcaption>' + alt + '</figcaption>' : '') + '</figure>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
        .replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^)]+)\\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

      const parseMarkdownToHtml = (markdown) => {
        const codeFence = String.fromCharCode(96, 96, 96);
        const lineFeed = String.fromCharCode(10);
        const carriageReturn = String.fromCharCode(13);
        const lines = String(markdown || '').replaceAll(carriageReturn + lineFeed, lineFeed).split(lineFeed);
        const chunks = [];
        let listType = null;
        let listItems = [];
        let paragraph = [];
        let inCodeBlock = false;
        let codeBuffer = [];

        const flushParagraph = () => {
          if (!paragraph.length) return;
          chunks.push('<p>' + renderInlineMarkdown(paragraph.join(' ')) + '</p>');
          paragraph = [];
        };

        const flushList = () => {
          if (!listType || !listItems.length) return;
          const tag = listType === 'ol' ? 'ol' : 'ul';
          chunks.push('<' + tag + '>' + listItems.map((item) => '<li>' + renderInlineMarkdown(item) + '</li>').join('') + '</' + tag + '>');
          listType = null;
          listItems = [];
        };

        const flushCode = () => {
          if (!inCodeBlock) return;
          chunks.push('<pre><code>' + escapeHtml(codeBuffer.join(lineFeed)) + '</code></pre>');
          inCodeBlock = false;
          codeBuffer = [];
        };

        lines.forEach((rawLine) => {
          const line = rawLine.trimEnd();

          if (line.trim().startsWith(codeFence)) {
            flushParagraph();
            flushList();
            if (inCodeBlock) {
              flushCode();
            } else {
              inCodeBlock = true;
            }
            return;
          }

          if (inCodeBlock) {
            codeBuffer.push(rawLine);
            return;
          }

          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            flushList();
            return;
          }

          const headingMatch = trimmed.match(/^(#{1,4})\\s+(.*)$/);
          if (headingMatch) {
            flushParagraph();
            flushList();
            const level = Math.min(4, headingMatch[1].length);
            chunks.push('<h' + level + '>' + renderInlineMarkdown(headingMatch[2]) + '</h' + level + '>');
            return;
          }

          const quoteMatch = trimmed.match(/^>\\s?(.*)$/);
          if (quoteMatch) {
            flushParagraph();
            flushList();
            chunks.push('<blockquote>' + renderInlineMarkdown(quoteMatch[1]) + '</blockquote>');
            return;
          }

          if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
            flushParagraph();
            flushList();
            chunks.push('<hr />');
            return;
          }

          const imageOnlyMatch = trimmed.match(/^!\\[([^\\]]*)\\]\\((https?:\\/\\/[^)\\s]+)\\)$/);
          if (imageOnlyMatch) {
            flushParagraph();
            flushList();
            chunks.push(renderInlineMarkdown(trimmed));
            return;
          }

          const unorderedMatch = trimmed.match(/^[-*]\\s+(.*)$/);
          if (unorderedMatch) {
            flushParagraph();
            if (listType && listType !== 'ul') {
              flushList();
            }
            listType = 'ul';
            listItems.push(unorderedMatch[1]);
            return;
          }

          const orderedMatch = trimmed.match(/^\\d+\\.\\s+(.*)$/);
          if (orderedMatch) {
            flushParagraph();
            if (listType && listType !== 'ol') {
              flushList();
            }
            listType = 'ol';
            listItems.push(orderedMatch[1]);
            return;
          }

          if (listType) {
            flushList();
          }

          paragraph.push(trimmed);
        });

        flushParagraph();
        flushList();
        flushCode();
        return chunks.join('');
      };

      const renderMarkdownDocument = (markdown) => {
        const parsed = parseMarkdownFrontmatter(markdown);
        const meta = parsed.meta || {};
        const themeAttr = meta.theme ? ' data-markdown-theme="' + escapeHtml(meta.theme) + '"' : '';
        const headerParts = [];
        if (meta.title) {
          headerParts.push('<h2>' + escapeHtml(meta.title) + '</h2>');
        }
        if (meta.subtitle) {
          headerParts.push('<p>' + escapeHtml(meta.subtitle) + '</p>');
        }
        if (meta.image) {
          headerParts.push('<figure class="markdown-image-wrap"><img src="' + escapeHtml(meta.image) + '" alt="' + escapeHtml(meta.imagealt || meta.title || '') + '" loading="lazy" />' + (meta.imagealt ? '<figcaption>' + escapeHtml(meta.imagealt) + '</figcaption>' : '') + '</figure>');
        }
        const headerHtml = headerParts.length ? '<div class="markdown-frontmatter"' + themeAttr + '>' + headerParts.join('') + '</div>' : '';
        return {
          html: headerHtml + parseMarkdownToHtml(parsed.body || ''),
          theme: meta.theme || ''
        };
      };

      document.querySelectorAll('[data-markdown-slot]').forEach((slot) => {
        const slotId = slot.getAttribute('data-markdown-slot');
        if (!slotId) return;
        slot.dataset.defaultHtml = slot.innerHTML;
        const savedMarkdown = localStorage.getItem(markdownStoragePrefix + slotId);
        if (savedMarkdown) {
          const rendered = renderMarkdownDocument(savedMarkdown);
          slot.innerHTML = rendered.html;
          slot.dataset.markdownTheme = rendered.theme || '';
          slot.classList.remove('markdown-slot-empty');
        }
      });

      const applyMarkdownToSlot = (slotId, markdown) => {
        const slot = slotId ? document.querySelector('[data-markdown-slot="' + slotId + '"]') : null;
        if (!slot) return false;
        localStorage.setItem(markdownStoragePrefix + slotId, markdown);
        const rendered = renderMarkdownDocument(markdown);
        slot.innerHTML = rendered.html;
        slot.dataset.markdownTheme = rendered.theme || '';
        slot.classList.remove('markdown-slot-empty');
        return true;
      };

      document.querySelectorAll('[data-markdown-input]').forEach((input) => {
        input.addEventListener('change', async () => {
          const slotId = input.getAttribute('data-markdown-input');
          const file = input.files && input.files[0];
          if (!slotId || !file) return;
          const markdown = await file.text();
          applyMarkdownToSlot(slotId, markdown);
          input.value = '';
        });
      });

      document.querySelectorAll('[data-markdown-reset]').forEach((button) => {
        button.addEventListener('click', () => {
          const slotId = button.getAttribute('data-markdown-reset');
          const slot = slotId ? document.querySelector('[data-markdown-slot="' + slotId + '"]') : null;
          if (!slot) return;
          localStorage.removeItem(markdownStoragePrefix + slotId);
          slot.innerHTML = slot.dataset.defaultHtml || '';
          slot.dataset.markdownTheme = '';
          if (slot.textContent.trim()) {
            slot.classList.remove('markdown-slot-empty');
          } else {
            slot.classList.add('markdown-slot-empty');
          }
        });
      });

      const downloadTextFile = (filename, content) => {
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      };

      const getMergedRoadmapForExport = () => mergeRoadmapDrafts(baseRoadmap, getDraftOverrides());

      document.querySelector('[data-roadmap-copy-json]')?.addEventListener('click', async () => {
        const json = JSON.stringify(getMergedRoadmapForExport(), null, 2);
        try {
          await navigator.clipboard.writeText(json);
        } catch (error) {
          downloadTextFile('project-roadmap.json', json);
        }
      });

      document.querySelector('[data-roadmap-download-json]')?.addEventListener('click', () => {
        downloadTextFile('project-roadmap.json', JSON.stringify(getMergedRoadmapForExport(), null, 2));
      });

      const normalizeBundleName = (name) => String(name || '')
        .toLowerCase()
        .replace(/\.(md|markdown|txt)$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const resolveBundleSlot = (normalizedName) => {
        const directMap = {
          'where-we-are': 'section-where-we-are',
          'where-we-are-going': 'section-where-we-are-going',
          'beta-means': 'section-beta-means',
          'stable-means': 'section-stable-means',
          'near-term-tasks': 'section-near-term-tasks',
          'future-update-tracks': 'section-future-update-tracks',
          'history': 'section-history-strip'
        };
        if (directMap[normalizedName]) return directMap[normalizedName];
        if (normalizedName.startsWith('milestone-')) return normalizedName + '-notes';
        const matchingMilestone = baseRoadmap.milestones.find((milestone) => normalizedName === milestone.id || normalizedName === normalizeBundleName(milestone.title));
        return matchingMilestone ? 'milestone-' + matchingMilestone.id + '-notes' : null;
      };

      const applyMarkdownBundle = async (files) => {
        for (const file of files) {
          const normalizedName = normalizeBundleName(file.name);
          const slotId = resolveBundleSlot(normalizedName);
          if (!slotId) continue;
          const markdown = await file.text();
          applyMarkdownToSlot(slotId, markdown);
        }
      };

      document.querySelector('[data-markdown-bundle]')?.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        await applyMarkdownBundle(files);
        event.target.value = '';
      });

      const dropzone = document.querySelector('[data-roadmap-dropzone]');
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone?.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropzone.classList.add('is-active');
        });
      });
      ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
        dropzone?.addEventListener(eventName, () => {
          dropzone.classList.remove('is-active');
        });
      });
      dropzone?.addEventListener('drop', async (event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => /\.(md|markdown|txt)$/i.test(file.name));
        await applyMarkdownBundle(files);
      });

      const editorSelect = document.querySelector('[data-roadmap-editor-select]');
      const editorTitle = document.querySelector('[data-roadmap-editor-title]');
      const editorWindow = document.querySelector('[data-roadmap-editor-window]');
      const editorCompletion = document.querySelector('[data-roadmap-editor-completion]');
      const editorRisk = document.querySelector('[data-roadmap-editor-risk]');
      const editorConfidence = document.querySelector('[data-roadmap-editor-confidence]');
      const editorGoal = document.querySelector('[data-roadmap-editor-goal]');
      const editorBlockers = document.querySelector('[data-roadmap-editor-blockers]');
      const editorStatus = document.querySelector('[data-roadmap-editor-status]');
      const historyDate = document.querySelector('[data-roadmap-history-date]');
      const historyTitle = document.querySelector('[data-roadmap-history-title]');
      const historySummary = document.querySelector('[data-roadmap-history-summary]');
      const historyStatus = document.querySelector('[data-roadmap-history-status]');

      const refreshEditorFields = () => {
        if (!editorSelect) return;
        currentRoadmap = mergeRoadmapDrafts(baseRoadmap, getDraftOverrides());
        const milestone = currentRoadmap.milestones.find((entry) => entry.id === editorSelect.value) || currentRoadmap.milestones[0];
        if (!milestone) return;
        editorTitle.value = milestone.title || '';
        editorWindow.value = milestone.targetWindow || '';
        editorCompletion.value = String(milestone.completion ?? 0);
        editorRisk.value = milestone.risk || 'medium';
        editorConfidence.value = milestone.confidence || 'medium';
        editorGoal.value = milestone.goal || '';
        editorBlockers.value = Array.isArray(milestone.blockers) ? milestone.blockers.join('\n') : '';
      };

      editorSelect?.addEventListener('change', refreshEditorFields);
      refreshEditorFields();

      document.querySelector('[data-roadmap-editor-save]')?.addEventListener('click', () => {
        if (!editorSelect) return;
        const draft = getDraftOverrides();
        draft.milestones = draft.milestones || {};
        draft.milestones[editorSelect.value] = {
          title: editorTitle.value.trim(),
          targetWindow: editorWindow.value.trim(),
          completion: Number(editorCompletion.value || 0),
          risk: editorRisk.value,
          confidence: editorConfidence.value,
          goal: editorGoal.value.trim(),
          blockers: editorBlockers.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        currentRoadmap = mergeRoadmapDrafts(baseRoadmap, draft);
        applyRoadmapToDom(currentRoadmap);
        if (editorStatus) {
          editorStatus.textContent = 'Local draft saved. Download or copy the JSON if you want to keep it outside this browser.';
        }
      });

      document.querySelector('[data-roadmap-editor-reset]')?.addEventListener('click', () => {
        if (!editorSelect) return;
        const draft = getDraftOverrides();
        if (draft.milestones) {
          delete draft.milestones[editorSelect.value];
        }
        localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        currentRoadmap = mergeRoadmapDrafts(baseRoadmap, draft);
        applyRoadmapToDom(currentRoadmap);
        refreshEditorFields();
        if (editorStatus) {
          editorStatus.textContent = 'Local draft cleared for this milestone.';
        }
      });

      document.querySelector('[data-roadmap-history-add]')?.addEventListener('click', () => {
        const draft = getDraftOverrides();
        draft.historyAppend = Array.isArray(draft.historyAppend) ? draft.historyAppend : [];
        const entry = {
          date: (historyDate?.value || '').trim() || new Date().toISOString().slice(0, 10),
          title: (historyTitle?.value || '').trim() || 'Untitled update',
          summary: (historySummary?.value || '').trim() || 'No summary provided.'
        };
        draft.historyAppend.unshift(entry);
        localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        currentRoadmap = mergeRoadmapDrafts(baseRoadmap, draft);
        applyRoadmapToDom(currentRoadmap);
        if (historyDate) historyDate.value = entry.date;
        if (historyTitle) historyTitle.value = '';
        if (historySummary) historySummary.value = '';
        if (historyStatus) {
          historyStatus.textContent = 'History entry added to local draft.';
        }
      });

      document.querySelector('[data-roadmap-history-reset]')?.addEventListener('click', () => {
        const draft = getDraftOverrides();
        draft.historyAppend = [];
        localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        currentRoadmap = mergeRoadmapDrafts(baseRoadmap, draft);
        applyRoadmapToDom(currentRoadmap);
        if (historyStatus) {
          historyStatus.textContent = 'Local history draft entries cleared.';
        }
      });

      document.querySelectorAll('[data-milestone-jump]').forEach((button) => {
        button.addEventListener('click', () => {
          const targetId = button.getAttribute('data-milestone-jump');
          const target = targetId ? document.getElementById(targetId) : null;
          if (!target) return;
          activateRoadmapTab('milestones');
          document.querySelectorAll('.milestone-card[open]').forEach((card) => {
            if (card !== target) {
              card.removeAttribute('open');
            }
          });
          target.setAttribute('open', '');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }());
  </script>
</body>
</html>`;
}

function main() {
    const roadmap = readJson(roadmapPath);
    const pkg = readJson(packagePath);
    const html = buildHtml({ roadmap, pkg })
        .replace(/Â·/g, '&middot;')
        .replace(/â†’/g, '&rarr;');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Roadmap dashboard written to ${outputPath}`);
}

main();
