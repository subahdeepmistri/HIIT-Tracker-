import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('PWA installability files', () => {
  it('declares a standalone manifest with 192 and 512 any-purpose icons', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8')) as {
      display: string;
      start_url: string;
      name: string;
      short_name: string;
      prefer_related_applications?: boolean;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(manifest.name).toBe('HIIT Tracker');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.prefer_related_applications).toBe(false);
    expect(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose !== 'maskable')).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose !== 'maskable')).toBe(true);
  });

  it('ships a service worker that actually handles fetch', () => {
    const source = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
    expect(source).toContain("addEventListener('fetch'");
    expect(source).toContain('event.respondWith');
  });
});
