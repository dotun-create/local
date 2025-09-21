/**
 * Button Component Tests
 * Shared component testing with styled-components theme integration
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@shared/testing/test-utils';
import { lightTheme, darkTheme } from '@shared/styles/theme';
import Button from '../ui/Button/Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    renderWithProviders(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    renderWithProviders(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    renderWithProviders(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  describe('Variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'];

    variants.forEach(variant => {
      it(`renders ${variant} variant correctly`, () => {
        renderWithProviders(<Button variant={variant}>Button</Button>);

        const button = screen.getByRole('button');
        expect(button).toHaveClass(`button--${variant}`);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'];

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, () => {
        renderWithProviders(<Button size={size}>Button</Button>);

        const button = screen.getByRole('button');
        expect(button).toHaveClass(`button--${size}`);
      });
    });
  });

  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;

    it('renders with left icon', () => {
      renderWithProviders(
        <Button icon={<TestIcon />} iconPosition="left">
          Button
        </Button>
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      renderWithProviders(
        <Button icon={<TestIcon />} iconPosition="right">
          Button
        </Button>
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('renders icon only button', () => {
      renderWithProviders(
        <Button icon={<TestIcon />} iconOnly aria-label="Icon button">
          Hidden text
        </Button>
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.queryByText('Hidden text')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Icon button')).toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('renders full width button', () => {
      renderWithProviders(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--full-width');
    });
  });

  describe('Theme Integration', () => {
    it('applies light theme styles', () => {
      renderWithProviders(<Button>Light Theme</Button>, { theme: lightTheme });

      const button = screen.getByRole('button');
      const styles = getComputedStyle(button);

      // Check if light theme colors are applied
      expect(styles.backgroundColor).toBe(lightTheme.colors.interactive.primary);
    });

    it('applies dark theme styles', () => {
      renderWithProviders(<Button>Dark Theme</Button>, { theme: darkTheme });

      const button = screen.getByRole('button');
      const styles = getComputedStyle(button);

      // Check if dark theme colors are applied
      expect(styles.backgroundColor).toBe(darkTheme.colors.interactive.primary);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <Button aria-label="Custom label" aria-describedby="description">
          Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    it('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      renderWithProviders(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');

      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('has proper focus styles', () => {
      renderWithProviders(<Button>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
      expect(button).toHaveClass('button--focused');
    });
  });

  describe('Form Integration', () => {
    it('works as submit button', () => {
      const handleSubmit = jest.fn(e => e.preventDefault());

      renderWithProviders(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );

      const button = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('works as reset button', () => {
      renderWithProviders(
        <form>
          <input defaultValue="test" />
          <Button type="reset">Reset</Button>
        </form>
      );

      const input = screen.getByRole('textbox');
      const resetButton = screen.getByRole('button', { name: /reset/i });

      expect(input).toHaveValue('test');

      fireEvent.click(resetButton);
      expect(input).toHaveValue('');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestButton = React.memo(({ children, ...props }) => {
        renderSpy();
        return <Button {...props}>{children}</Button>;
      });

      const { rerender } = renderWithProviders(<TestButton>Button</TestButton>);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestButton>Button</TestButton>);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with different props
      rerender(<TestButton disabled>Button</TestButton>);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});