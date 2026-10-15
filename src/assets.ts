/** Public assets must follow Vite's base when the site lives under /Trazo/. */
export const assetUrl = (filename: string) => `${import.meta.env.BASE_URL}assets/${filename}`;
