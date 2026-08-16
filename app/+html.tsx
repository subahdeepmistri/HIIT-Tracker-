import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>HIIT Tracker</title>
        <meta
          name="description"
          content="Offline-first HIIT trainer. Plan work and rest, record what you actually did, and track progress without invented calories or heart rate."
        />
        <meta name="theme-color" content="#07080A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="HIIT Tracker" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        <div id="hiit-boot" aria-hidden="true">
          <div className="hiit-boot-label">HIIT Tracker</div>
          <h1>
            Train.
            <br />
            Track.
            <br />
            <span>Improve.</span>
          </h1>
        </div>
        {children}
      </body>
    </html>
  );
}

const responsiveBackground = `
html, body {
  background-color: #07080A;
  margin: 0;
}
#hiit-boot {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 72px 20px 140px;
  box-sizing: border-box;
  background: #07080A;
  color: #F4F1EA;
  font-family: "Arial Narrow", Impact, system-ui, sans-serif;
}
#hiit-boot .hiit-boot-label {
  font: 600 12px/1 system-ui, sans-serif;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #9AA3B2;
}
#hiit-boot h1 {
  margin: 12px 0 0;
  font-size: 56px;
  line-height: 56px;
  letter-spacing: -0.6px;
  font-weight: 700;
}
#hiit-boot span { color: #E8FF3D; }
@media (prefers-color-scheme: light) {
  html, body, #hiit-boot { background-color: #F6F4EE; }
  #hiit-boot { color: #12141A; }
}`;
