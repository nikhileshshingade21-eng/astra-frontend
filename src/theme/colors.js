/**
 * ASTRA 2.0 Design Tokens
 * ========================
 * Single source of truth for all colors.
 * Import this instead of declaring colors per-screen.
 */

export const Colors = {
    // ── Backgrounds ──────────────────────────────
    bg: '#1e1b4b', // Royal Purple
    bgCard: '#2e2a7a',
    bgElevated: '#3b369c',
    bgSheet: '#18153d',

    // ── Primary (Electric Gold) ────────────────
    primary: '#fbbf24', // Updated to Gold
    primaryLight: '#fde68a',
    primaryDark: '#d97706',
    primaryGlass: 'rgba(251, 191, 36, 0.12)',

    // ── Accent (Electric Gold / Amber) ──────────
    accent: '#fbbf24',
    accentGlass: 'rgba(251, 191, 36, 0.10)',

    // ── Semantic ─────────────────────────────────
    success: '#10b981',
    successGlass: 'rgba(16, 185, 129, 0.10)',
    warning: '#f59e0b',
    warningGlass: 'rgba(245, 158, 11, 0.10)',
    danger: '#ef4444',
    dangerGlass: 'rgba(239, 68, 68, 0.10)',

    // ── Text ─────────────────────────────────────
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.85)',
    textMuted: 'rgba(255, 255, 255, 0.50)',
    textDisabled: 'rgba(255, 255, 255, 0.25)',

    // ── Surfaces ─────────────────────────────────
    glass: 'rgba(255, 255, 255, 0.06)',
    glassMedium: 'rgba(255, 255, 255, 0.10)',
    surfaceLight: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    divider: 'rgba(255, 255, 255, 0.10)',

    // ── Gamification ─────────────────────────────
    gold: '#fbbf24',
    silver: '#cbd5e1',
    bronze: '#92400e',
    streak: '#fbbf24',

    // ── Role Colors ──────────────────────────────
    student: '#fbbf24',
    faculty: '#fde047',
    admin: '#f59e0b',

    // ── Chart / Data Viz ─────────────────────────
    chart: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#6366f1'],

    // ── Gradients ────────────────────────────────
    gradientBg: ['#1e1b4b', '#2e2a7a'],
    gradientPrimary: ['#fbbf24', '#f59e0b'],
    gradientAccent: ['#fbbf24', '#fde68a'],
    gradientSuccess: ['#10b981', '#059669'],
    gradientDanger: ['#ef4444', '#dc2626'],
    gradientCard: ['rgba(255,255,255,0.08)', 'rgba(46,42,122,0.4)'],
};

export default Colors;
