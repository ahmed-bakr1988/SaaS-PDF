import React, { useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Home,
  Send,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ErrorType =
  | 'processing_failed'
  | 'upload_failed'
  | 'file_too_large'
  | 'unauthorized'
  | 'server_error'
  | 'timeout'
  | 'invalid_format'
  | 'network_error';

export interface ProcessingErrorProps {
  errorType: ErrorType;
  title?: string;
  message?: string;
  details?: string;
  suggestion?: string;
  onRetry?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  onContactSupport?: () => void;
  showDetails?: boolean;
}

const errorConfigs: Record<
  ErrorType,
  {
    title_ar: string;
    title_en: string;
    message_ar: string;
    message_en: string;
    suggestion_ar: string;
    suggestion_en: string;
    icon: React.ReactNode;
    gradient: string;
    accentColor: string;
    bgPattern: string;
  }
> = {
  processing_failed: {
    title_ar: 'فشلت معالجة الملف',
    title_en: 'File Processing Failed',
    message_ar: 'لم نتمكن من معالجة ملفك. قد يكون الملف تالفاً أو يحتوي على محتوى غير متوافق.',
    message_en: "We couldn't process your file. The file may be corrupted or contain incompatible content.",
    suggestion_ar: 'جرب رفع ملف آخر أو اتصل بنا للمساعدة.',
    suggestion_en: 'Try uploading another file or contact our support team.',
    icon: <AlertCircle className="w-20 h-20" />,
    gradient: 'from-red-500 to-red-600',
    accentColor: 'text-red-600',
    bgPattern: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
  },
  upload_failed: {
    title_ar: 'فشل الرفع',
    title_en: 'Upload Failed',
    message_ar: 'حدثت مشكلة أثناء رفع الملف. تحقق من اتصالك بالإنترنت وحاول مجدداً.',
    message_en: 'There was an issue uploading your file. Check your internet connection and try again.',
    suggestion_ar: 'تأكد من جودة الاتصال بالإنترنت وأعد المحاولة.',
    suggestion_en: 'Ensure you have a stable internet connection and retry.',
    icon: <AlertTriangle className="w-20 h-20" />,
    gradient: 'from-orange-500 to-orange-600',
    accentColor: 'text-orange-600',
    bgPattern: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20',
  },
  file_too_large: {
    title_ar: 'الملف كبير جداً',
    title_en: 'File Too Large',
    message_ar: 'حجم الملف يتجاوز الحد المسموح به. يرجى رفع ملف أصغر.',
    message_en: 'The file size exceeds the allowed limit. Please upload a smaller file.',
    suggestion_ar: 'الحد الأقصى للملف هو 100 ميجابايت. ضغط الملف أو قسمه إلى أجزاء أصغر.',
    suggestion_en: 'Maximum file size is 100MB. Compress the file or split it into smaller parts.',
    icon: <Zap className="w-20 h-20" />,
    gradient: 'from-yellow-500 to-yellow-600',
    accentColor: 'text-yellow-600',
    bgPattern: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20',
  },
  unauthorized: {
    title_ar: 'غير مصرح',
    title_en: 'Unauthorized Access',
    message_ar: 'تحتاج إلى اشتراك أو تسجيل الدخول لمعالجة هذا الملف.',
    message_en: 'You need a subscription or to sign in to process this file.',
    suggestion_ar: 'قم بترقية حسابك أو سجل الدخول للمتابعة.',
    suggestion_en: 'Upgrade your account or sign in to continue.',
    icon: <Shield className="w-20 h-20" />,
    gradient: 'from-purple-500 to-purple-600',
    accentColor: 'text-purple-600',
    bgPattern: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
  },
  server_error: {
    title_ar: 'خطأ في الخادم',
    title_en: 'Server Error',
    message_ar: 'حدث خطأ على الخادم. يرجى محاولة لاحقاً.',
    message_en: 'An error occurred on the server. Please try again later.',
    suggestion_ar: 'نعمل على حل هذه المشكلة. حاول مجدداً خلال بضع دقائق.',
    suggestion_en: "We're working to fix this issue. Try again in a few moments.",
    icon: <AlertCircle className="w-20 h-20" />,
    gradient: 'from-red-600 to-pink-600',
    accentColor: 'text-red-600',
    bgPattern: 'bg-gradient-to-br from-red-50 to-pink-100/50 dark:from-red-950/30 dark:to-pink-900/20',
  },
  timeout: {
    title_ar: 'انتهت مهلة الوقت',
    title_en: 'Request Timeout',
    message_ar: 'استغرقت المعالجة وقتاً طويلاً وتم إيقافها. حاول ملف أصغر.',
    message_en: 'The processing took too long and was stopped. Try with a smaller file.',
    suggestion_ar: 'قلل حجم الملف أو عدد الصفحات وحاول مجدداً.',
    suggestion_en: 'Reduce the file size or number of pages and try again.',
    icon: <Clock className="w-20 h-20" />,
    gradient: 'from-blue-500 to-blue-600',
    accentColor: 'text-blue-600',
    bgPattern: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
  },
  invalid_format: {
    title_ar: 'صيغة غير صحيحة',
    title_en: 'Invalid File Format',
    message_ar: 'صيغة الملف غير مدعومة. يرجى استخدام ملف PDF أو صورة.',
    message_en: 'The file format is not supported. Please use a PDF or image file.',
    suggestion_ar: 'الصيغ المدعومة: PDF, JPG, PNG, DOCX, PPTX',
    suggestion_en: 'Supported formats: PDF, JPG, PNG, DOCX, PPTX',
    icon: <AlertTriangle className="w-20 h-20" />,
    gradient: 'from-indigo-500 to-indigo-600',
    accentColor: 'text-indigo-600',
    bgPattern: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20',
  },
  network_error: {
    title_ar: 'خطأ في الاتصال',
    title_en: 'Connection Error',
    message_ar: 'فقدنا الاتصال بالإنترنت. تحقق من الاتصال وحاول مجدداً.',
    message_en: 'We lost the internet connection. Check your connection and try again.',
    suggestion_ar: 'تأكد من اتصالك بشبكة قوية وأعد المحاولة.',
    suggestion_en: 'Ensure you have a stable internet connection and retry.',
    icon: <AlertCircle className="w-20 h-20" />,
    gradient: 'from-slate-500 to-slate-600',
    accentColor: 'text-slate-600',
    bgPattern: 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20',
  },
};

export default function ProcessingError({
  errorType,
  title,
  message,
  details,
  suggestion,
  onRetry,
  onBack,
  onHome,
  onContactSupport,
  showDetails = false,
}: ProcessingErrorProps) {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState(showDetails);

  const config = errorConfigs[errorType];
  const lang = i18n.language;

  const displayTitle = title || (lang === 'ar' ? config.title_ar : config.title_en);
  const displayMessage =
    message || (lang === 'ar' ? config.message_ar : config.message_en);
  const displaySuggestion =
    suggestion || (lang === 'ar' ? config.suggestion_ar : config.suggestion_en);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${config.bgPattern}`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${config.gradient} rounded-full blur-3xl opacity-10`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br ${config.gradient} rounded-full blur-3xl opacity-10`}
        ></div>
      </div>

      {/* Main content */}
      <div className="relative w-full max-w-md">
        {/* Icon container with animation */}
        <div className="flex justify-center mb-6">
          <div className="relative p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl">
            {/* Animated background pulse */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-3xl opacity-5 animate-pulse`}
            ></div>

            {/* Icon */}
            <div
              className={`relative ${config.accentColor} animate-bounce`}
              style={{ animationDuration: '2s' }}
            >
              {config.icon}
            </div>
          </div>
        </div>

        {/* Error card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
          {/* Header with gradient */}
          <div className={`h-2 bg-gradient-to-r ${config.gradient}`}></div>

          {/* Content */}
          <div className="p-8">
            {/* Title */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 text-center">
              <span className={config.accentColor}>{displayTitle}</span>
            </h1>

            {/* Main message */}
            <p className="text-slate-600 dark:text-slate-300 text-center mb-6 leading-relaxed">
              {displayMessage}
            </p>

            {/* Suggestion box */}
            <div className={`p-4 rounded-2xl mb-6 ${config.bgPattern} border border-opacity-20`}>
              <div className="flex items-start gap-3">
                <HelpCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.accentColor}`}
                />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {displaySuggestion}
                </p>
              </div>
            </div>

            {/* Details section */}
            {details && (
              <div className="mb-6">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Technical Details
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      expanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {expanded && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                      {details}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r ${config.gradient} hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 group`}
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform" />
                  Try Again
                </button>
              )}

              <div className="flex gap-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                {onHome && (
                  <button
                    onClick={onHome}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </button>
                )}
              </div>

              {onContactSupport && (
                <button
                  onClick={onContactSupport}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Contact Support
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer help text */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Need help?{' '}
          <a
            href="/contact"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
