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
  'robots.txt',
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
  '<meta name="description" content="Offline-first HIIT trainer. Plan work and rest, record what you actually did, and track progress without invented calories or heart rate." />',
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
if (!html.includes('rel="manifest"') || !html.includes('name="description"')) {
  if (!html.includes('</head>')) {
    console.error('inject-pwa-head: no </head> in index.html');
    process.exit(1);
  }
  const inject = [];
  if (!html.includes('name="description"')) {
    inject.push(
      '<meta name="description" content="Offline-first HIIT trainer. Plan work and rest, record what you actually did, and track progress without invented calories or heart rate." />',
    );
  }
  if (!html.includes('rel="manifest"')) inject.push(tags);
  html = html.replace('</head>', `    ${inject.join('\n    ')}\n  </head>`);
  fs.writeFileSync(htmlPath, html);
}

html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('rel="manifest"') || !html.includes('/icons/icon-512.png')) {
  console.error('inject-pwa-head: HTML is still missing PWA tags');
  process.exit(1);
}
const bootCss = `#hiit-boot{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;justify-content:center;padding:72px 20px 140px;box-sizing:border-box;background:#07080A;color:#F4F1EA;font-family:"Arial Narrow",Impact,system-ui,sans-serif}#hiit-boot .hiit-boot-label{font:600 12px/1 system-ui,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:#9AA3B2}#hiit-boot h1{margin:12px 0 0;font-size:56px;line-height:56px;letter-spacing:-.6px;font-weight:700}#hiit-boot span{color:#E8FF3D}`;
if (!html.includes('#hiit-boot{')) {
  html = html.replace('</head>', `<style>${bootCss}</style>\n</head>`);
}
if (!html.includes('id="hiit-boot"')) {
  const boot = `<div id="hiit-boot" aria-hidden="true"><div class="hiit-boot-label">HIIT Tracker</div><h1>Train.<br/>Track.<br/><span>Improve.</span></h1></div>`;
  html = html.replace('<body>', `<body>${boot}`);
}
fs.writeFileSync(htmlPath, html);

console.log('inject-pwa-head: PWA manifest, icons, and service worker are in dist/');
