import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Store, MapPin, Phone, Tag, Crown, Shield, ShoppingCart } from 'lucide-react';
import Layout from '../components/Layout';
import { shopApi } from '../config/api';

interface Shop {
  id: string;
  name: string;
  type: string;
  shopCategories?: string[];
  address?: string;
  phone?: string;
  inviteCode?: string;
  userRole?: string;
}

interface ShopsData {
  ownedShops: Shop[];
  memberShops: Shop[];
}

const ROLE_LABELS: Record<string, { label: string; className: string; icon: typeof Crown }> = {
  OWNER: { label: 'Propriétaire', className: 'owner-badge', icon: Crown },
  MANAGER: { label: 'Gestionnaire', className: 'manager-badge', icon: Shield },
  SELLER: { label: 'Vendeur', className: 'seller-badge', icon: ShoppingCart },
};

export default function ShopListPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopsData>({ ownedShops: [], memberShops: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirectToCreate, setShouldRedirectToCreate] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (shouldRedirectToCreate) {
      navigate('/shops/new', { replace: true });
    }
  }, [shouldRedirectToCreate, navigate]);

  const loadShops = async () => {
    try {
      const response = await shopApi.getAll();
      const data = response.data;
      setShops(data);
      // If no shops, redirect to create
      if (data.ownedShops.length === 0 && data.memberShops.length === 0) {
        setShouldRedirectToCreate(true);
      }
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const allShops = [...shops.ownedShops, ...shops.memberShops];

  if (isLoading) {
    return (
      <Layout title="Mes boutiques">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Mes boutiques">
      <div className="shop-list-page">
        <div className="page-header">
          <h1>Mes boutiques</h1>
          <button onClick={() => navigate('/shops/new')} className="btn btn-primary">
            <Plus size={20} />
            Nouvelle boutique
          </button>
        </div>

        {allShops.length === 0 ? (
          <div className="empty-state">
            <Store size={64} />
            <h2>Aucune boutique</h2>
            <p>Créez votre première boutique pour commencer</p>
            <button onClick={() => navigate('/shops/new')} className="btn btn-primary">
              <Plus size={20} />
              Créer une boutique
            </button>
          </div>
        ) : (
          <div className="shops-grid">
            {shops.ownedShops.map(shop => (
              <div key={shop.id} className="shop-card owned">
                <div className="shop-card-header">
                  <div className="shop-icon">
                    <Store size={24} />
                  </div>
                  <span className="owner-badge">
                    <Crown size={14} />
                    Propriétaire
                  </span>
                </div>
                
                <h3>{shop.name}</h3>
                
                {shop.shopCategories && shop.shopCategories.length > 0 && (
                  <div className="shop-categories">
                    <Tag size={14} />
                    {shop.shopCategories.slice(0, 2).join(', ')}
                    {shop.shopCategories.length > 2 && ` +${shop.shopCategories.length - 2}`}
                  </div>
                )}
                
                {shop.address && (
                  <div className="shop-info">
                    <MapPin size={14} />
                    <span>{shop.address}</span>
                  </div>
                )}
                
                {shop.phone && (
                  <div className="shop-info">
                    <Phone size={14} />
                    <span>{shop.phone}</span>
                  </div>
                )}
                
                <div className="shop-card-actions">
                  <button 
                    onClick={() => navigate(`/shops/${shop.id}`)} 
                    className="btn-shop-action primary"
                  >
                    <Store size={16} />
                    <span>Ouvrir</span>
                  </button>
                  <button 
                    onClick={() => navigate(`/shops/${shop.id}/settings`)} 
                    className="btn-shop-action secondary"
                    title="Paramètres"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            ))}

            {shops.memberShops.map(shop => {
              const roleInfo = ROLE_LABELS[shop.userRole || 'SELLER'];
              const RoleIcon = roleInfo.icon;
              return (
                <div key={shop.id} className="shop-card member">
                  <div className="shop-card-header">
                    <div className="shop-icon">
                      <Store size={24} />
                    </div>
                    <span className={roleInfo.className}>
                      <RoleIcon size={14} />
                      {roleInfo.label}
                    </span>
                  </div>
                  
                  <h3>{shop.name}</h3>
                  
                  {shop.shopCategories && shop.shopCategories.length > 0 && (
                    <div className="shop-categories">
                      <Tag size={14} />
                      {shop.shopCategories.slice(0, 2).join(', ')}
                    </div>
                  )}
                  
                  {shop.address && (
                    <div className="shop-info">
                      <MapPin size={14} />
                      <span>{shop.address}</span>
                    </div>
                  )}
                  
                  <div className="shop-card-actions">
                    <button 
                      onClick={() => navigate(`/shops/${shop.id}`)} 
                      className="btn-shop-action primary"
                    >
                      <Store size={16} />
                      <span>Ouvrir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
