import { useState } from 'react';
import { Send, CheckCircle, Mail } from 'lucide-react';
import './Newsletter.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    
    // Simular llamada a API
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      
      // Reset después de 3 segundos
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="newsletter-section">
      <div className="container">
        <div className="newsletter-container">
          <div className="newsletter-content">
            <h3 className="newsletter-title">Únete a nuestra comunidad</h3>
            <p className="newsletter-subtitle">
              Recibe ofertas exclusivas, novedades y consejos sobre tecnología directamente en tu correo.
            </p>
          </div>
          
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <div className="newsletter-input-group">
              <Mail className="newsletter-icon" size={20} />
              <input
                type="email"
                placeholder="Ingresa tu correo electrónico"
                className="newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'loading' || status === 'success'}
              />
              <button 
                type="submit" 
                className={`newsletter-btn ${status === 'success' ? 'success' : ''}`}
                disabled={status === 'loading' || status === 'success'}
              >
                {status === 'loading' ? (
                  <span className="loading-spinner-small"></span>
                ) : status === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <>
                    <span>Suscribirse</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </div>
            {status === 'success' && (
              <p className="newsletter-message success-message">
                ¡Gracias por suscribirte! Revisa tu bandeja de entrada.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
