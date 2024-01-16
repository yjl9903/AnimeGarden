import SwaggerUI from 'swagger-ui-react';

import spec from './spec.json';

export default function Content() {
  return <SwaggerUI spec={spec} />;
}
