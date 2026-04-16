/**
 * ASTRA 2.0 Spacing & Layout Tokens
 */

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    screen: 24, // standard horizontal padding
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 100,
    card: 20,
    button: 16,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    glow: (color) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    }),
};

export const Typography = {
    // Display
    hero: { fontFamily: 'Tanker', fontSize: 48, color: '#fff' },
    h1: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 0.5 },
    h2: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 0.5 },
    h3: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },

    // Body
    bodyLg: { fontFamily: 'Satoshi-Medium', fontSize: 16, color: '#fff', lineHeight: 24 },
    body: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', lineHeight: 20 },
    bodySm: { fontFamily: 'Satoshi-Medium', fontSize: 12, color: 'rgba(255,255,255,0.7)' },

    // Labels
    label: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
    labelSm: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
    caption: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },

    // Numbers
    stat: { fontFamily: 'Tanker', fontSize: 36, color: '#fff' },
    statSm: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    badge: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 1 },
};

export default { Spacing, Radius, Shadows, Typography };
