import {
  Target, Crosshair, Ruler, Flame, Medal, Trophy, Crown, Award, PenLine, Rocket,
  Star, TrendingUp, Shield, MessageCircle, MessagesSquare, Users, FileText, BookOpen,
  Heart, Sparkles, HeartHandshake, Brain, MessageSquare, Radio, UserPlus, Users2,
  UserCheck, ClipboardCheck, Activity, Zap, Eye, Gem, Dumbbell, CheckSquare, Vote,
  PlusSquare, BarChart3, Landmark, CalendarCheck, Quote, CalendarClock, GraduationCap,
  CircleDot, type LucideIcon,
} from 'lucide-react';

// Maps the `badges.icon` string column (a lucide-react icon name) to the
// actual component — the DB can't store JSX, so this is the one place that
// bridges catalog data to a renderable icon.
export const BADGE_ICONS: Record<string, LucideIcon> = {
  Target, Crosshair, Ruler, Flame, Medal, Trophy, Crown, Award, PenLine, Rocket,
  Star, TrendingUp, Shield, MessageCircle, MessagesSquare, Users, FileText, BookOpen,
  Heart, Sparkles, HeartHandshake, Brain, MessageSquare, Radio, UserPlus, Users2,
  UserCheck, ClipboardCheck, Activity, Zap, Eye, Gem, Dumbbell, CheckSquare, Vote,
  PlusSquare, BarChart3, Landmark, CalendarCheck, Quote, CalendarClock, GraduationCap,
};

export function getBadgeIcon(iconName: string): LucideIcon {
  return BADGE_ICONS[iconName] ?? CircleDot;
}
