import {useTranslation} from 'react-i18next'; export function Loading(){const {t}=useTranslation();return <div className="loading"><span className="spinner"/>{t('common.loading')}</div>}
