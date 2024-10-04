import { useAtom, useSetAtom } from 'jotai';

import './sidebar.css';
import { isOpenSidebar } from './atom';

export function Sidebar() {
  const [isOpen] = useAtom(isOpenSidebar);

  return (
    <div className="sidebar-root">
      {!isOpen && <SidebarTrigger></SidebarTrigger>}
      {isOpen && <SidebarContent></SidebarContent>}
    </div>
  );
}

const SidebarTrigger = () => {
  const setIsOpen = useSetAtom(isOpenSidebar);

  return (
    <div className="sidebar-trigger font-quicksand font-500" onClick={() => setIsOpen(true)}>
      <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
      <span className="text-sm">收藏夹</span>
    </div>
  );
};

const SidebarContent = () => {
  const setIsOpen = useSetAtom(isOpenSidebar);

  return (
    <div className="sidebar-wrapper">
      <div className="mt-[16px] px1 py1 text-base-700 select-none font-500 font-quicksand flex items-center">
        <div className="cursor-pointer" onClick={() => setIsOpen(false)}>
          <span className="i-carbon:bookmark text-sm relative top-[2px] mr1"></span>
          <span className="text-sm">收藏夹</span>
        </div>
        <div className="flex-auto"></div>
        <div
          className="h-[26px] w-auto rounded-md px-1 flex items-center cursor-pointer hover:bg-layer-muted"
          onClick={() => setIsOpen(false)}
        >
          <span className="i-fluent:panel-right-expand-16-regular w-[1em]"></span>
        </div>
      </div>
    </div>
  );
};
