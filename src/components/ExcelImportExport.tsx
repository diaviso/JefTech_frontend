import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

interface Category {
  id?: string;
  name: string;
  description?: string;
}

interface Product {
  id?: string;
  name: string;
  sku?: string;
  categoryId?: string;
  categoryName?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: string;
  description?: string;
}

interface ExcelImportExportProps {
  categories: Category[];
  products: Product[];
  onImport: (categories: Category[], products: Product[]) => Promise<void>;
  onClose: () => void;
}

export default function ExcelImportExport({ categories, products, onImport, onClose }: ExcelImportExportProps) {
  const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<{ categories: Category[]; products: Product[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate and download Excel template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Categories sheet
    const categoriesData = [
      ['Nom de la catégorie', 'Description'],
      ['Exemple: Boissons', 'Toutes les boissons'],
      ['Exemple: Alimentation', 'Produits alimentaires'],
    ];
    const wsCategories = XLSX.utils.aoa_to_sheet(categoriesData);
    wsCategories['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Catégories');

    // Products sheet
    const productsData = [
      ['Nom du produit', 'SKU/Référence', 'Catégorie', 'Prix d\'achat', 'Prix de vente', 'Stock initial', 'Stock minimum', 'Unité', 'Description'],
      ['Exemple: Coca-Cola 33cl', 'COC-33', 'Boissons', '250', '350', '100', '20', 'unité', 'Canette de Coca-Cola'],
      ['Exemple: Riz 5kg', 'RIZ-5KG', 'Alimentation', '2500', '3000', '50', '10', 'kg', 'Sac de riz 5kg'],
    ];
    const wsProducts = XLSX.utils.aoa_to_sheet(productsData);
    wsProducts['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Produits');

    // Download
    XLSX.writeFile(wb, 'modele_catalogue.xlsx');
  };

  // Download current data as Excel
  const downloadCurrentData = () => {
    const wb = XLSX.utils.book_new();

    // Categories sheet with current data
    const categoriesData = [
      ['Nom de la catégorie', 'Description'],
      ...categories.map(c => [c.name, c.description || ''])
    ];
    const wsCategories = XLSX.utils.aoa_to_sheet(categoriesData);
    wsCategories['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Catégories');

    // Products sheet with current data
    const productsData = [
      ['Nom du produit', 'SKU/Référence', 'Catégorie', 'Prix d\'achat', 'Prix de vente', 'Stock actuel', 'Stock minimum', 'Unité', 'Description'],
      ...products.map(p => {
        const category = categories.find(c => c.id === p.categoryId);
        return [
          p.name,
          p.sku || '',
          category?.name || '',
          p.costPrice,
          p.sellingPrice,
          p.stockQuantity,
          p.minStock,
          p.unit,
          p.description || ''
        ];
      })
    ];
    const wsProducts = XLSX.utils.aoa_to_sheet(productsData);
    wsProducts['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Produits');

    // Download
    XLSX.writeFile(wb, 'catalogue_actuel.xlsx');
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse categories
        const categoriesSheet = workbook.Sheets['Catégories'];
        const categoriesRaw = categoriesSheet ? XLSX.utils.sheet_to_json<string[]>(categoriesSheet, { header: 1 }) : [];
        const parsedCategories: Category[] = categoriesRaw
          .slice(1) // Skip header
          .filter((row: string[]) => row[0] && typeof row[0] === 'string' && row[0].trim() && !row[0].startsWith('Exemple:'))
          .map((row: string[]) => ({
            name: String(row[0]).trim(),
            description: row[1] ? String(row[1]).trim() : undefined
          }));

        // Parse products
        const productsSheet = workbook.Sheets['Produits'];
        const productsRaw = productsSheet ? XLSX.utils.sheet_to_json<string[]>(productsSheet, { header: 1 }) : [];
        const parsedProducts: Product[] = productsRaw
          .slice(1) // Skip header
          .filter((row: string[]) => row[0] && typeof row[0] === 'string' && row[0].trim() && !row[0].startsWith('Exemple:'))
          .map((row: string[]) => ({
            name: String(row[0]).trim(),
            sku: row[1] ? String(row[1]).trim() : undefined,
            categoryName: row[2] ? String(row[2]).trim() : undefined,
            costPrice: parseFloat(String(row[3])) || 0,
            sellingPrice: parseFloat(String(row[4])) || 0,
            stockQuantity: parseFloat(String(row[5])) || 0,
            minStock: parseFloat(String(row[6])) || 5,
            unit: row[7] ? String(row[7]).trim() : 'unité',
            description: row[8] ? String(row[8]).trim() : undefined
          }));

        setPreviewData({ categories: parsedCategories, products: parsedProducts });
        setImportResult(null);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setImportResult({ success: false, message: 'Erreur lors de la lecture du fichier Excel. Vérifiez le format.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Confirm import
  const confirmImport = async () => {
    if (!previewData) return;

    setIsImporting(true);
    try {
      await onImport(previewData.categories, previewData.products);
      setImportResult({ success: true, message: `Import réussi: ${previewData.categories.length} catégories et ${previewData.products.length} produits importés.` });
      setPreviewData(null);
    } catch (error) {
      console.error('Error importing data:', error);
      setImportResult({ success: false, message: 'Erreur lors de l\'import. Veuillez réessayer.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal excel-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FileSpreadsheet size={24} /> Import/Export Excel</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-content">
          {/* Tabs */}
          <div className="excel-tabs">
            <button 
              className={`excel-tab ${activeTab === 'download' ? 'active' : ''}`}
              onClick={() => setActiveTab('download')}
            >
              <Download size={18} />
              Télécharger
            </button>
            <button 
              className={`excel-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={18} />
              Importer
            </button>
          </div>

          {/* Download Tab */}
          {activeTab === 'download' && (
            <div className="excel-tab-content">
              <div className="excel-option">
                <div className="excel-option-info">
                  <h3>Modèle vierge</h3>
                  <p>Téléchargez un modèle Excel vierge avec les colonnes pré-remplies pour ajouter vos catégories et produits.</p>
                </div>
                <button className="btn btn-primary" onClick={downloadTemplate}>
                  <Download size={18} />
                  Télécharger le modèle
                </button>
              </div>

              <div className="excel-option">
                <div className="excel-option-info">
                  <h3>Données actuelles</h3>
                  <p>Exportez votre catalogue actuel ({categories.length} catégories, {products.length} produits) vers un fichier Excel.</p>
                </div>
                <button className="btn btn-secondary" onClick={downloadCurrentData}>
                  <Download size={18} />
                  Exporter le catalogue
                </button>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="excel-tab-content">
              <div className="excel-upload-zone">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div 
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={48} />
                  <p>Cliquez pour sélectionner un fichier Excel</p>
                  <span>Formats acceptés: .xlsx, .xls</span>
                </div>
              </div>

              {/* Preview */}
              {previewData && (
                <div className="excel-preview">
                  <h3>Aperçu de l'import</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <strong>{previewData.categories.length}</strong>
                      <span>Catégories</span>
                    </div>
                    <div className="preview-stat">
                      <strong>{previewData.products.length}</strong>
                      <span>Produits</span>
                    </div>
                  </div>

                  {previewData.categories.length > 0 && (
                    <div className="preview-section">
                      <h4>Catégories à importer:</h4>
                      <ul>
                        {previewData.categories.slice(0, 5).map((c, i) => (
                          <li key={i}>{c.name}</li>
                        ))}
                        {previewData.categories.length > 5 && (
                          <li className="more">...et {previewData.categories.length - 5} autres</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {previewData.products.length > 0 && (
                    <div className="preview-section">
                      <h4>Produits à importer:</h4>
                      <ul>
                        {previewData.products.slice(0, 5).map((p, i) => (
                          <li key={i}>{p.name} - {p.sellingPrice} FCFA</li>
                        ))}
                        {previewData.products.length > 5 && (
                          <li className="more">...et {previewData.products.length - 5} autres</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="preview-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setPreviewData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    >
                      Annuler
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={confirmImport}
                      disabled={isImporting}
                    >
                      {isImporting ? 'Import en cours...' : 'Confirmer l\'import'}
                    </button>
                  </div>
                </div>
              )}

              {/* Result message */}
              {importResult && (
                <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                  {importResult.success ? <Check size={20} /> : <AlertCircle size={20} />}
                  <span>{importResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
