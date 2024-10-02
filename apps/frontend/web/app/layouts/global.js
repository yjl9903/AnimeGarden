const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 96;
const SearchHeight = NavHeight;

function updateHeroLayout() {
  const y = document.documentElement.scrollTop;
  const paddingTop = Math.max(
    y > MaxPaddingBottom ? MaxPaddingTop - (y - MaxPaddingBottom) : MaxPaddingTop,
    0
  );
  const paddingBottom = y <= MaxPaddingBottom ? MaxPaddingBottom - y : 0;
  const height = paddingTop + SearchHeight + paddingBottom;

  const hero = document.querySelector('.hero');
  if (hero) hero.style.height = height + 'px';
  const top = document.querySelector('.hero-top');
  if (top) {
    top.style.top = paddingTop - MaxPaddingTop + 'px';
    top.classList.remove('hidden');
  }
  const search = document.querySelector('.hero-search');
  if (search) search.style.top = paddingTop + 'px';
  const bottom = document.querySelector('.hero-bottom');
  if (bottom) {
    bottom.style.top = paddingTop + SearchHeight + 'px';
    bottom.style.height = paddingBottom + 'px';
  }
}

function setupGlobalListener() {
  if (!document) {
    console.warn('This should be executed under browser environment');
    return;
  }

  updateHeroLayout();

  const handler = () => {
    updateHeroLayout();
  };

  document.addEventListener('scroll', handler, {
    capture: false,
    passive: true
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupGlobalListener();
});
