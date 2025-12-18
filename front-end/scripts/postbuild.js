// scripts/postbuild.js
const fs = require('fs');
const path = require('path');

const build = path.resolve(__dirname, '..', 'build');
const prefix = path.join(build, 'cec-employee-database');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ensure /cec-employee-database exists
fs.mkdirSync(prefix, { recursive: true });

// mirror /static/* -> /cec-employee-database/static/*
copyDir(path.join(build, 'static'), path.join(prefix, 'static'));

// mirror a few top-level assets your app/manifest might load
[
  'asset-manifest.json',
  'manifest.json',
  'favicon.ico',
  'CEC.jpg',
  'home.svg',
  'logout.svg',
  'database.svg',
  'profile-default.svg',
  'logo192.png',
  'logo512.png'
].forEach(f => {
  const src = path.join(build, f);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(path.join(prefix, f)), { recursive: true });
    fs.copyFileSync(src, path.join(prefix, f));
  }
});

console.log('[postbuild] mirrored assets to /cec-employee-database/*');
