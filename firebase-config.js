// =====================================================
// KONFIGURASI FIREBASE — asetku-manajemen
// Project: https://console.firebase.google.com/project/asetku-manajemen
// =====================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBVecL3-oDrxOy96fpRpkiOVyO3NHxvGEA",
  authDomain: "asset-management-fd591.firebaseapp.com",
  projectId: "asset-management-fd591",
  storageBucket: "asset-management-fd591.firebasestorage.app",
  messagingSenderId: "262104188690",
  appId: "1:262104188690:web:0ac3f886498ec19da655cb",
  measurementId: "G-6V206MLL1R"
};
// Kunci data yang akan disinkronisasi ke Firestore
const SYNC_KEYS = [
  'asetku_assets',
  'asetku_history',
  'asetku_inspeksi',
  'asetku_categories',
  'asetku_locations',
  'asetku_users',
];
