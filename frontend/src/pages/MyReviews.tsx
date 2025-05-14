import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Rating,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Review {
  id: string;
  pageId: string;
  pageName: string;
  pageLogo: string;
  rating: number;
  comment: string;
  createdAt: any;
  followers?: number;
}

// Helper: get star color based on rating
function getStarColor(rating: number) {
  if (rating >= 4.5) return '#059669'; // Excellent
  if (rating >= 4) return '#10B981'; // Bien
  if (rating >= 3) return '#FDE68A'; // Moyen
  if (rating >= 2) return '#F59E42'; // Médiocre
  return '#EF4444'; // Mauvais
}

const MyReviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(reviewsQuery);
        const reviewsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];

        // Trier les avis par date (du plus récent au plus ancien)
        reviewsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        setReviews(reviewsData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des avis:', error);
        setError('Une erreur est survenue lors du chargement de vos avis');
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user, navigate]);

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'avis:', error);
      setError('Une erreur est survenue lors de la suppression de l\'avis');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert severity="info">
          Veuillez vous connecter pour voir vos avis
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 }, bgcolor: '#F3F4F6', minHeight: '100vh' }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800, color: '#10B981', mb: 4, letterSpacing: 0.5 }}>
        Mes avis
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: 16, bgcolor: '#FDE68A', color: '#1F2937' }}>
          {error}
        </Alert>
      )}

      {reviews.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, fontSize: 16, bgcolor: '#FDE68A', color: '#1F2937' }}>
          Vous n'avez pas encore laissé d'avis
        </Alert>
      ) : (
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {reviews.map((review) => (
            <Grid item xs={12} sm={12} md={6} key={review.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  borderRadius: 4,
                  boxShadow: '0 8px 32px rgba(16,185,129,0.10)',
                  background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)',
                  transition: 'box-shadow 0.3s, transform 0.2s',
                  '&:hover': {
                    boxShadow: '0 16px 40px rgba(253,230,138,0.18)',
                    background: '#FDE68A',
                    transform: 'translateY(-2px) scale(1.01)'
                  },
                  p: { xs: 1, md: 2 },
                }}
                onClick={() => navigate(`/page/${review.pageId}`, {
                  state: {
                    pageData: {
                      logo_image: review.pageLogo,
                      page_name: review.pageName,
                      followers: review.followers,
                      // Add other fields if available, e.g. cover_image
                    }
                  }
                })}
              >
                <CardContent sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CardMedia
                      component="img"
                      image={review.pageLogo}
                      alt={review.pageName}
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        mr: 2,
                        boxShadow: 2,
                        border: '3px solid #fff',
                        background: '#fff',
                        objectFit: 'cover',
                      }}
                    />
                    <Box>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: 22, color: '#1F2937', mb: 0.5 }}>
                        {review.pageName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15, fontWeight: 500, color: '#1F2937' }}>
                        {new Date(review.createdAt.toDate()).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                  <Rating value={review.rating} readOnly sx={{ mb: 1, fontSize: 28, color: getStarColor(review.rating) }} />
                  <Typography variant="body1" sx={{ mb: 2, fontSize: 17, color: '#1F2937', fontWeight: 500 }}>
                    {review.comment}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyReviews; 