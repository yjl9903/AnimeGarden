import type { MetaFunction } from "@remix-run/node";

import Layout from '~/layouts/Layout';

export const meta: MetaFunction = () => {
  return [
    { title: "Anime Garden 動漫花園資源網第三方镜像站" },
    { name: "description", content: "}Anime Garden 動漫花園資源網第三方镜像站" },
  ];
};

export default function Index() {
  return (
    <Layout>123</Layout>
  );
}
