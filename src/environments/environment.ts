export const environment = {
  production: false,
  apiUrl: 'https://fashionstore-backend-3wsr.onrender.com/api/v1',
  wsUrl: 'wss://fashionstore-backend-3wsr.onrender.com/api/v1',
  appName: 'FashionStore',
  version: '1.0.0',
  currency: 'USD',
  locale: 'es-ES',
  defaultPageSize: 10,
  maxFileSize: 5242880, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  enableDebugMode: true,
  stripePublishableKey: 'pk_test_51TNvrQDe1EbPeXeBixY8e7HDgNYN50bZQ1TA4173nShEEaZ4wLG79EbCR4CiV000OefzFlD3vq1NsBm88OnADdtp00vRTDFePe',
  firebase: {
    apiKey: "AIzaSy_FashionStoreKey",
    authDomain: "fashionstore-app.firebaseapp.com",
    projectId: "fashionstore-app",
    storageBucket: "fashionstore-app.appspot.com",
    messagingSenderId: "100000000000",
    appId: "1:100000000000:web:fashionstore",
    vapidKey: "BAFJmPeDjgxtCWHwfUqEshQX14COoKZXQlIR9v6lekq80P5v6dNyY03Y-5WCmOk1ziu8O-OqiEWA3BmhauT-AbY"
  }
};
