import type { World } from './types';
import { places } from './places';
import { fragments } from './fragments';
import { gates } from './gates';

/** 町「曖昧」。engine はこの World を外から受け取って動く */
export const world: World = {
  start: 'square',
  places,
  fragments,
  gates,
};

export * from './types';
