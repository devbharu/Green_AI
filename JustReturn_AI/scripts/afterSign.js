const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlementsPath = path.resolve(__dirname, '../build/entitlements.mac.plist');

  console.log(`\n\n[afterSign] Forcing ad-hoc signature with correct Identifier (com.green.ai) on: ${appPath}`);

  try {
    execSync(
      `codesign --force --deep --sign - --identifier "com.green.ai" --entitlements "${entitlementsPath}" "${appPath}"`,
      { stdio: 'inherit' }
    );
    console.log('[afterSign] Successfully re-signed app with correct identifier!\n\n');
  } catch (err) {
    console.error('[afterSign] Failed to re-sign the app:', err);
  }
};
