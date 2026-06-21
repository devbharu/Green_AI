// scripts/build-config.js
// Usage: PRODUCT_NAME="System Monitor" node scripts/build-config.js
const fs = require('fs');
const path = require('path');

const productName = process.env.PRODUCT_NAME || 'Parakeet AI';

// Sanitize: strip special chars, spaces → hyphens
const safeProductName = productName
  .replace(/[^a-zA-Z0-9\s-]/g, '')
  .replace(/\s+/g, '-');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

packageJson.build.productName = productName;
packageJson.build.mac.artifactName = `${safeProductName}-Mac-\${arch}-\${version}.\${ext}`;
packageJson.build.win.artifactName = `${safeProductName}-Windows-\${version}.\${ext}`;

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✓ Product name set to: "${productName}" (artifact: ${safeProductName})`);
