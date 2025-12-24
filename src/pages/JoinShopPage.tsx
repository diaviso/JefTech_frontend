import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ShopInfo {
  id: string;
  name: string;
  type: string;
}

export default function JoinShopPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated: _isAuthenticated, isLoading: authLoading } = useAuth();
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShopInfo = async () => {
      if (!code) {
        setError('Code d\'invitation invalide');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/invite/${code}`);
        if (!response.ok) {
          throw new Error('Invalid invite code');
        }
        const data = await response.json();
        setShopInfo(data);
      } catch {
        setError('Ce lien d\'invitation n\'est pas valide ou a expiré');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopInfo();
  }, [code]);

  const handleJoin = () => {
    // Redirect to Google auth with invite code in state
    window.location.href = `${API_URL}/auth/google?state=${code}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="join-page">
        <div className="join-card">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="join-page">
        <div className="join-card error">
          <XCircle size={64} className="error-icon" />
          <h2>Lien invalide</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="shop-icon-large">
          <Store size={64} />
        </div>
        
        <h2>Rejoindre une boutique</h2>
        
        <div className="shop-info-box">
          <h3>{shopInfo?.name}</h3>
          <p>Vous avez été invité à rejoindre cette boutique</p>
        </div>

        <p className="join-description">
          En rejoignant cette boutique, vous pourrez accéder à son inventaire et 
          enregistrer des ventes selon les permissions accordées par le propriétaire.
        </p>

        <button onClick={handleJoin} className="btn btn-primary btn-large">
          <CheckCircle size={20} />
          Rejoindre la boutique
        </button>

        <button onClick={() => navigate('/')} className="btn btn-outline">
          Annuler
        </button>
      </div>
    </div>
  );
}
