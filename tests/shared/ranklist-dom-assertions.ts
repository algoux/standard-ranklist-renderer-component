import { expect } from 'vitest';

export function textOf(element: Element | null | undefined): string {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

export function requireElement<T extends Element = Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector(selector);
  expect(element, `Expected to find selector: ${selector}`).toBeTruthy();
  return element as T;
}

export function requireAll(container: ParentNode, selector: string): Element[] {
  const elements = Array.from(container.querySelectorAll(selector));
  expect(elements.length, `Expected to find at least one selector: ${selector}`).toBeGreaterThan(0);
  return elements;
}

export function getTable(container: ParentNode): HTMLTableElement {
  return requireElement<HTMLTableElement>(container, 'table');
}

export function getBodyRows(container: ParentNode): HTMLTableRowElement[] {
  return Array.from(container.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
}

export function getProblemHeaders(container: ParentNode): HTMLTableCellElement[] {
  return Array.from(container.querySelectorAll('thead th.srk-problem-header')) as HTMLTableCellElement[];
}

export function getHeaderTexts(container: ParentNode): string[] {
  return Array.from(container.querySelectorAll('thead th')).map(textOf);
}

export function getRowByText(container: ParentNode, text: string): HTMLTableRowElement {
  const row = getBodyRows(container).find((candidate) => textOf(candidate).includes(text));
  expect(row, `Expected to find a table row containing: ${text}`).toBeTruthy();
  return row as HTMLTableRowElement;
}

export function expectTextIncludes(element: Element | null | undefined, expected: string) {
  expect(textOf(element)).toContain(expected);
}
