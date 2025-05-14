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

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });
  try {
    const data = await scrapeFacebookPage(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 