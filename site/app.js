const releasePage = "https://github.com/babu-studios/babu-uninstaller/releases/latest";

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

async function loadLatestRelease() {
  const status = document.querySelector("#release-status");
  try {
    const response = await fetch("https://api.github.com/repos/babu-studios/babu-uninstaller/releases/latest", {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const release = await response.json();
    const version = release.tag_name || release.name || "Latest";
    status.textContent = `Latest release: ${version}`;
    for (const architecture of ["arm64", "x64"]) {
      const button = document.querySelector(`[data-arch="${architecture}"]`);
      const detail = document.querySelector(`[data-size="${architecture}"]`);
      const asset = release.assets.find((item) => item.name.endsWith(`-${architecture}.dmg`));
      if (asset) {
        button.href = asset.browser_download_url;
        detail.textContent = `${version} · ${formatSize(asset.size)}`;
      } else {
        button.href = releasePage;
        detail.textContent = `${version} · DMG not published`;
      }
    }
  } catch (error) {
    status.textContent = "Could not load the latest release. Use the releases page to browse downloads.";
    for (const button of document.querySelectorAll(".download")) button.href = releasePage;
    console.warn("Could not load GitHub release metadata:", error);
  }
}

void loadLatestRelease();
