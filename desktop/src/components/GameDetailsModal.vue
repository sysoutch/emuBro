<script setup>
import { computed, ref, watch } from "vue";
import { useShellI18nStore } from "../stores/shell-i18n";
import { normalizeEmulatorRow, normalizePlatformOption } from "../utils/library-data";
import { buildSupportLlmSettings, loadDesktopLlmSettings } from "../utils/llm-settings";
import { dedupeTagRows, formatTagLabel, normalizeTagIds } from "../utils/tags";

const props = defineProps({
  game: {
    type: Object,
    default: null
  },
  status: {
    type: String,
    default: ""
  },
  statusTone: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["close", "launch", "show-folder", "create-shortcut", "refresh-game", "open-ai-settings"]);
const shellI18nStore = useShellI18nStore();

const descriptionDraft = ref("");
const descriptionStatus = ref("");
const descriptionStatusTone = ref("");
const descriptionSaving = ref(false);
const descriptionGenerating = ref(false);

const tagRows = ref([]);
const selectedTagIds = ref([]);
const tagsLoading = ref(false);
const tagsStatus = ref("");
const tagsStatusTone = ref("");
const tagsSaving = ref(false);
const tagsSuggesting = ref(false);
const tagsMutating = ref(false);

const platformRows = ref([]);
const emulatorRows = ref([]);
const preferencesLoading = ref(false);
const preferencesSaving = ref(false);
const platformShortNameDraft = ref("");
const emulatorOverrideDraft = ref("");
const runAsModeDraft = ref("default");
const runAsUserDraft = ref("");

const actionStatus = ref("");
const actionStatusTone = ref("");
const removeBusy = ref(false);
const coverBusy = ref("");
const coverStatus = ref("");
const coverStatusTone = ref("");
const coverSearchQuery = ref("");
const coverSearchResults = ref([]);
const coverSearchOpen = ref(false);

const selectedTagRows = computed(() =>
  selectedTagIds.value.map((tagId) => {
    const matched = tagRows.value.find((row) => row.id === tagId);
    return {
      id: tagId,
      label: matched?.label || formatTagLabel(tagId)
    };
  })
);

const descriptionLength = computed(() => String(descriptionDraft.value || "").trim().length);
const hasSelectedTags = computed(() => selectedTagIds.value.length > 0);
const canRenameTag = computed(() => selectedTagIds.value.length === 1);
const tagActionBusy = computed(() => tagsLoading.value || tagsSaving.value || tagsSuggesting.value || tagsMutating.value);
const platformOptions = computed(() => {
  const rows = [...platformRows.value];
  const current = String(platformShortNameDraft.value || "").trim().toLowerCase();
  if (current && !rows.some((row) => row.id === current)) {
    rows.unshift({
      id: current,
      label: String(props.game?.platform || current.toUpperCase()).trim() || current.toUpperCase()
    });
  }
  return rows;
});
const emulatorOverrideOptions = computed(() => {
  const currentOverride = String(emulatorOverrideDraft.value || "").trim();
  const platformKey = String(platformShortNameDraft.value || props.game?.platformShortName || "")
    .trim()
    .toLowerCase();
  const rows = emulatorRows.value
    .filter((row) => {
      const filePath = String(row?.filePath || "").trim();
      if (!filePath) {
        return false;
      }

      const isWeb = isWebEmulatorPath(filePath) || String(row?.type || "").trim().toLowerCase() === "web";
      if (!isWeb && !row?.installed) {
        return false;
      }

      const rowPlatform = String(row?.platformShortName || row?.platform || "")
        .trim()
        .toLowerCase();
      if (!platformKey || !rowPlatform || rowPlatform === platformKey) {
        return true;
      }

      return filePath === currentOverride;
    })
    .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

  if (currentOverride && !rows.some((row) => String(row?.filePath || "").trim() === currentOverride)) {
    rows.unshift({
      key: `override:${currentOverride}`,
      name: t("desktopShell.gameDetails.launch.currentOverride", "Current Override"),
      platform: String(props.game?.platform || t("desktopShell.gameDetails.launch.custom", "Custom")).trim() ||
        t("desktopShell.gameDetails.launch.custom", "Custom"),
      platformShortName: String(platformKey || "custom").trim() || "custom",
      type: "custom",
      filePath: currentOverride,
      installed: true
    });
  }

  return rows;
});

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function t(key, fallback) {
  return shellI18nStore.t(key, fallback);
}

function tf(key, params, fallback) {
  return shellI18nStore.tf(key, params, fallback);
}

function normalizeRunAsMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "user" ? normalized : "default";
}

function isWebEmulatorPath(value) {
  return /\.html?(?:$|[?#])/i.test(String(value || "").trim());
}

function resetLocalStatus() {
  descriptionStatus.value = "";
  descriptionStatusTone.value = "";
  tagsStatus.value = "";
  tagsStatusTone.value = "";
  coverStatus.value = "";
  coverStatusTone.value = "";
  actionStatus.value = "";
  actionStatusTone.value = "";
}

function syncFromGame() {
  descriptionDraft.value = String(props.game?.description || "").trim();
  selectedTagIds.value = normalizeTagIds(props.game?.tags);
  platformShortNameDraft.value = String(props.game?.platformShortName || "")
    .trim()
    .toLowerCase();
  emulatorOverrideDraft.value = String(props.game?.emulatorOverridePath || "").trim();
  runAsModeDraft.value = normalizeRunAsMode(props.game?.runAsMode || "default");
  runAsUserDraft.value = String(props.game?.runAsUser || "").trim();
  coverSearchQuery.value = buildCoverSearchQuery(props.game);
  coverSearchResults.value = [];
  coverSearchOpen.value = false;
  resetLocalStatus();
}

function setDescriptionFeedback(message, tone = "") {
  descriptionStatus.value = String(message || "").trim();
  descriptionStatusTone.value = tone;
}

function setTagsFeedback(message, tone = "") {
  tagsStatus.value = String(message || "").trim();
  tagsStatusTone.value = tone;
}

function setActionFeedback(message, tone = "") {
  actionStatus.value = String(message || "").trim();
  actionStatusTone.value = tone;
}

function setCoverFeedback(message, tone = "") {
  coverStatus.value = String(message || "").trim();
  coverStatusTone.value = tone;
}

function buildCoverSearchQuery(game) {
  return [String(game?.name || "").trim(), String(game?.platform || game?.platformShortName || "").trim(), "cover"]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildEditableGamePayload() {
  const game = props.game || {};
  return {
    id: Number(game.id || 0),
    name: String(game.name || "").trim(),
    platform: String(game.platform || "").trim(),
    platformShortName: String(game.platformShortName || "").trim(),
    genre: String(game.genre || "").trim(),
    description: String(descriptionDraft.value || game.description || "").trim(),
    filePath: String(game.filePath || "").trim(),
    tags: normalizeTagIds(selectedTagIds.value)
  };
}

function getLlmSettingsOrThrow() {
  const settings = buildSupportLlmSettings(loadDesktopLlmSettings());
  if (settings.llmMode === "client" && !String(settings.relayHostUrl || "").trim()) {
    throw new Error(t("desktopShell.gameDetails.errors.missingRelayHost", "Set a relay host URL first in Settings -> AI / LLM."));
  }

  if (settings.llmMode !== "client" && (!String(settings.model || "").trim() || !String(settings.baseUrl || "").trim())) {
    throw new Error(
      t("desktopShell.gameDetails.errors.missingLlmProvider", "Configure your AI / LLM provider first in Settings -> AI / LLM.")
    );
  }

  if (
    settings.llmMode !== "client" &&
    ["openai", "gemini"].includes(String(settings.provider || "").trim().toLowerCase()) &&
    !String(settings.apiKey || "").trim()
  ) {
    throw new Error(t("desktopShell.gameDetails.errors.missingApiKey", "API key is missing for the selected AI / LLM provider."));
  }

  return settings;
}

async function refreshTagCatalog() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    tagRows.value = [];
    return;
  }

  tagsLoading.value = true;
  try {
    const result = await bridge.invoke("tags:list");
    tagRows.value = dedupeTagRows(result?.tags);
    if (tagsStatusTone.value === "error") {
      setTagsFeedback("", "");
    }
  } catch (error) {
    tagRows.value = [];
    setTagsFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.loadTags", "Failed to load tags.")),
      "error"
    );
  } finally {
    tagsLoading.value = false;
  }
}

async function refreshLaunchPreferences() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    platformRows.value = [];
    emulatorRows.value = [];
    return;
  }

  preferencesLoading.value = true;
  try {
    const [platforms, emulators] = await Promise.all([bridge.invoke("get-platforms"), bridge.invoke("get-emulators")]);
    platformRows.value = (Array.isArray(platforms) ? platforms : [])
      .map((row, index) => normalizePlatformOption(row, index))
      .filter(Boolean);
    emulatorRows.value = (Array.isArray(emulators) ? emulators : [])
      .map((row, index) => normalizeEmulatorRow(row, index))
      .filter(Boolean);
    if (actionStatusTone.value === "error") {
      setActionFeedback("", "");
    }
  } catch (error) {
    platformRows.value = [];
    emulatorRows.value = [];
    setActionFeedback(
      error instanceof Error
        ? error.message
        : String(error || t("desktopShell.gameDetails.errors.loadLaunchOptions", "Failed to load launch preference options.")),
      "error"
    );
  } finally {
    preferencesLoading.value = false;
  }
}

async function downloadCover() {
  const bridge = getDesktopBridge();
  const gameId = Number(props.game?.id || 0);
  if (!bridge?.invoke) {
    setCoverFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }
  if (!gameId) {
    setCoverFeedback(t("desktopShell.gameDetails.errors.invalidGameId", "Invalid game id."), "error");
    return;
  }

  coverBusy.value = "download";
  setCoverFeedback(t("desktopShell.gameDetails.cover.downloading", "Downloading cover..."), "");
  try {
    const response = await bridge.invoke("covers:download-for-game", {
      gameId,
      overwrite: true
    });
    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.downloadCover", "Failed to download cover.")));
    }

    emit("refresh-game");
    if (response?.status === "reused_existing_file") {
      setCoverFeedback(t("desktopShell.gameDetails.cover.appliedFromCache", "Cover applied from local cache."), "success");
      return;
    }
    setCoverFeedback(t("desktopShell.gameDetails.cover.downloadSuccess", "Cover downloaded and applied."), "success");
  } catch (error) {
    setCoverFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.downloadCover", "Failed to download cover.")),
      "error"
    );
  } finally {
    coverBusy.value = "";
  }
}

async function searchCoverWeb() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setCoverFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const query = String(coverSearchQuery.value || buildCoverSearchQuery(props.game)).trim();
  if (!query) {
    setCoverFeedback(t("desktopShell.gameDetails.cover.missingQuery", "Enter a cover search query first."), "error");
    return;
  }

  coverBusy.value = "search";
  setCoverFeedback(t("desktopShell.gameDetails.cover.searching", "Searching web cover results..."), "");
  try {
    const response = await bridge.invoke("covers:search-web", { query, limit: 24 });
    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.searchCovers", "Cover web search failed.")));
    }

    coverSearchResults.value = Array.isArray(response?.results) ? response.results : [];
    coverSearchOpen.value = true;
    if (!coverSearchResults.value.length) {
      setCoverFeedback(t("desktopShell.gameDetails.cover.noResults", "No web cover results found for this query."), "error");
      return;
    }
    setCoverFeedback(
      tf("desktopShell.gameDetails.cover.resultCount", { count: coverSearchResults.value.length }, "Found {{count}} cover result(s)."),
      "success"
    );
  } catch (error) {
    coverSearchResults.value = [];
    setCoverFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.searchCovers", "Cover web search failed.")),
      "error"
    );
  } finally {
    coverBusy.value = "";
  }
}

async function applyCoverResult(resultRow) {
  const bridge = getDesktopBridge();
  const gameId = Number(props.game?.id || 0);
  const imageUrl = String(resultRow?.imageUrl || resultRow?.thumbnailUrl || "").trim();
  if (!bridge?.invoke) {
    setCoverFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }
  if (!gameId || !imageUrl) {
    setCoverFeedback(t("desktopShell.gameDetails.cover.invalidCoverResult", "This cover result cannot be applied."), "error");
    return;
  }

  coverBusy.value = "apply";
  setCoverFeedback(t("desktopShell.gameDetails.cover.applying", "Applying selected cover..."), "");
  try {
    const response = await bridge.invoke("update-game-metadata", {
      gameId,
      image: imageUrl
    });
    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.applyCover", "Failed to apply cover.")));
    }

    emit("refresh-game");
    setCoverFeedback(t("desktopShell.gameDetails.cover.applySuccess", "Cover applied from search result."), "success");
  } catch (error) {
    setCoverFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.applyCover", "Failed to apply cover.")),
      "error"
    );
  } finally {
    coverBusy.value = "";
  }
}

async function openCoverSearchInExternalBrowser() {
  const bridge = getDesktopBridge();
  const query = String(coverSearchQuery.value || buildCoverSearchQuery(props.game)).trim();
  if (!query) {
    setCoverFeedback(t("desktopShell.gameDetails.cover.missingQuery", "Enter a cover search query first."), "error");
    return;
  }

  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  if (!bridge?.invoke) {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const response = await bridge.invoke("open-external-url", url);
  setCoverFeedback(
    String(
      response?.message ||
        (response?.success
          ? t("desktopShell.gameDetails.cover.browserOpened", "Opened cover search in browser.")
          : t("desktopShell.gameDetails.cover.browserFailed", "Could not open cover search."))
    ),
    response?.success ? "success" : "error"
  );
}

function toggleTag(tagId) {
  const normalized = normalizeTagIds([tagId])[0] || "";
  if (!normalized) {
    return;
  }

  if (selectedTagIds.value.includes(normalized)) {
    selectedTagIds.value = selectedTagIds.value.filter((entry) => entry !== normalized);
    return;
  }

  selectedTagIds.value = [...selectedTagIds.value, normalized];
}

function clearSelectedTags() {
  selectedTagIds.value = [];
}

async function persistDescription(
  description,
  successMessage = t("desktopShell.gameDetails.description.saved", "Description saved.")
) {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    throw new Error(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."));
  }

  const gameId = Number(props.game?.id || 0);
  if (!gameId) {
    throw new Error(t("desktopShell.gameDetails.errors.invalidGameId", "Invalid game id."));
  }

  const result = await bridge.invoke("update-game-metadata", {
    gameId,
    description: String(description || "").trim()
  });

  if (!result?.success) {
    throw new Error(String(result?.message || t("desktopShell.gameDetails.errors.saveDescription", "Failed to save description.")));
  }

  descriptionDraft.value = String(description || "").trim();
  setDescriptionFeedback(successMessage, "success");
  emit("refresh-game");
}

async function saveDescription() {
  descriptionSaving.value = true;
  setDescriptionFeedback(t("desktopShell.gameDetails.description.saving", "Saving description..."), "");
  try {
    await persistDescription(descriptionDraft.value, t("desktopShell.gameDetails.description.saved", "Description saved."));
  } catch (error) {
    setDescriptionFeedback(
      error instanceof Error
        ? error.message
        : String(error || t("desktopShell.gameDetails.errors.saveDescription", "Failed to save description.")),
      "error"
    );
  } finally {
    descriptionSaving.value = false;
  }
}

async function generateDescription() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setDescriptionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  descriptionGenerating.value = true;
  setDescriptionFeedback(t("desktopShell.gameDetails.description.generating", "Generating description..."), "");
  try {
    const llm = getLlmSettingsOrThrow();
    const response = await bridge.invoke("suggestions:generate-description-for-game", {
      ...llm,
      maxChars: 420,
      game: buildEditableGamePayload()
    });

    if (!response?.success) {
      throw new Error(
        String(response?.message || t("desktopShell.gameDetails.errors.generateDescription", "Failed to generate description."))
      );
    }

    const generated = String(response?.description || "").trim();
    if (!generated) {
      throw new Error(t("desktopShell.gameDetails.errors.emptyGeneratedDescription", "The AI response returned no usable description."));
    }

    await persistDescription(generated, t("desktopShell.gameDetails.description.generatedSaved", "Description generated and saved."));
  } catch (error) {
    setDescriptionFeedback(
      error instanceof Error
        ? error.message
        : String(error || t("desktopShell.gameDetails.errors.generateDescription", "Failed to generate description.")),
      "error"
    );
  } finally {
    descriptionGenerating.value = false;
  }
}

async function persistTags(tagIds, successMessage = t("desktopShell.gameDetails.tags.saved", "Tags saved.")) {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    throw new Error(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."));
  }

  const gameId = Number(props.game?.id || 0);
  if (!gameId) {
    throw new Error(t("desktopShell.gameDetails.errors.invalidGameId", "Invalid game id."));
  }

  const normalized = normalizeTagIds(tagIds);
  const result = await bridge.invoke("update-game-metadata", {
    gameId,
    tags: normalized
  });

  if (!result?.success) {
    throw new Error(String(result?.message || t("desktopShell.gameDetails.errors.saveTags", "Failed to save tags.")));
  }

  selectedTagIds.value = normalized;
  setTagsFeedback(successMessage, "success");
  emit("refresh-game");
}

async function saveTags() {
  tagsSaving.value = true;
  setTagsFeedback(t("desktopShell.gameDetails.tags.saving", "Saving tags..."), "");
  try {
    await persistTags(selectedTagIds.value, t("desktopShell.gameDetails.tags.saved", "Tags saved."));
  } catch (error) {
    setTagsFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.saveTags", "Failed to save tags.")),
      "error"
    );
  } finally {
    tagsSaving.value = false;
  }
}

async function suggestTags() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setTagsFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  if (!tagRows.value.length) {
    setTagsFeedback(t("desktopShell.gameDetails.tags.noCatalog", "No tags are currently available in your tag catalog."), "error");
    return;
  }

  tagsSuggesting.value = true;
  setTagsFeedback(t("desktopShell.gameDetails.tags.generating", "Generating tags..."), "");
  try {
    const llm = getLlmSettingsOrThrow();
    const response = await bridge.invoke("suggestions:suggest-tags-for-game", {
      ...llm,
      maxTags: 6,
      allowUnknownTags: false,
      game: buildEditableGamePayload(),
      availableTags: tagRows.value
    });

    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.generateTags", "Failed to generate tags.")));
    }

    const knownIds = new Set(tagRows.value.map((row) => row.id));
    const suggestedTagIds = normalizeTagIds(response?.tags).filter((tagId) => knownIds.has(tagId));

    if (!suggestedTagIds.length) {
      throw new Error(t("desktopShell.gameDetails.errors.noSuggestedTags", "The AI response did not match any tags in your catalog."));
    }

    await persistTags(suggestedTagIds, t("desktopShell.gameDetails.tags.suggestedApplied", "Suggested tags applied."));
  } catch (error) {
    setTagsFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.generateTags", "Failed to generate tags.")),
      "error"
    );
  } finally {
    tagsSuggesting.value = false;
  }
}

async function renameSelectedTag() {
  if (!canRenameTag.value) {
    setTagsFeedback(t("desktopShell.gameDetails.tags.renameSingle", "Select exactly one tag to rename."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setTagsFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const currentTagId = selectedTagIds.value[0];
  const currentTagLabel = selectedTagRows.value[0]?.label || formatTagLabel(currentTagId);
  const nextLabel =
    typeof window !== "undefined"
      ? window.prompt(t("desktopShell.gameDetails.tags.renamePrompt", "Rename selected tag:"), currentTagLabel)
      : "";

  if (nextLabel == null) {
    return;
  }

  tagsMutating.value = true;
  setTagsFeedback(t("desktopShell.gameDetails.tags.renaming", "Renaming tag..."), "");
  try {
    const response = await bridge.invoke("tags:rename", {
      oldTagId: currentTagId,
      newTagName: nextLabel
    });

    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.renameTag", "Failed to rename tag.")));
    }

    await refreshTagCatalog();
    selectedTagIds.value = normalizeTagIds([response?.newTagId || nextLabel]);
    setTagsFeedback(
      tf(
        "desktopShell.gameDetails.tags.renamedTo",
        { label: String(response?.newLabel || nextLabel).trim() || formatTagLabel(response?.newTagId) },
        "Renamed tag to {{label}}."
      ),
      "success"
    );
    emit("refresh-game");
  } catch (error) {
    setTagsFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.renameTag", "Failed to rename tag.")),
      "error"
    );
  } finally {
    tagsMutating.value = false;
  }
}

async function deleteSelectedTags() {
  if (!hasSelectedTags.value) {
    setTagsFeedback(t("desktopShell.gameDetails.tags.deleteAtLeastOne", "Select at least one tag to delete."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setTagsFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const tagLabels = selectedTagRows.value.map((row) => row.label);
  const confirmed =
    typeof window === "undefined"
      ? false
      : window.confirm(
          tf(
            "desktopShell.gameDetails.tags.deleteConfirm",
            { suffix: tagLabels.length > 1 ? "s" : "", labels: tagLabels.join("\n") },
            "Delete the selected tag{{suffix}}?\n\n{{labels}}"
          )
        );
  if (!confirmed) {
    return;
  }

  tagsMutating.value = true;
  setTagsFeedback(t("desktopShell.gameDetails.tags.deleting", "Deleting selected tags..."), "");
  try {
    for (const tagId of selectedTagIds.value) {
      const response = await bridge.invoke("tags:delete", { tagId });
      if (!response?.success) {
        throw new Error(
          String(response?.message || tf("desktopShell.gameDetails.errors.deleteTagSpecific", { tagId }, "Failed to delete tag {{tagId}}."))
        );
      }
    }

    selectedTagIds.value = [];
    await refreshTagCatalog();
    setTagsFeedback(t("desktopShell.gameDetails.tags.deleted", "Selected tags deleted."), "success");
    emit("refresh-game");
  } catch (error) {
    setTagsFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.deleteTags", "Failed to delete tags.")),
      "error"
    );
  } finally {
    tagsMutating.value = false;
  }
}

async function saveLaunchPreferences() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const gameId = Number(props.game?.id || 0);
  if (!gameId) {
    setActionFeedback(t("desktopShell.gameDetails.errors.invalidGameId", "Invalid game id."), "error");
    return;
  }

  const nextMode = normalizeRunAsMode(runAsModeDraft.value);
  const nextUser = String(runAsUserDraft.value || "").trim();
  if (nextMode === "user" && !nextUser) {
    setActionFeedback(t("desktopShell.gameDetails.launch.missingRunAsUser", "Specify the Windows user to use for the run-as override."), "error");
    return;
  }

  preferencesSaving.value = true;
  setActionFeedback(t("desktopShell.gameDetails.launch.saving", "Saving launch preferences..."), "");
  try {
    const payload = {
      gameId,
      emulatorOverridePath: String(emulatorOverrideDraft.value || "").trim() || null,
      runAsMode: nextMode,
      runAsUser: nextMode === "user" ? nextUser : null
    };

    const nextPlatform = String(platformShortNameDraft.value || "").trim().toLowerCase();
    const matchedPlatform = platformOptions.value.find((row) => row.id === nextPlatform);
    if (nextPlatform) {
      payload.platformShortName = nextPlatform;
      payload.platform = String(matchedPlatform?.label || props.game?.platform || nextPlatform).trim();
    }

    const response = await bridge.invoke("update-game-metadata", payload);
    if (!response?.success) {
      throw new Error(
        String(response?.message || t("desktopShell.gameDetails.errors.saveLaunchPreferences", "Failed to save launch preferences."))
      );
    }

    setActionFeedback(t("desktopShell.gameDetails.launch.saved", "Launch preferences saved."), "success");
    emit("refresh-game");
  } catch (error) {
    setActionFeedback(
      error instanceof Error
        ? error.message
        : String(error || t("desktopShell.gameDetails.errors.saveLaunchPreferences", "Failed to save launch preferences.")),
      "error"
    );
  } finally {
    preferencesSaving.value = false;
  }
}

async function removeGame() {
  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const gameId = Number(props.game?.id || 0);
  if (!gameId) {
    setActionFeedback(t("desktopShell.gameDetails.errors.invalidGameId", "Invalid game id."), "error");
    return;
  }

  const confirmed =
    typeof window === "undefined"
      ? false
      : window.confirm(
          tf(
            "desktopShell.gameDetails.remove.confirm",
            { name: String(props.game?.name || t("desktopShell.gameDetails.remove.thisGame", "this game")) },
            'Remove "{{name}}" from your library?'
          )
        );
  if (!confirmed) {
    return;
  }

  removeBusy.value = true;
  setActionFeedback(t("desktopShell.gameDetails.remove.removing", "Removing game from library..."), "");
  try {
    const response = await bridge.invoke("remove-game", gameId);
    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.gameDetails.errors.removeGame", "Failed to remove game.")));
    }

    emit("refresh-game");
    emit("close");
  } catch (error) {
    setActionFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.gameDetails.errors.removeGame", "Failed to remove game.")),
      "error"
    );
  } finally {
    removeBusy.value = false;
  }
}

watch(
  () => props.game,
  () => {
    syncFromGame();
    void Promise.all([refreshTagCatalog(), refreshLaunchPreferences()]);
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="game" class="desktop-modal-backdrop" @mousedown.self="$emit('close')">
    <section class="desktop-modal-card desktop-game-details-modal">
      <div class="card-header-row">
        <div>
          <h3>{{ game.name }}</h3>
          <p class="meta-line">{{ game.platform }} | {{ game.company }}</p>
        </div>
        <button type="button" class="action-button" @click="$emit('close')">
          {{ shellI18nStore.t("buttons.close", "Close") }}
        </button>
      </div>

      <div class="desktop-modal-layout">
        <div class="desktop-modal-cover">
          <img :src="game.image" :alt="game.name" loading="lazy" />
        </div>
        <div class="desktop-modal-content">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.gameDetails.metrics.genre", "Genre") }}</span>
              <strong>{{ game.genre }}</strong>
              <small>{{ shellI18nStore.tf("desktopShell.gameDetails.metrics.series", { value: game.series }, `Series: ${game.series || ""}`) }}</small>
            </div>
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.gameDetails.metrics.rating", "Rating") }}</span>
              <strong>{{ game.rating }}</strong>
              <small>
                {{
                  shellI18nStore.tf(
                    "desktopShell.gameDetails.metrics.installed",
                    {
                      value: game.isInstalled
                        ? shellI18nStore.t("common.yes", "Yes")
                        : shellI18nStore.t("common.no", "No")
                    },
                    `Installed: ${game.isInstalled ? shellI18nStore.t("common.yes", "Yes") : shellI18nStore.t("common.no", "No")}`
                  )
                }}
              </small>
            </div>
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.gameDetails.metrics.libraryMetadata", "Library Metadata") }}</span>
              <strong>{{ shellI18nStore.tf("desktopShell.gameDetails.metrics.tagCount", { count: selectedTagIds.length }, `${selectedTagIds.length} tags`) }}</strong>
              <small>{{ shellI18nStore.tf("desktopShell.gameDetails.metrics.descriptionLength", { count: descriptionLength }, `${descriptionLength} description chars`) }}</small>
            </div>
          </div>

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.gameDetails.cover.title", "Cover") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.gameDetails.cover.description", "Shell-native cover download and web search, without falling back to the old popup.") }}
                </p>
              </div>
            </div>
            <label class="field">
              <span>{{ shellI18nStore.t("desktopShell.gameDetails.cover.searchQuery", "Cover Search Query") }}</span>
              <input
                v-model="coverSearchQuery"
                :placeholder="shellI18nStore.t('desktopShell.gameDetails.cover.searchQueryPlaceholder', 'Game name + platform + cover')"
              />
            </label>
            <div class="button-row">
              <button type="button" class="action-button" :disabled="!!coverBusy" @click="downloadCover">
                {{
                  coverBusy === "download"
                    ? shellI18nStore.t("desktopShell.gameDetails.cover.downloadingShort", "Downloading...")
                    : shellI18nStore.t("desktopShell.gameDetails.cover.downloadButton", "Download Cover")
                }}
              </button>
              <button type="button" class="action-button" :disabled="!!coverBusy" @click="searchCoverWeb">
                {{
                  coverBusy === "search"
                    ? shellI18nStore.t("desktopShell.gameDetails.cover.searchingShort", "Searching...")
                    : shellI18nStore.t("desktopShell.gameDetails.cover.searchButton", "Search Web Covers")
                }}
              </button>
              <button type="button" class="action-button" :disabled="!!coverBusy" @click="openCoverSearchInExternalBrowser">
                {{ shellI18nStore.t("desktopShell.gameDetails.cover.openInBrowser", "Open In Browser") }}
              </button>
            </div>

            <div v-if="coverSearchOpen" class="desktop-cover-search-grid">
              <button
                v-for="(row, index) in coverSearchResults"
                :key="`${row.imageUrl || row.thumbnailUrl || index}`"
                type="button"
                class="desktop-cover-search-card"
                :disabled="coverBusy === 'apply'"
                @click="applyCoverResult(row)"
              >
                <span class="desktop-cover-search-thumb-wrap">
                  <img
                    class="desktop-cover-search-thumb"
                    :src="row.thumbnailUrl || row.imageUrl"
                    :alt="row.title || shellI18nStore.tf('desktopShell.gameDetails.cover.resultAlt', { index: index + 1 }, `Cover result ${index + 1}`)"
                    loading="lazy"
                  />
                </span>
                <strong>{{ row.title || shellI18nStore.tf("desktopShell.gameDetails.cover.resultLabel", { index: index + 1 }, `Result ${index + 1}`) }}</strong>
                <small>{{ row.source || shellI18nStore.t("desktopShell.gameDetails.cover.webSource", "web") }}</small>
              </button>
            </div>

            <p
              v-if="coverStatus"
              class="meta-line"
              :class="{
                'meta-line-error': coverStatusTone === 'error',
                'meta-line-success': coverStatusTone === 'success'
              }"
            >
              {{ coverStatus }}
            </p>
          </article>

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.gameDetails.description.title", "Description") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.gameDetails.description.description", "Edit the library description stored for this game or let AI generate one.") }}
                </p>
              </div>
              <button type="button" class="action-button" @click="$emit('open-ai-settings')">
                {{ shellI18nStore.t("desktopShell.settingsTools.ai", "AI / LLM Settings") }}
              </button>
            </div>
            <textarea
              v-model="descriptionDraft"
              class="desktop-modal-textarea"
              rows="6"
              :placeholder="shellI18nStore.t('desktopShell.gameDetails.description.placeholder', 'Add a concise description for this game...')"
            />
            <div class="button-row">
              <button type="button" class="action-button" :disabled="descriptionSaving || descriptionGenerating" @click="saveDescription">
                {{
                  descriptionSaving
                    ? shellI18nStore.t("desktopShell.gameDetails.description.savingShort", "Saving...")
                    : shellI18nStore.t("desktopShell.gameDetails.description.saveButton", "Save Description")
                }}
              </button>
              <button type="button" class="action-button" :disabled="descriptionSaving || descriptionGenerating" @click="generateDescription">
                {{
                  descriptionGenerating
                    ? shellI18nStore.t("desktopShell.gameDetails.description.generatingShort", "Generating...")
                    : shellI18nStore.t("desktopShell.gameDetails.description.generateButton", "Generate With AI")
                }}
              </button>
            </div>
            <p
              v-if="descriptionStatus"
              class="meta-line"
              :class="{
                'meta-line-error': descriptionStatusTone === 'error',
                'meta-line-success': descriptionStatusTone === 'success'
              }"
            >
              {{ descriptionStatus }}
            </p>
          </article>

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.gameDetails.tags.title", "Tags") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.gameDetails.tags.description", "Assign library categories directly from the migrated shell workspace.") }}
                </p>
              </div>
              <button type="button" class="action-button" :disabled="tagActionBusy" @click="refreshTagCatalog">
                {{
                  tagsLoading
                    ? shellI18nStore.t("desktopShell.gameDetails.tags.refreshing", "Refreshing...")
                    : shellI18nStore.t("desktopShell.gameDetails.tags.refreshButton", "Refresh Tags")
                }}
              </button>
            </div>

            <div class="desktop-tag-pill-row">
              <span v-for="row in selectedTagRows" :key="row.id" class="pill">{{ row.label }}</span>
              <span v-if="!selectedTagRows.length" class="pill">
                {{ shellI18nStore.t("desktopShell.gameDetails.tags.noneAssigned", "No tags assigned") }}
              </span>
            </div>

            <div v-if="tagRows.length" class="desktop-tag-toggle-grid">
              <button
                v-for="row in tagRows"
                :key="row.id"
                type="button"
                class="desktop-tag-toggle"
                :class="{ 'is-active': selectedTagIds.includes(row.id) }"
                :disabled="tagActionBusy"
                @click="toggleTag(row.id)"
              >
                <strong>{{ row.label }}</strong>
                <small>{{ row.id }}</small>
              </button>
            </div>
            <p v-else-if="tagsLoading" class="meta-line">
              {{ shellI18nStore.t("desktopShell.gameDetails.tags.loading", "Loading tag catalog...") }}
            </p>
            <p v-else class="meta-line">
              {{ shellI18nStore.t("desktopShell.gameDetails.tags.noCatalog", "No tags are currently available in your tag catalog.") }}
            </p>

            <div class="button-row">
              <button type="button" class="action-button" :disabled="tagActionBusy" @click="saveTags">
                {{
                  tagsSaving
                    ? shellI18nStore.t("desktopShell.gameDetails.tags.savingShort", "Saving...")
                    : shellI18nStore.t("desktopShell.gameDetails.tags.saveButton", "Save Tags")
                }}
              </button>
              <button type="button" class="action-button" :disabled="tagActionBusy || !tagRows.length" @click="suggestTags">
                {{
                  tagsSuggesting
                    ? shellI18nStore.t("desktopShell.gameDetails.tags.generatingShort", "Generating...")
                    : shellI18nStore.t("desktopShell.gameDetails.tags.suggestButton", "Suggest Tags")
                }}
              </button>
              <button type="button" class="action-button" :disabled="tagActionBusy || !hasSelectedTags" @click="clearSelectedTags">
                {{ shellI18nStore.t("desktopShell.gameDetails.tags.clearSelection", "Clear Selection") }}
              </button>
              <button type="button" class="action-button" :disabled="tagActionBusy || !canRenameTag" @click="renameSelectedTag">
                {{ shellI18nStore.t("desktopShell.gameDetails.tags.renameButton", "Rename Selected") }}
              </button>
              <button type="button" class="action-button danger" :disabled="tagActionBusy || !hasSelectedTags" @click="deleteSelectedTags">
                {{ shellI18nStore.t("desktopShell.gameDetails.tags.deleteButton", "Delete Selected") }}
              </button>
            </div>
            <p
              v-if="tagsStatus"
              class="meta-line"
              :class="{
                'meta-line-error': tagsStatusTone === 'error',
                'meta-line-success': tagsStatusTone === 'success'
              }"
            >
              {{ tagsStatus }}
            </p>
          </article>

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.gameDetails.launch.title", "Launch Preferences") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.gameDetails.launch.description", "Shell-native overrides for platform, emulator, and Windows run-as settings.") }}
                </p>
              </div>
              <button type="button" class="action-button" :disabled="preferencesLoading || preferencesSaving" @click="refreshLaunchPreferences">
                {{
                  preferencesLoading
                    ? shellI18nStore.t("desktopShell.gameDetails.launch.refreshing", "Refreshing...")
                    : shellI18nStore.t("desktopShell.gameDetails.launch.refreshButton", "Refresh Options")
                }}
              </button>
            </div>
            <div class="form-grid">
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.gameDetails.launch.platform", "Platform") }}</span>
                <select v-model="platformShortNameDraft">
                  <option v-for="row in platformOptions" :key="row.id" :value="row.id">{{ row.label }} ({{ row.id }})</option>
                </select>
              </label>
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.gameDetails.launch.emulatorOverride", "Emulator Override") }}</span>
                <select v-model="emulatorOverrideDraft">
                  <option value="">
                    {{
                      shellI18nStore.tf(
                        "desktopShell.gameDetails.launch.defaultEmulator",
                        {
                          platform: game.platform || shellI18nStore.t("desktopShell.gameDetails.launch.platformEmulator", "platform emulator")
                        },
                        `Default (${game.platform || shellI18nStore.t("desktopShell.gameDetails.launch.platformEmulator", "platform emulator")})`
                      )
                    }}
                  </option>
                  <option v-for="row in emulatorOverrideOptions" :key="row.key || row.filePath" :value="row.filePath">
                    {{
                      row.name
                    }}
                    ({{ row.platform }}){{ isWebEmulatorPath(row.filePath) || row.type === "web" ? ` [${shellI18nStore.t("desktopShell.gameDetails.launch.web", "Web")}]` : "" }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.gameDetails.launch.runAs", "Run As") }}</span>
                <select v-model="runAsModeDraft">
                  <option value="default">{{ shellI18nStore.t("desktopShell.gameDetails.launch.default", "Default") }}</option>
                  <option value="admin">{{ shellI18nStore.t("desktopShell.gameDetails.launch.administrator", "Administrator") }}</option>
                  <option value="user">{{ shellI18nStore.t("desktopShell.gameDetails.launch.anotherUser", "Another user") }}</option>
                </select>
              </label>
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.gameDetails.launch.runAsUser", "Run As User") }}</span>
                <input
                  v-model="runAsUserDraft"
                  :disabled="runAsModeDraft !== 'user'"
                  :placeholder="shellI18nStore.t('desktopShell.gameDetails.launch.runAsUserPlaceholder', 'DOMAIN\\\\User')"
                />
              </label>
            </div>
            <div class="button-row">
              <button type="button" class="action-button" :disabled="preferencesLoading || preferencesSaving" @click="saveLaunchPreferences">
                {{
                  preferencesSaving
                    ? shellI18nStore.t("desktopShell.gameDetails.launch.savingShort", "Saving...")
                    : shellI18nStore.t("desktopShell.gameDetails.launch.saveButton", "Save Launch Preferences")
                }}
              </button>
            </div>
            <p v-if="preferencesLoading" class="meta-line">
              {{ shellI18nStore.t("desktopShell.gameDetails.launch.loadingOptions", "Refreshing platform and emulator options...") }}
            </p>
          </article>

          <article class="subcard">
            <h4>{{ shellI18nStore.t("desktopShell.gameDetails.filePath.title", "File path") }}</h4>
            <p class="meta-line">{{ game.filePath || shellI18nStore.t("desktopShell.gameDetails.filePath.none", "No file path recorded.") }}</p>
          </article>

          <div class="button-row">
            <button type="button" class="action-button" @click="$emit('launch')">
              {{ shellI18nStore.t("desktopShell.gameDetails.actions.launchGame", "Launch Game") }}
            </button>
            <button type="button" class="action-button" @click="$emit('show-folder')">
              {{ shellI18nStore.t("desktopShell.gameDetails.actions.showInFolder", "Show In Folder") }}
            </button>
            <button type="button" class="action-button" @click="$emit('create-shortcut')">
              {{ shellI18nStore.t("desktopShell.gameDetails.actions.createShortcut", "Create Shortcut") }}
            </button>
          </div>

          <div class="button-row desktop-modal-danger-row">
            <button type="button" class="action-button danger" :disabled="removeBusy" @click="removeGame">
              {{
                removeBusy
                  ? shellI18nStore.t("desktopShell.gameDetails.remove.removingShort", "Removing...")
                  : shellI18nStore.t("desktopShell.gameDetails.remove.button", "Remove From Library")
              }}
            </button>
          </div>

          <p
            v-if="actionStatus"
            class="meta-line"
            :class="{
              'meta-line-error': actionStatusTone === 'error',
              'meta-line-success': actionStatusTone === 'success'
            }"
          >
            {{ actionStatus }}
          </p>

          <p v-if="status" class="meta-line" :class="{ 'meta-line-error': statusTone === 'error' }">
            {{ status }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
