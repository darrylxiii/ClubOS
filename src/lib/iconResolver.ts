/**
 * Dynamic icon resolver for components that need to render icons by name string.
 * 
 * PERF: This replaces `import * as Icons from 'lucide-react'` which bundles ALL 
 * 1000+ icons (646KB). Instead, we maintain a curated map of only the icons 
 * actually used by dynamic-name features (achievements, departments, tips).
 * 
 * To add an icon: import it from lucide-react and add to the ICON_MAP below.
 */
import {
  Award, Star, Trophy, Target, Zap, Crown, Shield, Heart,
  Flame, Rocket, Medal, Brain, Sparkles, Users, Briefcase,
  Building2, Code, Globe, Lightbulb, TrendingUp, Calendar,
  CheckCircle, Clock, FileText, MessageCircle, Puzzle,
  BookOpen, GraduationCap, Handshake, Key, Lock, Mail,
  MapPin, Music, Phone, Search, Send, Settings, ThumbsUp,
  Video, Wifi, Wrench, Activity, AlertTriangle, Archive,
  BarChart3, Bell, Camera, Clipboard, Cloud, Coffee,
  Compass, Database, Download, Edit, Eye, Flag, Folder,
  Gift, Hash, Headphones, Home, Image, Info, Layers,
  Layout, Link, List, Loader2, LogOut, Map, Mic, Monitor,
  MoreHorizontal, Package, Palette, Paperclip, PenTool,
  Percent, PieChart, Pin, Play, Plus, Power, Printer,
  Radio, RefreshCw, Repeat, Save, Scissors, Share2,
  ShoppingCart, Sidebar, Slash, Sliders, Smartphone,
  Speaker, Sun, Table, Tag, Terminal, Thermometer,
  ToggleLeft, Trash2, Type, Umbrella, Upload, User,
  UserCheck, UserPlus, Volume2, Watch, X, Hexagon,
  Diamond, CircleDot, Gem, Sword, Swords, Wand2,
  BadgeCheck, PartyPopper, Blocks, Network, School,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Award, Star, Trophy, Target, Zap, Crown, Shield, Heart,
  Flame, Rocket, Medal, Brain, Sparkles, Users, Briefcase,
  Building2, Code, Globe, Lightbulb, TrendingUp, Calendar,
  CheckCircle, Clock, FileText, MessageCircle, Puzzle,
  BookOpen, GraduationCap, Handshake, Key, Lock, Mail,
  MapPin, Music, Phone, Search, Send, Settings, ThumbsUp,
  Video, Wifi, Wrench, Activity, AlertTriangle, Archive,
  BarChart3, Bell, Camera, Clipboard, Cloud, Coffee,
  Compass, Database, Download, Edit, Eye, Flag, Folder,
  Gift, Hash, Headphones, Home, Image, Info, Layers,
  Layout, Link, List, Loader2, LogOut, Map, Mic, Monitor,
  MoreHorizontal, Package, Palette, Paperclip, PenTool,
  Percent, PieChart, Pin, Play, Plus, Power, Printer,
  Radio, RefreshCw, Repeat, Save, Scissors, Share2,
  ShoppingCart, Sidebar, Slash, Sliders, Smartphone,
  Speaker, Sun, Table, Tag, Terminal, Thermometer,
  ToggleLeft, Trash2, Type, Umbrella, Upload, User,
  UserCheck, UserPlus, Volume2, Watch, X, Hexagon,
  Diamond, CircleDot, Gem, Sword, Swords, Wand2,
  BadgeCheck, PartyPopper, Blocks, Network, School,
};

/**
 * Resolves an icon component by its string name.
 * Returns the fallback icon if the name is not found in the curated map.
 */
export function resolveIcon(name: string, fallback: LucideIcon = Sparkles): LucideIcon {
  return ICON_MAP[name] ?? fallback;
}

/** All available icon names for picker UIs */
export const AVAILABLE_ICON_NAMES = Object.keys(ICON_MAP);

export { type LucideIcon };
