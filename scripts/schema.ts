import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { documentSchema } from '../src/lib/schema.js';
writeFileSync(
  'public/threadline.schema.json',
  JSON.stringify({ ...z.toJSONSchema(documentSchema), title: 'Threadline document v1' }, null, 2) +
    '\n',
);
