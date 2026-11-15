const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'c:\\Users\\Jimou\\Downloads\\Compressed\\masrofi-fullstack_8',
  'c:\\Users\\Jimou\\Downloads\\Compressed\\MASROFI\\masrofi-fullstack_8'
];

const filesToSync = [
  'js/icons.js',
  'js/app.js',
  'js/data.js',
  'js/ui.js',
  'js/api.js',
  'js/scanner.js',
  'js/screen-home.js',
  'js/screen-bills.js',
  'js/screen-family.js',
  'js/screen-insights.js',
  'css/screens.css',
  'css/studio.css',
  'supabase/schema.sql',
  'test/unit-features.test.js',
  'www/js/scanner.js',
  'www/js/data.js',
  'www/js/app.js',
  'www/js/api.js',
  'ios/App/App/public/js/scanner.js',
  'ios/App/App/public/js/data.js',
  'ios/App/App/public/js/app.js',
  'ios/App/App/public/js/api.js',
  'android/app/src/main/assets/public/js/scanner.js',
  'android/app/src/main/assets/public/js/data.js',
  'android/app/src/main/assets/public/js/app.js',
  'android/app/src/main/assets/public/js/api.js',
  'Masrofi.ipa'
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    for (const rel of filesToSync) {
      const src = path.join(root, rel);
      const dst = path.join(target, rel);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      }
    }
    console.log(`Synced files to ${target}`);
  } else {
    console.log(`Target does not exist: ${target}`);
  }
}
