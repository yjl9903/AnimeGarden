import clsx from 'clsx';

import { Link } from '@remix-run/react';

export interface PaginationProps {
  page: number;

  complete: boolean;

  timestamp?: Date;

  link?: (page: number) => string;

  navigate?: (page: number) => void | Promise<void>;
}

export const Pagination = (props: PaginationProps) => {
  const { page, complete } = props;
  const isPrev = page > 1;
  const isNext = !complete;
  const pages = isPrev
    ? [page - 1, page, page + 1, page + 2, page + 3]
    : [page, page + 1, page + 2, page + 3, page + 4];

  return (
    <div className="mt-4 flex lt-md:flex-col font-sm">
      {/* {timestamp && (
        <div className="text-base-400 py-1 pl3 lt-sm:pl1">
          <span className="mr1 text-sm i-carbon-update-now op-80"></span>
          <span className="select-none">数据更新于 </span>
          <span>{formatChinaTime(timestamp)}</span>
        </div>
      )} */}
      <div className="flex-auto"></div>
      {(page !== 1 || !complete) && (
        <div className="flex lt-md:(mt-4 justify-center) items-center gap-2 text-base-500">
          <PageItem
            page={page - 1}
            link={props.link}
            navigate={props.navigate}
            className={clsx(isPrev || 'hidden', 'block text-link-active')}
          >
            <span>上一页</span>
          </PageItem>
          {page > 2 && (
            <PageItem
              page={1}
              link={props.link}
              navigate={props.navigate}
              className={clsx('block')}
            >
              <span>1</span>
            </PageItem>
          )}
          {page > 2 && <span className="select-none i-ant-design:ellipsis-outlined"></span>}
          {pages.map((p) => (
            <PageItem
              key={p}
              page={p}
              link={props.link}
              navigate={props.navigate}
              className={clsx('block', p === page && 'text-pink-600')}
            >
              <span>{p}</span>
            </PageItem>
          ))}
          {isNext && <span className="select-none i-ant-design:ellipsis-outlined"></span>}
          <PageItem
            page={page + 1}
            link={props.link}
            navigate={props.navigate}
            className={clsx(isNext || 'hidden', 'block text-link-active')}
          >
            <span>下一页</span>
          </PageItem>
        </div>
      )}
    </div>
  );
};

const PageItem = (
  props: Pick<PaginationProps, 'page' | 'link' | 'navigate'> & React.HTMLAttributes<any>
) => {
  const { page, navigate, link } = props;
  const className = 'px-2 py-1 rounded-md hover:bg-gray-100 select-none cursor-pointer';

  if (link) {
    return (
      <Link to={link(page)} className={clsx(className, props.className)}>
        {props.children}
      </Link>
    );
  } else if (navigate) {
    return (
      <div className={clsx(className, props.className)} onClick={() => navigate(page)}>
        {props.children}
      </div>
    );
  } else {
    return <div className={clsx(className, props.className)}>{props.children}</div>;
  }
};
