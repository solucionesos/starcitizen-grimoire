import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"]
        )
        page = await browser.new_page(
            viewport={"width": 1360, "height": 900},
            locale="en-US"
        )

        print("Loading SCMDB...")
        await page.goto("https://scmdb.net/", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(7000)

        # Get all class names
        classes = await page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            const cls = new Set();
            all.forEach(el => el.classList.forEach(c => cls.add(c)));
            return Array.from(cls).filter(c => c.length > 3).join(',');
        }""")
        print("Classes:", classes[:600])

        # Try finding rows
        rows = await page.query_selector_all("[class*=row]")
        print(f"Elements with *row*: {len(rows)}")
        for r in rows[:3]:
            cls = await r.get_attribute("class")
            print(f"  row class: {cls}")

        # count contracts
        contracts = await page.query_selector_all("[class*=contract]")
        print(f"Elements with *contract*: {len(contracts)}")
        for c in contracts[:3]:
            cls = await c.get_attribute("class")
            print(f"  contract class: {cls}")

        title = await page.title()
        print("Page title:", title)

        # Get page HTML snippet
        body_text = await page.inner_text("body")
        print("Body text (first 300):", body_text[:300])

        await browser.close()

asyncio.run(check())
