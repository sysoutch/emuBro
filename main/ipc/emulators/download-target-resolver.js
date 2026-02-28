function createDownloadTargetResolver(deps = {}) {
  const {
    fetchFn,
    primitives
  } = deps;

  if (typeof fetchFn !== "function") throw new Error("createDownloadTargetResolver requires fetchFn");
  if (!primitives || typeof primitives !== "object") throw new Error("createDownloadTargetResolver requires primitives");

  const {
    ensureHttpUrl,
    parseGitHubRepoFromUrl,
    getFilenameFromUrl,
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    getDownloadRegexBundleForOs,
    classifyDownloadPackageType,
    scoreAssetForOs,
    selectDownloadOptionsByType,
    selectPreferredDownloadOption,
    selectBestGitHubAsset,
    getEmulatorDownloadUrlCandidates,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl
  } = primitives;

  function isLikelyDirectDownloadUrl(rawUrl) {
    const input = ensureHttpUrl(rawUrl);
    if (!input) return false;
    try {
      const parsed = new URL(input);
      const pathname = String(parsed.pathname || "").toLowerCase();
      return /\.(zip|7z|rar|exe|msi|msix|appx|dmg|pkg|appimage|deb|rpm|tar|tar\.gz|tar\.xz|tgz)$/i.test(pathname);
    } catch (_e) {
      return false;
    }
  }

  async function fetchGitHubLatestRelease(repoInfo) {
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases/latest`;
    const res = await fetchFn(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "emuBro"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub release lookup failed (${res.status})`);
    }
    return await res.json();
  }

  async function scrapePageForDownloadLinks(pageUrl, osKey, regexBundle) {
    const candidates = [];
    const sourceUrl = ensureHttpUrl(pageUrl);
    if (!sourceUrl) return candidates;

    try {
      const res = await fetchFn(sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!res.ok) return candidates;

      const html = await res.text();
      const baseUrl = new URL(sourceUrl);

      // Simple regex-based anchor extraction
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*?>(.*?)<\/a>/gis;
      let match;

      while ((match = anchorRegex.exec(html)) !== null) {
        let href = String(match[2] || "").trim();
        const text = String(match[3] || "").replace(/<[^>]*>?/gm, "").trim();

        if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;

        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          const fileName = getFilenameFromUrl(absoluteUrl) || text;

          const packageType = classifyDownloadPackageType(fileName, osKey, regexBundle);
          if (!packageType) continue;

          const score = scoreAssetForOs(fileName, osKey);
          // Only include if it has some relevance to the OS or matches a specific pattern
          if (score <= 0 && !(regexBundle.archive?.test(fileName) || regexBundle.installer?.test(fileName) || regexBundle.executable?.test(fileName))) {
            continue;
          }

          candidates.push({
            packageType,
            url: absoluteUrl,
            fileName,
            score,
            source: "scraped-page",
            releaseUrl: sourceUrl
          });
        } catch (_urlError) {
          // Skip invalid URLs
        }
      }
    } catch (_error) {
      // Ignore fetch/scraping errors
    }

    return candidates;
  }

  async function listEmulatorDownloadTargets(emulator, osKey) {
    const normalizedOs = normalizeDownloadOsKey(osKey);
    const sourceUrls = getEmulatorDownloadUrlCandidates(emulator, normalizedOs);
    const preferredUrl = sourceUrls[0] || getPreferredEmulatorDownloadUrl(emulator, normalizedOs);
    if (!preferredUrl) {
      throw new Error("No download URL available for this emulator");
    }

    const regexBundle = getDownloadRegexBundleForOs(emulator, normalizedOs);
    const candidates = [];
    let manualUrl = preferredUrl;

    for (const sourceUrl of sourceUrls) {
      const candidateSource = ensureHttpUrl(sourceUrl);
      if (!candidateSource) continue;
      if (!manualUrl) manualUrl = candidateSource;

      const repo = parseGitHubRepoFromUrl(candidateSource);
      if (repo) {
        try {
          const release = await fetchGitHubLatestRelease(repo);
          const releaseUrl = ensureHttpUrl(release?.html_url || candidateSource);
          manualUrl = releaseUrl || candidateSource;
          const assets = Array.isArray(release?.assets) ? release.assets : [];

          for (const asset of assets) {
            const assetUrl = ensureHttpUrl(asset?.browser_download_url || "");
            if (!assetUrl) continue;

            const fileName = String(asset?.name || getFilenameFromUrl(assetUrl)).trim();
            if (!fileName) continue;

            const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
            if (!packageType) continue;

            const score = scoreAssetForOs(fileName, normalizedOs);
            if (score <= 0 && !(regexBundle.archive?.test(fileName) || regexBundle.installer?.test(fileName) || regexBundle.executable?.test(fileName))) {
              continue;
            }

            candidates.push({
              packageType,
              url: assetUrl,
              fileName,
              score,
              source: "github-release",
              releaseUrl
            });
          }

          if (candidates.length === 0) {
            const bestAsset = selectBestGitHubAsset(release, emulator, normalizedOs);
            if (bestAsset?.browser_download_url) {
              const fallbackName = String(bestAsset?.name || getFilenameFromUrl(bestAsset.browser_download_url)).trim();
              const fallbackType = classifyDownloadPackageType(fallbackName, normalizedOs, regexBundle);
              if (fallbackType) {
                candidates.push({
                  packageType: fallbackType,
                  url: ensureHttpUrl(bestAsset.browser_download_url),
                  fileName: fallbackName,
                  score: scoreAssetForOs(fallbackName, normalizedOs),
                  source: "github-release",
                  releaseUrl
                });
              }
            }
          }
        } catch (_e) {
          // Fall through to direct URL handling.
        }
      }

      if (candidates.length === 0 && isLikelyDirectDownloadUrl(candidateSource)) {
        const fileName = getFilenameFromUrl(candidateSource);
        const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
        if (packageType) {
          candidates.push({
            packageType,
            url: candidateSource,
            fileName,
            score: scoreAssetForOs(fileName, normalizedOs),
            source: "direct-link",
            releaseUrl: ensureHttpUrl(candidateSource)
          });
        }
      }

      if (candidates.length === 0 && !repo && !isLikelyDirectDownloadUrl(candidateSource)) {
        const scraped = await scrapePageForDownloadLinks(candidateSource, normalizedOs, regexBundle);
        if (scraped.length > 0) {
          candidates.push(...scraped);
        }
      }

      if (candidates.length > 0) break;
    }

    return {
      osKey: normalizedOs,
      options: selectDownloadOptionsByType(candidates, emulator, normalizedOs),
      manualUrl,
      waybackUrl: buildWaybackMachineUrl(manualUrl || preferredUrl)
    };
  }

  async function resolveEmulatorDownloadTarget(emulator, osKey, preferredType, preferredUrl) {
    const normalizedOs = normalizeDownloadOsKey(osKey);
    const requestedType = normalizeDownloadPackageType(preferredType);
    const requestedUrl = ensureHttpUrl(preferredUrl);
    const discovered = await listEmulatorDownloadTargets(emulator, normalizedOs);
    const options = Array.isArray(discovered?.options) ? discovered.options : [];
    const manualUrl = ensureHttpUrl(discovered?.manualUrl || "");

    if (!options.length) {
      return {
        directDownload: false,
        url: manualUrl,
        releaseUrl: manualUrl,
        osKey: normalizedOs,
        options: [],
        waybackUrl: buildWaybackMachineUrl(manualUrl)
      };
    }

    const selected = (() => {
      if (requestedUrl) {
        return options.find((item) => item.url === requestedUrl);
      }
      if (requestedType) {
        return options.find((item) => normalizeDownloadPackageType(item?.packageType) === requestedType);
      }
      return null;
    })();
    const preferred = selected || selectPreferredDownloadOption(options, emulator, normalizedOs);
    if (!preferred?.url) {
      return {
        directDownload: false,
        url: manualUrl,
        releaseUrl: manualUrl,
        osKey: normalizedOs,
        options,
        waybackUrl: buildWaybackMachineUrl(manualUrl)
      };
    }

    return {
      directDownload: true,
      osKey: normalizedOs,
      url: preferred.url,
      fileName: preferred.fileName || "",
      packageType: normalizeDownloadPackageType(preferred.packageType),
      source: preferred.source || "unknown",
      releaseUrl: ensureHttpUrl(preferred.releaseUrl || manualUrl || preferred.url),
      options,
      waybackUrl: buildWaybackMachineUrl(manualUrl || preferred.url)
    };
  }

  return {
    resolveEmulatorDownloadTarget
  };
}

module.exports = {
  createDownloadTargetResolver
};
