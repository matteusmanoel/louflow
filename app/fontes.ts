import { Fraunces, Inter, Manrope } from 'next/font/google';

/** Texto corrido: parágrafos, células, campos. */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/** Interface: menu, botões, rótulos, badges. */
export const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

/** Títulos, números e caracteres de destaque. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
});

export const classesFontes = `${inter.variable} ${manrope.variable} ${fraunces.variable}`;
