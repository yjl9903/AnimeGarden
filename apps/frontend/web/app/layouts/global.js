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

  let ticking = false;
  function update() {
    if (ticking) return;
    requestAnimationFrame(() => {
      updateHeroLayout();
      ticking = false;
    });
    ticking = true;
  }

  updateHeroLayout();

  document.addEventListener(
    'scroll',
    () => {
      update();
    },
    {
      capture: false,
      passive: true
    }
  );

  let raf;
  document.addEventListener(
    'touchmove',
    () => {
      update();
    },
    {
      capture: false,
      passive: true
    }
  );

  document.addEventListener(
    'touchend',
    () => {
      cancelAnimationFrame(raf);
      const now = new Date().getTime();
      updateHeroLayout();
      const handler = () => {
        if (new Date().getTime() - now > 1000) {
          return;
        }
        updateHeroLayout();
        raf = requestAnimationFrame(handler);
      };
      requestAnimationFrame(handler);
    },
    {
      capture: false,
      passive: true
    }
  );
}

setupGlobalListener();
