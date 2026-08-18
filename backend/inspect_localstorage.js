import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  const customAgents = await page.evaluate(() => localStorage.getItem('customAgents'));
  const departments = await page.evaluate(() => localStorage.getItem('departments'));
  
  console.log('--- CUSTOM AGENTS ---');
  console.log(customAgents);
  console.log('--- DEPARTMENTS ---');
  console.log(departments);
  
  await browser.close();
})();
