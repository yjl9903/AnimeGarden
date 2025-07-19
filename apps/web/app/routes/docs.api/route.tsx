import { useLoaderData } from '@remix-run/react';
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from 'swagger-ui-react';

import Layout from '~/layouts/Layout';
import { version, license } from '~build/package';
import { fetchTimestamp } from '~/utils';

import spec from './spec.json';

spec.info.version = version;
spec.info.license.name = license;

export const meta: MetaFunction = () => {
  return [
    { title: 'API 文档 | Anime Garden 動漫花園镜像站 动画 BT 资源聚合站' },
    { name: 'description', content: 'Anime Garden 動漫花園镜像站 动画 BT 资源聚合站' }
  ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  return await fetchTimestamp();
};

export default function About() {
  const { timestamp } = useLoaderData<typeof loader>();

  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-12 pb-24">
        <SwaggerUI spec={spec} />
      </div>
    </Layout>
  );
}
