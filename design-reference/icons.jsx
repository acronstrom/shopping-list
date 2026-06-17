/* Line icon set — SF-Symbols-ish, 1.7 stroke, round caps. currentColor. */
const Ic = (function () {
  const S = ({ d, size = 24, sw = 1.7, fill, children, vb = 24 }) =>
    React.createElement(
      'svg',
      { width: size, height: size, viewBox: `0 0 ${vb} ${vb}`, fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' },
      children || React.createElement('path', { d })
    );

  const P = (d, extra) => ({ d, ...extra });

  return {
    cart: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M3 4h2l1.6 10.2a1.6 1.6 0 0 0 1.58 1.35h7.9a1.6 1.6 0 0 0 1.57-1.28L20 7H6' }),
      React.createElement('circle', { key: 2, cx: 9, cy: 20, r: 1.3 }),
      React.createElement('circle', { key: 3, cx: 17, cy: 20, r: 1.3 }),
    ]}),
    calendar: (p) => S({ ...p, children: [
      React.createElement('rect', { key: 1, x: 3.5, y: 5, width: 17, height: 16, rx: 3 }),
      React.createElement('path', { key: 2, d: 'M3.5 9.5h17M8 3.5v3M16 3.5v3' }),
    ]}),
    book: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M5 4.5h9a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H5z' }),
      React.createElement('path', { key: 2, d: 'M5 4.5v15.1' }),
      React.createElement('path', { key: 3, d: 'M9 9h5M9 12h5' }),
    ]}),
    store: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5' }),
      React.createElement('path', { key: 2, d: 'M3.4 10.2 5 4.6A1 1 0 0 1 6 4h12a1 1 0 0 1 .98.7l1.6 5.5a2.2 2.2 0 0 1-4.27.9 2.2 2.2 0 0 1-4.27 0 2.2 2.2 0 0 1-4.27 0 2.2 2.2 0 0 1-4.27-.9Z' }),
      React.createElement('path', { key: 3, d: 'M10 20v-4.5h4V20' }),
    ]}),
    more: (p) => S({ ...p, sw: 0, children: [
      React.createElement('circle', { key: 1, cx: 5, cy: 12, r: 1.7, fill: 'currentColor' }),
      React.createElement('circle', { key: 2, cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }),
      React.createElement('circle', { key: 3, cx: 19, cy: 12, r: 1.7, fill: 'currentColor' }),
    ]}),
    plus: (p) => S({ ...p, d: 'M12 5v14M5 12h14' }),
    minus: (p) => S({ ...p, d: 'M5 12h14' }),
    check: (p) => S({ ...p, sw: p && p.sw ? p.sw : 2.2, d: 'M5 12.5l4.2 4.3L19 7' }),
    chevR: (p) => S({ ...p, d: 'M9 5l7 7-7 7' }),
    chevL: (p) => S({ ...p, d: 'M15 5l-7 7 7 7' }),
    chevD: (p) => S({ ...p, d: 'M5 9l7 7 7-7' }),
    search: (p) => S({ ...p, children: [
      React.createElement('circle', { key: 1, cx: 11, cy: 11, r: 6.5 }),
      React.createElement('path', { key: 2, d: 'M16 16l4.5 4.5' }),
    ]}),
    clock: (p) => S({ ...p, children: [
      React.createElement('circle', { key: 1, cx: 12, cy: 12, r: 8.2 }),
      React.createElement('path', { key: 2, d: 'M12 7.6V12l3 2' }),
    ]}),
    camera: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M3 8.5A2 2 0 0 1 5 6.5h1.7a1 1 0 0 0 .9-.55l.6-1.2a1 1 0 0 1 .9-.55h4a1 1 0 0 1 .9.55l.6 1.2a1 1 0 0 0 .9.55H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }),
      React.createElement('circle', { key: 2, cx: 12, cy: 13, r: 3.4 }),
    ]}),
    heart: (p) => S({ ...p, d: 'M12 20s-7-4.4-9-9.2C1.6 7.3 3.3 4.5 6.2 4.5c1.9 0 3.1 1.1 3.8 2.2.7-1.1 1.9-2.2 3.8-2.2 2.9 0 4.6 2.8 3.2 6.3C19 15.6 12 20 12 20Z' }),
    heartFill: (p) => S({ ...p, sw: 0, children: React.createElement('path', { d: 'M12 20s-7-4.4-9-9.2C1.6 7.3 3.3 4.5 6.2 4.5c1.9 0 3.1 1.1 3.8 2.2.7-1.1 1.9-2.2 3.8-2.2 2.9 0 4.6 2.8 3.2 6.3C19 15.6 12 20 12 20Z', fill: 'currentColor' }) }),
    trash: (p) => S({ ...p, d: 'M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M7 7l.8 11.2A2 2 0 0 0 9.8 20h4.4a2 2 0 0 0 2-1.8L17 7' }),
    sliders: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M4 7h10M18 7h2M4 17h2M10 17h10' }),
      React.createElement('circle', { key: 2, cx: 16, cy: 7, r: 2.3 }),
      React.createElement('circle', { key: 3, cx: 8, cy: 17, r: 2.3 }),
    ]}),
    tag: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M4 11.5V5.5a1.5 1.5 0 0 1 1.5-1.5h6l8 8a1.6 1.6 0 0 1 0 2.3l-5.2 5.2a1.6 1.6 0 0 1-2.3 0Z' }),
      React.createElement('circle', { key: 2, cx: 8.5, cy: 8.5, r: 1.2, fill: 'currentColor', stroke: 'none' }),
    ]}),
    leaf: (p) => S({ ...p, children: [
      React.createElement('path', { key: 1, d: 'M5 19c0-8 5.5-12 14-12 0 8.5-5 13-14 12Z' }),
      React.createElement('path', { key: 2, d: 'M5 19c3-5 6-7.5 10-9' }),
    ]}),
    spark: (p) => S({ ...p, d: 'M12 4l1.6 4.6L18 10l-4.4 1.4L12 16l-1.6-4.6L6 10l4.4-1.4Z' }),
    x: (p) => S({ ...p, d: 'M6 6l12 12M18 6L6 18' }),
    flame: (p) => S({ ...p, d: 'M12 3.5c2.4 3 1 5-.2 6.2-1 1-1.8 2-.3 3.6 1.2-.2 2-1 2.3-2.2 1.6 1.4 2.4 3 2.4 4.6A6.2 6.2 0 1 1 6 13.5c0-1 .3-1.8.8-2.4.4 1 1.2 1.6 2 1.8C7.5 9.5 9.8 6.7 12 3.5Z' }),
    users: (p) => S({ ...p, children: [
      React.createElement('circle', { key: 1, cx: 9, cy: 8.5, r: 3 }),
      React.createElement('path', { key: 2, d: 'M3.5 19c.4-3 2.8-4.6 5.5-4.6S14.1 16 14.5 19' }),
      React.createElement('path', { key: 3, d: 'M16 6.2a3 3 0 0 1 0 5.6M17 14.7c2.1.5 3.6 2 3.9 4.3' }),
    ]}),
    gear: (p) => S({ ...p, children: [
      React.createElement('circle', { key: 1, cx: 12, cy: 12, r: 3 }),
      React.createElement('path', { key: 2, d: 'M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6' }),
    ]}),
    link: (p) => S({ ...p, d: 'M9 15l6-6M10.5 7.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l1-1' }),
    arrowR: (p) => S({ ...p, d: 'M4 12h15M13 6l6 6-6 6' }),
    refresh: (p) => S({ ...p, d: 'M20 11a8 8 0 0 0-14-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 4.5L20 16M20 20v-4h-4' }),
  };
})();

window.Ic = Ic;
