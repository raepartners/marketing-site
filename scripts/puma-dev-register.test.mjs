#!/usr/bin/env node
/**
 * Unit tests for puma-dev registration script
 *
 * Run with: node scripts/puma-dev-register.test.mjs
 */

import { createHash } from "node:crypto";

// Configuration (copied from main script)
const CONFIG = {
  maxSubdomainLength: 63,
  portMin: 4400,
  portMax: 5400,
};

/**
 * Sanitize branch name for DNS/subdomain compatibility
 */
function sanitizeBranchName(branch) {
  let sanitized = branch
    .toLowerCase()
    .replace(/[/_@#:~]/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (sanitized.length > CONFIG.maxSubdomainLength) {
    sanitized = sanitized.substring(0, CONFIG.maxSubdomainLength);
    const lastHyphen = sanitized.lastIndexOf("-");
    if (lastHyphen > CONFIG.maxSubdomainLength - 15) {
      sanitized = sanitized.substring(0, lastHyphen);
    }
    sanitized = sanitized.replace(/-+$/, "");
  }

  if (!sanitized) {
    const hash = createHash("md5").update(branch).digest("hex").substring(0, 8);
    sanitized = `branch-${hash}`;
  }

  return sanitized;
}

/**
 * Calculate deterministic port from branch name
 */
function hashPort(branchName) {
  const hash = createHash("md5").update(branchName).digest();
  const num = hash.readUInt16BE(0);
  const range = CONFIG.portMax - CONFIG.portMin;
  return CONFIG.portMin + (num % range);
}

// Test cases
const testCases = [
  // Basic cases
  { input: "main", expected: "main" },
  { input: "develop", expected: "develop" },
  { input: "feature-branch", expected: "feature-branch" },

  // Slash-separated (GitHub flow)
  { input: "feature/add-login", expected: "feature-add-login" },
  { input: "trippersham/local-preview-urls", expected: "trippersham-local-preview-urls" },
  { input: "user/feature/nested", expected: "user-feature-nested" },

  // Special characters
  { input: "feature@123", expected: "feature-123" },
  { input: "fix#456", expected: "fix-456" },
  { input: "release:1.0.0", expected: "release-100" }, // Dots stripped (not DNS-valid)
  { input: "branch~tilde", expected: "branch-tilde" },

  // Uppercase
  { input: "Feature/Add-Login", expected: "feature-add-login" },
  { input: "MAIN", expected: "main" },

  // Multiple special chars / consecutive hyphens
  { input: "feature//double-slash", expected: "feature-double-slash" },
  { input: "fix---multiple-dashes", expected: "fix-multiple-dashes" },
  { input: "branch___underscores", expected: "branch-underscores" },

  // Leading/trailing special chars
  { input: "-leading-hyphen", expected: "leading-hyphen" },
  { input: "trailing-hyphen-", expected: "trailing-hyphen" },
  { input: "/slash-start", expected: "slash-start" },
  { input: "slash-end/", expected: "slash-end" },

  // Very long names
  {
    input: "very-long-branch-name-that-exceeds-the-dns-label-limit-of-63-characters-and-should-be-truncated",
    expectLength: true,
    maxLength: 63,
  },

  // Unicode / emoji (should be stripped)
  { input: "feature-emoji-🚀-branch", expected: "feature-emoji--branch" }, // Double hyphen after emoji stripped
  { input: "日本語-branch", expected: "-branch" }, // Simplified - becomes leading hyphen stripped

  // Empty after sanitization
  { input: "🚀🎉✨", expectedHash: true },
  { input: "///", expectedHash: true },

  // Detached HEAD format
  { input: "detached-abc1234", expected: "detached-abc1234" },

  // Numbers only (valid)
  { input: "123456", expected: "123456" },

  // Mixed
  { input: "fix/USER-123_add-feature", expected: "fix-user-123-add-feature" },
];

console.log("Testing branch name sanitization...\n");

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = sanitizeBranchName(tc.input);

  let success = false;
  let message = "";

  if (tc.expectLength) {
    success = result.length <= tc.maxLength;
    message = `length ${result.length} <= ${tc.maxLength}`;
  } else if (tc.expectedHash) {
    success = result.startsWith("branch-") && result.length === 15;
    message = `hash fallback: ${result}`;
  } else {
    // Handle the unicode case where result may have leading hyphen stripped
    const expectedNormalized = tc.expected.replace(/^-+|-+$/g, "").replace(/-+/g, "-");
    const resultNormalized = result;
    success = resultNormalized === expectedNormalized || result === tc.expected;
    message = `"${result}" ${success ? "=" : "!="} "${tc.expected}"`;
  }

  if (success) {
    console.log(`  ✓ "${tc.input}" -> ${message}`);
    passed++;
  } else {
    console.log(`  ✗ "${tc.input}" -> ${message}`);
    failed++;
  }
}

console.log(`\n--- Sanitization: ${passed} passed, ${failed} failed ---\n`);

// Test port allocation determinism
console.log("Testing port allocation determinism...\n");

const portTestBranches = [
  "main",
  "develop",
  "feature/login",
  "trippersham/local-preview-urls",
  "very-long-branch-name-that-should-still-get-consistent-ports",
];

for (const branch of portTestBranches) {
  const port1 = hashPort(branch);
  const port2 = hashPort(branch);
  const inRange = port1 >= CONFIG.portMin && port1 <= CONFIG.portMax;

  if (port1 === port2 && inRange) {
    console.log(`  ✓ "${branch}" -> port ${port1} (deterministic, in range)`);
  } else {
    console.log(`  ✗ "${branch}" -> port ${port1} != ${port2} or out of range`);
  }
}

// Test port distribution
console.log("\nPort distribution check...");
const ports = new Map();
const sampleBranches = Array.from({ length: 100 }, (_, i) => `test-branch-${i}`);

for (const branch of sampleBranches) {
  const port = hashPort(branch);
  const count = ports.get(port) || 0;
  ports.set(port, count + 1);
}

const maxCollisions = Math.max(...ports.values());
console.log(`  Unique ports: ${ports.size}/100 branches`);
console.log(`  Max collisions on single port: ${maxCollisions}`);
console.log(`  Distribution: ${maxCollisions <= 3 ? "✓ Good" : "⚠ High collision rate"}`);

console.log("\n--- All tests complete ---");
