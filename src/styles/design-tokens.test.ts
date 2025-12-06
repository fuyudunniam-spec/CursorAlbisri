/**
 * Design Tokens Tests
 * 
 * Basic tests to verify design tokens are properly defined
 * and meet requirements.
 */

import { describe, it, expect } from 'vitest';
import {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  transitions,
  breakpoints,
  components,
  gradients,
} from './design-tokens';

describe('Design Tokens', () => {
  describe('Colors', () => {
    it('should have primary color palette', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[600]).toBe('#2563eb'); // Primary brand color
    });

    it('should have neutral color palette', () => {
      expect(colors.neutral).toBeDefined();
      expect(colors.neutral[50]).toBe('#f9fafb'); // Background
      expect(colors.neutral[900]).toBe('#111827'); // Primary text
    });

    it('should have semantic colors', () => {
      expect(colors.semantic.success).toBe('#10b981');
      expect(colors.semantic.warning).toBe('#f59e0b');
      expect(colors.semantic.error).toBe('#ef4444');
      expect(colors.semantic.info).toBe('#3b82f6');
    });

    it('should have status colors for badges (Requirement 5.4)', () => {
      expect(colors.status.active).toBe('#10b981');   // Green
      expect(colors.status.inactive).toBe('#ef4444'); // Red
      expect(colors.status.cuti).toBe('#f59e0b');     // Yellow
    });
  });

  describe('Typography', () => {
    it('should have font family defined (Requirement 6.4)', () => {
      expect(typography.fontFamily.sans).toContain('Inter');
    });

    it('should have proper font size hierarchy (Requirement 6.1)', () => {
      expect(typography.fontSize['5xl']).toBe('2rem');    // 32px - h1
      expect(typography.fontSize['2xl']).toBe('1.5rem');  // 24px - h2
      expect(typography.fontSize.xl).toBe('1.25rem');     // 20px - h4
      expect(typography.fontSize.lg).toBe('1.125rem');    // 18px
    });

    it('should have body text sizes (Requirement 6.2)', () => {
      expect(typography.fontSize.base).toBe('1rem');      // 16px
      expect(typography.fontSize.sm).toBe('0.875rem');    // 14px
    });

    it('should have label sizes (Requirement 6.3)', () => {
      expect(typography.fontSize.xs).toBe('0.75rem');     // 12px
      expect(typography.fontSize.sm).toBe('0.875rem');    // 14px
    });

    it('should have proper line heights (Requirement 6.2)', () => {
      expect(typography.lineHeight.normal).toBe(1.5);
      expect(typography.lineHeight.tight).toBe(1.25);
      expect(typography.lineHeight.relaxed).toBe(1.75);
    });

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBe(400);
      expect(typography.fontWeight.medium).toBe(500);
      expect(typography.fontWeight.semibold).toBe(600);
      expect(typography.fontWeight.bold).toBe(700);
    });
  });

  describe('Spacing', () => {
    it('should have minimum 16px spacing (Requirement 1.4)', () => {
      expect(spacing[4]).toBe('1rem'); // 16px minimum gap
    });

    it('should have card spacing (Requirement 8.2)', () => {
      expect(spacing[6]).toBe('1.5rem'); // 24px card spacing
    });

    it('should have consistent spacing scale', () => {
      expect(spacing[0]).toBe('0');
      expect(spacing[1]).toBe('0.25rem');  // 4px
      expect(spacing[2]).toBe('0.5rem');   // 8px
      expect(spacing[3]).toBe('0.75rem');  // 12px
      expect(spacing[8]).toBe('2rem');     // 32px
    });
  });

  describe('Border Radius', () => {
    it('should have card border radius (Requirement 1.3)', () => {
      expect(borderRadius.lg).toBe('0.75rem'); // 12px
    });

    it('should have circular radius for avatars', () => {
      expect(borderRadius.full).toBe('9999px');
    });

    it('should have consistent border radius scale', () => {
      expect(borderRadius.sm).toBe('0.375rem');  // 6px
      expect(borderRadius.DEFAULT).toBe('0.5rem'); // 8px
      expect(borderRadius.md).toBe('0.625rem');  // 10px
      expect(borderRadius.xl).toBe('1rem');      // 16px
    });
  });

  describe('Shadows', () => {
    it('should have shadow scale', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.DEFAULT).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      expect(shadows.xl).toBeDefined();
    });
  });

  describe('Transitions', () => {
    it('should have button hover transition (Requirement 9.1)', () => {
      expect(transitions.base).toBe('200ms cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should have tab transition (Requirement 4.1)', () => {
      expect(transitions.slow).toBe('300ms cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should have fast transition', () => {
      expect(transitions.fast).toBe('150ms cubic-bezier(0.4, 0, 0.2, 1)');
    });
  });

  describe('Breakpoints', () => {
    it('should have mobile breakpoint', () => {
      expect(breakpoints.mobile).toBe('320px');
    });

    it('should have tablet breakpoint (Requirement 2.1)', () => {
      expect(breakpoints.tablet).toBe('768px');
    });

    it('should have desktop breakpoint (Requirement 3.1)', () => {
      expect(breakpoints.desktop).toBe('1024px');
    });

    it('should have wide and ultrawide breakpoints', () => {
      expect(breakpoints.wide).toBe('1280px');
      expect(breakpoints.ultrawide).toBe('1920px');
    });
  });

  describe('Component Tokens', () => {
    it('should have avatar sizes (Requirements 7.1, 7.3)', () => {
      expect(components.avatar.hero.desktop).toBe('120px');
      expect(components.avatar.hero.mobile).toBe('80px');
      expect(components.avatar.sidebar.min).toBe('64px');
      expect(components.avatar.sidebar.max).toBe('80px');
    });

    it('should have sidebar width (Requirement 3.1)', () => {
      expect(components.sidebar.width.min).toBe('280px');
      expect(components.sidebar.width.max).toBe('320px');
    });

    it('should have stat card dimensions (Requirements 5.1, 5.2)', () => {
      expect(components.statCard.icon.min).toBe('24px');
      expect(components.statCard.icon.max).toBe('32px');
      expect(components.statCard.value.fontSize.min).toBe('24px');
      expect(components.statCard.value.fontSize.max).toBe('36px');
    });

    it('should have card spacing (Requirement 8.2)', () => {
      expect(components.card.spacing.min).toBe('16px');
      expect(components.card.spacing.max).toBe('24px');
    });

    it('should have navigation dimensions', () => {
      expect(components.navigation.item.height).toBe('48px');
      expect(components.navigation.bottomNav.height).toBe('64px');
    });
  });

  describe('Gradients', () => {
    it('should have hero gradient', () => {
      expect(gradients.hero).toContain('linear-gradient');
      expect(gradients.hero).toContain('#667eea');
      expect(gradients.hero).toContain('#764ba2');
    });

    it('should have semantic gradients', () => {
      expect(gradients.primary).toBeDefined();
      expect(gradients.card).toBeDefined();
      expect(gradients.success).toBeDefined();
      expect(gradients.warning).toBeDefined();
      expect(gradients.error).toBeDefined();
    });
  });
});
