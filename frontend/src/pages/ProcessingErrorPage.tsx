import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ProcessingError, { ErrorType } from '../components/shared/ProcessingError';

export default function ProcessingErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const errorType = (searchParams.get('type') || 'processing_failed') as ErrorType;
  const title = searchParams.get('title');
  const message = searchParams.get('message');
  const details = searchParams.get('details');
  const suggestion = searchParams.get('suggestion');
  const returnPath = searchParams.get('return') || '/';

  const handleRetry = () => {
    navigate(returnPath, { replace: true });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleContactSupport = () => {
    navigate('/contact');
  };

  return (
    <>
      <Helmet>
        <title>{title || 'Processing Error'} — {t('common.appName')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <ProcessingError
        errorType={errorType}
        title={title ? decodeURIComponent(title) : undefined}
        message={message ? decodeURIComponent(message) : undefined}
        details={details ? decodeURIComponent(details) : undefined}
        suggestion={suggestion ? decodeURIComponent(suggestion) : undefined}
        onRetry={handleRetry}
        onBack={handleBack}
        onHome={handleHome}
        onContactSupport={handleContactSupport}
      />
    </>
  );
}
