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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Home = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!url) {
      setError('Veuillez entrer une URL');
      setLoading(false);
      return;
    }

    if (!url.includes('facebook.com/')) {
      setError('Veuillez entrer une URL Facebook valide');
      setLoading(false);
      return;
    }

    try {
      const pageId = url.split('facebook.com/')[1].split('?')[0];
      const pageRef = doc(db, 'pages', pageId);
      const pageSnap = await getDoc(pageRef);

      let pageData;
      if (pageSnap.exists()) {
        pageData = pageSnap.data();
      } else {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error('Erreur lors de l\'analyse de la page');
        pageData = await response.json();

        await setDoc(pageRef, pageData);
      }

      navigate(`/page/${pageId}`, { state: { pageData } });
    } catch (error) {
      setError('Une erreur est survenue lors de l\'analyse de la page');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#FFFFFF', minHeight: '100vh', pb: 8 }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          py: { xs: 10, md: 16 },
          mb: { xs: 2, md: 4 },
          borderRadius: 0,
          boxShadow: '0 2px 16px rgba(16,185,129,0.07)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.7rem', md: '3.8rem' },
              letterSpacing: 0.5,
              mb: 3.5,
              color: '#1F2937',
              lineHeight: 1.13,
            }}
          >
            Trouvez une page Facebook fiable
          </Typography>
          <Typography
            variant="h5"
            sx={{ mb: 7, color: '#10B981', fontWeight: 400, fontSize: { xs: 18, md: 24 }, opacity: 0.95, lineHeight: 1.4 }}
          >
            la référence des avis sur les pages Facebook
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              borderRadius: 8,
              boxShadow: '0 4px 24px rgba(16,185,129,0.10)',
              background: '#FFFFFF',
              maxWidth: 700,
              mx: 'auto',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <TextField
                fullWidth
                variant="outlined"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                error={!!error}
                helperText={error}
                placeholder="Rechercher une page Facebook…"
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 8,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 8,
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#1F2937',
                    background: '#FFFFFF',
                    boxShadow: 'none',
                    height: 68,
                  },
                  '& .MuiInputBase-input': {
                    py: 2.5,
                    px: 2.5,
                  },
                  mr: 2.5,
                }}
                InputLabelProps={{ sx: { fontWeight: 600, color: '#10B981' } }}
                inputProps={{ style: { fontSize: 22, color: '#1F2937' } }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  minWidth: 72,
                  minHeight: 72,
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.10)',
                  ml: 1,
                  p: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    background: '#059669',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.18)',
                  },
                }}
                disabled={loading}
              >
                <SearchIcon sx={{ fontSize: 38 }} />
              </Button>
            </form>
          </Paper>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="md">
        <Grid container spacing={4} sx={{ mt: { xs: 2, md: 5 } }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                height: '100%',
                textAlign: 'center',
                borderRadius: 4,
                boxShadow: '0 4px 16px rgba(16,185,129,0.07)',
                background: '#FFFFFF',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(16,185,129,0.13)',
                  background: '#FDE68A',
                },
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#10B981', fontSize: 20 }}>
                Avis Vérifiés
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500, color: '#1F2937' }}>
                Tous les avis sont vérifiés et proviennent d'utilisateurs authentiques
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                height: '100%',
                textAlign: 'center',
                borderRadius: 4,
                boxShadow: '0 4px 16px rgba(16,185,129,0.07)',
                background: '#FFFFFF',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(16,185,129,0.13)',
                  background: '#FDE68A',
                },
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#10B981', fontSize: 20 }}>
                Communauté Active
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500, color: '#1F2937' }}>
                Une communauté active d'utilisateurs partageant leurs expériences
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                height: '100%',
                textAlign: 'center',
                borderRadius: 4,
                boxShadow: '0 4px 16px rgba(16,185,129,0.07)',
                background: '#FFFFFF',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(16,185,129,0.13)',
                  background: '#FDE68A',
                },
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#10B981', fontSize: 20 }}>
                Gratuit
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500, color: '#1F2937' }}>
                Service entièrement gratuit pour tous les utilisateurs
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Home; 