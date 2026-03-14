import { defineStore } from "pinia";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeArray(rows) {
  return Array.isArray(rows) ? rows : [];
}

function extractDocContent(doc) {
  return String(
    doc?.body ||
      doc?.content ||
      doc?.markdown ||
      doc?.text ||
      doc?.html ||
      doc?.preview ||
      ""
  ).trim();
}

export const useHomeHubStore = defineStore("homeHub", {
  state: () => ({
    initialized: false,
    loading: false,
    docsLoading: false,
    error: "",
    actionStatus: "",
    docsQuery: "",
    libraryStats: {
      totalGames: 0,
      totalPlayTime: "0h"
    },
    userInfo: {
      username: "Guest",
      displayName: "Guest",
      id: "local",
      avatarUrl: ""
    },
    docs: [],
    selectedDocId: "",
    selectedDoc: null
  }),
  getters: {
    selectedDocContent(state) {
      return extractDocContent(state.selectedDoc);
    }
  },
  actions: {
    async refreshOverview() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = "Desktop bridge unavailable.";
        return;
      }

      this.loading = true;
      this.error = "";

      try {
        const [libraryStats, userInfo] = await Promise.all([
          bridge.invoke("get-library-stats"),
          bridge.invoke("get-user-info")
        ]);
        this.libraryStats = {
          totalGames: Number(libraryStats?.totalGames || 0),
          totalPlayTime: String(libraryStats?.totalPlayTime || "0h")
        };
        this.userInfo = {
          username: String(userInfo?.username || "Guest"),
          displayName: String(userInfo?.displayName || userInfo?.username || "Guest"),
          id: String(userInfo?.id || "local"),
          avatarUrl: String(userInfo?.avatarUrl || "")
        };
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.loading = false;
      }
    },
    async refreshDocs(query = this.docsQuery) {
      const bridge = getDesktopBridge();
      if (!bridge?.helpDocs) {
        this.error = "Desktop help-docs bridge unavailable.";
        return;
      }

      this.docsLoading = true;
      this.error = "";
      this.docsQuery = String(query || "");

      try {
        const result = await bridge.helpDocs.list({
          query: this.docsQuery,
          limit: 24
        });
        this.docs = normalizeArray(result?.docs);
        if (!this.selectedDocId || !this.docs.some((row) => row?.id === this.selectedDocId)) {
          this.selectedDocId = String(this.docs[0]?.id || "");
        }
        if (this.selectedDocId) {
          await this.selectDoc(this.selectedDocId);
        } else {
          this.selectedDoc = null;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.docsLoading = false;
      }
    },
    async selectDoc(docId) {
      const bridge = getDesktopBridge();
      const id = String(docId || "").trim();
      if (!bridge?.helpDocs || !id) {
        this.selectedDoc = null;
        this.selectedDocId = "";
        return;
      }

      this.docsLoading = true;
      try {
        const result = await bridge.helpDocs.get({ id });
        if (result?.success && result.doc) {
          this.selectedDoc = result.doc;
          this.selectedDocId = id;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.docsLoading = false;
      }
    },
    async openCommunityWindow(url, title) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = "Desktop bridge unavailable.";
        return null;
      }

      try {
        const result = await bridge.invoke("community:open-in-app-window", { url, title });
        this.actionStatus = String(
          result?.success || result?.fallback ? "Opened community window." : result?.message || ""
        );
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      }
    },
    async openExternal(url) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = "Desktop bridge unavailable.";
        return null;
      }

      try {
        const result = await bridge.invoke("open-external-url", url);
        this.actionStatus = String(result?.success ? "Opened external link." : result?.message || "");
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await Promise.all([this.refreshOverview(), this.refreshDocs("")]);
      this.initialized = true;
    }
  }
});
