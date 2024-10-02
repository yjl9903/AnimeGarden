const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 96;
const SearchHeight = NavHeight;

function updateHeroLayout() {
  const y = document.documentElement.scrollTop;
  const paddingTop = y <= MaxPaddingTop ? MaxPaddingTop - y : 0;
  const paddingBottom = Math.max(
    y > MaxPaddingTop ? MaxPaddingBottom - (y - MaxPaddingTop) : MaxPaddingBottom,
    0
  );
  const height = paddingTop + SearchHeight + paddingBottom;

  const hero = document.querySelector('.hero') as HTMLElement;
  if (hero) hero.style.height = height + 'px';
  const top = document.querySelector('.hero-top') as HTMLElement;
  if (top) {
    top.style.top = paddingTop - MaxPaddingTop + 'px';
    top.classList.remove('hidden');
  }
  const search = document.querySelector('.hero-search') as HTMLElement;
  if (search) search.style.top = paddingTop + 'px';
  const bottom = document.querySelector('.hero-bottom') as HTMLElement;
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
