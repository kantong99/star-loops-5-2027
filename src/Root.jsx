import React from 'react';
import { Composition } from 'remotion';
import { DURATION, FPS } from './components/Transitions.jsx';
import { makeStarLoop } from './projects/StarLoops.jsx';

// Final 4K composition. Preview mode overrides --width/--height at render time.
const WIDTH = 3840;
const HEIGHT = 2160;

// IDs may only contain a-z, A-Z, 0-9 and hyphens (-)
export const COMPOSITIONS = [
  { id: 'Q01-Burung', component: makeStarLoop('burung') },
  { id: 'Q02-Hati', component: makeStarLoop('hati') },
  { id: 'Q03-Bintang', component: makeStarLoop('bintang') },
  { id: 'Q04-Ikan', component: makeStarLoop('ikan') },
  { id: 'Q05-Kupu', component: makeStarLoop('kupu') },
];

export const RemotionRoot = () => (
  <>
    {COMPOSITIONS.map(({ id, component }) => (
      <Composition key={id} id={id} component={component} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    ))}
  </>
);
