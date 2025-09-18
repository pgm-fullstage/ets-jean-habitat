/**
 * Gestionnaire centralisé pour les widgets Trustindex dans les popups/modals
 * Résout les problèmes de timing et de rendu des widgets dans les contenus dynamiques
 */

class TrustindexPopupManager {
  constructor() {
    this.loadedInstances = new Set();
    this.initialized = false;
    this.reviewId = null;
  }

  /**
   * Initialise le gestionnaire avec l'ID de review Trustindex
   */
  init(reviewId) {
    this.reviewId = reviewId;
    this.ensureTrustindexLoaded();
  }

  /**
   * S'assure que le script Trustindex principal est chargé
   */
  async ensureTrustindexLoaded() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      // Vérifier si Trustindex est déjà disponible
      if (window.Trustindex) {
        this.initialized = true;
        resolve();
        return;
      }

      // Vérifier si le script est déjà en cours de chargement
      const existingScript = document.querySelector(`script[src*="trustindex.io/loader.js"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.initialized = true;
          resolve();
        });
        existingScript.addEventListener('error', reject);
        return;
      }

      // Charger le script Trustindex
      const script = document.createElement('script');
      script.src = `https://cdn.trustindex.io/loader.js?${this.reviewId}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.initialized = true;
        resolve();
      };
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  /**
   * Crée et affiche un widget Trustindex dans un conteneur spécifique
   */
  async createWidget(containerId, options = {}) {
    if (!this.reviewId) {
      console.error('TrustindexPopupManager: reviewId non défini');
      return false;
    }

    // Éviter les doublons
    if (this.loadedInstances.has(containerId)) {
      return true;
    }

    try {
      // S'assurer que le script est chargé
      await this.ensureTrustindexLoaded();

      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container ${containerId} introuvable`);
        return false;
      }

      // Nettoyer le contenu existant
      container.innerHTML = '';

      // Créer l'élément widget Trustindex
      const widget = document.createElement('div');
      widget.className = 'trustindex-widget';
      
      // Définir les attributs du widget
      widget.setAttribute('data-widget-id', this.reviewId);
      widget.setAttribute('data-setup-mode', 'manual');
      
      // Options personnalisables
      if (options.theme) widget.setAttribute('data-theme', options.theme);
      if (options.layout) widget.setAttribute('data-layout', options.layout);
      if (options.height) widget.style.height = options.height;
      
      container.appendChild(widget);

      // Attendre que Trustindex soit disponible et initialiser
      let attempts = 0;
      const maxAttempts = 50; // 5 secondes maximum
      
      const initWidget = () => {
        if (window.Trustindex && typeof window.Trustindex.init === 'function') {
          try {
            // Réinitialiser Trustindex pour détecter les nouveaux widgets
            window.Trustindex.init();
            this.loadedInstances.add(containerId);
            return true;
          } catch (error) {
            console.error('Erreur lors de l\'initialisation Trustindex:', error);
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(initWidget, 100);
        } else {
          console.error('Timeout: Impossible d\'initialiser le widget Trustindex');
        }
      };

      // Démarrer l'initialisation
      setTimeout(initWidget, 100);
      return true;

    } catch (error) {
      console.error('Erreur lors de la création du widget:', error);
      return false;
    }
  }

  /**
   * Supprime un widget d'un conteneur
   */
  removeWidget(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      this.loadedInstances.delete(containerId);
    }
  }

  /**
   * Crée un widget lorsque un popup s'ouvre
   */
  async onPopupOpen(containerId, options = {}) {
    // Petit délai pour s'assurer que le popup est complètement rendu
    setTimeout(async () => {
      await this.createWidget(containerId, options);
    }, 150);
  }

  /**
   * Nettoie les widgets lors de la fermeture des popups
   */
  onPopupClose(containerId) {
    this.removeWidget(containerId);
  }
}

// Instance globale
window.trustindexPopupManager = new TrustindexPopupManager();

export default window.trustindexPopupManager;