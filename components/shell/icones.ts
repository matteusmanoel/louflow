import {
  LayoutDashboard,
  FileText,
  ListChecks,
  ClipboardList,
  CheckCircle2,
  Clock,
  CalendarDays,
  Camera,
  Smartphone,
  Plane,
  Scissors,
  Package,
  BarChart2,
  Trophy,
  Brain,
  BookOpen,
  Gift,
  Users,
  Trash2,
  Shield,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type ItemMenu = { slug: string; rotulo: string };

/** Única fonte dos ícones de navegação. MenuLateral, MenuMobile e BottomBar usam este mapa. */
export const ICONES: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  demandas: FileText,
  fichas: ListChecks,
  'ficha-tecnica': ClipboardList,
  aprovacoes: CheckCircle2,
  pendencias: Clock,
  agenda: CalendarDays,
  captacoes: Camera,
  'midia-movel': Smartphone,
  drone: Plane,
  cortes: Scissors,
  equipamentos: Package,
  relatorio: BarChart2,
  ranking: Trophy,
  analista: Brain,
  wiki: BookOpen,
  sorteios: Gift,
  usuarios: Users,
  lixeira: Trash2,
  auditoria: Shield,
  preferencias: Settings,
};

/** Rótulo da bottom bar, até ~10 caracteres. O menu continua com o rótulo completo. */
export const ROTULO_CURTO: Record<string, string> = {
  demandas: 'Demandas',
  fichas: 'Fichas',
  'ficha-tecnica': 'Ficha',
  aprovacoes: 'Aprovar',
  pendencias: 'Pendências',
  agenda: 'Agenda',
  captacoes: 'Captações',
  'midia-movel': 'Mídia',
  drone: 'Drone',
  cortes: 'Cortes',
  usuarios: 'Usuários',
  lixeira: 'Lixeira',
  auditoria: 'Auditoria',
};

/** Ordem da bottom bar. O que não está aqui entra depois, na ordem dos grupos. */
export const PRIORIDADE_BARRA = ['demandas', 'aprovacoes', 'pendencias', 'agenda', 'captacoes'] as const;
