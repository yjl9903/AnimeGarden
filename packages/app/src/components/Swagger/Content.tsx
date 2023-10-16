import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

import { spec } from './spec';

export default function Content() {
  return <SwaggerUI spec={spec} />;
}
