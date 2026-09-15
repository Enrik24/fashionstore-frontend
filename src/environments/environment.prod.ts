export const environment = {
  production: true,
  apiUrl: 'https://fashionstore-backend-3wsr.onrender.com/api/v1',
  wsUrl: 'wss://fashionstore-backend-3wsr.onrender.com/api/v1',
  appName: 'FashionStore',
  version: '1.0.0',
  currency: 'USD',
  locale: 'es-ES',
  defaultPageSize: 10,
  maxFileSize: 5242880,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  enableDebugMode: false,
  stripePublishableKey: 'pk_test_51TNvrQDe1EbPeXeBixY8e7HDgNYN50bZQ1TA4173nShEEaZ4wLG79EbCR4CiV000OefzFlD3vq1NsBm88OnADdtp00vRTDFePe' // Reemplazar por pk_live_... en producción real
  //http://localhost:8000
  //https://fashionstore-backend-3wsr.onrender.com
};
