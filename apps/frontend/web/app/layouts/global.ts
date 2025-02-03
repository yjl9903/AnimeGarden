const NavHeight = 66;
const SearchTop = 128;
const HeroHeight = 300;

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

  handling = false;
}

function handleScroll() {
  if (handling) return;
  handling = true;
  requestAnimationFrame(updateHero);
}

updateHero();
document.addEventListener('DOMContentLoaded', updateHero);
document.addEventListener('scroll', handleScroll);

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
