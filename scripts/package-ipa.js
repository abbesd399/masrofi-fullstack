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

// 1. Always rebuild www/ from latest root files first
execSync('node scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
const wwwDir = path.join(rootDir, 'www');

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

// 1.5 If a compiled native iOS template exists (with Mach-O binary & frameworks), copy it into App.app
const nativeTemplate = path.join(rootDir, 'ios', 'App', 'native_template');
if (fs.existsSync(nativeTemplate)) {
  console.log('Including native compiled binary & frameworks from native_template...');
  copyRecursive(nativeTemplate, appDir);
}

console.log('Copying application files into App.app/public...');
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
const iconSrc = fs.existsSync(path.join(rootDir, 'assets', 'icon-512.png'))
  ? path.join(rootDir, 'assets', 'icon-512.png')
  : path.join(rootDir, 'icons', 'icon-512.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(iconSrc, path.join(appDir, 'AppIcon60x60@3x.png'));
}

// 4. Compress with POSIX forward slashes for authentic iOS IPA & Sideloadly compatibility
console.log('Compressing with authentic PKZIP headers & POSIX forward-slash paths...');
if (process.platform === 'win32') {
  const psScript = `Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $src = '${tempRoot.replace(/\\/g, '/')}'; $out = '${ipaOutput.replace(/\\/g, '/')}'; if (Test-Path $out) { Remove-Item $out }; $zip = [System.IO.Compression.ZipFile]::Open($out, [System.IO.Compression.ZipArchiveMode]::Create); Get-ChildItem -Path $src -Recurse -File | ForEach-Object { $rel = $_.FullName.Substring((Resolve-Path $src).Path.Length + 1).Replace('\\', '/'); [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null }; $zip.Dispose();`;
  execSync(`powershell -NoProfile -Command "${psScript}"`, { cwd: rootDir, stdio: 'inherit' });
} else {
  execSync(`python3 -c "import shutil; shutil.make_archive('${ipaOutput.replace(/\.ipa$/, '')}', 'zip', '${tempRoot}'); import os; os.rename('${ipaOutput.replace(/\.ipa$/, '.zip')}', '${ipaOutput}')"`, { cwd: rootDir, stdio: 'inherit' });
}

console.log(`✓ Masrofi.ipa created successfully at: ${ipaOutput}`);

if (fs.existsSync(tempRoot)) {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
