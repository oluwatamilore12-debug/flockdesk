/** Jmages Dbestline — Dark Blue / Neon Red brand palette */
export const palette = {
  darkBlue: '#001996',
  darkBlueMid: '#10259C',
  darkBlueLight: '#1A3BB0',
  neonRed: '#FF052E',
  black: '#000000',
  white: '#FFFFFF',
  /** Light surface tint derived from dark blue */
  softBlue: '#F0F2FA',
  /** Semantic aliases */
  darkest: '#000000',
  dark: '#001996',
  medium: '#10259C',
  light: '#F0F2FA',
  lightest: '#F0F2FA',
  text: '#000000',
  textMuted: '#001996',
  textSubtle: '#10259C',
  border: '#D6DBEF',
  surface: '#F0F2FA',
  surfaceCard: '#FFFFFF',
  danger: '#FF052E',
  warning: '#D97706',
  success: '#001996',
  info: '#10259C',
} as const

export const gradients = {
  /** Sidebar & login — midnight surge */
  midnightSurge: `linear-gradient(180deg, ${palette.darkBlue} 0%, #000D4D 55%, ${palette.black} 100%)`,
  /** Banners & headers */
  brandWave: `linear-gradient(135deg, ${palette.darkBlueLight} 0%, ${palette.darkBlue} 55%, ${palette.darkBlueMid} 100%)`,
  sidebar: `linear-gradient(180deg, ${palette.black} 0%, #000D4D 40%, ${palette.darkBlue} 100%)`,
  banner: `linear-gradient(135deg, ${palette.darkBlueLight} 0%, ${palette.darkBlue} 60%, ${palette.darkBlueMid} 100%)`,
  bannerSoft: `linear-gradient(135deg, ${palette.softBlue} 0%, ${palette.white} 100%)`,
  progress: `linear-gradient(90deg, ${palette.darkBlue}, ${palette.neonRed})`,
  progressBalanced: `linear-gradient(90deg, ${palette.softBlue}, ${palette.white})`,
  login: `linear-gradient(135deg, ${palette.black} 0%, #000D4D 45%, ${palette.darkBlue} 100%)`,
  page: `linear-gradient(180deg, ${palette.softBlue} 0%, ${palette.white} 100%)`,
} as const