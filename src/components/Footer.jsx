import React from 'react';
import './Footer.css';

const FacebookIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const TikTokIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function Footer() {
  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('¡Gracias por suscribirte!');
  };

  return (
    <footer className="footer-section">
      <div className="container footer-grid">
        
        {/* Columna Principal: Marca y Newsletter */}
        <div className="footer-brand-col">
          <div className="footer-brand">SRX Tech</div>
          <p className="footer-description">
            Equipamiento audiovisual premium para creadores y profesionales. Eleva la calidad de tu producción.
          </p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Tu correo electrónico" 
              className="newsletter-input" 
              required
            />
            <button type="submit" className="newsletter-btn">Suscribir</button>
          </form>
        </div>

        {/* Columna: Catálogo */}
        <div className="footer-col">
          <h4 className="footer-title">Catálogo</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link-item">Cámaras</a></li>
            <li><a href="#" className="footer-link-item">Iluminación</a></li>
            <li><a href="#" className="footer-link-item">Accesorios</a></li>
          </ul>
        </div>

        {/* Columna: Soporte */}
        <div className="footer-col">
          <h4 className="footer-title">Soporte</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link-item">Contacto</a></li>
            <li><a href="#" className="footer-link-item">Envíos</a></li>
            <li><a href="#" className="footer-link-item">Preguntas Frecuentes</a></li>
          </ul>
        </div>

        {/* Columna: Legal */}
        <div className="footer-col">
          <h4 className="footer-title">Legal</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link-item">Términos de Servicio</a></li>
            <li><a href="#" className="footer-link-item">Políticas de Reembolso</a></li>
          </ul>
        </div>

      </div>

      {/* Barra Inferior */}
      <div className="footer-bottom">
        <div className="container footer-bottom-container">
          <div className="copyright-text">
            © 2026 SRX Tech. Todos los derechos reservados.
          </div>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <TikTokIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
