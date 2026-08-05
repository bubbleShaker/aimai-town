import type { World } from './types';
import { places } from './places';
import { fragments } from './fragments';
import { gates } from './gates';
import { endings } from './endings';

/** 町「曖昧」。engine はこの World を外から受け取って動く */
export const world: World = {
  start: 'square',
  finale: 'fog-bottom',
  places,
  fragments,
  gates,
  endings,
};

export * from './types';
