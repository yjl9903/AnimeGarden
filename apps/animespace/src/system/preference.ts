import { z } from 'zod';

export interface Preference {}

export const PreferenceSchema = z.object({}).optional();
