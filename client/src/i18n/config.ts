import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import knTranslations from './locales/kn.json';
import teTranslations from './locales/te.json';

// Initialize i18next
i18n
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      kn: { translation: knTranslations },
      te: { translation: teTranslations },
    },
    fallbackLng: 'en', // Fallback language if translation not found
    debug: true, // Enable debug mode to see translation issues
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },
    react: {
      useSuspense: false, // Disable suspense to ensure immediate translations
      bindI18n: 'languageChanged loaded', // Re-render on language change and resource load
      bindI18nStore: 'added removed', // Re-render when resources are added/removed
      transEmptyNodeValue: '', // What to return for empty Trans nodes
      transSupportBasicHtmlNodes: true, // Allow basic HTML nodes in Trans
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'], // Keep these HTML nodes
      nsMode: 'default', // Use default namespace mode for better performance
    },
  });

export default i18n;

// Language configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  // Placeholders for future expansion (up to 30 total)
  // { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  // { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  // { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  // { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  // { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  // { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  // Add more as needed up to 30 total
];

export const changeLanguage = (languageCode: string) => {
  // Change the language in i18next
  i18n.changeLanguage(languageCode);
  
  // Store the preference in localStorage for persistence
  localStorage.setItem('preferredLanguage', languageCode);
  localStorage.setItem('i18nextLng', languageCode); // Also set this for language detector
  
  // Force a re-render by updating the document language attribute
  document.documentElement.lang = languageCode;
  
  // Note: Do NOT reload the page to avoid losing session state
  // React i18next will handle the re-render automatically through bindI18n events
};

export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};