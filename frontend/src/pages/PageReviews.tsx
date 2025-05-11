import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Rating,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PageData {
  cover_image: string;
  logo_image: string;
  page_name: string;
  likes: string;
  followers: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  screenshotUrl?: string;
  createdAt: any;
}

// Helper: calculate average rating
function getAverageRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

// Helper: count reviews per star
function getStarCounts(reviews: Review[]): number[] {
  const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star, ...
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
  });
  return counts;
}

// Helper: badge label and color for average rating
function getRatingBadge(avg: number, total: number) {
  if (total === 0) return { label: 'Aucun avis', color: '#9CA3AF', textColor: '#1F2937' };
  if (avg >= 4.5) return { label: 'Excellent', color: '#059669', textColor: '#fff' };
  if (avg >= 3.5) return { label: 'Bien', color: '#10B981', textColor: '#fff' };
  if (avg >= 2.5) return { label: 'Moyen', color: '#FDE68A', textColor: '#B45309' };
  if (avg >= 1.5) return { label: 'Médiocre', color: '#F59E42', textColor: '#fff' };
  return { label: 'Mauvais', color: '#EF4444', textColor: '#fff' };
}

// Helper: get star color based on rating
function getStarColor(rating: number) {
  if (rating >= 4.5) return '#059669'; // Excellent
  if (rating >= 4) return '#10B981'; // Bien
  if (rating >= 3) return '#FDE68A'; // Moyen
  if (rating >= 2) return '#F59E42'; // Médiocre
  return '#EF4444'; // Mauvais
}

const PageReviews = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // État pour l'édition inline d'un avis
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!pageId) {
          navigate('/');
          return;
        }
        // Récupérer les données de la page depuis l'état de navigation
        let state = location.state as { pageData: PageData };
        let pageDataFromState = state?.pageData;
        let finalPageData = pageDataFromState;
        // Fallback: fetch from Firestore if missing or missing fields
        if (!finalPageData || !finalPageData.page_name || !finalPageData.followers) {
          const pageRef = doc(db, 'pages', String(pageId));
          const pageSnap = await getDoc(pageRef);
          if (pageSnap.exists()) {
            finalPageData = { ...finalPageData, ...pageSnap.data() };
          }
        }
        if (finalPageData && finalPageData.page_name) {
          setPageData(finalPageData as PageData);
        } else {
          // Si pas de données dans l'état ni Firestore, rediriger vers la page d'accueil
          navigate('/');
          return;
        }

        // Récupérer les avis depuis Firestore
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('pageId', '==', pageId)
        );
        const querySnapshot = await getDocs(reviewsQuery);
        let reviewsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];

        // Trier les avis du plus récent au plus ancien
        reviewsData = reviewsData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });

        setReviews(reviewsData);

        // Trouver l'avis de l'utilisateur connecté
        if (user) {
          const userReview = reviewsData.find(review => review.userId === user.uid);
          if (userReview) {
            setUserReview(userReview);
            setRating(userReview.rating);
            setComment(userReview.comment);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Une erreur est survenue lors du chargement des données');
        setLoading(false);
      }
    };

    fetchData();
  }, [pageId, user, location.state, navigate]);

  const handleSubmitReview = async () => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!pageData) {
      setError('Impossible de soumettre un avis : données de la page manquantes.');
      return;
    }
    setSubmitting(true);
    try {
      const reviewData = {
        pageId,
        pageLogo: pageData.logo_image,
        pageName: pageData.page_name,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        rating,
        comment,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'reviews'), reviewData);
      setSuccessMessage('Merci pour votre avis ! Il a bien été soumis et aide la communauté. 🎉\nVous pouvez modifier ou supprimer votre avis à tout moment.');
      setRating(0);
      setComment('');
      setSubmitting(false);
      // Refresh reviews
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('pageId', '==', pageId)
      );
      const querySnapshot = await getDocs(reviewsQuery);
      let reviewsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      reviewsData = reviewsData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      setReviews(reviewsData);
    } catch (error) {
      console.error('Erreur lors de la soumission de l\'avis:', error);
      setError('Une erreur est survenue lors de la soumission de l\'avis');
      setSubmitting(false);
    }
  };

  // Fonction pour valider la modification d'un avis
  const handleUpdateReview = async (review: Review) => {
    try {
      await updateDoc(doc(db, 'reviews', review.id), {
        rating: editRating,
        comment: editComment,
      });
      // Recharge les avis
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('pageId', '==', pageId)
      );
      let reviewsData = (await getDocs(reviewsQuery)).docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      reviewsData = reviewsData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      setReviews(reviewsData);
      setEditingReviewId(null);
    } catch (error) {
      setError("Erreur lors de la modification de l'avis");
    }
  };

  // Filtrer les avis de l'utilisateur courant pour cette page
  const userReviews = user ? reviews.filter(r => r.userId === user.uid) : [];
  const canSubmitReview = user && !userReview;

  const averageRating = getAverageRating(reviews);
  const starCounts = getStarCounts(reviews);
  const totalReviews = reviews.length;
  const badge = getRatingBadge(averageRating, totalReviews);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!pageData) {
    return (
      <Container>
        <Alert severity="error">
          Impossible de charger les données de la page
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      {/* Header Trustpilot style modernisé */}
      <Grid container spacing={3} alignItems="center" sx={{ mb: 4, flexWrap: 'wrap' }}>
        {/* Left: Profile info vertical */}
        <Grid item xs={12} md={7}>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar
              src={pageData.logo_image || undefined}
              alt={pageData.page_name}
              sx={{ width: 96, height: 96, boxShadow: 4, border: '5px solid #fff', background: '#fff', borderRadius: 4 }}
            />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: 0.5, color: '#10B981', fontSize: { xs: 28, md: 38 } }}>
                {pageData.page_name}
              </Typography>
              {pageData.followers && (
                <Typography variant="subtitle1" sx={{ fontSize: 18, fontWeight: 500, color: '#1F2937' }}>
                  {pageData.followers}
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
        {/* Right: Modern summary card */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 4,
            minWidth: 260,
            maxWidth: 350,
            mx: 'auto',
            boxShadow: '0 8px 32px rgba(16,185,129,0.12)',
            background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)',
            textAlign: 'center',
          }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#1F2937', fontSize: 20 }}>
              Avis globaux
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
              <Typography variant="h2" sx={{ fontWeight: 800, mr: 1, color: badge.color, lineHeight: 1, fontSize: 38 }}>
                {averageRating.toFixed(1)}
              </Typography>
              <Rating
                value={averageRating}
                precision={0.5}
                readOnly
                size="large"
                sx={{ mr: 1, color: badge.color, fontSize: 32 }}
              />
            </Box>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 2 }}>
              <Box sx={{
                bgcolor: badge.color,
                color: badge.textColor,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: 0.5,
                minWidth: 80,
                textAlign: 'center',
              }}>{badge.label}</Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15, color: '#1F2937' }}>
                {totalReviews} avis
              </Typography>
            </Box>
            {/* Bar chart modernisé */}
            <Box sx={{ mt: 1 }}>
              {[5, 4, 3, 2, 1].map(star => (
                <Box key={star} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ width: 38, fontSize: 15, color: '#1F2937' }}>{star}★</Typography>
                  <Box sx={{ flex: 1, mx: 1, height: 16, bgcolor: '#F3F4F6', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                    <Box
                      sx={{
                        width: `${totalReviews ? (starCounts[star - 1] / totalReviews) * 100 : 0}%`,
                        height: '100%',
                        bgcolor:
                          star === 5 ? '#10B981' :
                          star === 4 ? '#34D399' :
                          star === 3 ? '#FDE68A' :
                          star === 2 ? '#F59E42' : '#EF4444',
                        borderRadius: 8,
                        transition: 'width 0.4s',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
                      }}
                    />
                  </Box>
                  <Typography sx={{ width: 32, fontSize: 15, textAlign: 'right', color: '#1F2937' }}>{starCounts[star - 1]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Formulaire d'avis : visible si l'utilisateur a moins de 5 avis */}
      {user ? (
        userReview || successMessage ? (
          <Paper sx={{ p: { xs: 2, md: 4 }, mb: 4, textAlign: 'center', background: 'linear-gradient(135deg, #F3F4F6 80%, #FFFFFF 100%)', borderRadius: 4, boxShadow: 3, border: '1.5px solid #FDE68A' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#10B981', fontSize: 24 }}>
              Merci pour votre avis !
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: '#1F2937', fontSize: 17, fontWeight: 500 }}>
              {successMessage || 'Votre avis a bien été soumis et aide la communauté. Vous pouvez le modifier ou le supprimer à tout moment.'}
            </Typography>
            {userReview && (
              <Box sx={{ mb: 2 }}>
                <Rating value={userReview.rating} readOnly sx={{ mb: 1, fontSize: 28, color: getStarColor(userReview.rating) }} />
                <Typography variant="body2" sx={{ mb: 1, fontSize: 16, color: '#1F2937' }}>{userReview.comment}</Typography>
              </Box>
            )}
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 4, boxShadow: 3, background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)', border: '1.5px solid #FDE68A' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontSize: 20, color: '#10B981' }}>
              Laisser un avis
            </Typography>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmitReview(); }}>
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue || 0)}
                size="large"
                sx={{ mb: 2, fontSize: 32, color: getStarColor(rating) }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Votre commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                sx={{ mb: 2, bgcolor: '#F3F4F6', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                InputLabelProps={{ sx: { fontWeight: 600, color: '#10B981' } }}
                inputProps={{ style: { fontSize: 17, padding: '16px 14px', color: '#1F2937' } }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || !rating || !comment}
                  sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, fontSize: 17, letterSpacing: 0.5, boxShadow: 'none', background: '#10B981', color: '#FFFFFF', transition: 'all 0.2s', '&:hover': { background: '#059669', boxShadow: 2 } }}
                >
                  Publier
                </Button>
              </Box>
            </Box>
          </Paper>
        )
      ) : (
        <Alert severity="info" sx={{ mb: 4, borderRadius: 2, fontSize: 16, bgcolor: '#FDE68A', color: '#1F2937' }}>
          Connectez-vous pour laisser un avis
        </Alert>
      )}

      {/* Liste des avis */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: '#10B981', fontSize: 26, mt: 4, mb: 2 }}>
        Avis ({reviews.length})
      </Typography>
      {reviews.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, fontSize: 16, bgcolor: '#FDE68A', color: '#1F2937' }}>
          Aucun avis pour le moment
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {reviews.map((review) => (
            <Grid item xs={12} key={review.id}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(16,185,129,0.10)', background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)', border: '1.5px solid #FDE68A', transition: 'box-shadow 0.3s, transform 0.2s', '&:hover': { boxShadow: '0 16px 40px rgba(253,230,138,0.18)', background: '#FDE68A', transform: 'translateY(-2px) scale(1.01)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={review.userPhoto}
                      alt={review.userName}
                      sx={{ mr: 2, width: 56, height: 56, boxShadow: 2, border: '2px solid #fff', background: '#fff' }}
                    />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>
                        {review.userName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15, fontWeight: 500, color: '#1F2937' }}>
                        {new Date(review.createdAt?.toDate()).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                  <Rating value={review.rating} readOnly sx={{ mb: 1, fontSize: 28, color: getStarColor(review.rating) }} />
                  <Typography variant="body1" sx={{ mb: 2, fontSize: 17, color: '#1F2937', fontWeight: 500 }}>
                    {review.comment}
                  </Typography>
                  {/* Bouton Modifier/Supprimer pour l'avis de l'utilisateur courant */}
                  {user && review.userId === user.uid && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {editingReviewId === review.id ? (
                        <>
                          <Rating
                            value={editRating}
                            onChange={(_, newValue) => setEditRating(newValue || 0)}
                            sx={{ mb: 1, fontSize: 28, color: getStarColor(editRating) }}
                          />
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editComment}
                            onChange={e => setEditComment(e.target.value)}
                            sx={{ mb: 1, bgcolor: '#F3F4F6', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            inputProps={{ style: { fontSize: 16, padding: '12px 12px', color: '#1F2937' } }}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleUpdateReview(review)}
                            disabled={!editRating || !editComment}
                            sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, fontSize: 15, letterSpacing: 0.5, boxShadow: 'none', background: '#10B981', color: '#FFFFFF', transition: 'all 0.2s', '&:hover': { background: '#059669', boxShadow: 2 } }}
                          >
                            Valider
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setEditingReviewId(null)}
                            sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, fontSize: 15, borderWidth: 2, color: '#10B981', borderColor: '#10B981', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#10B981', color: '#1F2937', boxShadow: 2 } }}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outlined"
                            sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, fontSize: 15, borderWidth: 2, color: '#10B981', borderColor: '#10B981', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#10B981', color: '#1F2937', boxShadow: 2 } }}
                            onClick={() => {
                              setEditingReviewId(review.id);
                              setEditRating(review.rating);
                              setEditComment(review.comment);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, fontSize: 15, borderWidth: 2, color: '#EF4444', borderColor: '#EF4444', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#EF4444', color: '#1F2937', boxShadow: 2 } }}
                            onClick={async () => {
                              await deleteDoc(doc(db, 'reviews', review.id));
                              setReviews(reviews.filter(r => r.id !== review.id));
                            }}
                          >
                            Supprimer
                          </Button>
                        </>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default PageReviews; 