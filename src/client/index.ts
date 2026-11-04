// Entrada do JavaScript de todas as páginas. Compilado e embutido no fim do <body> por scripts/build.ts.
import { trackWhatsappClicks } from './analytics.ts';
import { closeMenuOnEscapeAndOutsideClick } from './menu.ts';
import { idleMobileBar } from './mobile-bar.ts';

trackWhatsappClicks();
idleMobileBar();
closeMenuOnEscapeAndOutsideClick();
