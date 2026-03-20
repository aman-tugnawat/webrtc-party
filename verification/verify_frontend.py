from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        print("Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173")

        # Wait for content to load
        page.wait_for_selector("text=Create or Join a Game", timeout=5000)

        if page.get_by_text("Create or Join a Game").is_visible():
            print("Verified: 'Create or Join a Game' header is visible.")
        else:
            print("Failed: 'Create or Join a Game' header not found.")

        # Check for 'Select Game' label
        if page.get_by_label("Select Game:").is_visible():
             print("Verified: 'Select Game' label is visible.")

        # Check for 'Create Game Session' button
        if page.get_by_role("button", name="Create Game Session").is_visible():
             print("Verified: 'Create Game Session' button is visible.")

        page.screenshot(path="verification/verification.png")
        print("Screenshot saved to verification/verification.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
