const semver = require('semver');

/**
 * Parse version string to extract version code
 * Supports formats like "1.0.0", "1.0.0.100", "v1.0.0"
 */
function parseVersionName(versionName) {
  // Remove 'v' prefix if present
  const cleaned = versionName.replace(/^v/i, '');
  
  // Try to parse as semver
  const parsed = semver.parse(cleaned);
  if (parsed) {
    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      versionName: parsed.version
    };
  }

  // Fallback: split by dots and convert to numbers
  const parts = cleaned.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    versionName: cleaned
  };
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parsed1 = parseVersionName(v1);
  const parsed2 = parseVersionName(v2);
  
  if (semver.valid(parsed1.versionName) && semver.valid(parsed2.versionName)) {
    return semver.compare(parsed1.versionName, parsed2.versionName);
  }

  // Fallback comparison
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }
  return 0;
}

/**
 * Determine if update is major or minor based on version difference
 */
function getUpdateType(currentVersion, newVersion) {
  const current = parseVersionName(currentVersion);
  const newVer = parseVersionName(newVersion);

  // Major update if major version changed
  if (newVer.major > current.major) {
    return 'major';
  }

  // Minor update for patch or minor changes
  return 'minor';
}

module.exports = {
  parseVersionName,
  compareVersions,
  getUpdateType
};

