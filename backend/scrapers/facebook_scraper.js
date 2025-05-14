const puppeteer = require('puppeteer');

async function scrapeFacebookPage(url) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        const data = await page.evaluate((pageUrl) => {
            const result = { pageUrl };

            // Helper to clean up category text
            function cleanCategory(str) {
                if (!str) return null;
                return str
                  .replace(/d[â€™']/gi, "d'")
                  .replace(/[\u2019\u2018\u201C\u201D]/g, "'")
                  .replace(/\s+/g, ' ')
                  .trim();
            }
            function getFullText(el) {
                if (!el) return '';
                return Array.from(el.childNodes).map(node =>
                    node.nodeType === Node.TEXT_NODE ? node.textContent :
                    node.nodeType === Node.ELEMENT_NODE ? getFullText(node) : ''
                ).join('');
            }

            // Title
            const titleElement = document.querySelector('h1');
            let title = titleElement ? titleElement.textContent.trim() : null;
            if (title) {
              // Remove 'Compte vérifié', 'Verified account', and similar from the end of the title
              title = title.replace(/\s*[-–—|]*\s*(Compte vérifié|Verified account|Page vérifiée|Page verified)$/i, '').trim();
            }
            result.title = title;

            // Check for verified badge - more robust detection
            let isVerified = false;
            if (titleElement) {
                // Check for badge in title's parent or adjacent elements
                const titleContainer = titleElement.parentElement;
                const verifiedBadge = titleContainer.querySelector('svg[title*="Verified account"], svg[title*="Compte vérifié"]');
                if (verifiedBadge) {
                    isVerified = true;
                } else {
                    // Fallback: check for badge in nearby elements
                    const nearbyElements = Array.from(document.querySelectorAll('svg[title*="Verified account"], svg[title*="Compte vérifié"]'));
                    const titleRect = titleElement.getBoundingClientRect();
                    for (const element of nearbyElements) {
                        const elementRect = element.getBoundingClientRect();
                        // Check if badge is near the title (within 50px)
                        if (Math.abs(elementRect.top - titleRect.top) < 50 && 
                            Math.abs(elementRect.left - titleRect.right) < 50) {
                            isVerified = true;
                            break;
                        }
                    }
                }
            }
            result.verified = isVerified;

            // Profile picture
            const imageEl = document.querySelector('image');
            if (imageEl && imageEl.querySelector('g')) {
                result.profilePictureUrl = imageEl.getAttribute('xlink:href') || null;
            } else if (imageEl) {
                result.profilePictureUrl = imageEl.getAttribute('xlink:href') || null;
            } else {
                result.profilePictureUrl = null;
            }

            // Robust category extraction
            let category = null;
            const categorySpan = Array.from(document.querySelectorAll('span')).find(span => {
                const strong = span.querySelector('strong');
                return strong && strong.textContent.trim() === 'Page' && span.textContent.includes('·');
            });
            if (categorySpan) {
                // Try getFullText first
                let raw = getFullText(categorySpan) || '';
                // Fallback to innerText if accents are missing
                if (!raw.match(/[éèêàâîïôûùç]/i) && categorySpan.innerText) {
                    raw = categorySpan.innerText;
                }
                const parts = raw.split('·');
                category = parts.length > 1 ? cleanCategory(parts[1].normalize('NFC')) : null;
            }
            if (!category) {
                const h1 = document.querySelector('h1');
                if (h1) {
                    let next = h1.parentElement;
                    for (let i = 0; i < 3 && next; i++) {
                        next = next.nextElementSibling;
                        if (next) {
                            const txt = (next.innerText || next.textContent || '').trim();
                            if (txt && txt.length < 40 && txt.length > 2 && !txt.match(/\d/)) {
                                category = cleanCategory(txt.normalize('NFC'));
                                break;
                            }
                        }
                    }
                }
            }
            if (!category) {
                const candidates = Array.from(document.querySelectorAll('span,div')).map(e => (e.innerText || e.textContent || '').trim());
                const knownWords = ['business', 'shop', 'store', 'company', 'brand', 'service', 'organization', 'community', 'artist', 'public figure', 'restaurant', 'cafe', 'clothing', 'fashion', 'boutique', 'marque', 'vêtements'];
                category = candidates.find(txt => knownWords.some(word => txt.toLowerCase().includes(word)));
                if (category) category = cleanCategory(category.normalize('NFC'));
            }
            result.category = category || null;

            return result;
        }, url);

        return data;
    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a Facebook page URL');
        process.exit(1);
    }

    scrapeFacebookPage(url)
        .then(data => {
            console.log(JSON.stringify(data, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeFacebookPage }; 