"""Founder self-serve verification: is this a real company, submitted by
someone who actually works there?

We don't have a company-registry API to check against, so verification is
intentionally lightweight — the founder's email domain must match their
company's website domain (name@clevertap.com for clevertap.com). This blocks
the obvious abuse case (a personal Gmail address claiming any company name)
without adding friction like manual admin review.
"""

import re
from urllib.parse import urlparse

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Free/personal email providers are never accepted as a "company domain" —
# without this, someone could set website_url to their own webmail domain
# and pass the match trivially.
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
    "protonmail.com", "aol.com", "live.com", "yopmail.com", "rediffmail.com",
    "zoho.com", "gmx.com", "mail.com", "yandex.com",
}


def extract_domain(value: str) -> str | None:
    """Pulls a bare domain (no scheme, no www.) out of a URL or an email address."""
    value = value.strip().lower()
    if "@" in value:
        domain = value.rsplit("@", 1)[-1]
    else:
        parsed = urlparse(value if "//" in value else f"//{value}")
        domain = parsed.netloc or parsed.path
    domain = domain.split("/")[0].split(":")[0]
    return domain[4:] if domain.startswith("www.") else (domain or None)


def verify_founder_domain(founder_email: str, website_url: str | None) -> str | None:
    """Returns an error message if verification fails, or None if it passes."""
    if not EMAIL_PATTERN.match(founder_email):
        return "Please enter a valid email address."

    email_domain = extract_domain(founder_email)
    if email_domain in FREE_EMAIL_DOMAINS:
        return (
            "Please use your company work email (e.g. you@yourcompany.com), "
            "not a personal Gmail/Yahoo/Outlook address, to register a company."
        )

    if not website_url:
        return "A company website is required so we can verify your work email against it."

    site_domain = extract_domain(website_url)
    if not site_domain or site_domain != email_domain:
        return (
            f"Your email domain ({email_domain}) doesn't match the company "
            f"website ({site_domain or website_url}). Please register with your "
            "work email at that company's domain."
        )

    return None
