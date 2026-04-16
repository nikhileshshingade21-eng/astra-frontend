/**
 * ASTRA 2.0 Design Tokens
 * ========================
 * Single source of truth for all colors.
 * Import this instead of declaring colors per-screen.
 */

export const Colors = {
    // ── Backgrounds ──────────────────────────────
    bg: '#0A0E1A',
    bgCard: '#121729',
    bgElevated: '#1A2035',
    bgSheet: '#0D1220',

    // ── Primary (Electric Indigo) ────────────────
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    primaryDark: '#4834D4',
    primaryGlass: 'rgba(108, 92, 231, 0.12)',

    // ── Accent (Cyan) ────────────────────────────
    accent: '#00D2FF',
    accentGlass: 'rgba(0, 210, 255, 0.10)',

    // ── Semantic ─────────────────────────────────
    success: '#00E676',
    successGlass: 'rgba(0, 230, 118, 0.10)',
    warning: '#FFB74D',
    warningGlass: 'rgba(255, 183, 77, 0.10)',
    danger: '#FF5252',
    dangerGlass: 'rgba(255, 82, 82, 0.10)',

    // ── Text ─────────────────────────────────────
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.70)',
    textMuted: 'rgba(255, 255, 255, 0.40)',
    textDisabled: 'rgba(255, 255, 255, 0.20)',

    // ── Surfaces ─────────────────────────────────
    glass: 'rgba(255, 255, 255, 0.06)',
    glassMedium: 'rgba(255, 255, 255, 0.10)',
    surfaceLight: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.06)',
    divider: 'rgba(255, 255, 255, 0.08)',

    // ── Gamification ─────────────────────────────
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    streak: '#FF6B35',

    // ── Role Colors ──────────────────────────────
    student: '#6C5CE7',
    faculty: '#A29BFE',
    admin: '#00D2FF',

    // ── Chart / Data Viz ─────────────────────────
    chart: ['#6C5CE7', '#00D2FF', '#00E676', '#FFB74D', '#FF5252', '#A29BFE'],

    // ── Gradients (as arrays for LinearGradient) ─
    gradientBg: ['#0A0E1A', '#151B30'],
    gradientPrimary: ['#6C5CE7', '#4834D4'],
    gradientAccent: ['#00D2FF', '#0099CC'],
    gradientSuccess: ['#00E676', '#00C853'],
    gradientDanger: ['#FF5252', '#D32F2F'],
    gradientCard: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'],
};

export default Colors;
