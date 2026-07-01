import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, CreditCard, Wallet } from 'lucide-react';
import { uploadReceipt } from '../utils/supabaseClient';
import './PaymentCheckout.css';

export default function PaymentCheckout({ onPaymentSuccess }) {
  const [method, setMethod] = useState(''); // 'binance', 'pago_movil', 'zinli'
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setErrorMessage('');
      } else {
        setFile(null);
        setErrorMessage('Por favor, selecciona una imagen válida (JPG, PNG, etc).');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!method) {
      setErrorMessage('Selecciona un método de pago.');
      return;
    }
    
    // Binance might not require receipt immediately, but if they all do, we require file
    if ((method === 'pago_movil' || method === 'zinli') && !file) {
      setErrorMessage('Debes adjuntar el comprobante de pago.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setErrorMessage('');

    try {
      // If method requires file upload
      if (file) {
        const url = await uploadReceipt(file);
        if (url) {
          setUploadStatus('success');
          if (onPaymentSuccess) {
            onPaymentSuccess({ method, receiptUrl: url });
          }
        } else {
          setUploadStatus('error');
          setErrorMessage('Error al subir el comprobante. Inténtalo de nuevo.');
        }
      } else {
        // If Binance or a method that doesn't strictly need a file right away
        setUploadStatus('success');
        if (onPaymentSuccess) {
          onPaymentSuccess({ method, receiptUrl: null });
        }
      }
    } catch (error) {
      console.error('Error during uploadReceipt:', error);
      setUploadStatus('error');
      setErrorMessage('Ocurrió un error inesperado.');
    } finally {
      setIsUploading(false);
    }
  };

  const methods = [
    { id: 'binance', label: 'Binance Pay', icon: <Wallet size={20} /> },
    { id: 'pago_movil', label: 'Pago Móvil', icon: <CreditCard size={20} /> },
    { id: 'zinli', label: 'Zinli', icon: <Wallet size={20} /> },
  ];

  const requiresReceipt = method === 'pago_movil' || method === 'zinli';

  return (
    <div className="payment-checkout-container">
      <div className="payment-header">
        <h2 className="payment-title">Completar Pago</h2>
        <p className="payment-subtitle">Selecciona tu método preferido y adjunta el comprobante.</p>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="payment-methods-grid">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`payment-method-btn ${method === m.id ? 'active' : ''}`}
              onClick={() => {
                setMethod(m.id);
                setUploadStatus(null);
                setErrorMessage('');
              }}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {requiresReceipt && (
          <div className="receipt-upload-section">
            <label className="receipt-label">Comprobante de Pago</label>
            
            <div 
              className={`upload-dropzone ${file ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden-input"
              />
              
              {file ? (
                <div className="upload-success-preview">
                  <CheckCircle className="success-icon" size={32} />
                  <span className="file-name">{file.name}</span>
                  <span className="file-change-text">Click para cambiar</span>
                </div>
              ) : (
                <div className="upload-prompt">
                  <Upload className="upload-icon" size={32} />
                  <span className="upload-text">Haz click para subir tu captura</span>
                  <span className="upload-subtext">Soporta JPG, PNG (Max 5MB)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="payment-error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="payment-success">
            <CheckCircle size={16} />
            <span>¡Comprobante procesado con éxito!</span>
          </div>
        )}

        <button 
          type="submit" 
          className="payment-submit-btn"
          disabled={isUploading || !method || (requiresReceipt && !file) || uploadStatus === 'success'}
        >
          {isUploading ? (
            <>
              <Loader2 className="spinner" size={20} />
              <span>Procesando comprobante...</span>
            </>
          ) : uploadStatus === 'success' ? (
            <span>Pago Confirmado</span>
          ) : (
            <span>Confirmar Pago</span>
          )}
        </button>
      </form>
    </div>
  );
}
