from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import json

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://pagesure-frontend-app.onrender.com"])

def scrape_facebook_data(url):
    try:
        # Run the Node.js script as a subprocess
        result = subprocess.run(
            ['node', 'scrapers/facebook_scraper.js', url],
            capture_output=True,
            text=True,
            encoding='utf-8',
            check=True
        )
        
        # Parse the JSON output
        data = json.loads(result.stdout)
        return data
    except subprocess.CalledProcessError as e:
        print(f"Error running scraper: {e.stderr}")
        raise Exception("Failed to scrape Facebook page")
    except json.JSONDecodeError:
        print(f"Invalid JSON output: {result.stdout}")
        raise Exception("Invalid response from scraper")

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
        import traceback
        print('--- Exception in /api/scrape ---')
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 