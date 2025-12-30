import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from '../button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('should render as button by default', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link</a>
        </Button>
      );
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply default variant classes', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-card');
    });

    it('should apply outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
    });

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-card');
    });

    it('should apply ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-card');
    });

    it('should apply link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset');
    });

    it('should apply glass variant classes', () => {
      render(<Button variant="glass">Glass</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('backdrop-blur');
    });
  });

  describe('sizes', () => {
    it('should apply default size classes', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-11');
    });

    it('should apply sm size classes', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
    });

    it('should apply lg size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-13');
    });

    it('should apply icon size classes', () => {
      render(<Button size="icon">🔍</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-11');
    });
  });

  describe('props', () => {
    it('should pass through HTML button attributes', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button').className).toContain('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Button ref={ref}>Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('buttonVariants', () => {
    it('should generate default variant classes', () => {
      const classes = buttonVariants();
      expect(classes).toContain('inline-flex');
    });

    it('should generate variant-specific classes', () => {
      const ghostClasses = buttonVariants({ variant: 'ghost' });
      expect(ghostClasses).toContain('hover:bg-card');
    });

    it('should generate size-specific classes', () => {
      const lgClasses = buttonVariants({ size: 'lg' });
      expect(lgClasses).toContain('h-13');
    });

    it('should combine variant and size', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'sm' });
      expect(classes).toContain('border');
      expect(classes).toContain('h-9');
    });
  });
});
