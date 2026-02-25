// Simple machine fingerprint for offline licensing.
// Combines OS username, hostname, and CPU model and hashes with SHA-256.

const os = require('os');
const crypto = require('crypto');

/**
 * Generate a stable machine fingerprint for this device.
 *
 * NOTE:
 * - This is intentionally simple and not meant to be tamper-proof.
 * - It should be good enough to bind a license to a single clinic machine.
 */
function getMachineFingerprint() {
  const userInfo = safeGetUserInfo();
  const username = userInfo.username || 'unknown-user';
  const hostname = os.hostname() || 'unknown-host';
  const cpuModel = getFirstCpuModel() || 'unknown-cpu';

  const raw = `${username}|${hostname}|${cpuModel}`;

  const hash = crypto
    .createHash('sha256')
    .update(raw, 'utf8')
    .digest('hex');

  return hash;
}

function safeGetUserInfo() {
  try {
    return os.userInfo();
  } catch {
    // In rare environments os.userInfo can throw; fall back gracefully.
    return { username: process.env.USER || process.env.USERNAME || 'unknown' };
  }
}

function getFirstCpuModel() {
  try {
    const cpus = os.cpus();
    if (Array.isArray(cpus) && cpus.length > 0 && cpus[0] && cpus[0].model) {
      return cpus[0].model;
    }
  } catch {
    // Ignore and fall through to default.
  }
  return null;
}

module.exports = {
  getMachineFingerprint,
};

