const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { scrapeFacebookPage } = require('./facebook_scraper');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://pagesure-1.onrender.com'
  ]
}));
app.use(bodyParser.json());

// Concurrency control for scrapes
let runningScrapes = 0;
const scrapeQueue = [];
const MAX_CONCURRENT_SCRAPES = 2;

async function runScrapeTask(task) {
  if (runningScrapes < MAX_CONCURRENT_SCRAPES) {
    runningScrapes++;
    try {
      await task();
    } finally {
      runningScrapes--;
      if (scrapeQueue.length > 0) {
        const nextTask = scrapeQueue.shift();
        runScrapeTask(nextTask);
      }
    }
  } else {
    scrapeQueue.push(task);
  }
}

app.post('/api/scrape', (req, res) => {
  const { url } = req.body;
  console.log('Received /api/scrape request for URL:', url);
  if (!url) return res.status(400).json({ error: 'Missing URL' });
  runScrapeTask(async () => {
    try {
      const data = await scrapeFacebookPage(url);
      res.json(data);
    } catch (err) {
      console.error('Error in /api/scrape:', err);
      res.status(500).json({ error: err.message });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 