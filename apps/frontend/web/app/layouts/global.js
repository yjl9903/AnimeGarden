const NavHeight = 68;
const MaxPaddingTop = 152;
const MaxPaddingBottom = 96;
const SearchHeight = NavHeight;

let cacheScrollY;

function updateHeroLayout(_y) {
  const y = _y ?? document.documentElement.scrollTop;
  if (y !== cacheScrollY) {
    cacheScrollY = y;
  } else {
    return;
  }
  document.querySelector('.page-overlay')?.classList.add('hidden');

  const paddingTop = Math.max(
    y > MaxPaddingBottom ? MaxPaddingTop - (y - MaxPaddingBottom) : MaxPaddingTop,
    0
  );
  const paddingBottom = y <= MaxPaddingBottom ? MaxPaddingBottom - y : 0;

  document.body.style.setProperty('--hero-pt', `${paddingTop}px`);
  document.body.style.setProperty('--hero-pb', `${paddingBottom}px`);
}

window.updateHeroLayout = updateHeroLayout;

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

  document.addEventListener('touchmove', handler, {
    capture: false,
    passive: true
  });
}

setupGlobalListener();
