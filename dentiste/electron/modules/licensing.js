/**
 * Simple offline licensing orchestrator.
 *
 * This module wires together:
 * - Machine fingerprint
 * - 30-day trial
 * - Offline license key bound to fingerprint
 *
 * It exposes a small async API used by the main process and preload:
 *   - initialize()
 *   - getStatus()
 *   - validate()
 *   - activate(key)
 */

// Use local modules under electron/modules so they are always packaged
// together with the Electron main process code.
const { getMachineFingerprint } = require('./licensing-fingerprint');
const { isTrialValid, getDaysRemaining } = require('./licensing-trialManager');
const { isLicenseValid, activateLicense } = require('./licensing-licenseManager');

/**
 * Initialize licensing.
 * For this simple offline system, there is no heavy initialization work.
 * We still keep this async to match the main process API.
 */
async function initialize() {
  // Touch trial file so it's created on first run.
  try {
    // This will create the trial file if it doesn't exist.
    // We ignore the return value here.
    isTrialValid();
  } catch {
    // Licensing must never crash the app; fail silently and let validation handle it.
  }
}

/**
 * Aggregate current licensing status in a single object.
 *
 * Returns:
 * {
 *   licenseValid: boolean,
 *   trialValid: boolean,
 *   daysRemaining: number,
 *   fingerprint: string,
 *   locked: boolean
 * }
 */
async function getStatus() {
  let fingerprint = '';
  try {
    fingerprint = getMachineFingerprint();
  } catch {
    fingerprint = '';
  }

  let licenseOk = false;
  let trialOk = false;
  let daysRemaining = 0;

  try {
    licenseOk = isLicenseValid();
  } catch {
    licenseOk = false;
  }

  if (!licenseOk) {
    try {
      trialOk = isTrialValid();
      if (trialOk) {
        daysRemaining = getDaysRemaining();
      }
    } catch {
      trialOk = false;
      daysRemaining = 0;
    }
  }

  const locked = !licenseOk && !trialOk;

  return {
    licenseValid: licenseOk,
    trialValid: trialOk,
    daysRemaining,
    fingerprint,
    locked,
  };
}

/**
 * Simple boolean check used by the main process or renderer.
 * Returns true if either license or trial allows the app to run.
 */
async function validate() {
  const status = await getStatus();
  return !status.locked;
}

/**
 * Activate a license key for this machine.
 * - Uses the offline license manager.
 * - Returns a result object and the updated status.
 */
async function activate(key) {
  let activationResult;
  try {
    activationResult = activateLicense(key);
  } catch (error) {
    activationResult = {
      success: false,
      message: error && error.message ? error.message : 'Echec de l\'activation de la licence.',
    };
  }

  const status = await getStatus();
  return {
    ...activationResult,
    status,
  };
}

module.exports = {
  initialize,
  getStatus,
  validate,
  activate,
};

