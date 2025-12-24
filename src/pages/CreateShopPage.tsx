import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Store, Tag, MapPin, Phone, Building } from 'lucide-react';
import Layout from '../components/Layout';
import { shopApi } from '../config/api';
import { useAuth } from '../context/AuthContext';

const SHOP_CATEGORIES = [
  { id: 'alimentation', label: 'Alimentation', icon: '🍎' },
  { id: 'vetements', label: 'Vêtements & Mode', icon: '👕' },
  { id: 'electronique', label: 'Électronique', icon: '📱' },
  { id: 'beaute', label: 'Beauté & Cosmétiques', icon: '💄' },
  { id: 'maison', label: 'Maison & Décoration', icon: '🏠' },
  { id: 'sport', label: 'Sport & Loisirs', icon: '⚽' },
  { id: 'sante', label: 'Santé & Pharmacie', icon: '💊' },
  { id: 'restauration', label: 'Restauration', icon: '🍽️' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'autre', label: 'Autre', icon: '📦' },
];

interface FormData {
  name: string;
  categories: string[];
  address: string;
  phone: string;
  type: string;
}

export default function CreateShopPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    categories: [],
    address: '',
    phone: '',
    type: 'RETAIL',
  });

  const totalSteps = 3;

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const categories = prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : prev.categories.length < 3
          ? [...prev.categories, categoryId]
          : prev.categories;
      return { ...prev, categories };
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length >= 2;
      case 2:
        return formData.categories.length >= 1;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setIsSubmitting(true);
    try {
      await shopApi.create({
        name: formData.name,
        type: formData.type,
        shopCategories: formData.categories,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
      });
      await refreshUser();
      navigate('/shops');
    } catch (error) {
      console.error('Error creating shop:', error);
      alert('Erreur lors de la création de la boutique');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Créer une boutique">
      <div className="create-shop-page">
        {/* Progress bar */}
        <div className="steps-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className="steps-indicators">
            {[1, 2, 3].map(step => (
              <div 
                key={step} 
                className={`step-indicator ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
              >
                {currentStep > step ? <Check size={16} /> : step}
              </div>
            ))}
          </div>
          <div className="steps-labels">
            <span className={currentStep === 1 ? 'active' : ''}>Nom</span>
            <span className={currentStep === 2 ? 'active' : ''}>Catégories</span>
            <span className={currentStep === 3 ? 'active' : ''}>Informations</span>
          </div>
        </div>

        {/* Step content */}
        <div className="step-content">
          {/* Step 1: Shop name */}
          {currentStep === 1 && (
            <div className="step-card">
              <div className="step-icon">
                <Store size={48} />
              </div>
              <h2>Comment s'appelle votre boutique ?</h2>
              <p>Choisissez un nom qui représente votre activité</p>
              
              <div className="form-group">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Boutique Fatou, Chez Moussa..."
                  className="form-input large"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {currentStep === 2 && (
            <div className="step-card">
              <div className="step-icon">
                <Tag size={48} />
              </div>
              <h2>Quelles sont vos catégories ?</h2>
              <p>Sélectionnez entre 1 et 3 catégories qui décrivent votre activité</p>
              
              <div className="categories-grid">
                {SHOP_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-btn ${formData.categories.includes(category.id) ? 'selected' : ''}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-label">{category.label}</span>
                    {formData.categories.includes(category.id) && (
                      <Check size={16} className="category-check" />
                    )}
                  </button>
                ))}
              </div>
              
              <p className="categories-count">
                {formData.categories.length}/3 catégories sélectionnées
              </p>
            </div>
          )}

          {/* Step 3: Additional info */}
          {currentStep === 3 && (
            <div className="step-card">
              <div className="step-icon">
                <Building size={48} />
              </div>
              <h2>Informations complémentaires</h2>
              <p>Ces informations sont optionnelles mais recommandées</p>
              
              <div className="form-group">
                <label className="form-label">
                  <MapPin size={18} />
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Marché Sandaga, Dakar"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Phone size={18} />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: 77 123 45 67"
                  className="form-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="step-navigation">
          {currentStep > 1 && (
            <button onClick={handleBack} className="btn btn-outline">
              <ArrowLeft size={18} />
              Retour
            </button>
          )}
          
          <div className="nav-spacer" />
          
          {currentStep < totalSteps ? (
            <button 
              onClick={handleNext} 
              className="btn btn-primary"
              disabled={!canProceed()}
            >
              Suivant
              <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-small" />
                  Création...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Créer ma boutique
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
