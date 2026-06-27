function updateColorMode() {
  try {
    const mode = JSON.parse(localStorage.getItem('animegarden:theme-mode') ?? 'null');
    if (mode === 'light' || mode === 'dark') {
      document.documentElement.classList.add(mode);
    }
  } catch {}
}

const NavHeight = 66;
const SearchTop = 128;
const HeroHeight = 300;
const HeaderCollisionSourceSelector = '[data-header-collision-source]';
const NavCollisionTargetSelector = '[data-nav-collision-target]';
const NavCollisionBodyClassPrefix = 'nav-collision-from-';
const NavCollisionStyleId = 'nav-collision-style';

let handling = false;
let header = document.querySelector('header');
let heroSearch = document.querySelector('#hero-search');
let heroPlaceholder = document.querySelector('#hero-placeholder');
let sidebarRoot: HTMLDivElement | null = document.querySelector('.sidebar-root');

function updateHero() {
  const y = document.documentElement.scrollTop;

  if (!header || !header.isConnected) {
    header = document.querySelector('header');
  }
  if (!heroSearch || !heroSearch.isConnected) {
    heroSearch = document.querySelector('#hero-search');
  }
  if (!heroPlaceholder || !heroPlaceholder.isConnected) {
    heroPlaceholder = document.querySelector('#hero-placeholder');
  }
  if (!sidebarRoot || !sidebarRoot.isConnected) {
    sidebarRoot = document.querySelector('.sidebar-root');
  }

  if (y >= SearchTop) {
    heroSearch?.classList.add('fix-hero');
  } else {
    heroSearch?.classList.remove('fix-hero');
  }

  if (y >= HeroHeight - NavHeight) {
    heroPlaceholder?.classList.add('fix-hero');
    sidebarRoot?.classList.add('fix-hero');
    sidebarRoot?.style.removeProperty('--sidebar-pt');

    header?.classList.add('fix-hero');
  } else {
    heroPlaceholder?.classList.remove('fix-hero');
    sidebarRoot?.classList.remove('fix-hero');
    sidebarRoot?.style.setProperty('--sidebar-pt', HeroHeight - y + 'px');

    header?.classList.remove('fix-hero');
  }

  // 碰撞检测
  const width = document.documentElement.clientWidth;
  if (width < 1440) {
    updateHeader();
  } else {
    resetHeaderCollision();
  }

  handling = false;
}

function getHeaderCollisionTargets() {
  return Array.from(header?.querySelectorAll<HTMLElement>(NavCollisionTargetSelector) ?? []).filter(
    (element) => element.isConnected
  );
}

function setHeaderCollisionFrom(targetId: string | null) {
  for (const className of Array.from(document.body.classList)) {
    if (className.startsWith(NavCollisionBodyClassPrefix)) {
      document.body.classList.remove(className);
    }
  }

  if (targetId !== null) {
    document.body.classList.add(`${NavCollisionBodyClassPrefix}${targetId}`);
  }
}

function getCollisionStyleElement(): HTMLStyleElement {
  let style = document.getElementById(NavCollisionStyleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = NavCollisionStyleId;
    document.head.appendChild(style);
  }
  return style;
}

function getTargetId(target: HTMLElement) {
  return target.dataset.navCollisionTarget?.trim() || null;
}

function updateHeaderCollisionStyles(targets: HTMLElement[]) {
  const style = getCollisionStyleElement();
  const targetIds = targets.map((target) => getTargetId(target)).filter((id): id is string => !!id);

  style.textContent = targetIds
    .map((targetId, index) => {
      const rules = targetIds
        .slice(index)
        .map(
          (id) =>
            `body.${NavCollisionBodyClassPrefix}${targetId} ${NavCollisionTargetSelector}[data-nav-collision-target="${id}"]`
        )
        .join(',\n');

      return rules ? `${rules} {\n  display: none;\n}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function resetHeaderCollision() {
  setHeaderCollisionFrom(null);
}

function getCollisionBoundary() {
  const rect = header?.getBoundingClientRect();
  return {
    top: rect?.top ?? 0,
    bottom: rect?.bottom ?? NavHeight
  };
}

function updateHeader() {
  const targets = getHeaderCollisionTargets();
  if (targets.length === 0) {
    resetHeaderCollision();
    return;
  }

  updateHeaderCollisionStyles(targets);
  setHeaderCollisionFrom(null);

  const boundary = getCollisionBoundary();
  const collisionLeft = Array.from(
    document.querySelectorAll<HTMLElement>(HeaderCollisionSourceSelector)
  )
    .filter((element) => element.isConnected)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.top <= boundary.bottom && rect.bottom >= boundary.top)
    .reduce((left, rect) => Math.min(left, rect.left), Number.POSITIVE_INFINITY);

  if (!Number.isFinite(collisionLeft)) return;

  const firstCollidingTarget = targets.find(
    (target) => collisionLeft <= target.getBoundingClientRect().right
  );

  const targetId = firstCollidingTarget ? getTargetId(firstCollidingTarget) : null;
  if (!targetId) return;

  setHeaderCollisionFrom(targetId);
}

function handleResize() {
  updateHero();
}

function handleDOMContentLoaded() {
  updateHero();
}

function handleBodyResize() {
  updateHeader();
}

function handleScriptError(e: Event) {
  // @ts-ignore
  if (e?.target?.tagName === 'SCRIPT') {
    // 避免无限刷新
    if (!sessionStorage.getItem('script_error_reloaded')) {
      console.error('[global]', 'trigger reload', e);
      sessionStorage.setItem('script_error_reloaded', 'true');
      location.reload();
    }
  }
}

function handleScroll() {
  if (handling) return;
  handling = true;
  requestAnimationFrame(updateHero);
}

updateColorMode();
updateHero();

window.__animegardenLayoutController = {
  update: updateHero
};

document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
document.addEventListener('scroll', handleScroll);
window.addEventListener('resize', handleResize);

const resizeOb = new ResizeObserver(handleBodyResize);
resizeOb.observe(document.body);

// @ts-ignore
const scrollTo = window.scrollTo;
// @ts-ignore
window.scrollTo = (...args) => {
  updateHero();
  // @ts-ignore
  const r = scrollTo(...args);
  updateHero();
  return r;
};

// 监听 script error
window.addEventListener('error', handleScriptError, true);
