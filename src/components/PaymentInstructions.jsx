import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import './PaymentInstructions.css';

/**
 * PaymentInstructions — Muestra SOLO los datos del método seleccionado.
 *
 * Props:
 *  - paymentMethod    : 'binance' | 'pago-movil'
 *  - referenceNumber  : string
 *  - onReferenceChange: (value) => {}
 *
 * 🐒 Hecho por un mono senior con amor y bananas.
 */
export default function PaymentInstructions({ paymentMethod }) {
  const [copiedField, setCopiedField] = useState(null);

  const isBinance = paymentMethod === 'binance';

  // ── Clipboard helper ──
  const handleCopy = useCallback(async (text, fieldKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }, []);

  // ── Copy button render ──
  const CopyBtn = ({ text, fieldKey }) => {
    const isCopied = copiedField === fieldKey;
    return (
      <button
        type="button"
        className={`pi-copy-btn ${isCopied ? 'copied' : ''}`}
        onClick={() => handleCopy(text, fieldKey)}
        aria-label={`Copiar ${fieldKey}`}
      >
        {isCopied ? <Check /> : <Copy />}
        <span>{isCopied ? '¡Copiado! 🟢' : 'Copiar'}</span>
      </button>
    );
  };

  return (
    <div className="pi-container" id="payment-instructions-block">
      {/* Header */}
      <div className="pi-header">
        <h4 className="pi-title">
          {isBinance ? 'Pago con Binance Pay' : 'Pago Móvil & Bancario'}
        </h4>
        <p className="pi-subtitle">
          {isBinance
            ? 'Transfiere al siguiente correo desde tu app de Binance.'
            : 'Realiza tu transferencia con los siguientes datos bancarios.'}
        </p>
      </div>

      {/* ─── Binance Panel ─── */}
      {isBinance && (
        <div className="pi-panel">
          <div className="pi-data-row">
            <div className="pi-data-left">
              <span className="pi-data-label">Correo Binance</span>
              <span className="pi-data-value highlight-blue">
                diegosalamanca7777@gmail.com
              </span>
            </div>
            <CopyBtn text="diegosalamanca7777@gmail.com" fieldKey="binance-email" />
          </div>

          <div className="pi-note">
            <span className="pi-note-icon">💡</span>
            <p className="pi-note-text">
              Introduce este correo en tu app de Binance y pega el
              <strong> ID de transacción</strong> generado en el campo de abajo.
            </p>
          </div>
        </div>
      )}

      {/* ─── Pago Móvil Panel ─── */}
      {!isBinance && (
        <div className="pi-panel">
          {/* Banco Badge */}
          <div className="pi-bank-badge">
            <span className="pi-bank-icon">🏦</span>
            <span className="pi-bank-name">Banco Mercantil</span>
            <span className="pi-bank-code">(0105)</span>
          </div>

          {/* Teléfono */}
          <div className="pi-data-row">
            <div className="pi-data-left">
              <span className="pi-data-label">Teléfono</span>
              <span className="pi-data-value highlight-green">
                0426-3440940
              </span>
            </div>
            <CopyBtn text="04263440940" fieldKey="telefono" />
          </div>

          {/* Cédula */}
          <div className="pi-data-row">
            <div className="pi-data-left">
              <span className="pi-data-label">Cédula de Identidad</span>
              <span className="pi-data-value highlight-blue">
                V-32.027.031
              </span>
            </div>
            <CopyBtn text="32027031" fieldKey="cedula" />
          </div>
        </div>
      )}


    </div>
  );
}
