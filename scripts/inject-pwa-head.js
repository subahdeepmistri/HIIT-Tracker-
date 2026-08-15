#!/usr/bin/env node
/**
 * Expo's static HTML sometimes drops custom +html head tags.
 * After export, guarantee Chrome can find the manifest and large icons.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'dist', 'index.html');
const publicIco = path.join(root, 'public', 'favicon.ico');
const distIco = path.join(root, 'dist', 'favicon.ico');
if (fs.existsSync(publicIco)) {
  fs.copyFileSync(publicIco, distIco);
}
if (!fs.existsSync(htmlPath)) {
  console.error('inject-pwa-head: dist/index.html missing');
  process.exit(1);
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

let html = fs.readFileSync(htmlPath, 'utf8');
if (html.includes('rel="manifest"')) {
  console.log('inject-pwa-head: manifest already present');
  process.exit(0);
}

if (!html.includes('</head>')) {
  console.error('inject-pwa-head: no </head> in index.html');
  process.exit(1);
}

html = html.replace('</head>', `    ${tags}\n  </head>`);
fs.writeFileSync(htmlPath, html);
console.log('inject-pwa-head: wrote PWA tags into dist/index.html');
