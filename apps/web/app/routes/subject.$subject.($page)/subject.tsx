import clsx from 'clsx';
import { useCallback } from 'react';
import { NavLink } from '@remix-run/react';

import type { Jsonify } from '@animegarden/client';

import { getWeekday } from '~/utils/date';
import { type FullBangumiItem, getSubjectDisplayName, getSubjectURL } from '~/utils/subjects';
import { toast } from 'sonner';

export function SubjectCard({ subject }: { subject: Jsonify<FullBangumiItem> }) {
  const onClickShare = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();

      const url = new URL(`/subject/${subject.id}`, location.origin);
      await navigator.clipboard.writeText(url.toString());

      toast.success(`复制 ${getSubjectDisplayName(subject)} 链接成功`, {
        dismissible: true,
        duration: 3000,
        closeButton: true,
        position: 'top-right'
      });
    },
    [subject]
  );
  
  return (
    <div className="mb-12 p-4 w-full bg-zinc-50 dark:bg-zinc-800 drop-shadow rounded-md flex gap-8 lt-md:flex-col">
      {subject.bangumi?.images && (
        <div className="w-[300px] flex-shrink-0 lt-md:w-full">
          <img
            src={subject.bangumi?.images.large}
            alt={subject.name}
            className="rounded-md hover:drop-shadow"
          />
        </div>
      )}
      <div className="info-box space-y-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 pr-2">
          <NavLink to={getSubjectURL(subject)} className="text-link-active">
            {getSubjectDisplayName(subject)}
          </NavLink>
          <span className="h-[30px] px-1.5 py-1.5 w-auto rounded-md flex items-center cursor-pointer hover:bg-layer-muted" onClick={onClickShare}>
            <span className="i-carbon-share text-sm"></span>
          </span>
        </h1>
        <article className="grid grid-cols-1 gap-2">
          <p className="space-x-2">
            <span className="font-bold mr-3">放送日期</span>
            <span>{getWeekday(subject.air_date)}</span>
          </p>
          <p className="space-x-2">
            <span className="font-bold mr-3">放送开始</span>
            <span>{subject.air_date}</span>
          </p>
          <p className="flex items-center space-x-2">
            <span className="font-bold mr-3">外部链接</span>
            <a
              href={`https://bgm.tv/subject/${subject.id}`}
              target="_blank"
              className="text-link inline-flex items-center gap-1 underline underline-offset-4"
            >
              <span className="i-mingcute-bilibili-line"></span>
              <span>Bangumi</span>
            </a>
            {subject.tmdb && (
              <a
                href={`https://www.themoviedb.org/${subject.tmdb.type}/${subject.tmdb.id}`}
                target="_blank"
                className="ml-3 text-link inline-flex items-center gap-1 underline underline-offset-4"
              >
                <span className="i-simple-icons-themoviedatabase"></span>
                <span>TMDB</span>
              </a>
            )}
          </p>
        </article>
        <SubjectSummary
          className="summary-box"
          summary={subject.summary}
          tags={subject.bangumi?.tags}
        ></SubjectSummary>
      </div>
    </div>
  );
}

function SubjectSummary({
  className,
  summary,
  tags
}: {
  className?: any;
  summary: string;
  tags?: string[];
}) {
  const lines = summary.split('\n');

  return (
    <article className={`leading-relaxed space-y-2 text-base text-base-600 ${className}`}>
      {lines.map((line, idx) => (
        <p key={idx}>{line}</p>
      ))}
      {tags && tags.length > 0 && (
        <p className="mt-4">
          {tags.map((tag) => (
            <Tag key={tag} tag={tag} className="mr-2 mt-2 cursor-default hover:bg-zinc-200!"></Tag>
          ))}
        </p>
      )}
    </article>
  );
}

function Tag({
  icon,
  tag,
  href,
  className
}: {
  icon?: string;
  tag: string;
  href?: string;
  className?: any;
}) {
  return (
    <span
      className={clsx(
        'text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-600 text-base-800 px-2 py-1 rounded-md inline-flex items-center',
        className
      )}
    >
      {icon && <span className={clsx(icon, 'mr-1')}></span>}
      {href ? (
        <a href={href} target="_blank">
          {tag}
        </a>
      ) : (
        <span>{tag}</span>
      )}
    </span>
  );
}
