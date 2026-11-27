const paths = {
  overview: 'M3 3h8v8H3z M13 3h8v5h-8z M3 13h8v8H3z M13 10h8v11h-8z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  bars: 'M4 4v16h16 M8 16v-4 M12 16V7 M16 16V9 M20 16V5',
  wave: 'M3 12h3l3-7 5 14 3-7h4',
  compare: 'M3 8h17m-4-4 4 4-4 4 M21 16H4m4-4-4 4 4 4',
  branch: 'M6 4v16 M6 12h5a6 6 0 0 0 6-6V4 M14 7l3-3 3 3 M3 7l3-3 3 3',
  sliders: 'M4 7h5m4 0h7 M4 17h9m4 0h3 M9 4v6 M17 14v6',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7z M3 7l9 4 9-4 M12 11v10 M7.5 5l9 4',
  calculator: 'M6 3h12v18H6z M9 7h6 M9 11h1m4 0h1 M9 15h1m4 0h1 M9 18h1m4 0h1',
  history: 'M3 13a9 9 0 1 0 2-7L3 8 M3 3v5h5 M12 7v5l3 2',
  book: 'M3 5h4a5 5 0 0 1 5 5v10a5 5 0 0 0-5-4H3z M21 5h-4a5 5 0 0 0-5 5v10a5 5 0 0 1 5-4h4z',
  file: 'M6 3h7l5 5v13H6z M13 3v5h5 M9 12h6 M9 16h6',
  upload: 'M12 16V4m-4 4 4-4 4 4 M4 15v5h16v-5',
  download: 'M12 4v12m-4-4 4 4 4-4 M4 17v3h16v-3',
  close: 'm6 6 12 12M6 18 18 6',
  chevron: 'm9 6 6 6-6 6',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  panel: 'M3 5h18v14H3z M9 5v14',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 15A8 8 0 0 1 9 4 8.5 8.5 0 1 0 20 15Z',
  shield: 'M12 3 5 6v5c0 4 3 8 7 10 4-2 7-6 7-10V6z M9 12l2 2 4-4',
  pie: 'M11 3v10h10A9 9 0 1 1 11 3z M15 3v6h6a8 8 0 0 0-6-6z',
  signal: 'm3 16 5-5 4 4 7-8 M14 7h5v5',
  coins:
    'M20 7c0 2-3.5 4-8 4S4 9 4 7s3.5-4 8-4 8 2 8 4Z M4 7v5c0 2 3.5 4 8 4s8-2 8-4V7 M4 12v5c0 2 3.5 4 8 4s8-2 8-4v-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
