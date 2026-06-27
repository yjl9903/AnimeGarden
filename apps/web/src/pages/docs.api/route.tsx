import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from 'swagger-ui-react';

import Layout from '~/layouts/Layout';
import { version, license } from '~build/package';

import spec from './spec.json';

spec.info.version = version;
spec.info.license.name = license;

export default function About({ timestamp }: { timestamp?: Date }) {
  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        <SwaggerUI spec={spec} />
      </div>
    </Layout>
  );
}
