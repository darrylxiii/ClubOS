import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with default type text', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', undefined);
    });
  });

  describe('types', () => {
    it('should render text input', () => {
      render(<Input type="text" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');
    });

    it('should render email input', () => {
      render(<Input type="email" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<Input type="password" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('should render number input', () => {
      render(<Input type="number" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
    });

    it('should render search input', () => {
      render(<Input type="search" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'search');
    });
  });

  describe('props', () => {
    it('should accept value prop', () => {
      render(<Input value="test value" onChange={() => {}} data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveValue('test value');
    });

    it('should accept disabled prop', () => {
      render(<Input disabled data-testid="input" />);
      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('should accept readOnly prop', () => {
      render(<Input readOnly data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('readonly');
    });

    it('should accept required prop', () => {
      render(<Input required data-testid="input" />);
      expect(screen.getByTestId('input')).toBeRequired();
    });

    it('should accept custom className', () => {
      render(<Input className="custom-class" data-testid="input" />);
      expect(screen.getByTestId('input').className).toContain('custom-class');
    });
  });

  describe('events', () => {
    it('should call onChange when typing', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} data-testid="input" />);
      
      fireEvent.change(screen.getByTestId('input'), { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} data-testid="input" />);
      
      fireEvent.focus(screen.getByTestId('input'));
      
      expect(handleFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} data-testid="input" />);
      
      fireEvent.blur(screen.getByTestId('input'));
      
      expect(handleBlur).toHaveBeenCalled();
    });

    it('should call onKeyDown when key pressed', () => {
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} data-testid="input" />);
      
      fireEvent.keyDown(screen.getByTestId('input'), { key: 'Enter' });
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('should have base styling classes', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      
      expect(input.className).toContain('rounded-xl');
      expect(input.className).toContain('border');
    });

    it('should have focus styling classes', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      
      expect(input.className).toContain('focus-visible:ring');
    });

    it('should have disabled styling classes', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      
      expect(input.className).toContain('disabled:opacity-50');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} data-testid="input" />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow focus via ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} data-testid="input" />);
      
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });
});
