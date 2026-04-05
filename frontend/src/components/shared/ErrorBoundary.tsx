import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {this.props.fallbackMessage || t('common.errors.genericTitle')}
          </h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            {t('common.errors.genericDesc')}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            {t('common.errors.tryAgain')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
