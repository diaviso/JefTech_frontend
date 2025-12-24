import { useState } from 'react';
import { Store, Check, Shield, Users, TrendingUp, Smartphone, Cloud } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleGoogleLogin = () => {
    if (!termsAccepted) return;
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleICloudLogin = () => {
    alert('La connexion avec iCloud n\'est pas encore disponible. Veuillez utiliser Google pour le moment.');
  };

  return (
    <div className="login-page">
      {/* Left side - Branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="brand-logo">
            <Store size={48} />
          </div>
          <h1>JefTech PME</h1>
          <p className="tagline">La solution de gestion moderne pour les entrepreneurs africains</p>
          
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">
                <Shield size={20} />
              </div>
              <div>
                <h3>Sécurisé</h3>
                <p>Vos données sont protégées et sauvegardées</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Users size={20} />
              </div>
              <div>
                <h3>Collaboratif</h3>
                <p>Gérez votre équipe et vos employés facilement</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3>Performant</h3>
                <p>Suivez vos ventes et votre croissance en temps réel</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Smartphone size={20} />
              </div>
              <div>
                <h3>Mobile</h3>
                <p>Accessible partout, sur tous vos appareils</p>
              </div>
            </div>
          </div>
        </div>
        <div className="branding-footer">
          <span>🇸🇳 Conçu avec ❤️ pour les entrepreneurs sénégalais</span>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-header">
            <h2>Bienvenue</h2>
            <p>Connectez-vous pour gérer votre business</p>
          </div>

          <div className="login-form">
            {/* Project description */}
            <div className="project-description">
              <h3>À propos de JefTech PME</h3>
              <p>
                JefTech PME est une plateforme complète de gestion pour les petites et moyennes entreprises. 
                Gérez vos boutiques, suivez vos ventes, organisez votre inventaire et collaborez avec votre équipe 
                en toute simplicité.
              </p>
            </div>

            {/* Terms checkbox */}
            <label className="terms-checkbox">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="checkmark">
                {termsAccepted && <Check size={14} />}
              </span>
              <span className="terms-text">
                J'accepte les{' '}
                <button type="button" className="terms-link" onClick={() => setShowTerms(true)}>
                  conditions d'utilisation
                </button>
              </span>
            </label>

            {/* Auth buttons */}
            <div className="auth-buttons">
              <button 
                onClick={handleGoogleLogin} 
                className={`auth-btn google-btn ${!termsAccepted ? 'disabled' : ''}`}
                disabled={!termsAccepted}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </button>

              <button 
                onClick={handleICloudLogin} 
                className="auth-btn icloud-btn"
              >
                <Cloud size={20} />
                Continuer avec iCloud
              </button>
            </div>

            {!termsAccepted && (
              <p className="terms-warning">
                Veuillez accepter les conditions d'utilisation pour continuer
              </p>
            )}
          </div>

          <div className="login-footer">
            <p>Première visite ? La connexion créera automatiquement votre compte.</p>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Conditions d'utilisation</h2>
              <button className="modal-close" onClick={() => setShowTerms(false)}>×</button>
            </div>
            <div className="modal-content terms-content">
              <h3>1. Acceptation des conditions</h3>
              <p>
                En utilisant JefTech PME, vous acceptez d'être lié par les présentes conditions d'utilisation. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>

              <h3>2. Description du service</h3>
              <p>
                JefTech PME est une plateforme de gestion commerciale permettant aux entrepreneurs de gérer 
                leurs boutiques, leur inventaire, leurs ventes et leur équipe.
              </p>

              <h3>3. Compte utilisateur</h3>
              <p>
                Vous êtes responsable de maintenir la confidentialité de votre compte et de toutes les 
                activités qui se produisent sous votre compte. Vous acceptez de nous informer immédiatement 
                de toute utilisation non autorisée de votre compte.
              </p>

              <h3>4. Protection des données</h3>
              <p>
                Nous nous engageons à protéger vos données personnelles conformément aux lois en vigueur. 
                Vos informations ne seront jamais vendues à des tiers sans votre consentement explicite.
              </p>

              <h3>5. Utilisation acceptable</h3>
              <p>
                Vous vous engagez à utiliser le service de manière légale et à ne pas l'utiliser pour 
                des activités frauduleuses ou illégales.
              </p>

              <h3>6. Propriété intellectuelle</h3>
              <p>
                Tout le contenu de JefTech PME, y compris les textes, graphiques, logos et logiciels, 
                est la propriété de JefTech et est protégé par les lois sur la propriété intellectuelle.
              </p>

              <h3>7. Limitation de responsabilité</h3>
              <p>
                JefTech PME est fourni "tel quel" sans garantie d'aucune sorte. Nous ne serons pas 
                responsables des dommages directs ou indirects résultant de l'utilisation du service.
              </p>

              <h3>8. Modifications</h3>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications 
                prendront effet dès leur publication sur le site.
              </p>

              <h3>9. Contact</h3>
              <p>
                Pour toute question concernant ces conditions, veuillez nous contacter à support@jeftech.sn
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTerms(false);
                }}
              >
                J'accepte les conditions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
