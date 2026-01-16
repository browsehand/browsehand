#!/usr/bin/env node

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const GITHUB_REPO = "anthropics/browsehand"; // TODO: Update to actual repo before publishing
const BINARY_NAME = "browsehand";

const PLATFORM_MAP = {
  "darwin-x64": "browsehand-macos-x64",
  "darwin-arm64": "browsehand-macos-arm64",
  "linux-x64": "browsehand-linux-x64",
  "win32-x64": "browsehand-windows-x64.exe",
};

function getPlatformKey() {
  return `${process.platform}-${process.arch}`;
}

function getBinaryName() {
  const key = getPlatformKey();
  const name = PLATFORM_MAP[key];
  if (!name) {
    console.error(`Unsupported platform: ${key}`);
    console.error(`Supported platforms: ${Object.keys(PLATFORM_MAP).join(", ")}`);
    process.exit(1);
  }
  return name;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(
      url,
      {
        headers: {
          "User-Agent": "browsehand-npm-installer",
          Accept: "application/vnd.github.v3+json",
        },
      },
      (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return fetchJson(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    ).on("error", reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith("https") ? https.get : http.get;

    const request = (currentUrl) => {
      get(
        currentUrl,
        {
          headers: {
            "User-Agent": "browsehand-npm-installer",
            Accept: "application/octet-stream",
          },
        },
        (res) => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            file.close();
            fs.unlinkSync(dest);
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.unlinkSync(dest);
            return reject(new Error(`HTTP ${res.statusCode}: ${currentUrl}`));
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        }
      ).on("error", (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function install() {
  const binaryFileName = getBinaryName();
  const destPath = path.join(__dirname, BINARY_NAME + (process.platform === "win32" ? ".exe" : ""));

  console.log(`Platform: ${getPlatformKey()}`);
  console.log(`Binary: ${binaryFileName}`);

  try {
    console.log("Fetching latest release...");
    const release = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    console.log(`Latest version: ${release.tag_name}`);

    const asset = release.assets.find((a) => a.name === binaryFileName);
    if (!asset) {
      console.error(`Binary not found for platform: ${binaryFileName}`);
      console.error(`Available assets: ${release.assets.map((a) => a.name).join(", ")}`);
      process.exit(1);
    }

    console.log(`Downloading ${asset.browser_download_url}...`);
    await downloadFile(asset.browser_download_url, destPath);

    if (process.platform !== "win32") {
      fs.chmodSync(destPath, 0o755);
    }

    console.log(`Successfully installed ${BINARY_NAME} to ${destPath}`);
  } catch (error) {
    console.error("Installation failed:", error.message);
    console.log("\nTo install manually, download the binary from:");
    console.log(`  https://github.com/${GITHUB_REPO}/releases/latest`);
    process.exit(1);
  }
}

install();
