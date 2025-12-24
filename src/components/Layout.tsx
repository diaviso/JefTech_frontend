import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, User, Sun, Moon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function Layout({ children, title, showBack: _showBack }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/shops')}>
            <Store size={28} />
            <span>JefTech PME</span>
          </div>
        </div>
        
        {title && <h1 className="header-title">{title}</h1>}
        
        <div className="header-right">
          {user && (
            <div className="user-menu">
              <div className="user-info">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    <User size={20} />
                  </div>
                )}
                <span className="user-name">{user.name}</span>
              </div>
              <button 
                onClick={toggleTheme} 
                className="btn-icon-header" 
                title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button 
                onClick={() => setShowLogoutModal(true)} 
                className="btn-icon-header logout" 
                title="Déconnexion"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="main-content">
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal logout-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLogoutModal(false)}>
              <X size={24} />
            </button>
            
            <div className="modal-icon logout">
              <LogOut size={48} />
            </div>
            
            <h2>Se déconnecter ?</h2>
            <p className="modal-description">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
            </p>

            <div className="modal-actions">
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button 
                onClick={handleLogout} 
                className="btn btn-danger"
              >
                <LogOut size={18} />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
