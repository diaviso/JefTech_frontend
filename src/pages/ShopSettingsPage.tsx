import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Users, Copy, RefreshCw, Check, 
  UserPlus, Shield, ShoppingCart, Crown, ToggleLeft, ToggleRight, Trash2,
  Store, MapPin, Phone, Mail, Globe, FileText, Building2, CreditCard,
  AlertTriangle, X, Receipt, Banknote, Hash, Upload, Image, Quote
} from 'lucide-react';
import Layout from '../components/Layout';
import { shopApi } from '../config/api';

interface Member {
  id: string;
  role: 'OWNER' | 'MANAGER' | 'SELLER';
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
}

interface Shop {
  id: string;
  name: string;
  type: string;
  categories?: string[];
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tagline?: string;
  inviteCode?: string;
  userRole: string;
  members: Member[];
  // Invoice fields
  logo?: string;
  ninea?: string;
  rccm?: string;
  legalName?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  currency?: string;
  invoicePrefix?: string;
  invoiceFooter?: string;
}

interface FormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tagline: string;
  // Invoice fields
  logo: string;
  ninea: string;
  rccm: string;
  legalName: string;
  taxId: string;
  bankName: string;
  bankAccount: string;
  iban: string;
  currency: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  OWNER: { label: 'Propriétaire', icon: Crown, color: 'gold' },
  MANAGER: { label: 'Gestionnaire', icon: Shield, color: 'blue' },
  SELLER: { label: 'Vendeur', icon: ShoppingCart, color: 'green' },
};

export default function ShopSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'invoice' | 'team' | 'danger'>('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tagline: '',
    logo: '',
    ninea: '',
    rccm: '',
    legalName: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    iban: '',
    currency: 'XOF',
    invoicePrefix: 'FAC',
    invoiceFooter: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FRONTEND_URL = window.location.origin;

  useEffect(() => {
    loadShop();
  }, [id]);

  const loadShop = async () => {
    if (!id) return;
    try {
      const response = await shopApi.getOne(id);
      const shopData = response.data;
      setShop(shopData);
      setMembers(shopData.members || []);
      setFormData({
        name: shopData.name || '',
        address: shopData.address || '',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website: shopData.website || '',
        tagline: shopData.tagline || '',
        logo: shopData.logo || '',
        ninea: shopData.ninea || '',
        rccm: shopData.rccm || '',
        legalName: shopData.legalName || '',
        taxId: shopData.taxId || '',
        bankName: shopData.bankName || '',
        bankAccount: shopData.bankAccount || '',
        iban: shopData.iban || '',
        currency: shopData.currency || 'XOF',
        invoicePrefix: shopData.invoicePrefix || 'FAC',
        invoiceFooter: shopData.invoiceFooter || '',
      });
    } catch (error) {
      console.error('Error loading shop:', error);
      navigate('/shops');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await shopApi.update(id, formData);
      await loadShop();
    } catch (error) {
      console.error('Error saving shop:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyInviteLink = () => {
    if (!shop?.inviteCode) return;
    const link = `${FRONTEND_URL}/join/${shop.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateInviteCode = async () => {
    if (!id) return;
    try {
      const response = await shopApi.regenerateInvite(id);
      setShop(prev => prev ? { ...prev, inviteCode: response.data.inviteCode } : null);
    } catch (error) {
      console.error('Error regenerating invite code:', error);
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!id) return;
    try {
      await shopApi.updateMember(id, memberId, { role });
      await loadShop();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const toggleMemberActive = async (memberId: string, isActive: boolean) => {
    if (!id) return;
    try {
      await shopApi.updateMember(id, memberId, { isActive });
      await loadShop();
    } catch (error) {
      console.error('Error toggling member:', error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!id || !confirm('Êtes-vous sûr de vouloir retirer cet employé ?')) return;
    try {
      await shopApi.removeMember(id, memberId);
      await loadShop();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteShop = async () => {
    if (!id || !shop) return;
    
    if (deleteConfirmName !== shop.name) {
      setDeleteError('Le nom ne correspond pas');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    
    try {
      await shopApi.delete(id, deleteConfirmName);
      navigate('/shops');
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName('');
    setDeleteError('');
  };

  if (isLoading) {
    return (
      <Layout title="Paramètres">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  if (!shop) {
    return (
      <Layout title="Paramètres">
        <div className="empty-state">
          <h3>Boutique non trouvée</h3>
        </div>
      </Layout>
    );
  }

  const isOwner = shop.userRole === 'OWNER';
  const canManageMembers = shop.userRole === 'OWNER' || shop.userRole === 'MANAGER';

  return (
    <Layout title={`Paramètres - ${shop.name}`}>
      <div className="settings-page">
        {/* Header */}
        <div className="settings-header">
          <button onClick={() => navigate('/shops')} className="btn-back">
            <ArrowLeft size={20} />
          </button>
          <div className="settings-title">
            <h1>{shop.name}</h1>
            <p>Paramètres de la boutique</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Store size={18} />
            <span>Général</span>
          </button>
          <button 
            className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice')}
          >
            <Receipt size={18} />
            <span>Facturation</span>
          </button>
          {canManageMembers && (
            <button 
              className={`tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <Users size={18} />
              <span>Équipe</span>
            </button>
          )}
          {isOwner && (
            <button 
              className={`tab danger ${activeTab === 'danger' ? 'active' : ''}`}
              onClick={() => setActiveTab('danger')}
            >
              <AlertTriangle size={18} />
              <span>Zone danger</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="tab-content fade-in">
              {/* Logo & Branding */}
              <div className="glass-card">
                <div className="card-icon">
                  <Image size={24} />
                </div>
                <h2>Logo & Identité</h2>
                <p className="card-description">Logo et phrase d'accroche de votre entreprise</p>
                
                <div className="logo-upload-section">
                  <div className="logo-preview">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Logo" className="logo-image" />
                    ) : (
                      <div className="logo-placeholder">
                        <Image size={48} />
                        <span>Aucun logo</span>
                      </div>
                    )}
                  </div>
                  
                  {canManageMembers && (
                    <div className="logo-actions">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden-input"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" className="btn btn-secondary">
                        <Upload size={18} />
                        {formData.logo ? 'Changer le logo' : 'Télécharger un logo'}
                      </label>
                      {formData.logo && (
                        <button onClick={removeLogo} className="btn btn-outline">
                          <X size={18} />
                          Supprimer
                        </button>
                      )}
                      <p className="upload-hint">PNG, JPG ou GIF. Max 2 Mo.</p>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">
                    <Quote size={16} />
                    Phrase d'accroche / Slogan
                  </label>
                  <textarea
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="form-input textarea"
                    placeholder="Ex: Votre partenaire de confiance depuis 2010..."
                    rows={2}
                    disabled={!canManageMembers}
                  />
                </div>
              </div>

              {/* General Info */}
              <div className="glass-card">
                <div className="card-icon">
                  <Store size={24} />
                </div>
                <h2>Informations générales</h2>
                <p className="card-description">Coordonnées et informations de contact</p>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <Store size={16} />
                      Nom de la boutique
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={16} />
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="form-input"
                      placeholder="Ex: Marché Sandaga, Dakar"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Phone size={16} />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="Ex: 77 123 45 67"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Mail size={16} />
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="contact@maboutique.sn"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      <Globe size={16} />
                      Site web
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="form-input"
                      placeholder="https://www.maboutique.sn"
                      disabled={!canManageMembers}
                    />
                  </div>
                </div>

                {canManageMembers && (
                  <button onClick={handleSave} className="btn btn-primary btn-save" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="spinner-small"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Enregistrer les modifications
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Invoice Tab */}
          {activeTab === 'invoice' && (
            <div className="tab-content fade-in">
              <div className="glass-card">
                <div className="card-icon invoice">
                  <FileText size={24} />
                </div>
                <h2>Informations légales</h2>
                <p className="card-description">Ces informations apparaîtront sur vos factures</p>
                
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">
                      <Building2 size={16} />
                      Raison sociale
                    </label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="form-input"
                      placeholder="Nom légal de l'entreprise"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Hash size={16} />
                      NINEA
                    </label>
                    <input
                      type="text"
                      value={formData.ninea}
                      onChange={(e) => setFormData({ ...formData, ninea: e.target.value })}
                      className="form-input"
                      placeholder="Numéro NINEA"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FileText size={16} />
                      RCCM
                    </label>
                    <input
                      type="text"
                      value={formData.rccm}
                      onChange={(e) => setFormData({ ...formData, rccm: e.target.value })}
                      className="form-input"
                      placeholder="Numéro RCCM"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Receipt size={16} />
                      N° Identification Fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="form-input"
                      placeholder="NIF"
                      disabled={!canManageMembers}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div className="card-icon bank">
                  <Banknote size={24} />
                </div>
                <h2>Informations bancaires</h2>
                <p className="card-description">Coordonnées bancaires pour les paiements</p>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <Building2 size={16} />
                      Nom de la banque
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="form-input"
                      placeholder="Ex: CBAO, Ecobank..."
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <CreditCard size={16} />
                      Numéro de compte
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      className="form-input"
                      placeholder="Numéro de compte"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      <Hash size={16} />
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      className="form-input"
                      placeholder="Code IBAN"
                      disabled={!canManageMembers}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div className="card-icon settings">
                  <Receipt size={24} />
                </div>
                <h2>Paramètres de facturation</h2>
                <p className="card-description">Personnalisez vos factures</p>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <Hash size={16} />
                      Préfixe des factures
                    </label>
                    <input
                      type="text"
                      value={formData.invoicePrefix}
                      onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                      className="form-input"
                      placeholder="FAC"
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Banknote size={16} />
                      Devise
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="form-input"
                      disabled={!canManageMembers}
                    >
                      <option value="XOF">XOF (Franc CFA)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="USD">USD (Dollar)</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      <FileText size={16} />
                      Mentions légales (pied de facture)
                    </label>
                    <textarea
                      value={formData.invoiceFooter}
                      onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                      className="form-input textarea"
                      placeholder="Mentions légales à afficher en bas des factures..."
                      rows={3}
                      disabled={!canManageMembers}
                    />
                  </div>
                </div>

                {canManageMembers && (
                  <button onClick={handleSave} className="btn btn-primary btn-save" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="spinner-small"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Enregistrer les modifications
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && canManageMembers && (
            <div className="tab-content fade-in">
              {/* Invite Link */}
              {isOwner && (
                <div className="glass-card">
                  <div className="card-icon invite">
                    <UserPlus size={24} />
                  </div>
                  <h2>Inviter des employés</h2>
                  <p className="card-description">Partagez ce lien avec vos employés pour qu'ils rejoignent votre boutique</p>

                  <div className="invite-box">
                    <code className="invite-link">
                      {FRONTEND_URL}/join/{shop.inviteCode}
                    </code>
                    <div className="invite-actions">
                      <button onClick={copyInviteLink} className="btn btn-secondary">
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copié !' : 'Copier'}
                      </button>
                      <button onClick={regenerateInviteCode} className="btn btn-outline" title="Régénérer le lien">
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="warning-text">
                    <AlertTriangle size={14} />
                    Si vous régénérez le lien, l'ancien ne fonctionnera plus.
                  </p>
                </div>
              )}

              <div className="glass-card">
                <div className="card-icon team">
                  <Users size={24} />
                </div>
                <h2>Équipe ({members.length} membre{members.length > 1 ? 's' : ''})</h2>
                <p className="card-description">Gérez les membres de votre boutique</p>

                <div className="members-list">
                  {members.map((member) => {
                    const roleInfo = ROLE_LABELS[member.role];
                    const RoleIcon = roleInfo.icon;
                    const isCurrentOwner = member.role === 'OWNER';

                    return (
                      <div key={member.id} className={`member-item ${!member.isActive ? 'inactive' : ''}`}>
                        <div className="member-info">
                          {member.user.picture ? (
                            <img src={member.user.picture} alt={member.user.name} className="member-avatar" />
                          ) : (
                            <div className="member-avatar-placeholder">
                              {member.user.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <h4>{member.user.name}</h4>
                            <p>{member.user.email}</p>
                          </div>
                        </div>

                        <div className="member-role">
                          <span className={`role-badge ${roleInfo.color}`}>
                            <RoleIcon size={14} />
                            {roleInfo.label}
                          </span>
                        </div>

                        {!isCurrentOwner && isOwner && (
                          <div className="member-actions">
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value)}
                              className="role-select"
                            >
                              <option value="SELLER">Vendeur</option>
                              <option value="MANAGER">Gestionnaire</option>
                            </select>

                            <button
                              onClick={() => toggleMemberActive(member.id, !member.isActive)}
                              className={`toggle-btn ${member.isActive ? 'active' : ''}`}
                              title={member.isActive ? 'Désactiver' : 'Activer'}
                            >
                              {member.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            </button>

                            <button
                              onClick={() => removeMember(member.id)}
                              className="btn-icon danger"
                              title="Retirer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}

                        {isCurrentOwner && (
                          <div className="member-actions">
                            <span className="owner-tag">Vous</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {members.length === 1 && (
                    <div className="empty-team">
                      <Users size={48} />
                      <p>Vous êtes le seul membre de cette boutique.</p>
                      <p className="text-muted">Utilisez le lien d'invitation pour ajouter des employés.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && isOwner && (
            <div className="tab-content fade-in">
              <div className="glass-card danger-zone">
                <div className="card-icon danger">
                  <AlertTriangle size={24} />
                </div>
                <h2>Zone de danger</h2>
                <p className="card-description">Actions irréversibles - Procédez avec prudence</p>

                <div className="danger-action">
                  <div className="danger-info">
                    <h3>Supprimer la boutique</h3>
                    <p>
                      Cette action est <strong>irréversible</strong>. Toutes les données de la boutique seront 
                      définitivement supprimées, y compris les membres et leurs accès.
                    </p>
                    <ul className="danger-list">
                      <li>Tous les membres perdront leur accès</li>
                      <li>Le lien d'invitation sera invalidé</li>
                      <li>Les données ne pourront pas être récupérées</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => setShowDeleteModal(true)} 
                    className="btn btn-danger"
                  >
                    <Trash2 size={18} />
                    Supprimer cette boutique
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDeleteModal}>
              <X size={24} />
            </button>
            
            <div className="modal-icon danger">
              <AlertTriangle size={48} />
            </div>
            
            <h2>Supprimer la boutique ?</h2>
            <p className="modal-description">
              Cette action est <strong>définitive et irréversible</strong>. 
              Pour confirmer, veuillez saisir le nom exact de la boutique :
            </p>
            
            <div className="shop-name-display">
              <code>{shop.name}</code>
            </div>

            <div className="form-group">
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => {
                  setDeleteConfirmName(e.target.value);
                  setDeleteError('');
                }}
                className={`form-input ${deleteError ? 'error' : ''}`}
                placeholder="Tapez le nom de la boutique"
                autoFocus
              />
              {deleteError && (
                <span className="error-message">{deleteError}</span>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={closeDeleteModal} className="btn btn-secondary">
                Annuler
              </button>
              <button 
                onClick={handleDeleteShop} 
                className="btn btn-danger"
                disabled={isDeleting || deleteConfirmName !== shop.name}
              >
                {isDeleting ? (
                  <>
                    <div className="spinner-small"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
