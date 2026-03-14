"use strict";

(function initGameSessionOverlayWindow() {
  const emubro = window.emubro;
  if (!emubro || typeof emubro.invoke !== "function") {
    return;
  }

  const button = document.querySelector("[data-role='overlay-logo-btn']");
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const result = await emubro.invoke("game-session:show-overlay-menu");
      if (!result?.success) {
        await emubro.invoke("game-session:show-launcher");
      }
    } catch (_error) {
      try {
        await emubro.invoke("game-session:show-launcher");
      } catch (_e) {}
    } finally {
      button.disabled = false;
    }
  });

  button.addEventListener("dblclick", async () => {
    try {
      await emubro.invoke("game-session:show-launcher");
    } catch (_e) {}
  });
})();
