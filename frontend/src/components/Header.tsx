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
  useMediaQuery
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  return (
    <AppBar position="static" sx={{ bgcolor: '#10B981', color: '#1F2937', borderRadius: 0, boxShadow: '0 4px 24px rgba(16,185,129,0.10)', px: { xs: 1, md: 4 }, py: 0.5 }}>
      <Toolbar sx={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          PageSure
        </Typography>
        {user ? (
          <>
            {!isMobile && (
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
            )}
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
              {isMobile && (
                <MenuItem
                  component={RouterLink}
                  to="/my-reviews"
                  onClick={handleClose}
                  sx={{ fontWeight: 700, color: '#10B981', borderRadius: 2, '&:hover': { bgcolor: '#FDE68A', color: '#1F2937' } }}
                >
                  Mes avis
                </MenuItem>
              )}
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