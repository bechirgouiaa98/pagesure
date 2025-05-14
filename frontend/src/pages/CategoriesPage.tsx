import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Grid, TextField, Paper, InputAdornment, Card, CardActionArea, CardContent, Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import CategoryIcon from '@mui/icons-material/Category';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import PetsIcon from '@mui/icons-material/Pets';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SchoolIcon from '@mui/icons-material/School';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EmojiTransportationIcon from '@mui/icons-material/EmojiTransportation';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

// Example normalized categories (expand as needed)
const CATEGORY_MAP = [
  {
    key: 'restaurant',
    names: ['Restaurant', 'Restauration', 'Restaurante', 'Restauracja', 'Restoran', 'مطعم'],
    display: 'Restaurants & Food',
    displayFr: 'Restaurants & Alimentation',
    icon: <RestaurantIcon />, color: '#FDE68A'
  },
  {
    key: 'shopping',
    names: ['Clothing Store', 'Magasin de vêtements', 'Apparel & Clothing', 'Boutique', 'Shopping & Retail', 'Vêtements', 'Mode'],
    display: 'Shopping & Fashion',
    displayFr: 'Mode & Shopping',
    icon: <LocalMallIcon />, color: '#A7F3D0'
  },
  {
    key: 'pets',
    names: ['Animals & Pets', 'Animalerie', 'Pet Store', 'Pet Services', 'Animaux', 'Pets'],
    display: 'Animals & Pets',
    displayFr: 'Animaux & Animaux de compagnie',
    icon: <PetsIcon />, color: '#FEF3C7'
  },
  {
    key: 'health',
    names: ['Health', 'Santé', 'Hospital', 'Hôpital', 'Clinic', 'Clinique', 'Medical Center', 'Centre médical'],
    display: 'Health & Medical',
    displayFr: 'Santé & Médical',
    icon: <LocalHospitalIcon />, color: '#A7F3D0'
  },
  {
    key: 'education',
    names: ['Education', 'Éducation', 'School', 'École', 'College', 'Université', 'Training', 'Formation'],
    display: 'Education & Training',
    displayFr: 'Éducation & Formation',
    icon: <SchoolIcon />, color: '#FBCFE8'
  },
  {
    key: 'sports',
    names: ['Sports', 'Sport', 'Fitness', 'Gym', 'Salle de sport', 'Stadium', 'Stade'],
    display: 'Sports & Fitness',
    displayFr: 'Sports & Fitness',
    icon: <SportsSoccerIcon />, color: '#FDE68A'
  },
  {
    key: 'home',
    names: ['Home', 'Maison', 'Home Services', 'Service à domicile', 'Home Improvement', 'Amélioration de l\'habitat'],
    display: 'Home & Services',
    displayFr: 'Maison & Services',
    icon: <HomeWorkIcon />, color: '#A7F3D0'
  },
  {
    key: 'transport',
    names: ['Transport', 'Transportation', 'Transports', 'Taxi', 'Bus', 'Train', 'Airport', 'Aéroport'],
    display: 'Transport & Travel',
    displayFr: 'Transport & Voyage',
    icon: <EmojiTransportationIcon />, color: '#FBCFE8'
  },
  {
    key: 'services',
    names: ['Service', 'Services', 'Business Service', 'Service professionnel', 'Consulting', 'Conseil'],
    display: 'Business & Services',
    displayFr: 'Services & Entreprises',
    icon: <LocalOfferIcon />, color: '#FDE68A'
  },
  {
    key: 'other',
    names: [],
    display: 'Other',
    displayFr: 'Autres',
    icon: <MoreHorizIcon />, color: '#E5E7EB'
  }
];

function normalizeCategory(cat: string) {
  if (!cat) return 'other';
  const lower = cat.toLowerCase();
  for (const c of CATEGORY_MAP) {
    if (c.names.some(n => lower.includes(n.toLowerCase()))) return c.key;
  }
  return 'other';
}

const CategoriesPage = () => {
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPages = async () => {
      const snapshot = await getDocs(collection(db, 'pages'));
      setPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPages();
  }, []);

  // Build category to pages mapping
  const categoryPages: Record<string, any[]> = {};
  pages.forEach(page => {
    const catKey = page.categoryKey || 'other';
    if (!categoryPages[catKey]) categoryPages[catKey] = [];
    categoryPages[catKey].push(page);
  });

  // Filter categories by search
  const filteredCategories = CATEGORY_MAP.filter(cat => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      cat.display.toLowerCase().includes(s) ||
      cat.displayFr.toLowerCase().includes(s) ||
      cat.names.some(n => n.toLowerCase().includes(s))
    );
  });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <Typography variant="h3" sx={{ fontWeight: 900, mb: 3, textAlign: 'center', color: '#1F2937' }}>
        Explorer les catégories de pages Facebook
      </Typography>
      <Box sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une catégorie..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(16,185,129,0.07)' }}
        />
      </Box>
      <Grid container spacing={3} justifyContent="center">
        {filteredCategories.map(cat => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={cat.key} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card sx={{ bgcolor: cat.color, borderRadius: 4, boxShadow: '0 2px 8px rgba(16,185,129,0.07)', minHeight: 200, maxWidth: 320, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', mx: 'auto' }}>
              <CardActionArea onClick={() => navigate(`/categories/${cat.key}`)} sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
                  <Avatar sx={{ bgcolor: '#fff', color: '#10B981', width: 56, height: 56, mb: 2 }}>
                    {cat.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1F2937', textAlign: 'center', mb: 1 }}>
                    {cat.display}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#6B7280', fontWeight: 500, textAlign: 'center', fontSize: 15 }}>
                    {cat.displayFr}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, mt: 1 }}>
                    {categoryPages[cat.key]?.length || 0} pages
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default CategoriesPage; 