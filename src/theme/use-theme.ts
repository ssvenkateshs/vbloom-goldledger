import { Palette, type Colors, type Scheme } from './index';

/** The app ships dark (see app.json `userInterfaceStyle`); keep one source of truth here. */
export function useScheme(): Scheme {
  return 'dark';
}

export function useTheme(): Colors {
  return Palette[useScheme()];
}
