function registerThemeUploadIpc(deps = {}) {
  const {
    ipcMain,
    log,
    fetchImpl
  } = deps;

  if (!ipcMain) throw new Error("registerThemeUploadIpc requires ipcMain");
  if (!log) throw new Error("registerThemeUploadIpc requires log");

  const fetchFn = typeof fetchImpl === "function" ? fetchImpl : (typeof fetch === "function" ? fetch : null);
  if (!fetchFn) throw new Error("registerThemeUploadIpc requires fetch implementation");

  ipcMain.handle("upload-theme", async (_event, payload = {}) => {
    try {
      const author = String(payload?.author || "").trim();
      const name = String(payload?.name || "").trim();
      const themeObject = (payload?.themeObject && typeof payload.themeObject === "object")
        ? payload.themeObject
        : {};
      const base64Image = String(payload?.base64Image || "");
      const webhookUrl = String(payload?.webhookUrl || "").trim();

      if (!webhookUrl) {
        log.error("Upload failed: No webhook URL provided.");
        return false;
      }

      if (typeof FormData !== "function" || typeof Blob !== "function") {
        log.error("Upload failed: FormData/Blob API unavailable in this runtime.");
        return false;
      }

      const formData = new FormData();
      themeObject.author = author;

      formData.append("payload_json", JSON.stringify({
        content: `New theme submission: **${name}** by user **${author}**`,
        thread_name: name
      }));

      const jsonBlob = new Blob([JSON.stringify(themeObject, null, 2)], { type: "application/json" });
      formData.append("files[0]", jsonBlob, "theme.json");

      try {
        let imageData = "";
        let mimeType = "image/png";
        let extension = "png";

        if (base64Image.includes(";base64,")) {
          const parts = base64Image.split(";base64,");
          mimeType = String(parts?.[0] || "").split(":")[1] || mimeType;
          imageData = String(parts?.[1] || "");
          extension = String(mimeType).split("/")[1] || extension;
        } else {
          imageData = base64Image;
          extension = "gif";
          mimeType = "image/gif";
        }

        if (!imageData) {
          throw new Error("Base64 data is empty or invalid.");
        }

        const imageFileName = (themeObject.background && themeObject.background.image)
          ? String(themeObject.background.image)
          : `preview.${extension}`;

        const imageBuffer = Buffer.from(imageData, "base64");
        const imageBlob = new Blob([imageBuffer], { type: mimeType });
        formData.append("files[1]", imageBlob, imageFileName);
      } catch (error) {
        log.warn("Image conversion failed:", error.message);
      }

      const response = await fetchFn(webhookUrl, { method: "POST", body: formData });
      return !!response?.ok;
    } catch (error) {
      log.error("upload-theme failed:", error);
      return false;
    }
  });
}

module.exports = {
  registerThemeUploadIpc
};
