// Scalable Animation System with Intersection Observer
class ScrollAnimations {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    // Configuration de l'Intersection Observer
    const options = {
      root: null,
      rootMargin: '-10% 0px -10% 0px', // Trigger un peu avant que l'élément soit complètement visible
      threshold: 0.1 // 10% de l'élément visible
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateElement(entry.target);
        }
      });
    }, options);

    // Observer tous les éléments avec la classe animate-on-scroll
    this.observeElements();
  }

  observeElements() {
    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
    elementsToAnimate.forEach(element => {
      this.observer.observe(element);
    });
  }

  animateElement(element) {
    // Ajouter la classe animated pour déclencher l'animation CSS
    element.classList.add('animated');
    
    // Arrêter d'observer cet élément une fois animé pour des performances optimales
    this.observer.unobserve(element);
  }

  // Méthode pour réinitialiser les animations (utile pour le SPA routing)
  reset() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll.animated');
    animatedElements.forEach(element => {
      element.classList.remove('animated');
      this.observer.observe(element);
    });
  }

  // Méthode pour ajouter de nouveaux éléments à observer (contenu dynamique)
  addElement(element) {
    if (element.classList.contains('animate-on-scroll')) {
      this.observer.observe(element);
    }
  }
}

// Initialisation automatique quand le DOM est prêt
function initScrollAnimations() {
  // Vérifier si les animations sont supportées et désirées
  if (!window.IntersectionObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Fallback : afficher tous les éléments sans animation
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
      element.classList.add('animated');
    });
    return;
  }

  // Initialiser le système d'animation
  window.scrollAnimations = new ScrollAnimations();
}

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}

// Support pour Astro/SPA navigation
document.addEventListener('astro:page-load', initScrollAnimations);