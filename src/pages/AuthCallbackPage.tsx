import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { XCircle } from 'lucide-react';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('Connexion échouée. Veuillez réessayer.');
        return;
      }

      try {
        await login(token);
        // Redirect immediately - ShopListPage will handle first login redirect
        navigate('/shops', { replace: true });
      } catch {
        setStatus('error');
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="callback-page">
      <div className="callback-card">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <h2>Connexion en cours...</h2>
            <p>Veuillez patienter</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} className="error-icon" />
            <h2>Erreur de connexion</h2>
            <p>{errorMessage}</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
