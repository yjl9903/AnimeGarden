import type { MetaFunction } from "@remix-run/node";

import { NavLink } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Anime Garden 動漫花園資源網第三方镜像站" },
    { name: "description", content: "}Anime Garden 動漫花園資源網第三方镜像站" },
  ];
};

export default function Index() {
  return (
    <div className="w-full">
      <div className="w-screen fixed bg-[#fef8f7]">
        <nav className="px-8 py-2 flex gap-2">
          <div>🌸 Anime Garden</div>
          <div>动画</div>
        </nav>
        <div className="mt-4rem pb-3rem text-4xl font-quicksand font-bold text-center select-none outline-none">
          <NavLink to="/">🌸 Anime Garden</NavLink>
        </div>
        <div className="flex justify-center pb-6rem sticky top-4">
          <div className="rounded-md h-16 w-[600px] border bg-white">

          </div>
        </div>
      </div>
      <div className="flex">
        <div className="w-[300px] border-r-1 h-[150vh]"></div>
        <div></div>
      </div>
    </div>
  );
}
