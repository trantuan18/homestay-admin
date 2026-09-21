import i18n from 'i18next'; import {initReactI18next} from 'react-i18next';
import vi from './locales/vi/common.json'; import en from './locales/en/common.json';
const saved=localStorage.getItem('language'); const browser=(navigator.language||'vi').toLowerCase().startsWith('en')?'en':'vi';
i18n.use(initReactI18next).init({resources:{vi:{translation:vi},en:{translation:en}},lng:saved||browser,fallbackLng:'vi',interpolation:{escapeValue:false}});
i18n.on('languageChanged',lng=>localStorage.setItem('language',lng)); export default i18n;
