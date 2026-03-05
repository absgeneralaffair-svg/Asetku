// =====================================================
// KONFIGURASI FIREBASE — asetku-manajemen
// Project: https://console.firebase.google.com/project/asetku-manajemen
// =====================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBhUh9kzPuWjmI5Q2QlqOuHAdE5PEgO_tg",
    authDomain: "asetku-manajemen.firebaseapp.com",
    projectId: "asetku-manajemen",
    storageBucket: "asetku-manajemen.firebasestorage.app",
    messagingSenderId: "930361440111",
    appId: "1:930361440111:web:e9becd78163895e4beda9a"
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
