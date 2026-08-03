import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, ShieldCheck, User, Calendar, KeyRound, Globe } from 'lucide-react';
import './InternationalCardForm.css';

export function getCardBrand(number) {
  const cleanNumber = (number || '').replace(/\D/g, '');
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^(6011|65)/.test(cleanNumber)) return 'discover';
  return 'generic';
}

export function formatCardNumber(value) {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(' ');
  } else {
    return v;
  }
}

export function formatExpiryDate(value) {
  const clean = value.replace(/\D/g, '');
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
  }
  return clean;
}

export default function InternationalCardForm({ cardData, onChange }) {
  const brand = getCardBrand(cardData.cardNumber);

  const handleNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) { // 16 digits + 3 spaces
      onChange({ target: { name: 'cardNumber', value: formatted } });
    }
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.length <= 5) {
      onChange({ target: { name: 'cardExpiry', value: formatted } });
    }
  };

  const handleCvcChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '');
    if (clean.length <= 4) {
      onChange({ target: { name: 'cardCvc', value: clean } });
    }
  };

  const renderBrandLogo = () => {
    switch (brand) {
      case 'visa':
        return <span className="brand-icon-visa">VISA</span>;
      case 'mastercard':
        return (
          <div className="brand-icon-mastercard">
            <span className="mc-circle red" />
            <span className="mc-circle orange" />
          </div>
        );
      case 'amex':
        return <span className="brand-icon-amex">AMEX</span>;
      case 'discover':
        return <span className="brand-pill" style={{ background: '#ff6600', color: '#fff' }}>DISCOVER</span>;
      default:
        return <CreditCard className="brand-icon-generic" size={24} />;
    }
  };

  const getDisplayNumber = () => {
    const raw = (cardData.cardNumber || '').padEnd(19, '•');
    // Format bullets nicely: •••• •••• •••• ••••
    const parts = cardData.cardNumber ? cardData.cardNumber.split(' ') : [];
    const formattedParts = [0, 1, 2, 3].map(i => {
      const part = parts[i] || '';
      return part.padEnd(4, '•');
    });
    return formattedParts.join(' ');
  };

  return (
    <div className="international-card-form-container">
      {/* Visual Interactive Card */}
      <motion.div
        className="virtual-card-wrapper"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="virtual-card">
          <div className="virtual-card-header">
            <div className="virtual-card-chip" />
            <div className="virtual-card-brand-badge">
              {renderBrandLogo()}
            </div>
          </div>

          <div className="virtual-card-number">
            {getDisplayNumber()}
          </div>

          <div className="virtual-card-footer">
            <div>
              <div className="virtual-card-label">Titular de la Tarjeta</div>
              <div className="virtual-card-holder">
                {cardData.cardName ? cardData.cardName.toUpperCase() : 'NOMBRE DEL TITULAR'}
              </div>
            </div>
            <div>
              <div className="virtual-card-label">Expira</div>
              <div className="virtual-card-expires">
                {cardData.cardExpiry || 'MM/YY'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security & Supported Brands Banner */}
      <div className="card-security-banner">
        <div className="accepted-brands">
          <span className="accepted-brands-title">Aceptamos:</span>
          <span className="brand-pill">VISA</span>
          <span className="brand-pill">MC</span>
          <span className="brand-pill">AMEX</span>
        </div>
        <div className="security-tag">
          <ShieldCheck size={16} />
          <span>Encriptación SSL 256-bit</span>
        </div>
      </div>

      {/* Card Inputs */}
      <div className="card-inputs-grid">
        {/* Cardholder Name */}
        <div className="card-field-group">
          <label className="card-field-label">Nombre impreso en la tarjeta</label>
          <div className="card-input-wrapper">
            <User size={18} className="card-input-icon" />
            <input
              type="text"
              name="cardName"
              value={cardData.cardName || ''}
              onChange={onChange}
              placeholder="Ej: JUAN PEREZ"
              className="card-form-input"
              required
            />
          </div>
        </div>

        {/* Card Number */}
        <div className="card-field-group">
          <label className="card-field-label">
            <span>Número de tarjeta</span>
            {brand !== 'generic' && (
              <span style={{ fontSize: '0.75rem', color: '#4f6ef7', textTransform: 'uppercase', fontWeight: 'bold' }}>
                {brand} detectada
              </span>
            )}
          </label>
          <div className="card-input-wrapper">
            <CreditCard size={18} className="card-input-icon" />
            <input
              type="text"
              name="cardNumber"
              value={cardData.cardNumber || ''}
              onChange={handleNumberChange}
              placeholder="4000 1234 5678 9010"
              className="card-form-input"
              required
            />
          </div>
        </div>

        {/* Expiration & CVC */}
        <div className="card-inputs-row">
          <div className="card-field-group">
            <label className="card-field-label">Vencimiento (MM/YY)</label>
            <div className="card-input-wrapper">
              <Calendar size={18} className="card-input-icon" />
              <input
                type="text"
                name="cardExpiry"
                value={cardData.cardExpiry || ''}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                className="card-form-input"
                required
              />
            </div>
          </div>

          <div className="card-field-group">
            <label className="card-field-label">Código CVC / CVV</label>
            <div className="card-input-wrapper">
              <KeyRound size={18} className="card-input-icon" />
              <input
                type="text"
                name="cardCvc"
                value={cardData.cardCvc || ''}
                onChange={handleCvcChange}
                placeholder="123"
                className="card-form-input"
                required
              />
            </div>
          </div>
        </div>

        {/* Country / Zip Code */}
        <div className="card-field-group">
          <label className="card-field-label">Código Postal de Facturación (ZIP)</label>
          <div className="card-input-wrapper">
            <Globe size={18} className="card-input-icon" />
            <input
              type="text"
              name="cardZip"
              value={cardData.cardZip || ''}
              onChange={onChange}
              placeholder="Ej: 10001 (Opcional si es internacional)"
              className="card-form-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
