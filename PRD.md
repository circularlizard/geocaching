# Product Requirements Document (PRD): QR Code Geocaching Tracker

# 1\. Introduction

The objective of this application is to support a geocaching game where teams navigate between physical cache locations by scanning QR codes. The app manages clue delivery, team-specific sequences, and scoring based on speed and clue usage.

# 2\. Gameplay and User Flow

1. Game Start and Registration: Each team scans a unique QR code printed on a physical card handed to them at the start. This is a one-time initial event for the first person to scan the code, directing them to a registration page where they must specify a team name and list the team members (minimum 4, maximum 8 per team). Upon successful registration and unique identification, the app initializes their journey and provides the clue for their first location.  
2. Late Registration/Access: Once a team is registered, the Registration Code serves as the unique identifier for their active session. If any team member scans the team's Registration Code again—whether after closing a browser, or if a second team member scans it—the app must bypass the registration form and automatically redirect them to the webpage for their current active clue. The physical Registration Code card is the team's recovery mechanism for re-accessing their progress.  
3. Location Sequence: The sequence for each team should be {start}, sequence of caches, {return to base}. There are approximately 8 locations in total. The sequence of caches is unique for each team to prevent tailing. The number of caches is configured per game and cache sequences are auto-generated randomly by the system during game setup.  
4. Upon scanning a **Cache Location Code**, the user is directed to a webpage where the app records the cache as found (scoring is calculated based on clues used). The user must then confirm that they have replaced the cache box in its original location. Once confirmed, they are shown the first clue for the next location. If stuck, they can request a second clue, and subsequently a third clue which includes a photograph of the location, directly from the active clue page.   
   Additionally, **once the team has requested the third clue**, they have an option to declare they cannot find the cache. If they choose this, they must confirm via an "Are you sure?" prompt, which results in 0 points for that cache and immediate delivery of the clue for the next location in their sequence.  
5. Active Clue Page: This page must display the team name, current score, the name of the cache the team is currently looking for, and the current clue text or image. It must also provide an option to request the next clue (if available) and the option to skip the cache if the third clue has already been requested.  
6. Completion and Return to Base: After the last cache in the sequence is found, a team should see a congratulatory message telling them to return to base. The game must be completed within a specified time limit; points earned after this window will not be counted.  
7. End of Game Handling: Any Cache Location Code scan that occurs after the global Game End Time has expired or after an Admin Recall has been initiated will result in a message informing the team that the game is over.
8. Wrong Cache Handling: When a team member scans a Cache Location Code that is not their current expected cache, the app must display a clear error message and redirect them to their active clue page so they can continue from the correct location.

# 3\. Scoring and Data Requirements

Scoring is based solely on the number of clues a team uses to find each cache:

* 5 points if the cache is found using 1 clue.  
* 3 points if the cache is found using 2 clues.  
* 1 point if the cache is found using 3 clues.  
* 0 points if the team chooses to skip the cache (declare they cannot find it).

If two or more teams finish with the same total points, they are declared joint winners. No tiebreaker logic is required.

The application must record the following data points for each team:

* The exact timestamp when each box is found, recorded at the moment the Cache Location QR code is scanned (not at confirmation).  
* Total points calculated based on clue usage.  
* The exact timestamp when Clue 1, Clue 2, and Clue 3 were requested.  
* Points by Cache.  
* Skipped Status.

# 4\. Administrative Setup Requirements

The admin interface is protected by a password configured via an environment variable. No PII is stored in the application, so a simple shared password is sufficient.

Administrators require a web interface to manage the game setup:

* Define a **Game**: set a game name, global Game End Time, and the number of caches in the sequence. Only one game is active at a time.  
* Associate physical QR codes with specific cache locations within the app.  
* Input text for Clue 1, Clue 2, and Clue 3 (including image uploads for the final clue).  
* Administrative monitoring interface: A real-time dashboard displaying all registered teams, their members, progress through the sequence of clues with associated timestamps, and a global control to terminate the game and recall teams.  
* Reset or re-run capability: Admins can create a new Game at any time (e.g. for test runs). Registration Codes are scoped to a specific Game — if a Registration Code QR card is scanned in the context of a new Game in which it has not yet been used, a fresh registration flow is triggered for that Game.
* Expected scale: approximately 8 teams per game. This is not a hard limit; the system should not impose a maximum number of teams.
* **Registration Token Management:** Admins can create new Registration Tokens at any time. Admins can delete a Registration Token provided it has not been used (i.e. no team has registered with it) in the currently active game.
* **Cache Deletion:** Admins can delete a cache record provided the cache is not currently assigned to the active game. If the cache is assigned to the active game it must first be unassigned before it can be deleted.

## 4.1 QR Code Management

This section details the generation and content of the QR codes:

1. **Generation:** The administrative web interface must include a server-side tool using a dedicated library to generate and export QR codes as high-resolution images (e.g., PNG or SVG) for printing. Team Registration Code QR sheets are generated as part of Game setup and printed at home before the event.  
2. **Content:** All QR codes will encode a unique URL following the format: *\[App Domain\]/scan?id=\[Secure Unique Identifier\]*. The *Secure Unique Identifier* must be a non-sequential, random token to prevent guessing and ensure security.  
3. **Types:** Two types of codes exist: **Registration Codes** (one per team slot, printed on physical cards handed to teams at the start, reusable across games) and **Cache Location Codes** (one per physical cache box, printed and placed inside or on the cache box, fixed across games).  
4. **Cache Location Codes** are generated once and remain permanently associated with their physical cache box. They do not change between games.

# 5\. Technical Constraints and Non-Functional Requirements (NFRs)

## 5.1 Production Stack

* Hosting: Vercel (standard Vercel domain).  
* Frontend: Next.js (App Router). No Edge Runtime — all routes use standard Node.js runtime.  
* Database: Neon (Vercel Postgres). All DB access via `DATABASE_URL` environment variable.  
* Image Storage: Vercel Blob (for Clue 3 photograph uploads). All storage access via an abstracted storage module driven by environment variables.  
* Development: AI coding agents will be used to generate the application.  
* Simplicity: The architecture should be as simple as possible to minimize failure points during the live game.  

## 5.2 Local Development Environment

The application must be fully runnable and testable locally without any Vercel-specific services:

* Local Postgres instance provided via Docker Compose.  
* Local S3-compatible blob storage provided via MinIO in Docker Compose.  
* All environment-specific dependencies injected via `.env.local`.  
* A `docker-compose.yml` must be provided at the project root to bring up the full local backing services with a single command.  
* A database seed script must be provided to populate a known test state for local development and test runs.  

## 5.3 Testing Stack

* **Unit/Integration tests:** Vitest with Gherkin feature files (via `@cucumber/cucumber` or equivalent). Tests run against the local Postgres and MinIO instances.  
* **E2E tests:** Playwright, running against the local Next.js dev server (`next dev`). The same Playwright suite must be runnable against a Vercel preview deployment URL.  
* All tests must be runnable with a single command from the project root.  

## 5.4 General NFRs

* The application must be a mobile-centric web interface, requiring no installation on users' devices.  
* All clue pages and data submissions must load and process within 2 seconds.  
* QR code URLs must be secured to prevent sequential guessing or direct access to future clues.  
* The mobile interface must be responsive and highly legible in bright outdoor lighting conditions.

# 6\. Data Model

The following entities define the core data structure of the application:

* **Games:** ID, Name, Game End Time, Cache Count, Is Active (boolean), Admin Recall Triggered (boolean)  
* **Registration Tokens:** ID, Secure Token (random, non-sequential) — generated once, reused across games  
* **Caches:** ID, Name/Location, Clue 1 Text, Clue 2 Text, Clue 3 Text, Clue 3 Image URL, Cache Location Token (random, non-sequential)  
* **Teams:** ID, Game ID, Registration Token ID, Display Name, Members, Current Cache Index, Registration Timestamp  
* **Team Sequences:** ID, Team ID, Cache ID, Sequence Order  
* **Progress Log:** ID, Team ID, Cache ID, Clue 1 Requested Timestamp, Clue 2 Requested Timestamp, Clue 3 Requested Timestamp, Found Timestamp, Points, Skipped (boolean)

