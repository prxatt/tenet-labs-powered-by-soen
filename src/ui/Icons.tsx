/** Custom line icon set — no emoji, no stock icon library. */

const P = (props: { d: string; lg?: boolean; extra?: React.ReactNode }) => (
  <svg className={'ic' + (props.lg ? ' lg' : '')} viewBox="0 0 24 24">
    <path d={props.d} />
    {props.extra}
  </svg>
);

export const IcWave = ({ lg }: { lg?: boolean }) => <P lg={lg} d="M3 12h4l3-7 4 14 3-7h4" />;
export const IcFuel = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4" />
  </svg>
);
export const IcRoad = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M5 21h14M12 3v4" /><circle cx="12" cy="12" r="2.5" />
  </svg>
);
export const IcSpark = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  </svg>
);
export const IcCam = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" />
  </svg>
);
export const IcPen = ({ lg }: { lg?: boolean }) => <P lg={lg} d="M4 20h16M6 16 16 6l2 2L8 18l-3 1z" />;
export const IcPin = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <circle cx="12" cy="10" r="6" /><path d="M12 16v5M8 21h8" />
  </svg>
);
export const IcPose = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <circle cx="12" cy="5" r="2" /><path d="M12 7v5m0 0l-4 6m4-6l4 6M6 10l6 2 6-2" />
  </svg>
);
export const IcTrack = ({ lg }: { lg?: boolean }) => <P lg={lg} d="M3 12h4l3-7 4 14 3-7h4" />;
export const IcPath = ({ lg }: { lg?: boolean }) => <P lg={lg} d="M4 18c4-8 6-10 8-6s4 2 8-6" />;
export const IcJson = ({ lg }: { lg?: boolean }) => (
  <P lg={lg} d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
);
export const IcViz = ({ lg }: { lg?: boolean }) => (
  <svg className={'ic' + (lg ? ' lg' : '')} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 14l3-4 2 2 4-5" />
  </svg>
);
