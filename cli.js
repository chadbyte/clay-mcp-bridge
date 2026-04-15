#!/usr/bin/env node
// Clay MCP Bridge CLI
// Usage:
//   npx clay-mcp-bridge install <extension-id>
//   npx clay-mcp-bridge uninstall
//   npx clay-mcp-bridge run          (called by Chrome, not by user)

var fs = require("fs");
var path = require("path");
var os = require("os");

var HOST_NAME = "com.clay.mcp_bridge";
var cmd = process.argv[2];

if (cmd === "install") {
  install();
} else if (cmd === "uninstall") {
  uninstall();
} else if (cmd === "run") {
  // Native Messaging mode: Chrome spawns this with --parent-window-id etc.
  require("./host");
} else if (!cmd || cmd === "help" || cmd === "--help") {
  console.log("Clay MCP Bridge - Native Messaging Host");
  console.log("");
  console.log("Usage:");
  console.log("  npx clay-mcp-bridge install <extension-id>   Install native host");
  console.log("  npx clay-mcp-bridge uninstall                Remove native host");
  console.log("");
} else {
  // Chrome launches native host without subcommand, just with args
  // Detect by checking if stdin is not a TTY (Chrome pipes stdin)
  if (!process.stdin.isTTY) {
    require("./host");
  } else {
    console.log("Unknown command: " + cmd);
    console.log("Run 'npx clay-mcp-bridge help' for usage.");
    process.exit(1);
  }
}

function getManifestDirs() {
  var dirs = [];
  var platform = os.platform();

  if (platform === "darwin") {
    // Chrome
    dirs.push(path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"));
    // Arc
    dirs.push(path.join(os.homedir(), "Library", "Application Support", "Arc", "User Data", "NativeMessagingHosts"));
    // Chromium
    dirs.push(path.join(os.homedir(), "Library", "Application Support", "Chromium", "NativeMessagingHosts"));
  } else if (platform === "linux") {
    dirs.push(path.join(os.homedir(), ".config", "google-chrome", "NativeMessagingHosts"));
    dirs.push(path.join(os.homedir(), ".config", "chromium", "NativeMessagingHosts"));
  }

  return dirs;
}

function install() {
  var extId = process.argv[3];
  if (!extId) {
    console.error("Error: Extension ID required.");
    console.error("Usage: npx clay-mcp-bridge install <extension-id>");
    console.error("");
    console.error("Find your extension ID at chrome://extensions");
    process.exit(1);
  }

  // Copy host.js to a permanent location (npx cache is temporary)
  var installDir = path.join(os.homedir(), ".clay", "mcp-bridge");
  var installedHost = path.join(installDir, "host.js");
  var wrapperPath = path.join(installDir, "clay-mcp-host");

  if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true });

  // Copy host.js from package to permanent location
  var hostSource = path.join(__dirname, "host.js");
  fs.copyFileSync(hostSource, installedHost);

  // Write wrapper with absolute node path (Chrome/Arc don't read user PATH)
  var nodePath = process.execPath;
  var wrapper = "#!/bin/bash\nexec \"" + nodePath + "\" \"" + installedHost + "\"\n";
  fs.writeFileSync(wrapperPath, wrapper, { mode: 0o755 });

  var manifest = {
    name: HOST_NAME,
    description: "Clay MCP Bridge - Manages local MCP server processes",
    path: wrapperPath,
    type: "stdio",
    allowed_origins: ["chrome-extension://" + extId + "/"]
  };

  var manifestJson = JSON.stringify(manifest, null, 2);
  var dirs = getManifestDirs();
  var installed = 0;

  for (var i = 0; i < dirs.length; i++) {
    try {
      if (!fs.existsSync(dirs[i])) fs.mkdirSync(dirs[i], { recursive: true });
      fs.writeFileSync(path.join(dirs[i], HOST_NAME + ".json"), manifestJson);
      installed++;
      console.log("  Installed: " + dirs[i]);
    } catch (e) {
      // Skip dirs we can't write to
    }
  }

  if (installed === 0) {
    console.error("Error: Could not install to any browser directory.");
    process.exit(1);
  }

  console.log("");
  console.log("Clay MCP Bridge installed.");
  console.log("Extension ID: " + extId);
  console.log("");
  console.log("Restart your browser for the native host to take effect.");
}

function uninstall() {
  var dirs = getManifestDirs();
  var removed = 0;

  for (var i = 0; i < dirs.length; i++) {
    var manifestPath = path.join(dirs[i], HOST_NAME + ".json");
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
      removed++;
      console.log("  Removed: " + manifestPath);
    }
  }

  // Remove wrapper
  var wrapperPath = path.join(os.homedir(), ".clay", "mcp-bridge", "clay-mcp-host");
  if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);

  if (removed === 0) {
    console.log("Nothing to remove.");
  } else {
    console.log("");
    console.log("Clay MCP Bridge uninstalled.");
  }
}
