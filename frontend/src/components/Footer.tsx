import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#F3F4F6',
        borderTop: '1.5px solid #E5E7EB',
        borderRadius: 0,
        boxShadow: '0 -2px 16px rgba(16,185,129,0.07)',
      }}
    >
      <Container maxWidth="sm">
        <Typography variant="body2" align="center" sx={{ color: '#1F2937', fontWeight: 500 }}>
          {'© '}
          {new Date().getFullYear()}
          {' '}
          <Link color="#10B981" href="/" underline="hover" sx={{ fontWeight: 700 }}>
            PageSure
          </Link>
          {' - Tous droits réservés'}
        </Typography>
        <Typography variant="body2" align="center" sx={{ color: '#1F2937', fontWeight: 400 }}>
          {'Plateforme d\'avis pour les pages Facebook en Tunisie'}
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 