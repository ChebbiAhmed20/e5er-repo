// Simple 30-day trial management for offline licensing.
// Stores trial info under: app.getPath('appData') + "/Virela/trial.json"

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getMachineFingerprint } = require('./licensing-fingerprint');

const TRIAL_DAYS = 30;

function getTrialFilePath() {
  const baseDir = path.join(app.getPath('appData'), 'Virela');
  return path.join(baseDir, 'trial.json');
}

function ensureBaseDirExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignore directory creation errors; subsequent file writes will fail gracefully.
  }
}

function readTrialFile() {
  const filePath = getTrialFilePath();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data.startDate === 'undefined' || !data.fingerprint) {
      return null;
    }
    return data;
  } catch {
    // Missing or invalid file -> treat as no trial yet.
    return null;
  }
}

function writeTrialFile(data) {
  const filePath = getTrialFilePath();
  ensureBaseDirExists(filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // If writing fails, we still allow app to continue; trial will be recomputed next run.
  }
}

/**
 * Ensure a trial record exists for this machine.
 * - If file is missing or invalid: creates a new 30-day trial starting now.
 * - If file exists: returns it as-is.
 */
function loadOrCreateTrial() {
  const existing = readTrialFile();
  const fingerprint = getMachineFingerprint();

  if (!existing) {
    const now = Date.now();
    const trial = {
      startDate: now,
      fingerprint,
    };
    writeTrialFile(trial);
    return trial;
  }

  return existing;
}

function calculateElapsedDays(startDate) {
  const start = typeof startDate === 'number' ? startDate : Date.parse(startDate);
  if (!Number.isFinite(start)) {
    return TRIAL_DAYS; // Invalid date -> treat as expired
  }
  const diffMs = Date.now() - start;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if the current machine's trial is valid.
 * Rules:
 * - If trial file is missing: create it and start 30-day trial.
 * - If fingerprint changed: trial is invalid.
 * - If more than 30 days passed: trial is invalid.
 */
function isTrialValid() {
  const trial = loadOrCreateTrial();
  const currentFingerprint = getMachineFingerprint();

  if (!trial || !trial.fingerprint) {
    return false;
  }

  if (trial.fingerprint !== currentFingerprint) {
    // Trial data was copied from another machine or hardware changed.
    return false;
  }

  const elapsedDays = calculateElapsedDays(trial.startDate);
  return elapsedDays < TRIAL_DAYS;
}

/**
 * Get remaining trial days for this machine.
 * - Returns 0 if trial is invalid or expired.
 * - Returns an integer between 1 and 30 while valid.
 */
function getDaysRemaining() {
  const trial = loadOrCreateTrial();
  const currentFingerprint = getMachineFingerprint();

  if (!trial || !trial.fingerprint || trial.fingerprint !== currentFingerprint) {
    return 0;
  }

  const elapsedDays = calculateElapsedDays(trial.startDate);
  if (elapsedDays >= TRIAL_DAYS) {
    return 0;
  }

  return TRIAL_DAYS - elapsedDays;
}

module.exports = {
  isTrialValid,
  getDaysRemaining,
};

