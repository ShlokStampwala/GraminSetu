// src/i18n.jsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './locales'; // तुम्हारी locales वाली फाइल

i18n
  // ब्राउज़र की भाषा डिटेक्ट करने के लिए
  .use(LanguageDetector)
  // react-i18next के साथ जोड़ने के लिए
  .use(initReactI18next)
  .init({
    resources,
    // अगर कोई भाषा न मिले तो English (en) लोड होगी
    fallbackLng: 'en',
    // डेवलपमेंट के समय कंसोल में लॉग्स देखने के लिए
    debug: false, 
    interpolation: {
      escapeValue: false, // React पहले से ही XSS से सुरक्षित है
    },
    detection: {
      // भाषा को कहाँ-कहाँ चेक करना है (localStorage में सेव रखना बेस्ट है)
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'], // अगली बार ऐप खुलने पर वही भाषा रहे
    }
  });

export default i18n;