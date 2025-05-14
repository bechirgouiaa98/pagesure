import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Grid, Card, CardActionArea, CardContent, Avatar, Button } from '@mui/material';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
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

interface Page extends DocumentData {
  id: string;
  title: string;
  profilePictureUrl?: string;
  category?: string;
  category_fr?: string;
  category_en?: string;
  categoryKey?: string;
}

const CATEGORY_MAP = [
  {
    key: 'restaurant',
    display: 'Restaurants & Food',
    displayFr: 'Restaurants & Alimentation',
    icon: <RestaurantIcon />, color: '#FDE68A'
  },
  {
    key: 'shopping',
    display: 'Shopping & Fashion',
    displayFr: 'Mode & Shopping',
    icon: <LocalMallIcon />, color: '#A7F3D0'
  },
  {
    key: 'pets',
    display: 'Animals & Pets',
    displayFr: 'Animaux & Animaux de compagnie',
    icon: <PetsIcon />, color: '#FEF3C7'
  },
  {
    key: 'health',
    display: 'Health & Medical',
    displayFr: 'Santé & Médical',
    icon: <LocalHospitalIcon />, color: '#A7F3D0'
  },
  {
    key: 'education',
    display: 'Education & Training',
    displayFr: 'Éducation & Formation',
    icon: <SchoolIcon />, color: '#FBCFE8'
  },
  {
    key: 'sports',
    display: 'Sports & Fitness',
    displayFr: 'Sports & Fitness',
    icon: <SportsSoccerIcon />, color: '#FDE68A'
  },
  {
    key: 'home',
    display: 'Home & Services',
    displayFr: 'Maison & Services',
    icon: <HomeWorkIcon />, color: '#A7F3D0'
  },
  {
    key: 'transport',
    display: 'Transport & Travel',
    displayFr: 'Transport & Voyage',
    icon: <EmojiTransportationIcon />, color: '#FBCFE8'
  },
  {
    key: 'services',
    display: 'Business & Services',
    displayFr: 'Services & Entreprises',
    icon: <LocalOfferIcon />, color: '#FDE68A'
  },
  {
    key: 'other',
    display: 'Other',
    displayFr: 'Autres',
    icon: <MoreHorizIcon />, color: '#E5E7EB'
  }
];

function getCategoryByKey(key: string) {
  return CATEGORY_MAP.find(c => c.key === key) || CATEGORY_MAP[CATEGORY_MAP.length - 1];
}

const CategoryPagesList = () => {
  const { categoryKey } = useParams<{ categoryKey: string }>();
  const [pages, setPages] = useState<Page[]>([]);
  const navigate = useNavigate();
  const category = getCategoryByKey(categoryKey || 'other');

  useEffect(() => {
    const fetchPages = async () => {
      const snapshot = await getDocs(collection(db, 'pages'));
      const allPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Page[];
      // Only use backend-detected categoryKey for filtering
      const filtered = allPages.filter(page => page.categoryKey === categoryKey);
      setPages(filtered);
    };
    fetchPages();
  }, [categoryKey]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: '#fff', color: '#10B981', width: 56, height: 56 }}>{category.icon}</Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1F2937' }}>{category.display}</Typography>
          <Typography variant="subtitle1" sx={{ color: '#6B7280', fontWeight: 500 }}>{category.displayFr}</Typography>
        </Box>
      </Box>
      <Grid container spacing={3} justifyContent="center">
        {pages.length === 0 ? (
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ color: '#6B7280', textAlign: 'center', mt: 6 }}>
              Aucune page trouvée dans cette catégorie.
            </Typography>
          </Grid>
        ) : (
          pages.map(page => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={page.id} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 2px 8px rgba(16,185,129,0.07)', minHeight: 200, maxWidth: 320, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', mx: 'auto' }}>
                <CardActionArea onClick={() => navigate(`/page/${page.id}`)} sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
                    <Avatar src={page.profilePictureUrl || ''} alt={page.title} sx={{ width: 56, height: 56, mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F2937', textAlign: 'center', mb: 1 }}>
                      {page.title}
                    </Typography>
                    {page.category && (
                      <Typography variant="subtitle2" sx={{ color: '#6B7280', fontWeight: 500, textAlign: 'center', fontSize: 15 }}>
                        {page.category}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button variant="outlined" color="primary" onClick={() => navigate('/categories')}>
          Retour aux catégories
        </Button>
      </Box>
    </Container>
  );
};

export default CategoryPagesList; 