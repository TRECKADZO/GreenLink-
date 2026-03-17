/**
 * Custom Expo Config Plugin: Remove Media Permissions
 * 
 * Ce plugin s'exécute EN DERNIER et force la suppression de READ_MEDIA_IMAGES
 * et READ_MEDIA_VIDEO du AndroidManifest.xml final, même si d'autres plugins
 * les ré-injectent.
 * 
 * Solution au rejet Google Play: "Invalid use of the photo and video permissions"
 */
const { withAndroidManifest } = require('expo/config-plugins');

function removeMediaPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Permissions à supprimer définitivement
    const BLOCKED_PERMISSIONS = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_MEDIA_LOCATION',
      'android.permission.RECORD_AUDIO',
    ];

    // 1. Supprimer les permissions existantes
    if (manifest['uses-permission']) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (perm) => {
          const name = perm.$?.['android:name'] || '';
          const isBlocked = BLOCKED_PERMISSIONS.includes(name);
          if (isBlocked) {
            console.log(`[RemoveMediaPerms] Removed: ${name}`);
          }
          return !isBlocked;
        }
      );
    }

    // 2. Supprimer aussi de uses-permission-sdk-23
    if (manifest['uses-permission-sdk-23']) {
      manifest['uses-permission-sdk-23'] = manifest['uses-permission-sdk-23'].filter(
        (perm) => {
          const name = perm.$?.['android:name'] || '';
          return !BLOCKED_PERMISSIONS.includes(name);
        }
      );
    }

    // 3. Ajouter les permissions avec tools:node="remove" pour bloquer la fusion de manifests
    if (!manifest.$) {
      manifest.$ = {};
    }
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    for (const perm of BLOCKED_PERMISSIONS) {
      // Vérifier si une entrée "remove" existe déjà
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm && p.$?.['tools:node'] === 'remove'
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: {
            'android:name': perm,
            'tools:node': 'remove',
          },
        });
        console.log(`[RemoveMediaPerms] Added tools:node="remove" for: ${perm}`);
      }
    }

    return config;
  });
}

module.exports = removeMediaPermissions;
