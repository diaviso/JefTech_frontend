import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, TrendingUp, Settings,
  ArrowLeft, Plus, Search, AlertTriangle, TrendingDown,
  DollarSign, Box, Tag, Edit, Trash2, X, Check, FileSpreadsheet, Camera
} from 'lucide-react';
import { shopApi, inventoryApi } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import ExcelImportExport from '../components/ExcelImportExport';

type TabType = 'dashboard' | 'catalog' | 'purchases' | 'sales';

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalStockValue: number;
  potentialRevenue: number;
  lowStockList: Array<{ id: string; name: string; stockQuantity: number; minStock: number }>;
  recentMovements: Array<any>;
  salesLast30Days: number;
  salesCount: number;
  purchasesLast30Days: number;
  purchasesCount: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image?: string;
  images?: string[];
  categoryId?: string;
  category?: { id: string; name: string; color: string };
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: string;
  isActive: boolean;
}

interface Shop {
  id: string;
  name: string;
  logo?: string;
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTheme();
  useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed] = useState(false);

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Catalog state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  // Movement state
  const [movements, setMovements] = useState<any[]>([]);
  const [movementType, setMovementType] = useState<'PURCHASE' | 'SALE'>('PURCHASE');
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Reception state (multi-product purchases)
  const [receptions, setReceptions] = useState<any[]>([]);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState<any | null>(null);
  const [showReceptionDetail, setShowReceptionDetail] = useState(false);
  const [editingReception, setEditingReception] = useState<any | null>(null);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Infinite scroll state
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    if (id) {
      loadShop();
    }
  }, [id]);

  useEffect(() => {
    if (id && shop) {
      setProductPage(1);
      setHasMoreProducts(true);
      loadTabData(true);
    }
  }, [activeTab, id, shop]);

  // Auto-search with debounce
  useEffect(() => {
    if (activeTab !== 'catalog' && activeTab !== 'purchases' && activeTab !== 'sales') return;
    
    const timer = setTimeout(() => {
      if (activeTab === 'catalog') {
        setProductPage(1);
        setHasMoreProducts(true);
        loadProducts(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreProducts && activeTab === 'catalog') {
        loadMoreProducts();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoadingMore, hasMoreProducts, activeTab]);

  const loadProducts = async (reset = false) => {
    if (!id) return;
    try {
      const page = reset ? 1 : productPage;
      const prodRes = await inventoryApi.getProducts(id, { 
        categoryId: selectedCategory || undefined, 
        search: searchQuery || undefined,
        limit: PRODUCTS_PER_PAGE,
        offset: (page - 1) * PRODUCTS_PER_PAGE
      });
      
      if (reset) {
        setProducts(prodRes.data);
      } else {
        setProducts(prev => [...prev, ...prodRes.data]);
      }
      
      setHasMoreProducts(prodRes.data.length === PRODUCTS_PER_PAGE);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadMoreProducts = async () => {
    if (isLoadingMore || !hasMoreProducts) return;
    setIsLoadingMore(true);
    const nextPage = productPage + 1;
    setProductPage(nextPage);
    
    try {
      const prodRes = await inventoryApi.getProducts(id!, { 
        categoryId: selectedCategory || undefined, 
        search: searchQuery || undefined,
        limit: PRODUCTS_PER_PAGE,
        offset: (nextPage - 1) * PRODUCTS_PER_PAGE
      });
      
      setProducts(prev => [...prev, ...prodRes.data]);
      setHasMoreProducts(prodRes.data.length === PRODUCTS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle product image upload
  const handleProductImageUpload = async (productId: string, file: File) => {
    if (!id) return;
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await inventoryApi.updateProduct(id, productId, { image: base64 });
        // Update local state
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, image: base64 } : p
        ));
      } catch (error) {
        console.error('Error uploading product image:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadShop = async () => {
    try {
      const response = await shopApi.getOne(id!);
      setShop(response.data);
    } catch (error) {
      console.error('Error loading shop:', error);
      navigate('/shops');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (_reset = false) => {
    if (!id) return;
    
    try {
      switch (activeTab) {
        case 'dashboard':
          const dashRes = await inventoryApi.getDashboard(id);
          setDashboardStats(dashRes.data);
          break;
        case 'catalog':
          const catRes = await inventoryApi.getCategories(id);
          setCategories(catRes.data);
          await loadProducts(true);
          break;
        case 'purchases':
          const [recRes, prodForRecRes, suppRes] = await Promise.all([
            inventoryApi.getReceptions(id),
            inventoryApi.getProducts(id),
            inventoryApi.getSuppliers(id),
          ]);
          setReceptions(recRes.data);
          setProducts(prodForRecRes.data);
          setSuppliers(suppRes.data);
          break;
        case 'sales':
          const salesRes = await inventoryApi.getMovements(id, { type: 'SALE' });
          setMovements(salesRes.data);
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(amount) + ' FCFA';
  };

  if (isLoading) {
    return (
      <div className="shop-detail-loading">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catalogue', icon: Package },
    { id: 'purchases', label: 'Achats', icon: TrendingDown },
    { id: 'sales', label: 'Ventes', icon: TrendingUp },
  ];

  return (
    <div className="shop-detail-page">
      {/* Sidebar */}
      <aside className={`shop-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className="btn-back-sidebar" onClick={() => navigate('/shops')}>
            <ArrowLeft size={20} />
          </button>
          {!sidebarCollapsed && (
            <div className="shop-info-sidebar">
              {shop.logo ? (
                <img src={shop.logo} alt={shop.name} className="shop-logo-small" />
              ) : (
                <div className="shop-logo-placeholder-small">
                  <Package size={20} />
                </div>
              )}
              <span className="shop-name-sidebar">{shop.name}</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id as TabType)}
                title={item.label}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => navigate(`/shops/${id}/settings`)}
            title="Paramètres"
          >
            <Settings size={20} />
            {!sidebarCollapsed && <span>Paramètres</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="shop-main-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content fade-in">
            <div className="content-header">
              <h1>Tableau de bord</h1>
              <p>Vue d'ensemble de votre activité</p>
            </div>

            {dashboardStats ? (
              <>
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon products">
                      <Package size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{dashboardStats.totalProducts}</span>
                      <span className="stat-label">Produits</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon categories">
                      <Tag size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{dashboardStats.totalCategories}</span>
                      <span className="stat-label">Catégories</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon stock-value">
                      <Box size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{formatCurrency(dashboardStats.totalStockValue)}</span>
                      <span className="stat-label">Valeur du stock</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon revenue">
                      <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{formatCurrency(dashboardStats.potentialRevenue)}</span>
                      <span className="stat-label">Revenu potentiel</span>
                    </div>
                  </div>
                </div>

                {/* Sales & Purchases Summary */}
                <div className="summary-grid">
                  <div className="summary-card sales">
                    <div className="summary-header">
                      <TrendingUp size={20} />
                      <h3>Ventes (30 jours)</h3>
                    </div>
                    <div className="summary-value">{formatCurrency(dashboardStats.salesLast30Days)}</div>
                    <div className="summary-count">{dashboardStats.salesCount} transactions</div>
                  </div>

                  <div className="summary-card purchases">
                    <div className="summary-header">
                      <TrendingDown size={20} />
                      <h3>Achats (30 jours)</h3>
                    </div>
                    <div className="summary-value">{formatCurrency(dashboardStats.purchasesLast30Days)}</div>
                    <div className="summary-count">{dashboardStats.purchasesCount} transactions</div>
                  </div>
                </div>

                {/* Low Stock Alert */}
                {dashboardStats.lowStockList.length > 0 && (
                  <div className="alert-card warning">
                    <div className="alert-header">
                      <AlertTriangle size={20} />
                      <h3>Stock faible ({dashboardStats.lowStockList.length} produits)</h3>
                    </div>
                    <div className="alert-list">
                      {dashboardStats.lowStockList.map((product) => (
                        <div key={product.id} className="alert-item">
                          <span className="product-name">{product.name}</span>
                          <span className="stock-badge low">{product.stockQuantity} en stock</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Movements */}
                {dashboardStats.recentMovements.length > 0 && (
                  <div className="recent-section">
                    <h3>Mouvements récents</h3>
                    <div className="movements-list">
                      {dashboardStats.recentMovements.slice(0, 5).map((movement: any) => (
                        <div key={movement.id} className="movement-item">
                          <div className={`movement-type ${movement.type.toLowerCase()}`}>
                            {movement.type === 'SALE' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div className="movement-info">
                            <span className="movement-product">{movement.product?.name}</span>
                            <span className="movement-date">
                              {new Date(movement.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="movement-quantity">
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </div>
                          <div className="movement-total">
                            {formatCurrency(movement.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-dashboard">
                <Package size={64} />
                <h2>Commencez par ajouter des produits</h2>
                <p>Créez votre catalogue pour suivre vos stocks et ventes</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('catalog')}>
                  <Plus size={18} />
                  Ajouter des produits
                </button>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="catalog-content fade-in">
            <div className="content-header">
              <div>
                <h1>Catalogue</h1>
                <p>Gérez vos produits et catégories</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-outline" onClick={() => setShowExcelModal(true)}>
                  <FileSpreadsheet size={18} />
                  Import/Export Excel
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}>
                  <Tag size={18} />
                  Nouvelle catégorie
                </button>
                <button className="btn btn-primary" onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}>
                  <Plus size={18} />
                  Nouveau produit
                </button>
              </div>
            </div>

            {/* Categories Section */}
            {categories.length > 0 && (
              <div className="categories-section">
                <div className="section-header">
                  <h3><Tag size={18} /> Catégories ({categories.length})</h3>
                </div>
                <div className="categories-grid">
                  {categories.map((cat) => (
                    <div 
                      key={cat.id} 
                      className={`category-card ${selectedCategory === cat.id ? 'selected' : ''}`}
                      style={{ '--cat-color': cat.color } as React.CSSProperties}
                      onClick={() => { setSelectedCategory(selectedCategory === cat.id ? null : cat.id); }}
                    >
                      <div className="category-color" style={{ backgroundColor: cat.color }}></div>
                      <div className="category-info">
                        <span className="category-name">{cat.name}</span>
                        <span className="category-count">{cat._count?.products || 0} produits</span>
                      </div>
                      <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn-icon-sm"
                          onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn-icon-sm danger"
                          onClick={async () => {
                            if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                              await inventoryApi.deleteCategory(id!, cat.id);
                              loadTabData();
                            }
                          }}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Filter */}
            <div className="catalog-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="filter-actions">
                <select 
                  className="filter-select"
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid with Infinite Scroll */}
            {products.length > 0 ? (
              <>
                <div className="products-grid">
                  {products.map((product) => (
                    <div key={product.id} className="product-card">
                      <label className="product-image clickable-image">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProductImageUpload(product.id, file);
                            e.target.value = '';
                          }}
                        />
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <Package size={40} />
                        )}
                        <div className="image-upload-overlay">
                          <Camera size={24} />
                          <span>Changer</span>
                        </div>
                        {product.category && (
                          <span 
                            className="product-category-badge"
                            style={{ backgroundColor: product.category.color }}
                          >
                            {product.category.name}
                          </span>
                        )}
                      </label>
                      <div 
                        className="product-info clickable"
                        onClick={() => { setSelectedProduct(product); setShowProductDetail(true); }}
                      >
                        <h3>{product.name}</h3>
                        {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
                        <div className="product-prices">
                          <span className="cost-price">Achat: {formatCurrency(product.costPrice)}</span>
                          <span className="sell-price">Vente: {formatCurrency(product.sellingPrice)}</span>
                        </div>
                        <div className={`product-stock ${product.stockQuantity < product.minStock ? 'low' : ''}`}>
                          <Box size={14} />
                          {product.stockQuantity} {product.unit}
                        </div>
                      </div>
                      <div className="product-actions">
                        <button 
                          className="btn-icon"
                          onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setShowProductModal(true); }}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Infinite scroll sentinel */}
                {hasMoreProducts && (
                  <div ref={loadMoreRef} className="load-more-sentinel">
                    {isLoadingMore && <div className="spinner-small"></div>}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-catalog">
                <Package size={64} />
                <h2>Aucun produit</h2>
                <p>Ajoutez votre premier produit pour commencer</p>
                <button className="btn btn-primary" onClick={() => setShowProductModal(true)}>
                  <Plus size={18} />
                  Ajouter un produit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Purchases Tab - Receptions */}
        {activeTab === 'purchases' && (
          <div className="receptions-content fade-in">
            <div className="content-header">
              <div>
                <h1>Réceptions d'achats</h1>
                <p>Enregistrez vos entrées de stock avec plusieurs produits</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowReceptionModal(true)}>
                <Plus size={18} />
                Nouvelle réception
              </button>
            </div>

            {/* Search & Filter */}
            <div className="catalog-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par référence ou fournisseur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {receptions.filter(r => 
              !searchQuery || 
              r.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0 ? (
              <div className="receptions-list">
                {receptions.filter(r => 
                  !searchQuery || 
                  r.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((reception) => (
                  <div 
                    key={reception.id} 
                    className="reception-card clickable"
                    onClick={() => { setSelectedReception(reception); setShowReceptionDetail(true); }}
                  >
                    <div className="reception-header">
                      <div className="reception-info">
                        <h3>
                          {reception.reference || `Réception du ${new Date(reception.createdAt).toLocaleDateString('fr-FR')}`}
                        </h3>
                        {reception.supplier && (
                          <span className="reception-supplier">Fournisseur: {reception.supplier.name}</span>
                        )}
                      </div>
                      <div className="reception-meta">
                        <span className="reception-date">
                          {new Date(reception.createdAt).toLocaleDateString('fr-FR', { 
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                        <span className="reception-total">{formatCurrency(reception.totalAmount)}</span>
                      </div>
                    </div>
                    <div className="reception-lines-preview">
                      <span className="lines-count">{reception.lines.length} produit(s)</span>
                      <span className="lines-summary">
                        {reception.lines.slice(0, 2).map((l: any) => l.product?.name).join(', ')}
                        {reception.lines.length > 2 && ` +${reception.lines.length - 2} autres`}
                      </span>
                    </div>
                    {reception.notes && (
                      <div className="reception-notes">
                        <small>{reception.notes}</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-movements">
                <TrendingDown size={64} />
                <h2>Aucune réception enregistrée</h2>
                <p>Enregistrez vos achats pour suivre vos entrées de stock</p>
                <button className="btn btn-primary" onClick={() => setShowReceptionModal(true)}>
                  <Plus size={18} />
                  Nouvelle réception
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="movements-content fade-in">
            <div className="content-header">
              <div>
                <h1>Ventes</h1>
                <p>Enregistrez vos sorties de stock</p>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setMovementType('SALE');
                setShowMovementModal(true);
              }}>
                <Plus size={18} />
                Nouvelle vente
              </button>
            </div>

            {/* Search & Filter */}
            <div className="catalog-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par produit ou référence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {movements.filter(m => 
              !searchQuery || 
              m.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.reference?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0 ? (
              <div className="movements-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Produit</th>
                      <th>Quantité</th>
                      <th>Prix unitaire</th>
                      <th>Total</th>
                      <th>Référence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.filter(m => 
                      !searchQuery || 
                      m.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.reference?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td>{m.product?.name}</td>
                        <td className="quantity negative">{m.quantity}</td>
                        <td>{formatCurrency(m.unitPrice)}</td>
                        <td>{formatCurrency(m.totalPrice)}</td>
                        <td>{m.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-movements">
                <TrendingUp size={64} />
                <h2>Aucune vente enregistrée</h2>
                <p>Enregistrez vos ventes pour suivre vos sorties de stock</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          shopId={id!}
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSave={() => { setShowProductModal(false); setEditingProduct(null); loadTabData(); }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          shopId={id!}
          category={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          onSave={() => { setShowCategoryModal(false); setEditingCategory(null); loadTabData(); }}
        />
      )}

      {/* Excel Import/Export Modal */}
      {showExcelModal && (
        <ExcelImportExport
          categories={categories}
          products={products}
          onImport={async (importedCategories, importedProducts) => {
            // First create categories
            const categoryMap: Record<string, string> = {};
            for (const cat of importedCategories) {
              try {
                const res = await inventoryApi.createCategory(id!, { name: cat.name, description: cat.description });
                categoryMap[cat.name] = res.data.id;
              } catch (error) {
                console.error('Error creating category:', cat.name, error);
              }
            }
            // Then create products with category mapping
            for (const prod of importedProducts) {
              try {
                const categoryId = prod.categoryName ? categoryMap[prod.categoryName] || categories.find(c => c.name === prod.categoryName)?.id : undefined;
                await inventoryApi.createProduct(id!, {
                  name: prod.name,
                  sku: prod.sku,
                  categoryId,
                  costPrice: prod.costPrice,
                  sellingPrice: prod.sellingPrice,
                  stockQuantity: prod.stockQuantity,
                  minStock: prod.minStock,
                  unit: prod.unit,
                  description: prod.description,
                });
              } catch (error) {
                console.error('Error creating product:', prod.name, error);
              }
            }
            // Reload data
            loadTabData();
          }}
          onClose={() => setShowExcelModal(false)}
        />
      )}

      {/* Product Detail Modal */}
      {showProductDetail && selectedProduct && (
        <ProductDetailModal
          shopId={id!}
          product={selectedProduct}
          formatCurrency={formatCurrency}
          onClose={() => { setShowProductDetail(false); setSelectedProduct(null); }}
          onEdit={() => {
            setShowProductDetail(false);
            setEditingProduct(selectedProduct);
            setShowProductModal(true);
          }}
          onUpdate={(updatedProduct) => {
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            setSelectedProduct(updatedProduct);
          }}
        />
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <MovementModal
          shopId={id!}
          type={movementType}
          products={products}
          onClose={() => setShowMovementModal(false)}
          onSave={() => { setShowMovementModal(false); loadTabData(); }}
        />
      )}

      {/* Reception Modal */}
      {showReceptionModal && (
        <ReceptionModal
          shopId={id!}
          products={products}
          suppliers={suppliers}
          reception={editingReception}
          onClose={() => { setShowReceptionModal(false); setEditingReception(null); }}
          onSave={() => { setShowReceptionModal(false); setEditingReception(null); loadTabData(); }}
          onProductCreated={(product) => setProducts(prev => [...prev, product])}
          onSupplierCreated={(supplier) => setSuppliers(prev => [...prev, supplier])}
        />
      )}

      {/* Reception Detail Modal */}
      {showReceptionDetail && selectedReception && (
        <ReceptionDetailModal
          reception={selectedReception}
          formatCurrency={formatCurrency}
          onClose={() => { setShowReceptionDetail(false); setSelectedReception(null); }}
          onEdit={() => {
            setShowReceptionDetail(false);
            setEditingReception(selectedReception);
            setShowReceptionModal(true);
          }}
          onDelete={async () => {
            if (confirm('Supprimer cette réception ? Les stocks seront ajustés.')) {
              await inventoryApi.deleteReception(id!, selectedReception.id);
              setShowReceptionDetail(false);
              setSelectedReception(null);
              loadTabData();
            }
          }}
        />
      )}
    </div>
  );
}

// Product Detail Modal Component with Photo Album
function ProductDetailModal({ shopId, product, formatCurrency, onClose, onEdit, onUpdate }: {
  shopId: string;
  product: Product;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: (product: Product) => void;
}) {
  const [images, setImages] = useState<string[]>(product.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle adding new photo to album
  const handleAddPhoto = async (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const newImages = [...images, base64];
      try {
        await inventoryApi.updateProduct(shopId, product.id, { images: newImages });
        setImages(newImages);
        onUpdate({ ...product, images: newImages });
      } catch (error) {
        console.error('Error adding photo:', error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle removing photo from album
  const handleRemovePhoto = async (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    try {
      await inventoryApi.updateProduct(shopId, product.id, { images: newImages });
      setImages(newImages);
      onUpdate({ ...product, images: newImages });
      setSelectedImageIndex(null);
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  // Set as main image
  const handleSetAsMain = async (index: number) => {
    const selectedImage = images[index];
    try {
      await inventoryApi.updateProduct(shopId, product.id, { image: selectedImage });
      onUpdate({ ...product, image: selectedImage });
    } catch (error) {
      console.error('Error setting main image:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails du produit</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="modal-content product-detail-content">
          {/* Main Image & Gallery */}
          <div className="product-detail-gallery">
            <div className="main-image-container">
              {product.image ? (
                <img src={product.image} alt={product.name} className="main-product-image" />
              ) : (
                <div className="no-image-placeholder">
                  <Package size={80} />
                  <span>Aucune image</span>
                </div>
              )}
            </div>

            {/* Photo Album */}
            <div className="photo-album-section">
              <div className="album-header">
                <h3><Camera size={18} /> Album photos ({images.length})</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAddPhoto(file);
                    e.target.value = '';
                  }}
                />
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Plus size={16} />
                  {isUploading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>

              <div className="album-grid">
                {images.map((img, index) => (
                  <div 
                    key={index} 
                    className={`album-thumbnail ${selectedImageIndex === index ? 'selected' : ''} ${product.image === img ? 'is-main' : ''}`}
                    onClick={() => setSelectedImageIndex(selectedImageIndex === index ? null : index)}
                  >
                    <img src={img} alt={`Photo ${index + 1}`} />
                    {product.image === img && <span className="main-badge">Principal</span>}
                  </div>
                ))}
                {images.length === 0 && (
                  <div className="empty-album">
                    <Camera size={24} />
                    <span>Aucune photo dans l'album</span>
                  </div>
                )}
              </div>

              {/* Selected image actions */}
              {selectedImageIndex !== null && (
                <div className="album-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleSetAsMain(selectedImageIndex)}
                    disabled={product.image === images[selectedImageIndex]}
                  >
                    <Check size={16} />
                    Définir comme principale
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemovePhoto(selectedImageIndex)}
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="product-detail-info">
            <div className="detail-header">
              <h1>{product.name}</h1>
              {product.category && (
                <span 
                  className="category-tag"
                  style={{ backgroundColor: product.category.color }}
                >
                  {product.category.name}
                </span>
              )}
            </div>

            {product.description && (
              <p className="product-description">{product.description}</p>
            )}

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">SKU / Référence</span>
                <span className="detail-value">{product.sku || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Code-barres</span>
                <span className="detail-value">{product.barcode || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Unité</span>
                <span className="detail-value">{product.unit}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Stock minimum</span>
                <span className="detail-value">{product.minStock} {product.unit}</span>
              </div>
            </div>

            <div className="price-stock-section">
              <div className="price-box">
                <span className="price-label">Prix d'achat</span>
                <span className="price-value cost">{formatCurrency(product.costPrice)}</span>
              </div>
              <div className="price-box">
                <span className="price-label">Prix de vente</span>
                <span className="price-value sell">{formatCurrency(product.sellingPrice)}</span>
              </div>
              <div className="price-box">
                <span className="price-label">Marge</span>
                <span className="price-value margin">
                  {formatCurrency(product.sellingPrice - product.costPrice)}
                  {product.costPrice > 0 && (
                    <small> ({Math.round((product.sellingPrice - product.costPrice) / product.costPrice * 100)}%)</small>
                  )}
                </span>
              </div>
            </div>

            <div className={`stock-status-box ${product.stockQuantity < product.minStock ? 'low' : 'ok'}`}>
              <Box size={24} />
              <div className="stock-info">
                <span className="stock-label">Stock actuel</span>
                <span className="stock-value">{product.stockQuantity} {product.unit}</span>
              </div>
              {product.stockQuantity < product.minStock && (
                <span className="stock-alert">
                  <AlertTriangle size={16} />
                  Stock bas
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            <Edit size={18} />
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

// Product Modal Component
function ProductModal({ shopId, product, categories, onClose, onSave }: {
  shopId: string;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || '',
    costPrice: product?.costPrice || 0,
    sellingPrice: product?.sellingPrice || 0,
    stockQuantity: product?.stockQuantity || 0,
    minStock: product?.minStock || 5,
    unit: product?.unit || 'unité',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (product) {
        await inventoryApi.updateProduct(shopId, product.id, formData);
      } else {
        await inventoryApi.createProduct(shopId, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Nom du produit *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Code-barres</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select
                  className="form-input"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unité</label>
                <select
                  className="form-input"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="unité">Unité</option>
                  <option value="kg">Kilogramme</option>
                  <option value="g">Gramme</option>
                  <option value="L">Litre</option>
                  <option value="mL">Millilitre</option>
                  <option value="m">Mètre</option>
                  <option value="pièce">Pièce</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prix d'achat (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prix de vente (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              {!product && (
                <div className="form-group">
                  <label className="form-label">Stock initial</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Stock minimum (alerte)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : (product ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Category Modal Component
function CategoryModal({ shopId, category, onClose, onSave }: {
  shopId: string;
  category: Category | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#6366f1',
  });
  const [isSaving, setIsSaving] = useState(false);

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (category) {
        await inventoryApi.updateCategory(shopId, category.id, formData);
      } else {
        await inventoryApi.createCategory(shopId, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label className="form-label">Nom de la catégorie *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div className="color-picker">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  >
                    {formData.color === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : (category ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Movement Modal Component
function MovementModal({ shopId, type, products, onClose, onSave }: {
  shopId: string;
  type: 'PURCHASE' | 'SALE';
  products: Product[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    reference: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = products.find(p => p.id === formData.productId);

  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        unitPrice: type === 'SALE' ? selectedProduct.sellingPrice : selectedProduct.costPrice,
      }));
    }
  }, [formData.productId, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await inventoryApi.createMovement(shopId, {
        type,
        productId: formData.productId,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const total = formData.quantity * formData.unitPrice;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal movement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === 'PURCHASE' ? 'Nouvel achat' : 'Nouvelle vente'}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label className="form-label">Produit *</label>
              <select
                className="form-input"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
              >
                <option value="">Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Quantité *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  max={type === 'SALE' && selectedProduct ? selectedProduct.stockQuantity : undefined}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prix unitaire (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Référence (facture, bon...)</label>
              <input
                type="text"
                className="form-input"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Ex: FAC-2024-001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="movement-total">
              <span>Total:</span>
              <strong>{new Intl.NumberFormat('fr-FR').format(total)} FCFA</strong>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !formData.productId}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reception Detail Modal Component
function ReceptionDetailModal({ reception, formatCurrency, onClose, onEdit, onDelete }: {
  _shopId?: string;
  reception: any;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal reception-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{reception.reference || 'Détails de la réception'}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <div className="modal-content">
          <div className="reception-detail-info">
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">
                {new Date(reception.createdAt).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>
            {reception.supplier && (
              <div className="detail-row">
                <span className="detail-label">Fournisseur:</span>
                <span className="detail-value">{reception.supplier.name}</span>
              </div>
            )}
            {reception.reference && (
              <div className="detail-row">
                <span className="detail-label">Référence:</span>
                <span className="detail-value">{reception.reference}</span>
              </div>
            )}
          </div>

          <div className="reception-detail-lines">
            <h3>Produits reçus</h3>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {reception.lines.map((line: any) => (
                  <tr key={line.id}>
                    <td>{line.product?.name}</td>
                    <td className="quantity positive">+{line.quantity} {line.product?.unit}</td>
                    <td>{formatCurrency(line.unitPrice)}</td>
                    <td>{formatCurrency(line.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="reception-detail-summary">
            <div className="summary-row">
              <span>Sous-total:</span>
              <span>{formatCurrency(reception.subtotal)}</span>
            </div>
            {reception.taxAmount > 0 && (
              <div className="summary-row">
                <span>Taxes:</span>
                <span>{formatCurrency(reception.taxAmount)}</span>
              </div>
            )}
            {reception.deliveryFee > 0 && (
              <div className="summary-row">
                <span>Livraison:</span>
                <span>{formatCurrency(reception.deliveryFee)}</span>
              </div>
            )}
            {reception.otherFees > 0 && (
              <div className="summary-row">
                <span>Autres frais:</span>
                <span>{formatCurrency(reception.otherFees)}</span>
              </div>
            )}
            {reception.discount > 0 && (
              <div className="summary-row discount">
                <span>Remise:</span>
                <span>-{formatCurrency(reception.discount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total:</span>
              <span>{formatCurrency(reception.totalAmount)}</span>
            </div>
          </div>

          {reception.notes && (
            <div className="reception-detail-notes">
              <h4>Notes:</h4>
              <p>{reception.notes}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onEdit}>
            <Edit size={16} />
            Modifier
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// Reception Modal Component (Excel-like interface for multi-product purchases)
interface ReceptionLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

function ReceptionModal({ shopId, products: initialProducts, suppliers: initialSuppliers, reception, onClose, onSave, onProductCreated, onSupplierCreated }: {
  shopId: string;
  products: Product[];
  suppliers: Supplier[];
  reception?: any;
  onClose: () => void;
  onSave: () => void;
  onProductCreated: (product: Product) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}) {
  const isEditing = !!reception;
  const [reference, setReference] = useState(reception?.reference || '');
  const [supplierId, setSupplierId] = useState(reception?.supplierId || reception?.supplier?.id || '');
  const [notes, setNotes] = useState(reception?.notes || '');
  const [taxAmount, setTaxAmount] = useState(reception?.taxAmount || 0);
  const [deliveryFee, setDeliveryFee] = useState(reception?.deliveryFee || 0);
  const [otherFees, setOtherFees] = useState(reception?.otherFees || 0);
  const [discount, setDiscount] = useState(reception?.discount || 0);
  const [lines, setLines] = useState<ReceptionLine[]>(
    reception?.lines?.map((l: any) => ({
      id: l.id || crypto.randomUUID(),
      productId: l.productId || l.product?.id,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })) || [{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showCharges, setShowCharges] = useState(
    (reception?.taxAmount || 0) > 0 || (reception?.deliveryFee || 0) > 0 || 
    (reception?.otherFees || 0) > 0 || (reception?.discount || 0) > 0
  );
  
  // Local state for products and suppliers (updated when new ones are created)
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  
  // Inline product creation modal state
  const [showInlineProductModal, setShowInlineProductModal] = useState(false);
  const [inlineProductName, setInlineProductName] = useState('');
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  // Open inline product creation modal
  const handleOpenProductModal = (searchQuery: string, lineId: string) => {
    setInlineProductName(searchQuery);
    setPendingLineId(lineId);
    setShowInlineProductModal(true);
  };

  // Handle product created from inline modal
  const handleInlineProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    onProductCreated(newProduct);
    // Auto-select the new product in the pending line
    if (pendingLineId) {
      setLines(prev => prev.map(l => 
        l.id === pendingLineId 
          ? { ...l, productId: newProduct.id, unitPrice: newProduct.costPrice }
          : l
      ));
    }
    setShowInlineProductModal(false);
    setPendingLineId(null);
  };

  // Create new supplier inline
  const handleCreateSupplier = async (name: string): Promise<{ id: string; name: string } | null> => {
    try {
      const response = await inventoryApi.createSupplier(shopId, { name });
      const newSupplier = response.data;
      setSuppliers(prev => [...prev, newSupplier]);
      onSupplierCreated(newSupplier);
      return { id: newSupplier.id, name: newSupplier.name };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return null;
    }
  };

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof ReceptionLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.unitPrice = product.costPrice;
          }
        }
        return updated;
      }
      return l;
    }));
  };

  const getLineTotal = (line: ReceptionLine) => line.quantity * line.unitPrice;
  const subtotal = lines.reduce((sum, line) => sum + getLineTotal(line), 0);
  const grandTotal = subtotal + taxAmount + deliveryFee + otherFees - discount;

  const validLines = lines.filter(l => l.productId && l.quantity > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validLines.length === 0) return;

    setIsSaving(true);
    try {
      const data = {
        reference: reference || undefined,
        supplierId: supplierId || undefined,
        notes: notes || undefined,
        taxAmount: taxAmount || undefined,
        deliveryFee: deliveryFee || undefined,
        otherFees: otherFees || undefined,
        discount: discount || undefined,
        lines: validLines.map(l => ({
          id: l.id,
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      };

      if (isEditing) {
        await inventoryApi.updateReception(shopId, reception.id, data);
      } else {
        await inventoryApi.createReception(shopId, data);
      }
      onSave();
    } catch (error) {
      console.error('Error saving reception:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal reception-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Modifier la réception' : 'Nouvelle réception d\'achat'}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Référence (facture, BL...)</label>
                <input
                  type="text"
                  className="form-input"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: FAC-2024-001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fournisseur</label>
                <SearchableSelect
                  options={suppliers.map(s => ({ id: s.id, name: s.name, subtitle: s.phone }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Sélectionner un fournisseur..."
                  onCreateNew={handleCreateSupplier}
                  createLabel="Ajouter"
                />
              </div>
            </div>

            <div className="reception-table-container">
              <table className="reception-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Produit</th>
                    <th style={{ width: '15%' }}>Quantité</th>
                    <th style={{ width: '20%' }}>Prix unitaire</th>
                    <th style={{ width: '20%' }}>Total</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <SearchableSelect
                          className="table-searchable-select"
                          options={products.map(p => ({ id: p.id, name: p.name, subtitle: p.sku ? `SKU: ${p.sku}` : undefined }))}
                          value={line.productId}
                          onChange={(value) => updateLine(line.id, 'productId', value)}
                          placeholder="Rechercher un produit..."
                          onOpenCreateModal={(query) => handleOpenProductModal(query, line.id)}
                          createLabel="Créer"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </td>
                      <td className="line-total">
                        {formatCurrency(getLineTotal(line))}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-line"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <button type="button" className="btn btn-add-line" onClick={addLine}>
                <Plus size={16} />
                Ajouter une ligne
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notes ou commentaires..."
              />
            </div>

            {/* Charges annexes */}
            <div className="charges-section">
              <button 
                type="button" 
                className="btn-toggle-charges"
                onClick={() => setShowCharges(!showCharges)}
              >
                {showCharges ? '− Masquer' : '+ Ajouter'} les charges annexes
              </button>
              
              {showCharges && (
                <div className="charges-grid">
                  <div className="charge-item">
                    <label>Taxes (TVA, etc.)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="charge-item">
                    <label>Frais de livraison</label>
                    <input
                      type="number"
                      className="form-input"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="charge-item">
                    <label>Autres frais</label>
                    <input
                      type="number"
                      className="form-input"
                      value={otherFees}
                      onChange={(e) => setOtherFees(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="charge-item discount">
                    <label>Remise</label>
                    <input
                      type="number"
                      className="form-input"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="reception-summary">
              <div className="summary-line">
                <span>Sous-total produits:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="summary-line">
                  <span>Taxes:</span>
                  <span>+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="summary-line">
                  <span>Livraison:</span>
                  <span>+{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {otherFees > 0 && (
                <div className="summary-line">
                  <span>Autres frais:</span>
                  <span>+{formatCurrency(otherFees)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="summary-line discount">
                  <span>Remise:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="summary-line total">
                <span>Total de la réception:</span>
                <strong>{formatCurrency(grandTotal)}</strong>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || validLines.length === 0}>
              {isSaving ? 'Enregistrement...' : `Enregistrer (${validLines.length} produit${validLines.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>

      {/* Inline Product Creation Modal */}
      {showInlineProductModal && (
        <InlineProductModal
          shopId={shopId}
          initialName={inlineProductName}
          categories={[]}
          onClose={() => { setShowInlineProductModal(false); setPendingLineId(null); }}
          onSave={handleInlineProductCreated}
        />
      )}
    </div>
  );
}

// Inline Product Creation Modal (simplified version for reception form)
function InlineProductModal({ shopId, initialName, categories: _categories, onClose, onSave }: {
  shopId: string;
  initialName: string;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [name, setName] = useState(initialName);
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [unit, setUnit] = useState('unité');
  const [minStock, setMinStock] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const response = await inventoryApi.createProduct(shopId, {
        name: name.trim(),
        sku: sku.trim() || undefined,
        costPrice,
        sellingPrice,
        unit,
        minStock,
        stockQuantity: 0,
      });
      onSave(response.data);
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay inline-modal-overlay" onClick={onClose}>
      <div className="modal inline-product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nouveau produit</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label className="form-label">Nom du produit *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du produit"
                autoFocus
                required
              />
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">SKU / Référence</label>
                <input
                  type="text"
                  className="form-input"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: PRD-001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unité</label>
                <select
                  className="form-input"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="unité">Unité</option>
                  <option value="kg">Kilogramme (kg)</option>
                  <option value="g">Gramme (g)</option>
                  <option value="L">Litre (L)</option>
                  <option value="mL">Millilitre (mL)</option>
                  <option value="m">Mètre (m)</option>
                  <option value="cm">Centimètre (cm)</option>
                  <option value="pièce">Pièce</option>
                  <option value="boîte">Boîte</option>
                  <option value="paquet">Paquet</option>
                  <option value="carton">Carton</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Prix d'achat (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prix de vente (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stock minimum (alerte)</label>
              <input
                type="number"
                className="form-input"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                min="0"
                placeholder="5"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Création...' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reception Detail Modal Component
