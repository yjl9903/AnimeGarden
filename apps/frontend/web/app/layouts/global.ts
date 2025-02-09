const NavHeight = 66;
const SearchTop = 128;
const HeroHeight = 300;

let handling = false;
let header = document.querySelector('header');
let heroSearch = document.querySelector('#hero-search');
let heroPlaceholder = document.querySelector('#hero-placeholder');
let sidebarRoot: HTMLDivElement | null = document.querySelector('.sidebar-root');

let navAnimes = document.querySelector('.nav-animes');
let navFansubs = document.querySelector('.nav-fansubs');
let navTypes = document.querySelector('.nav-types');
let rects: (DOMRect | undefined)[] = [undefined, undefined, undefined];

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
  }

  handling = false;
}

function updateHeader() {
  if (!navAnimes || !navAnimes.isConnected || !rects[0]) {
    navAnimes = document.querySelector('.nav-animes');
    rects[0] = navAnimes?.getBoundingClientRect();
  }
  if (!navFansubs || !navFansubs.isConnected || !rects[1]) {
    navFansubs = document.querySelector('.nav-fansubs');
    rects[1] = navFansubs?.getBoundingClientRect();
  }
  if (!navTypes || !navTypes.isConnected || !rects[2]) {
    navTypes = document.querySelector('.nav-types');
    rects[2] = navTypes?.getBoundingClientRect();
  }

  const searchRect = heroSearch?.firstElementChild?.getBoundingClientRect();
  if (searchRect) {
    const { left, top } = searchRect;
    document.body.classList.remove('hidden-nav-animes', 'hidden-nav-fansubs', 'hidden-nav-types');
    if (top <= 45) {
      if (rects[0] && left <= rects[0].right) {
        document.body.classList.add('hidden-nav-animes');
      } else if (rects[1] && left <= rects[1].right) {
        document.body.classList.add('hidden-nav-fansubs');
      } else if (rects[2] && left <= rects[2].right) {
        document.body.classList.add('hidden-nav-types');
      }
    }
  }
}

function handleScroll() {
  if (handling) return;
  handling = true;
  requestAnimationFrame(updateHero);
}

updateHero();

document.addEventListener('DOMContentLoaded', updateHero);
document.addEventListener('scroll', handleScroll);

const resizeOb = new ResizeObserver(() => {
  updateHeader();
});
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
