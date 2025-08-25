import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        import os
        file_path = "file://" + os.path.abspath("index.html")

        await page.goto(file_path)

        # The test can't easily trigger the 'beforeinstallprompt' event.
        # So, we'll manually make the button visible to test its click logic.

        # Open the settings modal
        await page.locator("#nav-settings").click()
        await expect(page.locator("#settingsModal")).to_be_visible()

        install_button = page.locator("#install-pwa-button")

        # Manually show the button for the test
        await install_button.evaluate("button => button.style.display = 'block'")
        await expect(install_button).to_be_visible()

        # We also need to fake the deferredPrompt object for the click handler to work
        await page.evaluate("""
            window.deferredPrompt = {
                prompt: () => {},
                userChoice: Promise.resolve({ outcome: 'accepted' })
            };
        """)

        # Click the install button
        await install_button.click()

        # Assert that the button is now hidden again, which is part of our logic
        await expect(install_button).not_to_be_visible()

        # Take a screenshot of the settings modal to show the button is gone
        await page.locator("#settingsModal .modal-content").screenshot(path="jules-scratch/verification/install_button_test.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
