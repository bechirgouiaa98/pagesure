import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  TextField,
  Paper,
  List as MUIList,
  ListItemAvatar,
  Avatar as MUIAvatar,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Rating from '@mui/material/Rating';

interface PageData {
  id: string;
  title: string;
  profilePictureUrl: string;
  category: string;
  pageId: string;
  verified: boolean;
  avg?: number;
  count?: number;
}

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<PageData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [showScrapeLoading, setShowScrapeLoading] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      handleClose();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setError('');
    if (!value || value.startsWith('http') || value.includes('facebook.com/')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
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
    setSuggestions(matches);
    setShowSuggestions(true);
    setSearchLoading(false);
  };

  const handleSuggestionClick = (page: PageData) => {
    setSearchOverlayOpen(false);
    setShowSuggestions(false);
    setSearch('');
    navigate(`/page/${page.id}`);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowScrapeLoading(false);
    if (search.startsWith('http') || search.includes('facebook.com/')) {
      if (!search) {
        setError('Veuillez entrer une URL');
        setShowScrapeLoading(false);
        return;
      }
      if (!search.includes('facebook.com/')) {
        setError('Veuillez entrer une URL Facebook valide');
        setShowScrapeLoading(false);
        return;
      }
      try {
        setShowScrapeLoading(true);
        const pageId = search.match(/facebook\.com\/(.+)/)?.[1]?.split('?')[0] || '';
        if (!pageId) {
          setError('Impossible d\'extraire l\'identifiant de la page Facebook');
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
          await setDoc(pageRef, { ...pageData, pageUrl: search, categoryKey: pageData.categoryKey });
        }
        setShowScrapeLoading(false);
        setSearchOverlayOpen(false);
        setSearch('');
        navigate(`/page/${pageId}`, { state: { pageData } });
      } catch (error) {
        setError('Une erreur est survenue lors de l\'analyse de la page');
        setShowScrapeLoading(false);
        console.error('Erreur:', error);
      }
      return;
    }
  };

  // --- MOBILE HEADER ---
  if (isMobile) {
    return (
      <AppBar position="static" sx={{ bgcolor: '#10B981', color: '#1F2937', borderRadius: 0, boxShadow: '0 4px 24px rgba(16,185,129,0.10)', px: 1, py: 0.5 }}>
        <Toolbar sx={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0 }}>
          {/* Hamburger */}
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)}>
            <MenuIcon sx={{ fontSize: 32, color: '#fff' }} />
          </IconButton>
          {/* Logo */}
          <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexGrow: 1, justifyContent: 'center' }}>
            <img src="/logo.svg" alt="PageSure Logo" style={{ height: 40, width: 'auto', display: 'block' }} />
          </Box>
          {/* Search icon (optional, can be hidden or used for future search overlay) */}
          <IconButton edge="end" color="inherit" aria-label="search" sx={{ ml: 1 }} onClick={() => setSearchOverlayOpen(true)}>
            <SearchIcon sx={{ fontSize: 28, color: '#fff' }} />
          </IconButton>
        </Toolbar>
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: '100vw',
              maxWidth: 360,
              bgcolor: '#1F2937',
              color: '#fff',
              height: '100vh',
              p: 0,
              display: 'flex',
              flexDirection: 'column',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 2 }}>
            <img src="/logo.svg" alt="PageSure Logo" style={{ height: 32, width: 'auto' }} />
            <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </Box>
          <Divider sx={{ bgcolor: '#10B981', opacity: 0.2, mb: 1 }} />
          <List sx={{ flexGrow: 1 }}>
            {!user && (
              <ListItem disablePadding>
                <ListItemButton onClick={() => { setDrawerOpen(false); signInWithGoogle(); }} sx={{ py: 2 }}>
                  <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#10B981', fontSize: 20 }}>Se connecter</Typography>} />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/categories" onClick={() => setDrawerOpen(false)} sx={{ py: 2 }}>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#10B981', fontSize: 20 }}>Catégories</Typography>} />
              </ListItemButton>
            </ListItem>
            {user && (
              <ListItem disablePadding>
                <ListItemButton component={RouterLink} to="/my-reviews" onClick={() => setDrawerOpen(false)} sx={{ py: 2 }}>
                  <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#FDE68A', fontSize: 20 }}>Mes avis</Typography>} />
                </ListItemButton>
              </ListItem>
            )}
          </List>
          {user && (
            <Box sx={{ px: 2, pb: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => { setDrawerOpen(false); handleSignOut(); }}
                sx={{
                  color: '#EF4444',
                  borderColor: '#EF4444',
                  fontWeight: 700,
                  borderRadius: 3,
                  py: 1.5,
                  fontSize: 18,
                  '&:hover': {
                    bgcolor: '#FDE68A',
                    color: '#1F2937',
                    borderColor: '#FDE68A',
                  },
                }}
              >
                Se déconnecter
              </Button>
            </Box>
          )}
        </Drawer>
        {/* Search Overlay */}
        {searchOverlayOpen && (
          <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(31,41,55,0.98)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pt: 4,
            px: 2
          }}>
            {/* X button at top left */}
            <IconButton
              onClick={() => setSearchOverlayOpen(false)}
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                bgcolor: '#fff',
                color: '#10B981',
                boxShadow: 2,
                width: 40,
                height: 40,
                zIndex: 2100,
                '&:hover': { bgcolor: '#ECFDF5' }
              }}
            >
              <CloseIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', position: 'relative', mt: 4 }}>
              <form onSubmit={handleSearchSubmit} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', maxWidth: 500, position: 'relative' }}>
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
                  InputProps={{
                    sx: { bgcolor: '#fff', borderRadius: 8, fontSize: 20, color: '#1F2937', height: 56 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#10B981' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ bgcolor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.10)', fontSize: 20, color: '#1F2937', height: 56, mt: 2, mb: 1 }}
                />
                <Button type="submit" sx={{ ml: 1, bgcolor: '#10B981', color: '#fff', minWidth: 48, minHeight: 48, borderRadius: 2, '&:hover': { bgcolor: '#059669' } }}>
                  <SearchIcon />
                </Button>
              </form>
              {showSuggestions && suggestions.length > 0 && (
                <Paper sx={{ position: 'absolute', top: 70, left: 0, right: 0, zIndex: 10, mt: 1, borderRadius: 3, boxShadow: 4, maxHeight: 350, overflowY: 'auto' }}>
                  <MUIList>
                    {suggestions.map(page => (
                      <ListItemButton key={page.id || page.pageId} onMouseDown={() => handleSuggestionClick(page)} alignItems="flex-start">
                        <ListItemAvatar>
                          <MUIAvatar src={page.profilePictureUrl || ''} alt={page.title} sx={{ width: 48, height: 48, mr: 1 }} />
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
                  </MUIList>
                </Paper>
              )}
              {showScrapeLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, mb: 2 }}>
                  <CircularProgress sx={{ color: '#10B981', mb: 2 }} />
                  <Typography variant="subtitle1" sx={{ color: '#1877F2', fontWeight: 600, fontSize: 18, mb: 1 }}>
                    Analyse de la page en cours…
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', fontSize: 16, opacity: 0.85 }}>
                    Veuillez patienter quelques secondes pendant que nous récupérons les informations Facebook.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </AppBar>
    );
  }

  // --- DESKTOP HEADER ---
  return (
    <AppBar position="static" sx={{ bgcolor: '#10B981', color: '#1F2937', borderRadius: 0, boxShadow: '0 4px 24px rgba(16,185,129,0.10)', px: { xs: 1, md: 4 }, py: 0.5 }}>
      <Toolbar sx={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexGrow: 1 }}>
          <img src="/logo.svg" alt="PageSure Logo" style={{ height: 40, width: 'auto', display: 'block' }} />
        </Box>
        <Button
          color="inherit"
          component={RouterLink}
          to="/categories"
          sx={{
            mr: 2,
            bgcolor: '#ECFDF5',
            color: '#10B981',
            fontWeight: 700,
            borderRadius: 3,
            px: 2.5,
            py: 1,
            fontSize: 16,
            boxShadow: 'none',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: '#D1FAE5',
              color: '#065F46',
            },
          }}
        >
          Catégories
        </Button>
        {user ? (
          <>
            <Button
              color="inherit"
              component={RouterLink}
              to="/my-reviews"
              sx={{
                mr: 2,
                bgcolor: '#FDE68A',
                color: '#1F2937',
                fontWeight: 700,
                borderRadius: 3,
                px: 2.5,
                py: 1,
                fontSize: 16,
                boxShadow: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: '#F3F4F6',
                  color: '#10B981',
                },
              }}
            >
              Mes avis
            </Button>
            <IconButton
              size="large"
              onClick={handleMenu}
              sx={{ color: '#FFFFFF', ml: 1 }}
            >
              <Avatar
                src={user.photoURL || undefined}
                alt={user.displayName || 'Avatar'}
                sx={{ width: 36, height: 36, bgcolor: '#F3F4F6', color: '#1F2937', fontWeight: 700 }}
              />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: 3,
                  boxShadow: '0 4px 24px rgba(16,185,129,0.10)',
                  bgcolor: '#FFFFFF',
                  color: '#1F2937',
                },
              }}
            >
              <MenuItem onClick={handleSignOut} sx={{ fontWeight: 700, color: '#EF4444', borderRadius: 2, '&:hover': { bgcolor: '#FDE68A', color: '#1F2937' } }}>
                Se déconnecter
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            color="inherit"
            onClick={signInWithGoogle}
            sx={{
              bgcolor: '#FDE68A',
              color: '#1F2937',
              fontWeight: 700,
              borderRadius: 3,
              px: 2.5,
              py: 1,
              fontSize: 16,
              boxShadow: 'none',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#F3F4F6',
                color: '#10B981',
              },
            }}
          >
            Se connecter
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 