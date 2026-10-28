#!/usr/bin/env node
/**
 * Phone-width layout check (ADR-051): signs in, opens every module page and one project's tabs at phone
 * widths, scrolls each to the end, and fails if anything sticks out past the screen edge. Elements inside
 * containers meant to scroll sideways (tables, tab rows) don't count.
 *
 *   CHECK_EMAIL=… CHECK_PASSWORD=… pnpm --filter @sitepilot/frontend check:mobile
 *
 * Optional: BASE_URL (default http://localhost:5173), API_URL (default http://localhost:5174/api),
 * CHROME_PATH (a Chrome/Chromium binary; otherwise the installed Google Chrome is used).
 * Run it against a dev or test database: it skips the product tours for the signed-in member.
 */
import { chromium } from 'playwright-core';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const API_URL = (process.env.API_URL ?? 'http://localhost:5174/api').replace(/\/$/, '');
const EMAIL = process.env.CHECK_EMAIL;
const PASSWORD = process.env.CHECK_PASSWORD;
const WIDTHS = [375, 393];
const PAGES = [
  '/dashboard', '/dashboard/projects', '/dashboard/daily-reports', '/dashboard/procurement', '/dashboard/materials',
  '/dashboard/inventory', '/dashboard/workforce', '/dashboard/finance', '/dashboard/billing', '/dashboard/reports',
  '/dashboard/ai', '/dashboard/ai-assistant', '/dashboard/notifications', '/dashboard/settings',
];
const PROJECT_TABS = ['', '/budget', '/timeline', '/team', '/daily-reports', '/purchase-orders', '/documents', '/materials', '/workforce'];
const TOURS = ['welcome', 'projects', 'daily-reports', 'procurement', 'materials', 'inventory', 'workforce', 'finance', 'billing', 'reports'];

if (!EMAIL || !PASSWORD) {
  console.error('Set CHECK_EMAIL and CHECK_PASSWORD to a member of a dev or test organization.');
  process.exit(2);
}

/** Runs in the page: elements whose right edge passes the screen and that no sideways scroller contains. */
function findOverflow() {
  const main = document.querySelector('main');
  if (!main) return [];
  const width = document.documentElement.clientWidth;
  const scrollsSideways = (element) => {
    for (let node = element.parentElement; node && node !== main; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowX)) return true;
    }
    return false;
  };
  return [...main.querySelectorAll('*')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > width + 1 && !scrollsSideways(element);
    })
    .slice(0, 5)
    .map((element) => `<${element.tagName.toLowerCase()} class="${String(element.className).slice(0, 80)}"> ends at ${Math.round(element.getBoundingClientRect().right)}px: "${(element.textContent ?? '').trim().slice(0, 60)}"`);
}

async function scrollToEnd(page) {
  await page.evaluate(async () => {
    const main = document.querySelector('main');
    if (!main) return;
    // Step down so lists that load more on scroll get the chance to.
    for (let y = 0; y < main.scrollHeight; y += 400) {
      main.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: WIDTHS[0], height: 852 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  await Promise.all(TOURS.map((key) => context.request.put(`${API_URL}/help/tours/${key}`, { data: { status: 'SKIPPED' } })));
  const projects = await (await context.request.get(`${API_URL}/projects?limit=1`)).json();
  const projectId = projects?.data?.items?.[0]?.id;
  const routes = [...PAGES, ...(projectId ? PROJECT_TABS.map((tab) => `/dashboard/projects/${projectId}${tab}`) : [])];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 852 });
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await scrollToEnd(page);
      const offenders = await page.evaluate(findOverflow);
      const status = offenders.length ? 'FAIL' : 'ok  ';
      console.log(`${status} ${width}px ${route}`);
      if (offenders.length) failures.push({ width, route, offenders });
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} page(s) overflow at phone width:`);
  for (const { width, route, offenders } of failures) {
    console.error(`\n${width}px ${route}`);
    offenders.forEach((line) => console.error(`  ${line}`));
  }
  process.exit(1);
}
console.log('\nNo page overflows at phone width.');
