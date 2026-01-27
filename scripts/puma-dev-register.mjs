#!/usr/bin/env node
/**
 * puma-dev Auto-Registration Script
 *
 * Automatically registers a {branch-name}.mktg.rae.test subdomain pointing to the dev server
 * when running `pnpm dev`. Handles:
 * - Git worktrees and detached HEAD states
 * - Branch name sanitization for DNS compatibility
 * - Hash-based port allocation with collision avoidance
 * - Cleanup on server stop (signal trapping)
 *
 * Usage:
 *   node scripts/puma-dev-register.mjs [--port PORT] [--cleanup] [--dry-run]
 *
 * Environment:
 *   PUMA_DEV_DIR - Override puma-dev directory (default: ~/.puma-dev)
 *   PUMA_DEV_PORT_MIN - Minimum port number (default: 4400)
 *   PUMA_DEV_PORT_MAX - Maximum port number (default: 5400)
 */

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// Configuration
const CONFIG = {
  pumaDevDir: process.env.PUMA_DEV_DIR || join(homedir(), ".puma-dev"),
  registryFile: join(homedir(), ".puma-dev-registry.json"),
  portMin: parseInt(process.env.PUMA_DEV_PORT_MIN || "4400", 10),
  portMax: parseInt(process.env.PUMA_DEV_PORT_MAX || "5400", 10),
  maxSubdomainLength: 63, // DNS label limit
  reservedPorts: [4321, 4399], // From CLAUDE.md
};

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  port: null,
  cleanup: args.includes("--cleanup"),
  dryRun: args.includes("--dry-run"),
  help: args.includes("--help") || args.includes("-h"),
};

const portArgIndex = args.indexOf("--port");
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  flags.port = parseInt(args[portArgIndex + 1], 10);
}

if (flags.help) {
  console.log(`
puma-dev Auto-Registration Script

Usage:
  node scripts/puma-dev-register.mjs [options] [-- command args...]

Options:
  --port PORT    Use specific port instead of auto-allocating
  --cleanup      Remove stale puma-dev entries and exit
  --dry-run      Show what would happen without making changes
  --help, -h     Show this help message

Examples:
  pnpm dev:puma                    # Auto-register and start dev server
  node scripts/puma-dev-register.mjs --cleanup  # Remove stale entries
  node scripts/puma-dev-register.mjs --dry-run  # Preview registration

Environment Variables:
  PUMA_DEV_DIR      Override puma-dev directory (default: ~/.puma-dev)
  PUMA_DEV_PORT_MIN Minimum port for allocation (default: 4400)
  PUMA_DEV_PORT_MAX Maximum port for allocation (default: 5400)
`);
  process.exit(0);
}

/**
 * Get the current git branch name, handling various edge cases
 */
function getGitBranch() {
  const cwd = process.cwd();

  // Method 1: git branch --show-current (works in worktrees)
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (branch) {
      return { branch, method: "branch --show-current" };
    }
  } catch {
    // Fall through to next method
  }

  // Method 2: git rev-parse --abbrev-ref HEAD (fallback)
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (branch && branch !== "HEAD") {
      return { branch, method: "rev-parse --abbrev-ref" };
    }
  } catch {
    // Fall through to next method
  }

  // Method 3: Detached HEAD - use short commit hash
  try {
    const commit = execSync("git rev-parse --short HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (commit) {
      return { branch: `detached-${commit}`, method: "detached HEAD" };
    }
  } catch {
    // Fall through
  }

  // Method 4: Fallback to directory name
  const dirName = basename(cwd);
  return { branch: dirName, method: "directory fallback" };
}

/**
 * Sanitize branch name for DNS/subdomain compatibility
 *
 * DNS labels must:
 * - Be 1-63 characters
 * - Contain only a-z, 0-9, and hyphens
 * - Not start or end with a hyphen
 */
function sanitizeBranchName(branch) {
  let sanitized = branch
    // Convert to lowercase
    .toLowerCase()
    // Replace common separators with hyphens
    .replace(/[/_@#:~]/g, "-")
    // Remove any remaining invalid characters
    .replace(/[^a-z0-9-]/g, "")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  // Truncate to max length, but try to break at a hyphen
  if (sanitized.length > CONFIG.maxSubdomainLength) {
    sanitized = sanitized.substring(0, CONFIG.maxSubdomainLength);
    // Try to break at last hyphen to avoid truncating mid-word
    const lastHyphen = sanitized.lastIndexOf("-");
    if (lastHyphen > CONFIG.maxSubdomainLength - 15) {
      sanitized = sanitized.substring(0, lastHyphen);
    }
    // Clean up trailing hyphens again
    sanitized = sanitized.replace(/-+$/, "");
  }

  // If empty after sanitization, use a hash of the original
  if (!sanitized) {
    const hash = createHash("md5").update(branch).digest("hex").substring(0, 8);
    sanitized = `branch-${hash}`;
  }

  return sanitized;
}

/**
 * Calculate a deterministic port from branch name using hash
 */
function hashPort(branchName) {
  const hash = createHash("md5").update(branchName).digest();
  // Use first 2 bytes as a number
  const num = hash.readUInt16BE(0);
  // Map to port range
  const range = CONFIG.portMax - CONFIG.portMin;
  return CONFIG.portMin + (num % range);
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // Other errors - assume port is unavailable
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find an available port, starting from the hash-based suggestion
 */
async function findAvailablePort(branchName) {
  const basePort = hashPort(branchName);
  const range = CONFIG.portMax - CONFIG.portMin;

  // Try the hash-based port first, then probe nearby ports
  for (let i = 0; i < range; i++) {
    const port = CONFIG.portMin + ((basePort - CONFIG.portMin + i) % range);

    // Skip reserved ports
    if (CONFIG.reservedPorts.includes(port)) {
      continue;
    }

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available ports in range ${CONFIG.portMin}-${CONFIG.portMax}`);
}

/**
 * Load the port registry
 */
function loadRegistry() {
  try {
    if (existsSync(CONFIG.registryFile)) {
      return JSON.parse(readFileSync(CONFIG.registryFile, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty registry
  }
  return { entries: {} };
}

/**
 * Save the port registry
 */
function saveRegistry(registry) {
  writeFileSync(CONFIG.registryFile, JSON.stringify(registry, null, 2));
}

/**
 * Register a subdomain with puma-dev
 */
function registerPumaDev(subdomain, port) {
  // Ensure puma-dev directory exists
  if (!existsSync(CONFIG.pumaDevDir)) {
    mkdirSync(CONFIG.pumaDevDir, { recursive: true });
  }

  const filePath = join(CONFIG.pumaDevDir, subdomain);
  writeFileSync(filePath, String(port));
  return filePath;
}

/**
 * Unregister a subdomain from puma-dev
 */
function unregisterPumaDev(subdomain) {
  const filePath = join(CONFIG.pumaDevDir, subdomain);
  if (existsSync(filePath)) {
    rmSync(filePath);
    return true;
  }
  return false;
}

/**
 * Check if a process is still running
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleanup stale entries from registry and puma-dev
 */
function cleanupStaleEntries() {
  const registry = loadRegistry();
  const staleEntries = [];
  const activeEntries = [];

  for (const [subdomain, entry] of Object.entries(registry.entries)) {
    if (entry.pid && !isProcessRunning(entry.pid)) {
      staleEntries.push({ subdomain, ...entry });
      unregisterPumaDev(subdomain);
      delete registry.entries[subdomain];
    } else {
      activeEntries.push({ subdomain, ...entry });
    }
  }

  // Also check for orphaned puma-dev files not in registry
  if (existsSync(CONFIG.pumaDevDir)) {
    const pumaDevFiles = readdirSync(CONFIG.pumaDevDir);
    for (const file of pumaDevFiles) {
      // Skip if it's a symlink to a directory (rack app) or in registry
      if (!registry.entries[file]) {
        const filePath = join(CONFIG.pumaDevDir, file);
        try {
          const content = readFileSync(filePath, "utf-8").trim();
          // If it looks like a port number, it might be one of ours
          if (/^\d+$/.test(content)) {
            const port = parseInt(content, 10);
            if (port >= CONFIG.portMin && port <= CONFIG.portMax) {
              staleEntries.push({ subdomain: file, port, orphaned: true });
              if (!flags.dryRun) {
                rmSync(filePath);
              }
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  if (!flags.dryRun) {
    saveRegistry(registry);
  }

  return { staleEntries, activeEntries };
}

/**
 * Setup cleanup handlers for graceful shutdown
 */
function setupCleanupHandlers(subdomain) {
  const cleanup = () => {
    console.log(`\n[puma-dev] Unregistering ${subdomain}.mktg.rae.test...`);
    unregisterPumaDev(subdomain);

    // Remove from registry
    const registry = loadRegistry();
    delete registry.entries[subdomain];
    saveRegistry(registry);

    process.exit(0);
  };

  // Handle various termination signals
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);

  // Handle uncaught errors
  process.on("uncaughtException", (err) => {
    console.error("[puma-dev] Uncaught exception:", err);
    cleanup();
  });

  // Handle process exit (but can't do async cleanup here)
  process.on("exit", () => {
    // Synchronous cleanup only
    try {
      unregisterPumaDev(subdomain);
    } catch {
      // Ignore errors during exit
    }
  });
}

/**
 * Main execution
 */
async function main() {
  // Handle cleanup mode
  if (flags.cleanup) {
    console.log("[puma-dev] Cleaning up stale entries...");
    const { staleEntries, activeEntries } = cleanupStaleEntries();

    if (staleEntries.length > 0) {
      console.log(`[puma-dev] Removed ${staleEntries.length} stale entries:`);
      for (const entry of staleEntries) {
        console.log(`  - ${entry.subdomain}.mktg.rae.test (port ${entry.port})${entry.orphaned ? " [orphaned]" : ""}`);
      }
    } else {
      console.log("[puma-dev] No stale entries found.");
    }

    if (activeEntries.length > 0) {
      console.log(`[puma-dev] Active entries: ${activeEntries.length}`);
      for (const entry of activeEntries) {
        console.log(`  - ${entry.subdomain}.mktg.rae.test -> port ${entry.port} (PID ${entry.pid})`);
      }
    }

    return;
  }

  // Get git branch
  const { branch, method } = getGitBranch();
  const subdomain = sanitizeBranchName(branch);

  console.log(`[puma-dev] Branch: ${branch} (via ${method})`);
  console.log(`[puma-dev] Subdomain: ${subdomain}.mktg.rae.test`);

  // Determine port
  let port;
  if (flags.port) {
    port = flags.port;
    console.log(`[puma-dev] Using specified port: ${port}`);
  } else {
    port = await findAvailablePort(branch);
    console.log(`[puma-dev] Allocated port: ${port}`);
  }

  // Dry run - just show what would happen
  if (flags.dryRun) {
    console.log(`[puma-dev] DRY RUN - Would register: ${subdomain}.mktg.rae.test -> port ${port}`);
    console.log(`[puma-dev] File: ${join(CONFIG.pumaDevDir, subdomain)}`);
    return;
  }

  // Register with puma-dev
  const filePath = registerPumaDev(subdomain, port);
  console.log(`[puma-dev] Registered: ${subdomain}.mktg.rae.test -> port ${port}`);
  console.log(`[puma-dev] URL: https://${subdomain}.mktg.rae.test`);

  // Update registry
  const registry = loadRegistry();
  registry.entries[subdomain] = {
    branch,
    port,
    pid: process.pid,
    cwd: process.cwd(),
    createdAt: new Date().toISOString(),
  };
  saveRegistry(registry);

  // Setup cleanup handlers
  setupCleanupHandlers(subdomain);

  // Find the command separator
  const separatorIndex = args.indexOf("--");
  if (separatorIndex !== -1) {
    // Run the command after --
    const command = args.slice(separatorIndex + 1);
    if (command.length > 0) {
      // Inject --port flag for Astro if running astro dev
      const finalCommand = [...command];
      if (
        command.some((arg) => arg.includes("astro")) &&
        command.includes("dev") &&
        !command.includes("--port")
      ) {
        finalCommand.push("--port", String(port));
      }

      console.log(`[puma-dev] Starting: ${finalCommand.join(" ")}`);
      console.log("---");

      const child = spawn(finalCommand[0], finalCommand.slice(1), {
        stdio: "inherit",
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(port),
          PUMA_DEV_SUBDOMAIN: subdomain,
        },
      });

      child.on("exit", (code) => {
        console.log(`\n[puma-dev] Server exited with code ${code}`);
        unregisterPumaDev(subdomain);

        const reg = loadRegistry();
        delete reg.entries[subdomain];
        saveRegistry(reg);

        process.exit(code || 0);
      });

      // Forward signals to child
      process.on("SIGINT", () => child.kill("SIGINT"));
      process.on("SIGTERM", () => child.kill("SIGTERM"));
    }
  } else {
    // Default: run Astro dev server with the allocated port
    const command = ["pnpm", "astro", "dev", "--port", String(port)];
    console.log(`[puma-dev] Starting: ${command.join(" ")}`);
    console.log("---");

    const child = spawn(command[0], command.slice(1), {
      stdio: "inherit",
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        PUMA_DEV_SUBDOMAIN: subdomain,
      },
    });

    child.on("exit", (code) => {
      console.log(`\n[puma-dev] Server exited with code ${code}`);
      unregisterPumaDev(subdomain);

      const reg = loadRegistry();
      delete reg.entries[subdomain];
      saveRegistry(reg);

      process.exit(code || 0);
    });

    // Forward signals to child
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
  }
}

main().catch((err) => {
  console.error("[puma-dev] Error:", err.message);
  process.exit(1);
});
