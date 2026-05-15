import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Container from '@/components/layout/Container';

describe('Container', () => {
  it('renders a <div> by default', () => {
    const { container } = render(<Container>content</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
  });

  it('emits the narrow variant locked class string', () => {
    const { container } = render(<Container variant="narrow">x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-2xl', 'px-4', 'sm:px-6');
  });

  it('emits the default variant locked class string when variant is omitted', () => {
    const { container } = render(<Container>x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-3xl', 'px-4', 'sm:px-6');
  });

  it('emits the default variant locked class string when variant="default" is explicit', () => {
    const { container } = render(<Container variant="default">x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-3xl', 'px-4', 'sm:px-6');
  });

  it('emits the wide variant locked class string', () => {
    const { container } = render(<Container variant="wide">x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-5xl', 'px-4', 'sm:px-6', 'lg:px-8');
  });

  it('emits the full variant locked class string and omits mx-auto / max-w-*', () => {
    const { container } = render(<Container variant="full">x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('w-full', 'px-4', 'sm:px-6', 'lg:px-8', 'xl:px-10');
    expect(el.className).not.toMatch(/(^|\s)mx-auto(\s|$)/);
    expect(el.className).not.toMatch(/max-w-/);
  });

  it('renders the chosen tag when as is set', () => {
    const a = render(<Container as="section">x</Container>);
    expect((a.container.firstChild as HTMLElement).tagName).toBe('SECTION');

    const b = render(<Container as="main">x</Container>);
    expect((b.container.firstChild as HTMLElement).tagName).toBe('MAIN');

    const c = render(<Container as="nav">x</Container>);
    expect((c.container.firstChild as HTMLElement).tagName).toBe('NAV');
  });

  it('appends className without replacing the variant class string', () => {
    const { container } = render(
      <Container variant="narrow" className="pt-12 custom-thing">x</Container>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('max-w-2xl');
    expect(el).toHaveClass('mx-auto');
    expect(el).toHaveClass('w-full');
    expect(el).toHaveClass('px-4');
    expect(el).toHaveClass('sm:px-6');
    expect(el).toHaveClass('pt-12');
    expect(el).toHaveClass('custom-thing');
  });

  it('strips px-* classes when noPadding is true (default variant)', () => {
    const { container } = render(<Container variant="default" noPadding>x</Container>);
    const el = container.firstChild as HTMLElement;
    // Geometry preserved
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-3xl');
    // All px-* / sm:px-* stripped
    expect(el.className).not.toMatch(/(^|\s)px-/);
    expect(el.className).not.toMatch(/sm:px-/);
  });

  it('strips px-* classes when noPadding is true (narrow variant)', () => {
    const { container } = render(<Container variant="narrow" noPadding>x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-2xl');
    expect(el.className).not.toMatch(/(^|\s)px-/);
    expect(el.className).not.toMatch(/sm:px-/);
  });

  it('strips px-* classes when noPadding is true (wide variant)', () => {
    const { container } = render(<Container variant="wide" noPadding>x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-5xl');
    expect(el.className).not.toMatch(/(^|\s)px-/);
    expect(el.className).not.toMatch(/sm:px-/);
    expect(el.className).not.toMatch(/lg:px-/);
  });

  it('strips px-* classes when noPadding is true (full variant)', () => {
    const { container } = render(<Container variant="full" noPadding>x</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('w-full');
    expect(el.className).not.toMatch(/(^|\s)px-/);
    expect(el.className).not.toMatch(/sm:px-/);
    expect(el.className).not.toMatch(/lg:px-/);
    expect(el.className).not.toMatch(/xl:px-/);
  });

  it('allows full padding replacement via noPadding + className (W4 override pattern)', () => {
    const { container } = render(
      <Container variant="narrow" noPadding className="px-6 sm:px-6">x</Container>,
    );
    const el = container.firstChild as HTMLElement;
    // Variant preserved
    expect(el).toHaveClass('max-w-2xl');
    // Caller's padding applied
    expect(el).toHaveClass('px-6');
    expect(el).toHaveClass('sm:px-6');
    // Variant's mobile padding stripped — this is the W4 fix that makes the
    // override deterministic regardless of Tailwind 4's internal class ordering
    expect(el.className).not.toMatch(/(^|\s)px-4(\s|$)/);
  });

  it('renders children', () => {
    render(<Container><p>hello</p></Container>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
