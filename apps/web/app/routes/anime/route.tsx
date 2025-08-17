import { NavLink, useLoaderData } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';

import Layout from '~/layouts/Layout';
import { fetchTimestamp, getCanonicalURL } from '~/utils';
import { getPosterImage, getCalendar } from '~/utils/anime';
import { getSubjectDisplayName, getSubjectURL } from '~/utils/subjects';

import './anime.css';
import { useEffect, useState } from 'react';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  return {
    timestamp: (await fetchTimestamp()).timestamp
  };
};

export const meta: MetaFunction = () => {
  return [
    { title: '动画周历 | Anime Garden 動漫花園資源網第三方镜像站' },
    {
      name: 'description',
      content: '动画每周播出时间表, 动画周历, Anime Garden 動漫花園資源網第三方镜像站'
    },
    { tagName: 'link', rel: 'canonical', href: getCanonicalURL('/anime') }
  ];
};

export default function Index() {
  const { timestamp } = useLoaderData<typeof loader>();

  const calendar = getCalendar();

  const [wrapperClassName, setWrapperClassName] = useState(calendar.map(() => ['scroll-begin']));

  const updateWrapperClassName = (container: HTMLDivElement) => {
    const index =
      +(
        [...container.classList.values()]
          .find((key) => key.startsWith('cal-'))
          ?.replace('cal-', '') ?? 1
      ) - 1;

    const newClassName = [...wrapperClassName[index]];
    if (container.scrollLeft <= 1) {
      newClassName.push('scroll-begin');
    } else {
      const idx = newClassName.indexOf('scroll-begin');
      idx !== -1 && newClassName.splice(idx, 1);
    }

    if (Math.abs(container.scrollWidth - container.clientWidth - container.scrollLeft) <= 1) {
      newClassName.push('scroll-end');
    } else {
      const idx = newClassName.indexOf('scroll-end');
      idx !== -1 && newClassName.splice(idx, 1);
    }

    setWrapperClassName((prev) => {
      const newWrapperClassName = [...prev];
      newWrapperClassName[index] = newClassName;
      return newWrapperClassName;
    });
  };

  const scrollHandler = calendar.map(() => (ev: React.UIEvent<HTMLDivElement>) => {
    const container = ev.currentTarget;
    updateWrapperClassName(container);
  });

  useEffect(() => {
    if (import.meta.env.SSR) return;

    const container = document.querySelectorAll('.bgm-list');
    container.forEach((item) => {
      updateWrapperClassName(item as HTMLDivElement);
    });
  }, []);

  const scrollLeftHandler = (ev: React.MouseEvent<HTMLDivElement>) => {
    const container = ev.currentTarget
      .closest('.bgm-list-wrapper')
      ?.querySelector('.bgm-list') as HTMLDivElement;
    if (!container) return;
    if (container.scrollLeft - 500 < 51) {
      container.scrollBy({ left: -550, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: -500, behavior: 'smooth' });
    }
  };

  const scrollRightHandler = (ev: React.MouseEvent<HTMLDivElement>) => {
    const container = ev.currentTarget
      .closest('.bgm-list-wrapper')
      ?.querySelector('.bgm-list') as HTMLDivElement;
    if (!container) return;
    if (
      Math.abs(container.scrollWidth - container.clientWidth - (container.scrollLeft + 500)) < 50
    ) {
      container.scrollBy({ left: 550, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: 500, behavior: 'smooth' });
    }
  };

  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-13 pb-24 space-y-8">
        {calendar.map((cal) => (
          <div
            className="bgm-weekday w-full pt-4 bg-gray-100 dark:bg-gray-800 rounded-md"
            id={`星期${cal.text}`}
            key={cal.index}
          >
            <h2 className="block px-6 text-xl font-bold mb-4 select-none border-l-[4px] border-[#0ca]">
              <a href={`#星期${cal.text}`}>星期{cal.text}</a>
              <span className="hidden">放送动画</span>
            </h2>
            <div
              className={`relative bgm-list-wrapper ${wrapperClassName[cal.index - 1].join(' ')}`}
            >
              <div
                className={`bgm-list px-6 pb-2 flex w-full space-x-6 overflow-x-auto cal-${cal.index}`}
                onScroll={scrollHandler[cal.index - 1]}
              >
                {cal.bangumis.map((bgm: any) => (
                  <NavLink to={getSubjectURL(bgm)} className="block w-max" key={bgm.id}>
                    <div className="w-150px h-225px flex items-center select-none">
                      <img
                        src={getPosterImage(bgm)}
                        alt={`${getSubjectDisplayName(bgm)} poster`}
                        className="rounded-md max-h-225px hover:shadow-box"
                      />
                    </div>
                    <div className="w-150px truncate py-2">
                      <span className="font-bold text-sm text-link-active">
                        {getSubjectDisplayName(bgm)}
                      </span>
                    </div>
                  </NavLink>
                ))}
              </div>

              <div
                className="scroll-left absolute top-[50%] translate-y-[-100%] left-7 select-none cursor-pointer"
                onClick={scrollLeftHandler}
              >
                <div className="h-[40px] w-[40px] rounded-full bg-gray-300 dark:bg-gray-700 op-90 flex items-center justify-center">
                  <i className="i-carbon-arrow-left text-2xl font-bold" />
                </div>
              </div>
              <div
                className="scroll-right absolute top-[50%] translate-y-[-100%] right-7 select-none cursor-pointer"
                onClick={scrollRightHandler}
              >
                <div className="h-[40px] w-[40px] rounded-full bg-gray-300 dark:bg-gray-700 op-90 flex items-center justify-center">
                  <i className="i-carbon-arrow-right text-2xl font-bold" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
