// Helper centralizado para rutas de assets en /public.
// Como hay basePath, hay que prefijarlas manualmente.
export const BASE_PATH = '/behelpyou-gallery';
export const asset = (path) => `${BASE_PATH}${path.startsWith('/') ? path : '/' + path}`;
export const LOGO_SRC = asset('/logo-behelpyou.png');
