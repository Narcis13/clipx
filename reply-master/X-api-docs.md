Here are all the official documentation URLs for the X API (formerly Twitter API) as of now. These cover everything you need to leverage X's full functionality from code: reading/writing posts, users, spaces, lists, DMs, trends, streaming, webhooks, authentication, rate limits, data models, and more.
1. Complete Documentation Index (Recommended Starting Point)
X provides a single file that lists every documentation page on the platform. This is the easiest way to discover all URLs without missing anything.

Full index of every doc page: https://docs.x.com/llms.txt
(The site itself recommends fetching this file first to explore the complete structure.)

2. Main X Developer Platform & X API Hub

X Developer Platform Overview (entry point for everything): https://docs.x.com/overview
X API Introduction: https://docs.x.com/x-api/introduction
X API Overview (high-level capabilities): https://docs.x.com/x-api/overview
Important Resources (links to API Reference, Data Dictionary, Authentication, OpenAPI spec, etc.): https://docs.x.com/important-resources

3. Core X API Reference & Fundamentals
All endpoint documentation lives under the /x-api/ section (posts, users, spaces, lists, DMs, trends, streaming, webhooks, etc.). The llms.txt index above gives you the full sub-list, but key foundations include:

Data Dictionary (object schemas for posts, users, media, etc.): https://docs.x.com/x-api/fundamentals/data-dictionary
Authentication Guide: https://docs.x.com/resources/fundamentals/authentication/overview
Changelog (latest updates): https://docs.x.com/changelog
Developer Guidelines & Policies: https://docs.x.com/developer-guidelines
Rate limits, pagination, versioning, etc. (covered in the per-section fundamentals)

4. Machine-Readable Specs (Best for Code)

Official OpenAPI Specification (JSON file with every endpoint, parameters, and schema — perfect for code generation, Postman, or SDKs): https://api.x.com/2/openapi.json

5. Tools, SDKs & Quickstarts for Coding

Tools & Libraries overview: https://docs.x.com/tools-and-libraries
Official Python SDK (XDK): https://docs.x.com/xdks/python/overview (or the older tools/python-xdk reference)
Official TypeScript SDK (XDK): https://docs.x.com/xdks/typescript/overview
API Playground: https://docs.x.com/tools/playground
Postman Collection (ready-to-use requests for all v2 endpoints): https://www.postman.com/xapidevelopers/x-api-public-workspace/collection/34902927-2efc5689-99c6-4ab6-8091-996f35c2fd80
Make Your First Request (quickstart): https://docs.x.com/make-your-first-request

6. Developer Portal & Console (for API Keys & Apps)

Developer Console (create apps, manage keys, billing, pay-per-use): https://console.x.com
Main Developer Portal: https://developer.x.com/

7. Other Important Sections

Tutorials & Use Cases: https://docs.x.com/tutorials (plus use-case pages like build-for-business, do-research, etc.)
X Ads API (if you also need advertising endpoints): https://docs.x.com/x-ads-api
Enterprise API (advanced features like Account Activity, full-archive, etc.): covered in the llms.txt under /enterprise-api/
Streaming / Powerstream / Webhooks: all under /x-api/ (listed exhaustively in llms.txt)
Status Page: https://docs.x.com/status
Support & Community: https://docs.x.com/support and https://devcommunity.x.com

Pro tip for developers:
Start with the llms.txt index → download the OpenAPI JSON → use the official SDKs (Python or TypeScript) or generate your own client from the OpenAPI spec. Everything is now under the new docs.x.com site (migrated from the old developer.twitter.com).
All of this is current as of May 2026 and uses the modern pay-per-use X API v2 (the primary way to access all X functionality programmatically). Let me know if you need help with a specific endpoint, authentication flow, or code example!