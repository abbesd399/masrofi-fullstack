const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  console.log('[Build] Preparing www/ directory for Capacitor and PWA...');
  if (!fs.existsSync(WWW)) {
    fs.mkdirSync(WWW, { recursive: true });
  }

  // Copy root files
  const rootFiles = ['index.html', 'manifest.json', 'sw.js'];
  for (const file of rootFiles) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(WWW, file));
    }
  }

  // Copy folders
  const folders = ['css', 'js', 'assets'];
  for (const folder of folders) {
    const src = path.join(ROOT, folder);
    if (fs.existsSync(src)) {
      copyDir(src, path.join(WWW, folder));
    }
  }

  // Sync icons to iOS (Must be 1024x1024 for Xcode actool)
  const iosIcon = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  const srcIcon1024 = path.join(ROOT, 'assets', 'icon-1024.png');
  const srcIcon512 = path.join(ROOT, 'assets', 'icon-512.png');
  if (fs.existsSync(srcIcon1024) && fs.existsSync(path.dirname(iosIcon))) {
    fs.copyFileSync(srcIcon1024, iosIcon);
  } else if (fs.existsSync(srcIcon512) && fs.existsSync(path.dirname(iosIcon)) && !fs.existsSync(iosIcon)) {
    fs.copyFileSync(srcIcon512, iosIcon);
  }

  // Sync icons to Android mipmaps
  const srcIcon192 = path.join(ROOT, 'assets', 'icon-192.png');
  const androidRes = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidRes)) {
    const mipmaps = ['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
    for (const mm of mipmaps) {
      const mmDir = path.join(androidRes, mm);
      if (fs.existsSync(mmDir)) {
        fs.copyFileSync(srcIcon192, path.join(mmDir, 'ic_launcher.png'));
        fs.copyFileSync(srcIcon192, path.join(mmDir, 'ic_launcher_round.png'));
        fs.copyFileSync(srcIcon192, path.join(mmDir, 'ic_launcher_foreground.png'));
      }
    }
  }

  console.log('[Build] www/ directory and native app icons prepared successfully.');
}

build();
