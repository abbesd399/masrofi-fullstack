const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Packaging Masrofi.ipa (Standard PKZIP) ---');

const rootDir = path.resolve(__dirname, '..');
const tempRoot = path.join(rootDir, 'temp_ipa_root');
const payloadDir = path.join(tempRoot, 'Payload');
const appDir = path.join(payloadDir, 'App.app');
const ipaOutput = path.join(rootDir, 'Masrofi.ipa');

if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true, force: true });
if (fs.existsSync(ipaOutput)) fs.unlinkSync(ipaOutput);

fs.mkdirSync(appDir, { recursive: true });

// 1. Copy Web Assets from www
const wwwDir = path.join(rootDir, 'www');
if (!fs.existsSync(wwwDir)) {
  execSync('node scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying application files into App.app...');
copyRecursive(wwwDir, path.join(appDir, 'public'));

// 2. Prepare Info.plist
const plistSrc = path.join(rootDir, 'ios', 'App', 'App', 'Info.plist');
if (fs.existsSync(plistSrc)) {
  let plist = fs.readFileSync(plistSrc, 'utf8');
  plist = plist.replace(/\$\(EXECUTABLE_NAME\)/g, 'App');
  plist = plist.replace(/\$\(PRODUCT_BUNDLE_IDENTIFIER\)/g, 'com.masrofi.app');
  plist = plist.replace(/\$\(PRODUCT_NAME\)/g, 'Masrofi');
  plist = plist.replace(/\$\(CURRENT_PROJECT_VERSION\)/g, '1.0.0');
  plist = plist.replace(/\$\(MARKETING_VERSION\)/g, '1.0.0');
  fs.writeFileSync(path.join(appDir, 'Info.plist'), plist, 'utf8');
}

// 3. Icons
const iconSrc = path.join(rootDir, 'icons', 'icon-512.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@3x.png'));
}

// 4. Compress using .NET ZipFile to produce authentic PKZIP
console.log('Compressing with authentic PKZIP headers...');
const psScript = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempRoot.replace(/\\/g, '/')}', '${ipaOutput.replace(/\\/g, '/')}')`;
execSync(`powershell -NoProfile -Command "${psScript}"`, { cwd: rootDir, stdio: 'inherit' });

// Copy to masrofi-fullstack as well
const subDirIpa = path.join(rootDir, 'masrofi-fullstack', 'Masrofi.ipa');
if (fs.existsSync(path.dirname(subDirIpa))) {
  fs.copyFileSync(ipaOutput, subDirIpa);
}

console.log(`✓ Masrofi.ipa created successfully at: ${ipaOutput}`);

// Clean temp directory
if (fs.existsSync(tempRoot)) {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
