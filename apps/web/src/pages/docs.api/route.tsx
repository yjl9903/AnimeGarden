import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from 'swagger-ui-react';

import Layout from '~/layouts/Layout';
import { version, license } from '~build/package';

import { getPublicOpenApiSpec } from './spec';

export default function About({ timestamp }: { timestamp?: Date }) {
  const spec = getPublicOpenApiSpec(version, license);

  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        <SwaggerUI spec={spec} />
      </div>
    </Layout>
  );
}
