import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onCreateNew?: (name: string) => Promise<Option | null>;
  onOpenCreateModal?: (searchQuery: string) => void;
  createLabel?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  onCreateNew,
  onOpenCreateModal,
  createLabel = 'Ajouter',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  // Filter options based on search query
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches any option exactly
  const hasExactMatch = options.some(
    opt => opt.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !newItemName.trim()) return;

    setIsCreating(true);
    try {
      const newOption = await onCreateNew(newItemName.trim());
      if (newOption) {
        onChange(newOption.id);
        setIsOpen(false);
        setSearchQuery('');
        setShowCreateForm(false);
        setNewItemName('');
      }
    } catch (error) {
      console.error('Error creating new item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!onCreateNew || !searchQuery.trim()) return;

    setIsCreating(true);
    try {
      const newOption = await onCreateNew(searchQuery.trim());
      if (newOption) {
        onChange(newOption.id);
        setIsOpen(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error creating new item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`searchable-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
    >
      {/* Selected value display / trigger */}
      <div 
        className="searchable-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <div className="selected-value">
            <span className="selected-name">{selectedOption.name}</span>
            {selectedOption.subtitle && (
              <span className="selected-subtitle">{selectedOption.subtitle}</span>
            )}
          </div>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        {selectedOption && !disabled && (
          <button className="clear-btn" onClick={handleClear} type="button">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="searchable-select-dropdown">
          {/* Search input */}
          <div className="search-input-container">
            <Search size={16} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="search-input"
            />
          </div>

          {/* Options list */}
          <div className="options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`option-item ${option.id === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.id)}
                >
                  <div className="option-content">
                    <span className="option-name">{option.name}</span>
                    {option.subtitle && (
                      <span className="option-subtitle">{option.subtitle}</span>
                    )}
                  </div>
                  {option.id === value && <Check size={16} className="check-icon" />}
                </div>
              ))
            ) : (
              <div className="no-results">
                Aucun résultat pour "{searchQuery}"
              </div>
            )}

            {/* Create new option */}
            {(onCreateNew || onOpenCreateModal) && searchQuery.trim() && !hasExactMatch && (
              <div 
                className="create-option"
                onClick={() => {
                  if (onOpenCreateModal) {
                    onOpenCreateModal(searchQuery.trim());
                    setIsOpen(false);
                    setSearchQuery('');
                  } else if (onCreateNew) {
                    handleQuickCreate();
                  }
                }}
              >
                <Plus size={16} />
                <span>
                  {isCreating ? 'Création...' : `${createLabel} "${searchQuery}"`}
                </span>
              </div>
            )}
          </div>

          {/* Create new form (for more complex creation) */}
          {showCreateForm && onCreateNew && (
            <div className="create-form">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nom..."
                className="create-input"
              />
              <button 
                className="create-btn"
                onClick={handleCreateNew}
                disabled={isCreating || !newItemName.trim()}
                type="button"
              >
                {isCreating ? '...' : <Check size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
