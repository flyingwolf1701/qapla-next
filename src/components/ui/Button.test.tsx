
import { render, screen } from '@testing-library/react';
import { Button } from './button'; // Adjust path as necessary
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('renders a button with children', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
  });

  it('applies default variant and size if not specified', () => {
    render(<Button>Default Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /default button/i });
    // Check for default classes (these might need adjustment based on your cva defaults)
    expect(buttonElement).toHaveClass('bg-primary'); // Example default class
    expect(buttonElement).toHaveClass('h-10'); // Example default size class
  });

  it('applies specified variant', () => {
    render(<Button variant="destructive">Destructive</Button>);
    const buttonElement = screen.getByRole('button', { name: /destructive/i });
    expect(buttonElement).toHaveClass('bg-destructive');
  });

  it('applies specified size', () => {
    render(<Button size="sm">Small</Button>);
    const buttonElement = screen.getByRole('button', { name: /small/i });
    expect(buttonElement).toHaveClass('h-9'); // Or 'text-sm' etc. depending on your cva
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/">Link Button</a>
      </Button>
    );
    const linkElement = screen.getByRole('link', { name: /link button/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe('A');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /disabled button/i });
    expect(buttonElement).toBeDisabled();
  });
});
