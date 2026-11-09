#!/usr/bin/env node
// Chrome Web Store API v2 with a service account, no dependencies.
//
//   node scripts/cws.mjs status            what the store has now (read only)
//   node scripts/cws.mjs upload [zip]      upload a package; default dist/xhandy-<manifest version>-store.zip
//   node scripts/cws.mjs publish           submit the uploaded package for review (published after approval)
//
// Settings come from the environment or .env (git-ignored): CWS_PUBLISHER_ID, CWS_ITEM_ID and CWS_KEY_FILE
// (path to the service account's JSON key). The service account's email must be added on the Account page of
// the Developer Dashboard. Never prints the key or the access token.
import { createSign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://chromewebstore.googleapis.com";

function loadEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (environment or .env)`);
  return v;
}

const b64url = (data) => Buffer.from(data).toString("base64url");

async function accessToken() {
  const keyFile = need("CWS_KEY_FILE").replace(/^~(?=\/)/, homedir());
  const key = JSON.parse(readFileSync(keyFile, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/chromewebstore",
    aud: key.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 600,
  }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(key.private_key, "base64url");
  const res = await fetch(key.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${sig}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`token request failed: HTTP ${res.status} ${body.error || ""} ${body.error_description || ""}`.trim());
  }
  return body.access_token;
}

async function call(token, method, path, { body, contentType } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(contentType ? { "content-type": contentType } : {}) },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!res.ok) throw new Error(`${method} ${path.split("?")[0]} failed: HTTP ${res.status}\n${JSON.stringify(json.error || json, null, 2)}`);
  return json;
}

function manifestVersion() {
  return JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).version;
}

async function main() {
  loadEnv();
  const [cmd, arg] = process.argv.slice(2);
  const name = `publishers/${need("CWS_PUBLISHER_ID")}/items/${need("CWS_ITEM_ID")}`;
  if (!["status", "upload", "publish"].includes(cmd)) {
    console.error("usage: node scripts/cws.mjs status | upload [zip] | publish");
    process.exit(2);
  }
  const token = await accessToken();
  const status = () => call(token, "GET", `/v2/${name}:fetchStatus`);

  if (cmd === "status") {
    console.log(JSON.stringify(await status(), null, 2));
  } else if (cmd === "upload") {
    const zip = arg || join(root, "dist", `xhandy-${manifestVersion()}-store.zip`);
    if (!existsSync(zip)) throw new Error(`${zip} not found; run npm run pack first`);
    let r = await call(token, "POST", `/upload/v2/${name}:upload?uploadType=media`, {
      body: readFileSync(zip),
      contentType: "application/zip",
    });
    for (let i = 0; i < 30 && r.uploadState === "UPLOAD_IN_PROGRESS"; i++) {
      await new Promise((ok) => setTimeout(ok, 2000));
      const s = await status();
      r = { ...r, uploadState: s.lastAsyncUploadState || r.uploadState };
    }
    console.log(JSON.stringify(r, null, 2));
    if (r.uploadState !== "SUCCEEDED") process.exit(1);
  } else if (cmd === "publish") {
    const r = await call(token, "POST", `/v2/${name}:publish`, {
      body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
      contentType: "application/json",
    });
    console.log(JSON.stringify(r, null, 2));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
