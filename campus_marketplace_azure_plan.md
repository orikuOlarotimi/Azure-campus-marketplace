# Campus Marketplace
## Notice Board Web Application

*System Architecture & Azure Deployment Plan*

**Microsoft Azure for Students — Free Tier**

---

## 1. Project Overview

Campus Marketplace is a simple web application designed to let university students post and browse listings for second-hand items (such as textbooks and furniture) and lost-and-found notices. Any student can visit the site, fill out a short form, and have their listing appear live on the page immediately — no login required.

The application is intentionally lightweight and built using technologies that fit entirely within the Microsoft Azure for Students free tier, meaning there is no cost to host or run it.

**The app supports two main use cases:**

- Students selling items — textbooks, laptops, desks, chairs, and similar goods
- Lost and found notices — students can report lost items or flag found ones

---

## 2. How the Application Works

The flow of the application is straightforward. A student opens the website in their browser, fills in a short form with details about their listing (title, category, description, and optionally a contact), and clicks Submit. The form data is sent to a serverless backend function, which saves it to a database. The main page then fetches all saved listings from the same backend and displays them as cards on the screen.

**Step-by-Step User Flow**

| Step | Action | What Happens |
| --- | --- | --- |
| 1 | Visit the site | The browser loads the static HTML/CSS/JS files served from Azure Static Web Apps. |
| 2 | View listings | The page makes a GET request to the Azure Function API, which queries Cosmos DB and returns all current listings as JSON. |
| 3 | Fill in the form | The student enters a title, selects a category (For Sale / Lost & Found), adds a description, and optionally adds a contact. |
| 4 | Submit the form | A POST request is sent to the Azure Function API with the form data. |
| 5 | Data is saved | The Azure Function writes the listing to Cosmos DB (NoSQL database). |
| 6 | Page updates | The listing appears live on the page without the student needing to refresh manually. |

---

## 3. System Architecture

The architecture follows a three-tier model: a frontend presentation layer, a serverless application layer, and a managed database layer. All three tiers are hosted on Microsoft Azure.

**Architecture Diagram (Text Representation)**

| Layer | Component | Azure Service |
| --- | --- | --- |
| Presentation (Frontend) | HTML + CSS + JavaScript (static site) | Azure Static Web Apps |
| Application (Backend) | REST API — two endpoints (GET and POST) | Azure Functions (serverless) |
| Data (Database) | NoSQL listings store (JSON documents) | Azure Cosmos DB (free tier) |
| Version Control / CI/CD | Source code repository + auto-deploy | GitHub + Azure SWA integration |

### How the Layers Connect

The user's browser talks only to Azure Static Web Apps (for page files) and Azure Functions (for data). Azure Functions in turn talk to Cosmos DB. The browser never connects to the database directly — the Function acts as the secure middle layer.

```
[ Browser ] ──► [ Azure Static Web Apps ] ──► [ HTML / JS / CSS ]

[ Browser ] ──► [ Azure Functions API ] ──► [ Cosmos DB ]
```

---

## 4. Azure Services Used

### 4.1 Azure Static Web Apps

Azure Static Web Apps is the primary hosting service for the frontend. It serves the HTML, CSS, and JavaScript files that make up the website directly to the user's browser. It is available for free on the Azure for Students plan with no monthly usage limits for static content.

**Why it was chosen:**

- Free on Azure for Students — no credit card or payment needed
- Built-in integration with GitHub: push code to GitHub and it deploys automatically (CI/CD out of the box)
- Provides a live HTTPS URL immediately after setup
- Can route API calls to Azure Functions from the same domain, avoiding CORS issues

### 4.2 Azure Functions (Serverless API)

Azure Functions provides the backend logic for the application. Instead of running a traditional server 24/7, the function only runs when a request comes in and stops when it is done. This makes it extremely cost-effective — the free tier includes 1 million function executions per month, which far exceeds what a campus app would use.

**Two functions are needed:**

- `GET /api/listings` — Reads all listings from Cosmos DB and returns them as JSON
- `POST /api/listings` — Receives form data from the browser and saves a new listing to Cosmos DB

**Runtime:**

Node.js (JavaScript) — consistent with the frontend language, easy to write and understand.

### 4.3 Azure Cosmos DB (NoSQL Database)

Cosmos DB stores all the listings submitted by students. Each listing is saved as a JSON document, which maps naturally to the form data the user fills in. Cosmos DB offers a permanent free tier with 1,000 RU/s throughput and 25 GB of storage — more than enough for a campus notice board.

**Example document stored in Cosmos DB:**

```json
{
  "id": "a1b2c3d4",
  "title": "Chemistry Textbook — 2nd Edition",
  "category": "For Sale",
  "description": "Good condition, a few highlights. ₦2,500 or best offer.",
  "contact": "08012345678",
  "postedAt": "2025-06-17T10:30:00Z"
}
```

### 4.4 GitHub (Source Control & CI/CD)

The application's source code is stored in a GitHub repository. Azure Static Web Apps connects directly to GitHub: whenever code is pushed to the main branch, Azure automatically rebuilds and redeploys the app within minutes. This removes the need to manually upload files or configure a deployment pipeline.

---

## 5. Cost Breakdown

All services used fall within the Azure for Students free tier. There is no cost to run this application as long as it stays within the stated limits, which are generous for a small campus project.

| Azure Service | Free Tier Limit | Expected Usage |
| --- | --- | --- |
| Azure Static Web Apps | Free (no limit) | Very low — static files only |
| Azure Functions | 1 million executions / month | < 10,000 / month for a campus app |
| Azure Cosmos DB | 25 GB storage, 1,000 RU/s | < 1 GB, minimal throughput |
| GitHub | Free for public and private repos | One small repository |
| HTTPS / Custom domain | Included with Static Web Apps | One auto-provisioned domain |

**Total estimated monthly cost: $0.00**

---

## 6. Deployment Steps

The following steps walk through setting up and deploying the application from scratch using the Azure for Students account.

**Step 1 — Set up the Azure for Students account**

- Sign up at azure.microsoft.com/en-us/free/students using a university email address
- This provides $100 credit and access to free-tier services — no credit card required

**Step 2 — Create a Cosmos DB account**

- In the Azure Portal, create a new Cosmos DB account using the Core (SQL) API
- Select the free tier option (one free account per subscription)
- Create a database called `campus-marketplace` and a container called `listings`
- Set the partition key to `/category`

**Step 3 — Write the Azure Functions**

- Create two HTTP-triggered functions in Node.js: one to GET all listings, one to POST a new listing
- Connect each function to Cosmos DB using the connection string from the Azure Portal

**Step 4 — Build the frontend**

- Build a single HTML page with a listing form and a section that displays existing listings as cards
- Use JavaScript `fetch()` calls to communicate with the Azure Function API endpoints
- Push the project to a GitHub repository

**Step 5 — Deploy via Azure Static Web Apps**

- In the Azure Portal, create a new Static Web Apps resource
- Connect it to the GitHub repository created in Step 4
- Azure automatically generates a GitHub Actions workflow that builds and deploys on every push
- The app is live at the auto-generated Azure URL (e.g. `https://calm-beach-1234.azurestaticapps.net`)

---

## 7. Security Considerations

Even though this is a simple application, a few basic measures should be in place.

- HTTPS is enforced by default on Azure Static Web Apps — all traffic is encrypted
- The Cosmos DB connection string is stored as an environment variable in Azure Functions, never in the source code
- Basic input validation is applied in the Azure Function before writing to the database (e.g. rejecting empty or oversized fields)
- No user authentication is required for this version, keeping the setup simple — all listings are public

---

## 8. Potential Future Improvements

If the application were to grow beyond a simple notice board, the following could be added while remaining on Azure:

- **Azure Active Directory B2C** — add student login so users can edit or delete their own listings
- **Azure Blob Storage** — allow image uploads alongside listings (e.g. photos of items for sale)
- **Azure Communication Services** — send an email confirmation to the poster when a listing goes live
- **Azure API Management** — add rate limiting to prevent spam submissions

---

## Summary

| Item | Detail |
| --- | --- |
| Application Name | Campus Marketplace / Notice Board |
| Purpose | Post items for sale and lost-and-found notices |
| Frontend | HTML, CSS, JavaScript (static site) |
| Backend | Azure Functions (Node.js, serverless) |
| Database | Azure Cosmos DB (NoSQL, free tier) |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub + Azure Static Web Apps auto-deploy |
| Total Cost | $0.00 per month (Azure for Students free tier) |
| Deployment Time | Under 30 minutes from scratch |

*Prepared for Academic Presentation • Microsoft Azure for Students*
