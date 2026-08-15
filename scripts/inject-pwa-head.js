#!/usr/bin/env node
/**
 * Expo's static HTML often drops +html head tags.
 * After export, copy PWA files and guarantee Chrome can discover
 * the manifest, large icons, and service worker.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pub = path.join(root, 'public');

function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      copyRecursive(path.join(from, name), path.join(to, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(dist)) {
  console.error('inject-pwa-head: dist/ missing');
  process.exit(1);
}

if (fs.existsSync(pub)) {
  copyRecursive(pub, dist);
}

const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'favicon.ico',
  path.join('icons', 'icon-192.png'),
  path.join('icons', 'icon-512.png'),
  path.join('icons', 'icon-512-maskable.png'),
];
for (const rel of required) {
  if (!fs.existsSync(path.join(dist, rel))) {
    console.error(`inject-pwa-head: missing ${rel}`);
    process.exit(1);
  }
}

const tags = [
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<meta name="theme-color" content="#07080A" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="HIIT Tracker" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />',
  '<link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />',
].join('\n    ');

const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('rel="manifest"')) {
  if (!html.includes('</head>')) {
    console.error('inject-pwa-head: no </head> in index.html');
    process.exit(1);
  }
  html = html.replace('</head>', `    ${tags}\n  </head>`);
  fs.writeFileSync(htmlPath, html);
}

html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('rel="manifest"') || !html.includes('/icons/icon-512.png')) {
  console.error('inject-pwa-head: HTML is still missing PWA tags');
  process.exit(1);
}

console.log('inject-pwa-head: PWA manifest, icons, and service worker are in dist/');
