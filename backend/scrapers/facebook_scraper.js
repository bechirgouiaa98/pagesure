const puppeteer = require('puppeteer');

async function scrapeFacebookPage(url) {
    const browser = await puppeteer.launch({
        headless: 'true',
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

            // --- CATEGORY KEYWORD DETECTION ---
            const CATEGORY_KEYWORDS = {
              shopping: [
                // English
                'shopping', 'store', 'retail', 'fashion', 'clothing', 'apparel', 'accessories', 'accessory', 'shoes', 'bag', 'jewelry', 'beauty', 'cosmetics', 'outlet', 'mall', 'department store', 'supermarket', 'gift shop', 'toy store', 'lingerie', 'underwear', 'sportswear', "men's clothing", "women's clothing", "children's clothing", 'kids clothing', 'baby clothing', 'vintage', 'thrift', 'consignment', 'discount', 'bazaar', 'flea market', 'organic market', 'food market', 'craft market', 'local market', 'farmers market', 'wholesale market', 'retail market', 'online shop', 'e-commerce', 'ecommerce', 'sale', 'purchase', 'commerce', 'supplier', 'wholesaler', 'franchise',
                // French
                'boutique', 'magasin', 'mode', 'vêtements', 'vetements', 'marque', 'chaussures', 'sac', 'bijouterie', 'beauté', 'cosmétiques', 'centre commercial', 'supermarché', 'épicerie', 'cadeau', 'jouet', 'prêt-à-porter', 'prêt a porter', 'lingerie', 'sous-vêtements', 'sous vetements', 'vintage', 'friperie', 'dépôt-vente', 'depot-vente', 'bazar', 'marché', 'marché aux puces', 'marché couvert', 'marché de noël', 'marché de nuit', 'marché bio', 'marché alimentaire', 'marché artisanal', 'marché local', 'marché fermier', 'marché de gros', 'marché de détail', 'marché en ligne', 'vente en ligne', 'vente', 'achat', 'commerce', 'distribution', 'distributeur', 'fournisseur', 'grossiste', 'franchisé', 'franchiseur'
              ],
              restaurant: [
                // English
                'restaurant', 'cafe', 'bar', 'bistro', 'eatery', 'diner', 'steakhouse', 'pizzeria', 'buffet', 'grill', 'brasserie', 'tavern', 'sandwich shop', 'coffee shop', 'tea room', 'bakery', 'pub', 'fast food', 'food', 'pizza', 'sushi', 'burger', 'steak', 'bbq', 'barbecue', 'deli', 'dessert', 'ice cream', 'snack', 'canteen', 'food court', 'food truck', 'food stand', 'takeout', 'delivery', 'crêperie', 'crêpe', 'pancake', 'salad bar', 'smoothie', 'juice bar', 'wine bar', 'beer bar', 'brewery', 'gastropub', 'tapas', 'buffet', 'fine dining', 'brunch', 'lunch', 'dinner', 'breakfast',
                // French
                'restaurant', 'restauration', 'alimentation', 'boulangerie', 'café', 'bar', 'bistro', 'brasserie', 'cafétéria', 'salon de thé', 'pâtisserie', 'sandwicherie', 'rôtisserie', 'crêperie', 'glacier', 'pub', 'rapide', 'pizza', 'sushi', 'burger', 'steak', 'bbq', 'barbecue', 'traiteur', 'snack', 'cantine', 'food court', 'camion', 'stand', 'à emporter', 'livraison', 'crêpe', 'pancake', 'salade', 'jus', 'vin', 'bière', 'brasserie', 'tapas', 'buffet', 'gastronomique', 'brunch', 'déjeuner', 'dîner', 'petit déjeuner'
              ],
              health: [
                // English
                'health', 'medical', 'clinic', 'doctor', 'dentist', 'hospital', 'pharmacy', 'wellness', 'therapist', 'psychologist', 'optometrist', 'chiropractor', 'nutritionist', 'spa', 'care center', 'nursing', 'nursing home', 'rehab', 'rehabilitation', 'mental health', 'addiction', 'audiologist', 'blood bank', 'counseling', 'drugstore', 'emergency', 'first aid', 'laboratory', 'lab', 'midwife', 'obgyn', 'pediatrician', 'physician', 'plastic surgery', 'retirement', 'speech pathologist', "women's health",
                // French
                'santé', 'médical', 'clinique', 'docteur', 'médecin', 'dentiste', 'hôpital', 'pharmacie', 'bien-être', 'thérapeute', 'psychologue', 'optométriste', 'chiropracteur', 'nutritionniste', 'spa', 'centre de soins', 'infirmier', 'maison de retraite', 'réadaptation', 'santé mentale', 'addiction', 'audiologiste', 'banque de sang', 'conseil', 'droguerie', 'urgence', 'premiers secours', 'laboratoire', 'sage-femme', 'gynécologue', 'pédiatre', 'médecin', 'chirurgie plastique', 'retraite', 'orthophoniste', 'santé des femmes'
              ],
              transport: [
                // English
                'transport', 'travel', 'airport', 'taxi', 'bus', 'train', 'car rental', 'travel agency', 'tourism', 'tourist', 'tour operator', 'tour agency', 'transit', 'shuttle', 'ferry', 'cruise', 'airline', 'airport shuttle', 'car hire', 'coach', 'driver', 'limo', 'limousine', 'metro', 'subway', 'station', 'tram', 'vehicle', 'ride', 'rideshare', 'parking', 'bike rental', 'boat rental', 'bus line', 'bus station', 'car service', 'charter', 'chauffeur', 'fret', 'freight', 'logistics', 'marina', 'motorcycle', 'public transport', 'rail', 'rental', 'school transportation', 'shipping', 'taxi service', 'ticket', 'tour', 'tourist information', 'train station', 'transit hub', 'transportation service', 'travel company', 'travel service', 'truck rental', 'van rental',
                // French
                'transport', 'voyage', 'aéroport', 'taxi', 'autobus', 'bus', 'train', 'location de voiture', 'agence de voyage', 'tourisme', 'touriste', 'opérateur touristique', 'agence touristique', 'navette', 'ferry', 'croisière', 'compagnie aérienne', 'navette aéroport', 'location de voiture', 'autocar', 'chauffeur', 'limousine', 'métro', 'station', 'tramway', 'véhicule', 'covoiturage', 'parking', 'location de vélo', 'location de bateau', 'ligne de bus', 'gare routière', 'service de voiture', 'location', 'fret', 'logistique', 'marina', 'moto', 'transport public', 'rail', 'location', 'transport scolaire', 'expédition', 'service de taxi', 'billet', 'tour', 'information touristique', 'gare', "pôle d'échange", 'service de transport', 'compagnie de voyage', 'service de voyage', 'location de camion', 'location de van'
              ],
              pets: [
                // English
                'pet', 'animal', 'veterinarian', 'dog', 'cat', 'aquarium', 'pet store', 'pet shop', 'pet groomer', 'pet sitter', 'animal shelter', 'dog trainer', 'kennel', 'pet breeder', 'pet adoption', 'pet grooming', 'pet care', 'pet supplies', 'pet food', 'pet hospital', 'pet clinic', 'pet services',
                // French
                'animal', 'animaux', 'vétérinaire', 'chien', 'chat', 'aquarium', 'animalerie', 'toilettage', 'pension pour animaux', 'refuge pour animaux', 'dresseur de chiens', 'élevage', 'adoption', 'soins pour animaux', 'fournitures pour animaux', 'nourriture pour animaux', 'clinique vétérinaire', 'services pour animaux'
              ],
              education: [
                // English
                'school', 'education', 'university', 'college', 'training', 'academy', 'high school', 'elementary school', 'middle school', 'preschool', 'kindergarten', 'tutor', 'course', 'lesson', 'teacher', 'professor', 'institute', 'campus', 'student', 'learning', 'study', 'test preparation', 'language school', 'music school', 'dance school', 'art school', 'driving school', 'vocational', 'trade school', 'private school', 'public school', 'religious school', 'specialty school', 'traffic school', 'tutoring',
                // French
                'école', 'éducation', 'université', 'collège', 'formation', 'académie', 'lycée', 'primaire', 'maternelle', 'cours', 'leçon', 'professeur', 'enseignement', 'soutien scolaire', 'institut', 'campus', 'étudiant', 'apprentissage', 'étude', 'préparation aux examens', 'école de langues', 'école de musique', 'école de danse', "école d'art", 'auto-école', 'école professionnelle', 'école de commerce', 'école privée', 'école publique', 'école religieuse', 'école spécialisée', 'école de conduite', 'tutorat'
              ],
              sports: [
                // English
                'sport', 'fitness', 'gym', 'athlete', 'stadium', 'yoga', 'martial arts', 'football', 'soccer', 'basketball', 'tennis', 'golf', 'swimming', 'cycling', 'running', 'boxing', 'dance', 'pilates', 'baseball', 'volleyball', 'hockey', 'cricket', 'rugby', 'track', 'field', 'personal trainer', 'coach', 'sports club', 'sports team', 'sports league', 'sports center', 'sportswear', 'recreation', 'outdoor', 'indoor', 'arena', 'pool', 'billiards', 'skating', 'ski', 'snowboard', 'surf', 'climbing', 'diving', 'archery', 'batting cage', 'golf course', 'golf club', 'racquetball', 'paintball', 'cheerleading', 'trainer',
                // French
                'sport', 'fitness', 'salle de sport', 'athlète', 'stade', 'yoga', 'arts martiaux', 'football', 'soccer', 'basketball', 'tennis', 'golf', 'natation', 'cyclisme', 'course', 'boxe', 'danse', 'pilates', 'baseball', 'volleyball', 'hockey', 'cricket', 'rugby', 'piste', 'terrain', 'entraîneur', 'club sportif', 'équipe sportive', 'ligue sportive', 'centre sportif', 'vêtements de sport', 'loisir', 'plein air', 'intérieur', 'arène', 'piscine', 'billard', 'patinage', 'ski', 'snowboard', 'surf', 'escalade', 'plongée', "tir à l'arc", 'cage de frappe', 'terrain de golf', 'club de golf', 'racquetball', 'paintball', 'pom-pom girl', 'coach'
              ],
              home: [
                // English
                'home', 'house', 'apartment', 'condo', 'real estate', 'furniture', 'home improvement', 'home services', 'plumber', 'electrician', 'painter', 'gardener', 'renovation', 'property', 'property management', 'interior design', 'kitchen', 'bathroom', 'bedroom', 'living room', 'cleaning', 'mover', 'storage', 'security', 'decor', 'appliance', 'repair', 'maintenance', 'landscaping', 'roofing', 'carpenter', 'contractor', 'construction', 'building', 'window', 'door', 'flooring', 'lighting', 'locksmith', 'upholstery', 'well drilling', 'survey', 'garden', 'yard', 'garage', 'pool', 'swimming pool',
                // French
                'maison', 'appartement', 'condo', 'immobilier', 'meubles', "amélioration de l'habitat", 'services à domicile', 'plombier', 'électricien', 'peintre', 'jardinier', 'rénovation', 'propriété', 'gestion immobilière', 'décoration intérieure', 'cuisine', 'salle de bain', 'chambre', 'salon', 'nettoyage', 'déménageur', 'stockage', 'sécurité', 'décor', 'appareil', 'réparation', 'entretien', 'paysagisme', 'toiture', 'charpentier', 'entrepreneur', 'construction', 'bâtiment', 'fenêtre', 'porte', 'revêtement de sol', 'éclairage', 'serrurier', 'rembourrage', 'forage de puits', 'arpentage', 'jardin', 'cour', 'garage', 'piscine', 'piscine à nage'
              ],
              services: [
                // English
                'service', 'consultant', 'business', 'agency', 'lawyer', 'accountant', 'consulting', 'firm', 'office', 'company', 'professional', 'assistance', 'marketing', 'advertising', 'public relations', 'media', 'event', 'event planning', 'photographer', 'videographer', 'translation', 'recruiter', 'employment', 'cleaning', 'janitorial', 'security', 'repair', 'maintenance', 'supply', 'distribution', 'franchise', 'management', 'legal', 'financial', 'insurance', 'real estate', 'property', 'notary', 'secretarial', 'writing', 'copywriting', 'printing', 'design', 'graphic design', 'web design', 'web development', 'it', 'technology', 'software', 'hardware', 'training', 'education', 'coaching', 'tutoring', 'personal', 'lifestyle', 'child care', 'elder care', 'funeral', 'wedding', 'catering', 'food service', 'transportation', 'logistics', 'storage', 'moving', 'delivery', 'distribution', 'waste', 'recycling', 'environmental', 'safety', 'first aid', 'health', 'beauty', 'spa', 'salon', 'barber', 'massage', 'tattoo', 'piercing', 'nail', 'hair', 'makeup', 'skin care', 'tanning', 'fitness', 'gym', 'sports', 'pet', 'animal', 'veterinary', 'kennel', 'grooming', 'boarding', 'adoption', 'breeder', 'training', 'obedience', 'behavior', 'rescue', 'shelter', 'boarding', 'pet sitting', 'dog walking', 'pet transport', 'pet food', 'pet supplies',
                // French
                'service', 'consultant', 'entreprise', 'agence', 'avocat', 'comptable', 'conseil', 'cabinet', 'bureau', 'société', 'professionnel', 'assistance', 'marketing', 'publicité', 'relations publiques', 'média', 'événement', "organisation d'événements", 'photographe', 'vidéaste', 'traduction', 'recruteur', 'emploi', 'nettoyage', 'entretien', 'sécurité', 'réparation', 'maintenance', 'fourniture', 'distribution', 'franchise', 'gestion', 'juridique', 'financier', 'assurance', 'immobilier', 'propriété', 'notaire', 'secrétariat', 'rédaction', 'impression', 'conception', 'graphisme', 'web design', 'développement web', 'informatique', 'technologie', 'logiciel', 'matériel', 'formation', 'éducation', 'coaching', 'tutorat', 'personnel', 'style de vie', "garde d'enfants", "soins aux personnes âgées", 'funéraire', 'mariage', 'traiteur', 'service alimentaire', 'transport', 'logistique', 'stockage', 'déménagement', 'livraison', 'recyclage', 'environnement', 'sécurité', 'premiers secours', 'santé', 'beauté', 'spa', 'salon', 'barbier', 'massage', 'tatouage', 'piercing', 'onglerie', 'coiffure', 'maquillage', 'soins de la peau', 'bronzage', 'fitness', 'gym', 'sport', 'animal', 'vétérinaire', 'chenil', 'toilettage', 'pension', 'adoption', 'élevage', 'dressage', 'obéissance', 'comportement', 'sauvetage', 'refuge', "garde d'animaux", "promenade de chiens", "transport d'animaux", 'nourriture pour animaux', 'fournitures pour animaux'
              ]
            };
            function detectCategoryKey(rawCategory) {
              if (!rawCategory) return 'other';
              const lower = rawCategory.toLowerCase();
              for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
                if (keywords.some(word => lower.includes(word))) {
                  return key;
                }
              }
              return 'other';
            }
            result.categoryKey = detectCategoryKey(category);
            // --- END CATEGORY KEYWORD DETECTION ---

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