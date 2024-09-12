import type { MetaFunction } from "@remix-run/node";

import Layout from '~/layouts/Layout';

export const meta: MetaFunction = () => {
  return [
    { title: "Anime Garden 動漫花園資源網第三方镜像站" },
    { name: "description", content: "}Anime Garden 動漫花園資源網第三方镜像站" },
  ];
};

export default function Resources() {
  return (
    <Layout>
      <div className="font-sans p-4">
        <h1 className="text-3xl">Welcome to Remix</h1>
        <ul className="list-disc mt-4 pl-6 space-y-2">
          <li>
            <a
              className="text-blue-700 underline visited:text-purple-900"
              target="_blank"
              href="https://remix.run/start/quickstart"
              rel="noreferrer"
            >
              5m Quick Start
            </a>
          </li>
          <li>
            <a
              className="text-blue-700 underline visited:text-purple-900"
              target="_blank"
              href="https://remix.run/start/tutorial"
              rel="noreferrer"
            >
              30m Tutorial
            </a>
          </li>
          <li>
            <a
              className="text-blue-700 underline visited:text-purple-900"
              target="_blank"
              href="https://remix.run/docs"
              rel="noreferrer"
            >
              Remix Docs
            </a>
          </li>
        </ul>
      </div>
    </Layout>
  );
}