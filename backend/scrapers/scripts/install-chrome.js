// scripts/install-chrome.js
const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Installing Chromium...');
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download(puppeteer._preferredRevision);
    console.log('Chromium downloaded to:', revisionInfo.folderPath);
  } catch (error) {
    console.error('Error installing Chromium:', error);
    process.exit(1);
  }
})();
