import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { setNavFilter } from './Navbar';
import './Footer.css';

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
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  // Cargar categorías dinámicamente desde Supabase al montar el componente
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug')
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      navigate('/register', { state: { email: email.trim() } });
    }
  };

  const handleCategoryClick = (slug) => {
    if (slug === 'accesorios') {
      // Búsqueda inteligente fallback para accesorios
      setNavFilter({ type: 'search', value: 'Accesorio' });
    } else {
      const found = categories.find(cat => cat.slug === slug);
      if (found) {
        setNavFilter({ type: 'category', value: found.id });
      } else {
        setNavFilter(null);
      }
    }
  };

  return (
    <footer className="footer-section">
      <div className="container footer-grid">
        
        {/* Columna Principal: Marca y Newsletter */}
        <div className="footer-brand-col">
          <div className="footer-brand">SRX Tech</div>
          <p className="footer-description">
            Únete a nuestra comunidad y recibe ofertas exclusivas, novedades y consejos sobre tecnología premium.
          </p>
          <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
            <div className="footer-newsletter-input-wrapper">
              <Mail className="footer-newsletter-icon" size={18} />
              <input 
                type="email" 
                placeholder="Ingresa tu correo" 
                className="footer-newsletter-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="footer-newsletter-btn" aria-label="Suscribirse">
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Columna: Catálogo */}
        <div className="footer-col">
          <h4 className="footer-title">Catálogo</h4>
          <ul className="footer-links">
            <li>
              <Link 
                to="/tienda" 
                onClick={() => handleCategoryClick('drones-y-sistemas-aereos')}
                className="footer-link-item"
              >
                Cámaras
              </Link>
            </li>
            <li>
              <Link 
                to="/tienda" 
                onClick={() => handleCategoryClick('iluminacion-y-energia')}
                className="footer-link-item"
              >
                Iluminación
              </Link>
            </li>
            <li>
              <Link 
                to="/tienda" 
                onClick={() => handleCategoryClick('accesorios')}
                className="footer-link-item"
              >
                Accesorios
              </Link>
            </li>
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
            <a 
              href="https://www.instagram.com/srx.tech?igsh=ZGdtZXBiYTkwMXVx" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a 
              href="https://www.tiktok.com/@srx_tech?_r=1&_t=ZS-97JaonmnxHm" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="TikTok"
            >
              <TikTokIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
