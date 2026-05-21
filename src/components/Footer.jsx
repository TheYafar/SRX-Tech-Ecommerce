import React from 'react';
import { Mail, Phone, CreditCard, Landmark, Coins } from 'lucide-react';
import './Footer.css';

const FacebookIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const TikTokIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="footer-section">
      <div className="container footer-grid">
        {/* Column 1: Menu */}
        <div className="footer-col">
          <h4 className="footer-title">Menú</h4>
          <ul className="footer-links">
            <li>
              <button onClick={scrollToTop} className="footer-link-btn">
                Inicio
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('tienda')} className="footer-link-btn">
                Tienda
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('categorias')} className="footer-link-btn">
                Categorías
              </button>
            </li>
          </ul>
        </div>

        {/* Column 2: Contacto & Redes */}
        <div className="footer-col">
          <h4 className="footer-title">Contactos</h4>
          <ul className="footer-contacts">
            <li>
              <Mail size={16} className="contact-icon" />
              <a href="mailto:srxtechgroup@gmail.com">srxtechgroup@gmail.com</a>
            </li>
            <li>
              <Phone size={16} className="contact-icon" />
              <a href="tel:+584244244194">+58 424-4244194</a>
            </li>
          </ul>

          <h4 className="footer-title sub">Redes Sociales</h4>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookIcon size={18} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon size={18} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <TikTokIcon size={18} />
            </a>
          </div>
        </div>

        {/* Column 3: Métodos de Pago */}
        <div className="footer-col">
          <h4 className="footer-title">Métodos de pago</h4>
          <div className="payment-badges-grid">
            <div className="payment-badge-item" title="Tarjeta de Crédito Visa">
              <CreditCard size={16} className="badge-icon-payment" />
              <span>VISA</span>
            </div>
            <div className="payment-badge-item zelle-badge" title="Zelle">
              <Landmark size={16} className="badge-icon-payment zelle" />
              <span>Zelle</span>
            </div>
            <div className="payment-badge-item" title="MasterCard">
              <CreditCard size={16} className="badge-icon-payment" />
              <span>MasterCard</span>
            </div>
            <div className="payment-badge-item" title="PayPal">
              <Coins size={16} className="badge-icon-payment" />
              <span>PayPal</span>
            </div>
            <div className="payment-badge-item" title="Pago Móvil">
              <Landmark size={16} className="badge-icon-payment" />
              <span>Pago Móvil</span>
            </div>
            <div className="payment-badge-item binance-badge" title="Binance Pay">
              <Coins size={16} className="badge-icon-payment binance" />
              <span>Binance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-container">
          <p className="copyright-text">
            © {currentYear} SRX Tech. Todos los derechos reservados.
          </p>
          <div className="bottom-meta-links">
            <a href="#privacy">Privacidad</a>
            <span className="dot-separator">•</span>
            <a href="#terms">Términos de servicio</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
