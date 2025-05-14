import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';

// Define PageData type for suggestions
interface PageData {
  id: string;
  title: string;
  profilePictureUrl: string;
  category: string;
  avg: number;
  count: number;
  pageId: string;
  verified: boolean;
}

// Animated dots loader component
const DotsLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, mt: 1 }}>
    <span className="dots-loader">
      <span>.</span><span>.</span><span>.</span>
    </span>
    <style>{`
      .dots-loader span {
        animation: blink 1.4s infinite both;
        font-size: 2.2rem;
        color: #1877F2;
        font-weight: bold;
        margin: 0 2px;
      }
      .dots-loader span:nth-child(2) { animation-delay: 0.2s; }
      .dots-loader span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes blink {
        0%, 80%, 100% { opacity: 0.2; }
        40% { opacity: 1; }
      }
    `}</style>
  </Box>
);

const Home = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<PageData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showScrapeLoading, setShowScrapeLoading] = useState(false);

  const extractPageId = (url: string) => {
    const match = url.match(/facebook\.com\/(.+)/);
    if (!match) return null;
    let path = match[1].split('?')[0];
    // For profile.php?id=... URLs, use the id as the pageId
    if (path === 'profile.php') {
      const idMatch = url.match(/[?&]id=(\d+)/);
      if (idMatch) return `profile_${idMatch[1]}`;
      return 'profile.php'; // fallback
    }
    // For normal pages, use the path (e.g., page name)
    return path.replace(/\/$/, ''); // remove trailing slash
  };

  // Helper to get average rating and review count for a page
  const getPageStats = async (pageId: string) => {
    const reviewsQuery = query(collection(db, 'reviews'), where('pageId', '==', pageId));
    const querySnapshot = await getDocs(reviewsQuery);
    const reviews = querySnapshot.docs.map(doc => doc.data());
    const count = reviews.length;
    const avg = count ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / count) : 0;
    return { avg: Math.round(avg * 10) / 10, count };
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setUrl(value); // keep url for fallback
    setError('');
    if (!value || value.startsWith('http') || value.includes('facebook.com/')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    // Query Firestore for pages with title starting with value (case-insensitive)
    const pagesQuery = query(collection(db, 'pages'));
    const snapshot = await getDocs(pagesQuery);
    let matches = snapshot.docs
      .map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        profilePictureUrl: doc.data().profilePictureUrl || '',
        category: doc.data().category || '',
        pageId: doc.data().pageId || '',
        verified: doc.data().verified || false
      }))
      .filter(page => page.title && page.title.toLowerCase().startsWith(value.toLowerCase()));
    // For each match, get stats and build a full PageData object
    const enrichedMatches: PageData[] = await Promise.all(matches.slice(0, 7).map(async (page) => {
      const stats = await getPageStats(page.id);
      return {
        id: page.id,
        title: page.title,
        profilePictureUrl: page.profilePictureUrl,
        category: page.category,
        pageId: page.pageId,
        avg: stats.avg,
        count: stats.count,
        verified: page.verified
      };
    }));
    setSuggestions(enrichedMatches);
    setShowSuggestions(true);
    setSearchLoading(false);
  };

  const handleSuggestionClick = (page: PageData) => {
    navigate(`/page/${page.id}`);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowScrapeLoading(false);

    // If user entered a Facebook URL, fallback to original logic
    if (search.startsWith('http') || search.includes('facebook.com/')) {
      if (!search) {
        setError('Veuillez entrer une URL');
        setLoading(false);
        setShowScrapeLoading(false);
        return;
      }
      if (!search.includes('facebook.com/')) {
        setError('Veuillez entrer une URL Facebook valide');
        setLoading(false);
        setShowScrapeLoading(false);
        return;
      }
      try {
        setShowScrapeLoading(true);
        const pageId = extractPageId(search);
        if (!pageId) {
          setError('Impossible d\'extraire l\'identifiant de la page Facebook');
          setLoading(false);
          setShowScrapeLoading(false);
          return;
        }
        const pageRef = doc(db, 'pages', pageId);
        const pageSnap = await getDoc(pageRef);
        let pageData;
        if (pageSnap.exists()) {
          pageData = pageSnap.data();
        } else {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: search }),
          });
          if (!response.ok) throw new Error('Erreur lors de l\'analyse de la page');
          pageData = await response.json();
          await setDoc(pageRef, { ...pageData, pageUrl: search });
        }
        setShowScrapeLoading(false);
        navigate(`/page/${pageId}`, { state: { pageData } });
      } catch (error) {
        setError('Une erreur est survenue lors de l\'analyse de la page');
        setShowScrapeLoading(false);
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
      return;
    }
    // If user typed a name, do nothing (handled by suggestions)
    setLoading(false);
    setShowScrapeLoading(false);
  };

  return (
    <Box
      sx={{
        bgcolor: '#F7F8FA',
        py: { xs: 4, md: 10 },
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: { xs: 1, md: 0 },
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: 'center', px: { xs: 0.5, md: 0 } }}>
        <Typography
          variant="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '2.2rem', md: '3.2rem' },
            letterSpacing: 0.5,
            mb: 1.5,
            color: '#1F2937',
            lineHeight: 1.13,
            mt: 2,
          }}
        >
          Achetez en confiance.
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ mb: 4, color: '#10B981', fontWeight: 500, fontSize: { xs: 16, md: 22 }, opacity: 0.95, lineHeight: 1.4 }}
        >
          Des avis réels.
        </Typography>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', maxWidth: 500, position: 'relative' }}>
          <TextField
            fullWidth
            variant="outlined"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            error={!!error}
            helperText={error}
            placeholder="Rechercher une page Facebook…"
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(16,185,129,0.10)',
              fontSize: { xs: 20, md: 24 },
              fontWeight: 500,
              color: '#1F2937',
              height: { xs: 56, md: 68 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                fontSize: { xs: 20, md: 24 },
                fontWeight: 500,
                color: '#1F2937',
                background: '#FFFFFF',
                boxShadow: 'none',
                height: { xs: 56, md: 68 },
              },
              '& .MuiInputBase-input': {
                py: { xs: 2, md: 2.5 },
                px: { xs: 2, md: 2.5 },
              },
              mr: { xs: 1, md: 2.5 },
            }}
            InputLabelProps={{ sx: { fontWeight: 600, color: '#10B981' } }}
            inputProps={{ style: { fontSize: 20, color: '#1F2937' } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{
              minWidth: { xs: 52, md: 72 },
              minHeight: { xs: 52, md: 72 },
              width: { xs: 52, md: 72 },
              height: { xs: 52, md: 72 },
              borderRadius: '50%',
              background: '#1877F2',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(24,119,243,0.10)',
              ml: { xs: 0.5, md: 1 },
              p: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, box-shadow 0.2s',
              '&:hover': {
                background: '#145db2',
                boxShadow: '0 4px 16px rgba(24,119,243,0.18)',
              },
            }}
            disabled={loading}
          >
            {loading && showScrapeLoading ? <CircularProgress size={28} sx={{ color: '#fff' }} /> : <SearchIcon sx={{ fontSize: { xs: 32, md: 38 } }} />}
          </Button>
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, mt: 1, borderRadius: 3, boxShadow: 4, maxHeight: 350, overflowY: 'auto' }}>
              <List>
                {suggestions.map(page => (
                  <ListItemButton key={page.id || page.pageId} onMouseDown={() => handleSuggestionClick(page)} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar src={page.profilePictureUrl || ''} alt={page.title} sx={{ width: 48, height: 48, mr: 1 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <span style={{ fontWeight: 700, fontSize: 18, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {page.title}
                          {page.verified && (
                            <CheckCircleIcon sx={{ color: '#1877F2', fontSize: 20, ml: 0.5, verticalAlign: 'middle' }} />
                          )}
                        </span>
                      }
                      secondary={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Rating value={page.avg ?? 0} precision={0.1} readOnly size="small" sx={{ color: (page.avg ?? 0) >= 4 ? '#10B981' : (page.avg ?? 0) >= 3 ? '#FDE68A' : '#EF4444', fontSize: 20 }} />
                          <span style={{ fontWeight: 500, color: '#6B7280', fontSize: 15 }}>{page.avg !== undefined ? page.avg.toFixed(1) : '—'} ({page.count ?? 0} avis)</span>
                          {page.category && <span style={{ color: '#2563EB', fontSize: 14, marginLeft: 8 }}>{page.category}</span>}
                        </span>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </form>
        {/* Scrape loading spinner and message */}
        {showScrapeLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, mb: 2 }}>
            <DotsLoader />
            <Typography variant="subtitle1" sx={{ color: '#1877F2', fontWeight: 600, fontSize: 18, mb: 1 }}>
              Analyse de la page en cours…
            </Typography>
            <Typography variant="body2" sx={{ color: '#1F2937', fontSize: 16, opacity: 0.85 }}>
              Veuillez patienter quelques secondes pendant que nous récupérons les informations Facebook.
            </Typography>
          </Box>
        )}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.07)' }}>
              <CheckCircleIcon sx={{ color: '#10B981', fontSize: 32, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1F2937', mb: 0.5 }}>Avis vérifiés</Typography>
              <Typography sx={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>Des avis authentiques pour chaque page.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.07)' }}>
              <GroupsIcon sx={{ color: '#2563EB', fontSize: 32, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1F2937', mb: 0.5 }}>Communauté active</Typography>
              <Typography sx={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>Partage d'expériences réelles.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.07)' }}>
              <AttachMoneyIcon sx={{ color: '#059669', fontSize: 32, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1F2937', mb: 0.5 }}>Gratuit</Typography>
              <Typography sx={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>Aucun frais, accès libre.</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Home; 