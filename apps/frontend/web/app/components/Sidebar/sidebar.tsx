import { useAtom } from 'jotai';
import { isOpenSidebar } from './atom';

export function Sidebar() {
  const [isOpen] = useAtom(isOpenSidebar);

  if (!isOpen) return <div></div>;

  return <div className="w-[300px] border-r-1 h-[150vh]"></div>;
}
