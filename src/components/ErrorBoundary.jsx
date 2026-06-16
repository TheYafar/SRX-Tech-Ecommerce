import React from 'react';
import { WifiOff, RotateCw } from 'lucide-react';
import './ErrorBoundary.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // Mantener console.error para fallos críticos reales
    console.error("ErrorBoundary caught an error in React tree:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrapper">
              <WifiOff size={40} />
            </div>
            <h2>Hubo un problema de conexión</h2>
            <p>Por favor, reintenta. Verifica tu conexión a internet o recarga la página.</p>
            <button className="error-boundary-btn" onClick={this.handleRetry}>
              <RotateCw size={16} />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
