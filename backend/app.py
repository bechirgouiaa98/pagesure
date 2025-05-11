from flask import Flask, request, jsonify
from flask_cors import CORS
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
import time

app = Flask(__name__)
CORS(app)

def scrape_facebook_data(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.goto(url)
        time.sleep(3)

        soup = BeautifulSoup(page.content(), 'html.parser')

        # Logo image (SVG or image tag)
        logo_img = soup.select_one('image')
        # Followers
        followers_tag = soup.find('a', string=re.compile(r' followers$'))
        # Page name (from <title>)
        title_tag = soup.find('title')
        page_name = "N/A"
        if title_tag:
            # Remove 'Facebook' and anything after '|' or '-'
            title_text = title_tag.text.strip()
            # Remove 'Facebook' and split on '|' or '-'
            title_text = re.split(r'\||-', title_text)[0].strip()
            title_text = title_text.replace('Facebook', '').strip()
            page_name = title_text

        data = {
            "logo_image": logo_img['xlink:href'] if logo_img else None,
            "page_name": page_name,
            "followers": followers_tag.get_text() if followers_tag else "N/A"
        }

        browser.close()
        return data

@app.route('/api/scrape', methods=['POST'])
def scrape():
    req_data = request.get_json()
    url = req_data.get('url')
    if not url or 'facebook.com' not in url:
        return jsonify({'error': 'Invalid Facebook URL'}), 400

    try:
        data = scrape_facebook_data(url)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 