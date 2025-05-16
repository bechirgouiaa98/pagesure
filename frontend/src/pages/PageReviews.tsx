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
  CircularProgress,
  Tooltip,
  Dialog,
  IconButton
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
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface PageData {
  facebookUrl: string;
  info: string[];
  messenger: string | null;
  title: string;
  pageId: string;
  pageName: string;
  pageUrl: string;
  intro: string;
  websites: string[];
  email?: string;
  website?: string;
  profilePictureUrl: string;
  coverPhotoUrl: string;
  profilePhoto?: string;
  creation_date?: string;
  ad_status?: string;
  about_me?: { text: string; urls: string[] };
  facebookId?: string;
  pageAdLibrary?: any;
  address?: string;
  phone?: string;
  rating?: string;
  ratingOverall?: number;
  ratingCount?: number;
  confirmed_owner?: string;
  category?: string;
  verified?: boolean;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  screenshotUrls?: string[];
  createdAt: any;
  title?: string;
  likes?: string[];
  experienceDate?: string | null;
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

// Add this helper function after imports
function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

// Add this helper function near the top (after imports):
function getStoragePathFromUrl(url: string): string | null {
  // Example: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/screenshots%2Fuid%2Ffilename.png?alt=media&token=...
  const match = url.match(/\/o\/(.+)\?/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

const PageReviews = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [editScreenshots, setEditScreenshots] = useState<string[]>([]);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [carouselIndexes, setCarouselIndexes] = useState<{ [reviewId: string]: number }>({});
  const [modalCarouselIndex, setModalCarouselIndex] = useState(0);

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
        if (!finalPageData || !finalPageData.title) {
          const pageRef = doc(db, 'pages', String(pageId));
          const pageSnap = await getDoc(pageRef);
          if (pageSnap.exists()) {
            finalPageData = { ...finalPageData, ...pageSnap.data() };
          }
        }
        if (finalPageData && finalPageData.title) {
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
    setUploading(true);
    let screenshotUrls: string[] = [];
    try {
      if (selectedFiles.length > 0) {
        screenshotUrls = await Promise.all(selectedFiles.map(async (file) => {
          const fileRef = storageRef(storage, `screenshots/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          return await getDownloadURL(fileRef);
        }));
      }
      // Use title or first line of comment
      const reviewTitle = title.trim() ? title.trim() : comment.split('\n')[0].slice(0, 80);
      const reviewData = {
        pageId,
        pageLogo: pageData.profilePictureUrl,
        pageName: pageData.title,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        rating,
        comment,
        screenshotUrls,
        title: reviewTitle,
        likes: [],
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'reviews'), reviewData);
      setSuccessMessage('Merci pour votre avis ! Il a bien été soumis et aide la communauté. 🎉\nVous pouvez modifier ou supprimer votre avis à tout moment.');
      setRating(0);
      setComment('');
      setTitle('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setSubmitting(false);
      setUploading(false);
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
      console.error("Erreur lors de la soumission de l'avis:", error);
      let errorMsg = "Une erreur est survenue lors de la soumission de l'avis";
      if (error instanceof Error) {
        errorMsg += ': ' + error.message;
      }
      setError(errorMsg);
      setSubmitting(false);
      setUploading(false);
    }
  };

  // Fonction pour valider la modification d'un avis
  const handleUpdateReview = async (review: Review) => {
    try {
      // Use title or first line of comment
      const updatedTitle = title.trim() ? title.trim() : editComment.split('\n')[0].slice(0, 80);
      await updateDoc(doc(db, 'reviews', review.id), {
        rating: editRating,
        comment: editComment,
        title: updatedTitle,
        screenshotUrls: editScreenshots,
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

  // Like/unlike logic
  const handleLike = async (review: Review) => {
    if (!user) return;
    const reviewRef = doc(db, 'reviews', review.id);
    const likesArray: string[] = review.likes || [];
    const alreadyLiked = likesArray.includes(user.uid);
    let newLikes: string[];
    if (alreadyLiked) {
      newLikes = likesArray.filter((uid) => uid !== user.uid);
    } else {
      newLikes = [...likesArray, user.uid];
    }
    await updateDoc(reviewRef, { likes: newLikes });
    setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, likes: newLikes } : r));
  };

  // Filtrer les avis de l'utilisateur courant pour cette page
  const userReviews = user ? reviews.filter(r => r.userId === user.uid) : [];
  const canSubmitReview = user && !userReview;

  const averageRating = getAverageRating(reviews);
  const starCounts = getStarCounts(reviews);
  const totalReviews = reviews.length;
  const badge = getRatingBadge(averageRating, totalReviews);

  // Calculate star counts for sidebar
  const starCountsSidebar = [5, 4, 3, 2, 1].map(star => reviews.filter(r => r.rating === star).length);
  const totalReviewsSidebar = reviews.length;
  const averageSidebar = totalReviewsSidebar ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviewsSidebar) : 0;

  // Filter reviews by selected star
  const filteredReviews = starFilter ? reviews.filter(r => r.rating === starFilter) : reviews;

  const handlePrevImage = (reviewId: string, images: string[]) => {
    setCarouselIndexes(prev => ({
      ...prev,
      [reviewId]: prev[reviewId] > 0 ? prev[reviewId] - 1 : images.length - 1
    }));
  };

  const handleNextImage = (reviewId: string, images: string[]) => {
    setCarouselIndexes(prev => ({
      ...prev,
      [reviewId]: prev[reviewId] < images.length - 1 ? prev[reviewId] + 1 : 0
    }));
  };

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
      {/* Header: compact business info */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
        {/* Facebook Button Top Left */}
        {pageData.pageUrl && (
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 12, md: 18 },
              left: { xs: 12, md: 32 },
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              href={pageData.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderRadius: '50%',
                minWidth: { xs: 36, md: 44 },
                minHeight: { xs: 36, md: 44 },
                width: { xs: 36, md: 44 },
                height: { xs: 36, md: 44 },
                p: 0,
                background: '#1877F3',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(24,119,243,0.10)',
                '&:hover': {
                  background: '#145db2',
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(24,119,243,0.15)'
                },
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook" style={{ width: 22, height: 22 }} />
            </Button>
          </Box>
        )}
        {/* Main header content */}
        <Grid item xs={12} md={7}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Avatar
              src={pageData.profilePictureUrl || undefined}
              alt={pageData.title}
              sx={{
                width: { xs: 140, md: 160 },
                height: { xs: 140, md: 160 },
                boxShadow: 5,
                border: '5px solid #fff',
                background: '#fff',
                borderRadius: '50%',
                mb: 1,
                mx: 'auto',
                display: 'block',
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', mb: 1, gap: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, letterSpacing: 0.5, color: '#10B981', fontSize: { xs: 36, md: 44 }, textAlign: 'center' }}>
                {pageData.title}
                {pageData.verified && (
                  <Tooltip title="Vérifié" arrow>
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 8 }}>
                      <CheckCircleIcon
                        sx={{
                          color: '#1877F2',
                          fontSize: 28,
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                        }}
                      />
                    </span>
                  </Tooltip>
                )}
              </Typography>
            </Box>
            {pageData.category && (
              <Typography variant="subtitle2" sx={{ fontSize: { xs: 22, md: 24 }, fontWeight: 600, color: '#6B7280', mt: 0.5, textAlign: 'center' }}>
                {pageData.category}
              </Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{
            p: { xs: 1.5, md: 3 },
            borderRadius: 4,
            minWidth: 180,
            maxWidth: 350,
            mx: { xs: 0, md: 'auto' },
            boxShadow: '0 8px 32px rgba(16,185,129,0.12)',
            background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)',
            border: '1.5px solid #FDE68A',
            textAlign: 'center',
            width: { xs: '100%', md: 'auto' },
          }}>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, color: '#1F2937', fontSize: { xs: 15, md: 18 } }}>
              Avis globaux
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
              <Typography variant="h1" sx={{ fontWeight: 900, mr: 1, color: badge.color, lineHeight: 1, fontSize: { xs: 44, md: 56 } }}>
                {averageRating.toFixed(1)}
              </Typography>
              <Rating
                value={averageRating}
                precision={0.5}
                readOnly
                size="large"
                sx={{ mr: 1, color: badge.color, fontSize: { xs: 32, md: 40 } }}
              />
            </Box>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 1 }}>
              <Box sx={{
                bgcolor: badge.color,
                color: badge.textColor,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: { xs: 12, md: 15 },
                letterSpacing: 0.5,
                minWidth: 60,
                textAlign: 'center',
              }}>{badge.label}</Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 12, md: 15 }, color: '#1F2937' }}>
                {totalReviews} avis
              </Typography>
            </Box>
            <Box sx={{ mt: 0.5 }}>
              {[5, 4, 3, 2, 1].map(star => (
                <Box key={star} display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ width: 24, fontSize: { xs: 12, md: 15 }, color: '#1F2937' }}>{star}★</Typography>
                  <Box sx={{ flex: 1, mx: 1, height: 8, bgcolor: '#F3F4F6', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
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
                  <Typography sx={{ width: 18, fontSize: { xs: 12, md: 15 }, textAlign: 'right', color: '#1F2937' }}>{starCounts[star - 1]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Laisser un avis form (moved up) */}
      {user ? (
        !userReview && !successMessage && (
          <Paper sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 4, boxShadow: 3, background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)', border: '1.5px solid #FDE68A', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontSize: 20, color: '#10B981' }}>
              Laisser un avis
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmitReview(); }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                  {previewUrls.map((url, idx) => (
                    <Box key={url} sx={{ position: 'relative', width: 80, height: 80 }}>
                      <Avatar
                        src={url}
                        alt={`Screenshot Preview ${idx + 1}`}
                        sx={{ width: 80, height: 80, mb: 1 }}
                        variant="rounded"
                      />
                      <IconButton
                        size="small"
                        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: '#fff', color: '#EF4444', '&:hover': { bgcolor: '#FDE68A', color: '#B91C1C' } }}
                        onClick={async () => {
                          const path = getStoragePathFromUrl(url);
                          if (path) {
                            try {
                              await deleteObject(storageRef(storage, path));
                            } catch (err) {
                              console.error('Failed to delete image from storage:', err);
                            }
                          }
                          setSelectedFiles(files => files.filter((_, i) => i !== idx));
                          setPreviewUrls(urls => urls.filter((_, i) => i !== idx));
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {previewUrls.length < 3 && (
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<PhotoCamera />}
                      sx={{ mb: 2, minWidth: 80, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {previewUrls.length === 0 ? "Add image" : "Add another image"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && previewUrls.length < 3) {
                            setSelectedFiles(files => [...files, file]);
                            setPreviewUrls(urls => [...urls, URL.createObjectURL(file)]);
                          }
                        }}
                      />
                    </Button>
                  )}
                </Box>
                {uploading && <CircularProgress />}
              </Box>
              <TextField
                fullWidth
                label="Titre de l'avis (optionnel)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                sx={{ mb: 2, bgcolor: '#F3F4F6', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                InputLabelProps={{ sx: { fontWeight: 600, color: '#10B981' } }}
                inputProps={{ style: { fontSize: 17, padding: '16px 14px', color: '#1F2937' } }}
              />
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue || 0)}
                size="large"
                sx={{ mb: 2, fontSize: 32, color: '#FFD600' }}
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
        <Alert severity="info" sx={{ mb: 4, borderRadius: 2, fontSize: 16, bgcolor: '#FDE68A', color: '#1F2937', display: 'flex', justifyContent: 'center', alignItems: 'center', p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <span style={{ marginBottom: 14, textAlign: 'center', width: '100%' }}>Connectez-vous pour laisser un avis</span>
            <Button
              variant="contained"
              size="medium"
              sx={{
                bgcolor: '#10B981',
                color: '#fff',
                fontWeight: 700,
                borderRadius: 3,
                px: 3,
                py: 1,
                fontSize: 16,
                boxShadow: 'none',
                textTransform: 'none',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  bgcolor: '#059669',
                  color: '#fff',
                },
              }}
              onClick={signInWithGoogle}
            >
              Se connecter
            </Button>
          </Box>
        </Alert>
      )}

      {/* Sticky Sidebar and Reviews Section */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 4, position: 'relative' }}>
        {/* Sticky Sidebar */}
        <Box
          sx={{
            position: 'sticky',
            top: 32,
            alignSelf: 'flex-start',
            minWidth: 240,
            maxWidth: 280,
            mr: { xs: 0, md: 4 },
            mb: 4,
            zIndex: 2,
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Paper elevation={0} sx={{
            p: { xs: 1.5, md: 3 },
            borderRadius: 4,
            minWidth: 180,
            maxWidth: 350,
            mx: { xs: 0, md: 'auto' },
            boxShadow: '0 8px 32px rgba(16,185,129,0.12)',
            background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)',
            border: '1.5px solid #FDE68A',
            textAlign: 'center',
            width: { xs: '100%', md: 'auto' },
          }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#10B981', mb: 1, fontSize: 22, textAlign: 'center' }}>
              All reviews <span style={{ color: '#6B7280', fontWeight: 500, fontSize: 18 }}>({totalReviewsSidebar})</span>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 900, color: getStarColor(averageSidebar), mr: 1, fontSize: 36 }}>{averageSidebar.toFixed(1)}</Typography>
              <Rating value={averageSidebar} precision={0.5} readOnly size="large" sx={{ color: getStarColor(averageSidebar), fontSize: 32 }} />
              </Box>
            <Box sx={{ mb: 2 }}>
              {[5, 4, 3, 2, 1].map((star, idx) => (
                <Box
                  key={star}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: starFilter === star ? '#ECFDF5' : 'transparent',
                    border: starFilter === star ? '2px solid #10B981' : '2px solid transparent',
                    transition: 'background 0.2s, border 0.2s',
                  }}
                  onClick={() => setStarFilter(starFilter === star ? null : star)}
                >
                  <Checkbox
                    checked={starFilter === star}
                    sx={{ p: 0.5, color: '#10B981', '&.Mui-checked': { color: '#10B981' } }}
                    icon={<span style={{ border: '2px solid #10B981', borderRadius: 4, width: 18, height: 18, display: 'inline-block' }} />}
                    checkedIcon={<span style={{ background: '#10B981', borderRadius: 4, width: 18, height: 18, display: 'inline-block', color: '#fff', position: 'relative' }}><svg width="18" height="18" viewBox="0 0 18 18"><polyline points="4,10 8,14 14,6" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2 }} /></svg></span>}
                    readOnly
                  />
                  <Typography sx={{ fontWeight: 600, fontSize: 16, color: '#1F2937', minWidth: 32, ml: 1 }}>{star}★</Typography>
                  <Box sx={{ flex: 1, mx: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={totalReviewsSidebar ? (starCountsSidebar[5 - star] / totalReviewsSidebar) * 100 : 0}
                      sx={{
                        height: 8,
                        borderRadius: 8,
                        bgcolor: '#F3F4F6',
                        '& .MuiLinearProgress-bar': {
                          bgcolor:
                            star === 5 ? '#10B981' :
                            star === 4 ? '#34D399' :
                            star === 3 ? '#FDE68A' :
                            star === 2 ? '#F59E42' : '#EF4444',
                        },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontWeight: 500, fontSize: 15, color: '#1F2937', minWidth: 24, textAlign: 'right', ml: 1 }}>{starCountsSidebar[5 - star]}</Typography>
              </Box>
              ))}
            </Box>
            <Button
              variant="outlined"
              fullWidth
              sx={{ borderRadius: 3, fontWeight: 700, color: '#10B981', borderColor: '#10B981', mt: 1, mb: 1, textTransform: 'none' }}
              onClick={() => setStarFilter(null)}
              disabled={starFilter === null}
            >
              Réinitialiser
            </Button>
          </Paper>
        </Box>
        {/* Reviews Section */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: '#10B981', fontSize: 26, mb: 2, textAlign: 'center', width: '100%' }}>
              Avis ({filteredReviews.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: 3 }}>
              {filteredReviews.map((review) => {
                const likedByUser = user && review.likes && review.likes.includes(user.uid);
                const screenshots = review.screenshotUrls || [];
                const currentIndex = carouselIndexes[review.id] || 0;
                return (
                  <Card key={review.id} sx={{
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(16,185,129,0.10)',
                    background: 'linear-gradient(135deg, #FFFFFF 80%, #F3F4F6 100%)',
                    border: '1.5px solid #FDE68A',
                    transition: 'box-shadow 0.3s, transform 0.2s',
                    '&:hover': { boxShadow: '0 16px 40px rgba(253,230,138,0.18)', background: '#FDE68A', transform: 'translateY(-2px) scale(1.01)' },
                    p: { xs: 2, md: 3 },
                    maxWidth: { xs: '100%', md: 800 },
                    width: '100%',
                    mx: 0,
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                        {/* Left: review text */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar src={review.userPhoto} alt={review.userName} sx={{ width: 48, height: 48, boxShadow: 2, border: '2px solid #fff', background: '#fff' }} />
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>{review.userName}</Typography>
                                {review.createdAt && review.createdAt.toDate && (
                                  <Typography sx={{ fontSize: 13, color: '#6B7280', fontWeight: 400, mt: 0.2, mb: 0.5 }}>
                                    Date de l'expérience: {new Date(review.createdAt.toDate()).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton onClick={() => handleLike(review)} disabled={!user} aria-label="J'aime">
                                {likedByUser ? <FavoriteIcon sx={{ color: '#EF4444' }} /> : <FavoriteBorderIcon sx={{ color: '#EF4444' }} />}
                              </IconButton>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#EF4444', minWidth: 24, textAlign: 'center' }}>{review.likes ? review.likes.length : 0}</Typography>
                            </Box>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981', fontSize: 20, mb: 1 }}>
                            {editingReviewId === review.id ? (
                              <>
                                {/* Editable Title in place */}
                                <TextField
                                  fullWidth
                                  label="Titre de l'avis (optionnel)"
                                  value={title}
                                  onChange={e => setTitle(e.target.value)}
                                  sx={{ mb: 1, bgcolor: '#F3F4F6', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 }, fontWeight: 700, fontSize: 20, color: '#10B981' }}
                                  InputLabelProps={{ sx: { fontWeight: 600, color: '#10B981' } }}
                                  inputProps={{ style: { fontSize: 20, fontWeight: 700, color: '#10B981' } }}
                                />
                                {/* Editable Rating in place */}
                                <Rating
                                  value={editRating}
                                  onChange={(_, newValue) => setEditRating(newValue || 0)}
                                  sx={{ mb: 1, fontSize: 24, color: '#FFD600' }}
                                />
                                {/* Editable Comment in place */}
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={3}
                                  value={editComment}
                                  onChange={e => setEditComment(e.target.value)}
                                  sx={{ mb: 1, bgcolor: '#F3F4F6', borderRadius: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 }, fontSize: 16, fontWeight: 500, color: '#1F2937' }}
                                  inputProps={{ style: { fontSize: 16, fontWeight: 500, color: '#1F2937' } }}
                                />
                              </>
                            ) : (
                              <>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981', fontSize: 20, mb: 1 }}>
                                  {review.title || review.comment.split('\n')[0].slice(0, 80)}
                                </Typography>
                                <Rating value={review.rating} readOnly sx={{ mb: 1, fontSize: 24, color: '#FFD600' }} />
                                <Typography variant="body1" sx={{ mb: 2, fontSize: 16, color: '#1F2937', fontWeight: 500, whiteSpace: 'pre-line' }}>
                                  {review.comment}
                                </Typography>
                              </>
                            )}
                          </Typography>
                          {/* Only one set of action buttons below, outside Typography */}
                          {user && review.userId === user.uid && (
                            editingReviewId === review.id ? (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleUpdateReview(review)}
                                  disabled={!editRating || !editComment}
                                  sx={{ borderRadius: 3, px: 2, py: 0.5, fontWeight: 700, fontSize: 14, letterSpacing: 0.5, boxShadow: 'none', background: '#10B981', color: '#FFFFFF', transition: 'all 0.2s', '&:hover': { background: '#059669', boxShadow: 2 }, mb: 0 }}
                                >
                                  Valider
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => setEditingReviewId(null)}
                                  sx={{ borderRadius: 3, px: 2, py: 0.5, fontWeight: 700, fontSize: 14, borderWidth: 2, color: '#10B981', borderColor: '#10B981', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#10B981', color: '#1F2937', boxShadow: 2 } }}
                                >
                                  Annuler
                                </Button>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Button
                                  variant="outlined"
                                  sx={{ borderRadius: 3, px: 2, py: 0.5, fontWeight: 700, fontSize: 14, borderWidth: 2, color: '#10B981', borderColor: '#10B981', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#10B981', color: '#1F2937', boxShadow: 2 }, mb: 0 }}
                                  onClick={() => {
                                    setEditingReviewId(review.id);
                                    setEditRating(review.rating);
                                    setEditComment(review.comment);
                                    setTitle(review.title || '');
                                    setEditScreenshots(review.screenshotUrls || []);
                                  }}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  sx={{ borderRadius: 3, px: 2, py: 0.5, fontWeight: 700, fontSize: 14, borderWidth: 2, color: '#EF4444', borderColor: '#EF4444', background: '#FFFFFF', transition: 'all 0.2s', boxShadow: 'none', '&:hover': { background: '#FDE68A', borderColor: '#EF4444', color: '#1F2937', boxShadow: 2 } }}
                                  onClick={async () => {
                                    await deleteDoc(doc(db, 'reviews', review.id));
                                    // Refetch reviews from Firestore
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
                                    // Update userReview
                                    if (user) {
                                      const userReview = reviewsData.find(r => r.userId === user.uid);
                                      setUserReview(userReview || null);
                                    }
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Box>
                            )
                          )}
                        </Box>
                        {/* Right: screenshot images or edit UI */}
                        {editingReviewId === review.id ? (
                          <Box sx={{ ml: 3, minWidth: 120, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                              {editScreenshots.map((url, idx) => (
                                <Box key={url} sx={{ position: 'relative', width: 80, height: 80 }}>
                                  <Avatar
                                    src={url}
                                    alt={`Screenshot Edit ${idx + 1}`}
                                    sx={{ width: 80, height: 80, mb: 1 }}
                                    variant="rounded"
                                  />
                                  <IconButton
                                    size="small"
                                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: '#fff', color: '#EF4444', '&:hover': { bgcolor: '#FDE68A', color: '#B91C1C' } }}
                                    onClick={async () => {
                                      const path = getStoragePathFromUrl(url);
                                      if (path) {
                                        try {
                                          await deleteObject(storageRef(storage, path));
                                        } catch (err) {
                                          console.error('Failed to delete image from storage:', err);
                                        }
                                      }
                                      setEditScreenshots(editScreenshots.filter((_, i) => i !== idx));
                                    }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                              {editScreenshots.length < 3 && (
                                <Box sx={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #10B981', borderRadius: 8, cursor: 'pointer', bgcolor: '#F3F4F6' }}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id={`upload-screenshot-edit-${review.id}`}
                                    onChange={async (e) => {
                                      if (!user) return;
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setUploadingScreenshot(true);
                                        const fileRef = storageRef(storage, `screenshots/${user.uid}/${Date.now()}_${file.name}`);
                                        await uploadBytes(fileRef, file);
                                        const url = await getDownloadURL(fileRef);
                                        setEditScreenshots(prev => [...prev, url]);
                                        setUploadingScreenshot(false);
                                      }
                                    }}
                                  />
                                  <label htmlFor={`upload-screenshot-edit-${review.id}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <PhotoCamera sx={{ color: '#10B981', fontSize: 32 }} />
                                  </label>
                                </Box>
                              )}
                              {uploadingScreenshot && <CircularProgress size={24} sx={{ ml: 1 }} />}
                            </Box>
                          </Box>
                        ) : (
                          screenshots.length > 0 && (
                            <Box sx={{ ml: 3, minWidth: 120, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                                {screenshots.map((url, idx) => (
                                  <Box key={url} sx={{ width: 80, height: 80, textAlign: 'center' }}>
                                    <img
                                      src={url}
                                      alt={`Screenshot ${idx + 1}`}
                                      style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.10)', cursor: 'pointer' }}
                                      onClick={() => {
                                        setZoomedImage(url);
                                        setModalCarouselIndex(idx);
                                      }}
                                    />
                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                      Cliquez pour agrandir
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Modal for zoomed image */}
      <Dialog open={!!zoomedImage} onClose={() => setZoomedImage(null)} maxWidth="md" fullWidth>
        <Box sx={{ position: 'relative', bgcolor: '#000', p: 2, textAlign: 'center' }}>
          <IconButton
            onClick={() => setZoomedImage(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 2 }}
            aria-label="Fermer"
          >
            <CloseIcon />
          </IconButton>
          {zoomedImage && (() => {
            const review = filteredReviews.find(r => r.screenshotUrls?.includes(zoomedImage));
            const images = review?.screenshotUrls || [];
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {images.length > 1 && (
                  <IconButton
                    onClick={() => {
                      if (!review) return;
                      setModalCarouselIndex(modalCarouselIndex > 0 ? modalCarouselIndex - 1 : images.length - 1);
                      setZoomedImage(images[modalCarouselIndex > 0 ? modalCarouselIndex - 1 : images.length - 1]);
                    }}
                    sx={{ color: '#fff' }}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                )}
                <img
                  src={zoomedImage}
                  alt="Zoomed Screenshot"
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    borderRadius: 8,
                    margin: '0 auto',
                    display: 'block',
                    background: '#fff',
                  }}
                />
                {images.length > 1 && (
                  <IconButton
                    onClick={() => {
                      if (!review) return;
                      setModalCarouselIndex(modalCarouselIndex < images.length - 1 ? modalCarouselIndex + 1 : 0);
                      setZoomedImage(images[modalCarouselIndex < images.length - 1 ? modalCarouselIndex + 1 : 0]);
                    }}
                    sx={{ color: '#fff' }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                )}
              </Box>
            );
          })()}
        </Box>
      </Dialog>
    </Container>
  );
};

export default PageReviews; 