const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Packaging Masrofi.ipa ---');

const rootDir = path.resolve(__dirname, '..');
const payloadDir = path.join(rootDir, 'Payload');
const appDir = path.join(payloadDir, 'Masrofi.app');
const ipaOutput = path.join(rootDir, 'Masrofi.ipa');

// 1. Clean previous build
if (fs.existsSync(payloadDir)) fs.rmSync(payloadDir, { recursive: true, force: true });
if (fs.existsSync(ipaOutput)) fs.unlinkSync(ipaOutput);

fs.mkdirSync(appDir, { recursive: true });

// 2. Copy Web Assets from www
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

console.log('Copying application bundle...');
copyRecursive(wwwDir, path.join(appDir, 'public'));

// 3. Copy iOS Info.plist & Assets
const plistSrc = path.join(rootDir, 'ios', 'App', 'App', 'Info.plist');
if (fs.existsSync(plistSrc)) {
  fs.copyFileSync(plistSrc, path.join(appDir, 'Info.plist'));
}

const iconSrc = path.join(rootDir, 'icons', 'icon-512.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@3x.png'));
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon76x76@2x~ipad.png'));
}

// 4. Create ZIP archive named Masrofi.ipa using tar.exe
console.log('Compressing into Masrofi.ipa using tar.exe...');
try {
  if (fs.existsSync(ipaOutput)) fs.unlinkSync(ipaOutput);
  execSync(`tar.exe -a -cf "${ipaOutput}" Payload`, { cwd: rootDir, stdio: 'inherit' });
  console.log(`✓ Masrofi.ipa created successfully at: ${ipaOutput}`);
} catch (err) {
  console.error('Failed to compress IPA:', err.message);
}

// Clean temporary Payload folder
if (fs.existsSync(payloadDir)) {
  fs.rmSync(payloadDir, { recursive: true, force: true });
}
