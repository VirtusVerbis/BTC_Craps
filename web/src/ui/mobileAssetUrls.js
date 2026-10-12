/** Stable URL for PNGs shipped under `public/mobile/` (works with Vite `base`). */
export const resolveMobileAssetUrl = (fileName) => {
    const base = import.meta.env.BASE_URL ?? '/';
    const withSlash = base.endsWith('/') ? base : `${base}/`;
    return `${withSlash}mobile/${fileName}`;
};
