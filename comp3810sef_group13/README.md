# TodoFlow — Personal To-Do List Manager
---

## 1. Project info

**Project name:** TodoFlow

**What it does:** A server-side web application that lets each registered user manage a private
to-do list. A user can create tasks (title, description, priority, deadline), search and filter the
list by keyword / status / priority, sort it, mark tasks as completed, edit them, delete them, and
view a live statistics dashboard (total, active, completed, overdue, completion rate and the number
of tasks per priority). The same data is also exposed through a set of stateless RESTful APIs so
that other programs can perform CRUD operations over HTTP.

**Topic-related meaning:** A to-do manager is a small but complete "personal productivity" service.
Every feature in the app serves that topic: priority and deadline turn a flat checklist into a plan,
overdue detection and completion statistics give the user feedback, and per-user data isolation makes
the list genuinely personal.

**Technology stack:**

|      Layer     |           Technology           |
|----------------|--------------------------------|
| Web framework  | Express.js 5                   |
| Database / ODM | MongoDB Atlas + Mongoose 8     |
| UI             | EJS templates + responsive CSS |
| Authentication | `cookie-session`               |
| Runtime        | Node.js 18+                    |

---

## 2. Group info

Group No. ： `comp3810sef_group13` 
Group size ： 4 members 
Course ： COMP3810SEF 

| # | Student name | SID |            Work role             |                                      Main files / pages owned                                   |
|---|--------------|-----|----------------------------------|-------------------------------------------------------------------------------------------------|
| 1 | _(name)_ | _(SID)_ | Backend core / integration       | `server.js`, `routes/webRoutes.js`, `controllers/todoWebController.js`                          |
| 2 | _(name)_ | _(SID)_ | Authentication & security        | `controllers/authController.js`, `models/user.js`, `middleware/auth.js`                         |
| 3 | _(name)_ | _(SID)_ | Data model & RESTful API         | `models/todo.js`, `controllers/todoApiController.js`, `routes/apiRoutes.js`, `utils/helpers.js` |
| 4 | _(name)_ | _(SID)_ | UI / UX, documentation & testing | `views/*.ejs`, `public/css/style.css`, `README.md`, CURL test list, demo rehearsal              |

---

## 3. Project file intro

```
comp3810sef_group13/
├── server.js                     # Application entry point
├── package.json                  # Dependencies and npm scripts
├── README.md                     # This document
├── models/
│   ├── user.js                   # User schema + password hashing helpers
│   └── todo.js                   # Todo schema, priority enum, isOverdue virtual
├── controllers/
│   ├── authController.js         # Register / login / logout logic
│   ├── todoWebController.js      # Web-page CRUD (list, create, read, update, delete)
│   └── todoApiController.js      # RESTful CRUD (JSON in, JSON out)
├── routes/
│   ├── webRoutes.js              # URL -> web controller mapping (login-protected)
│   └── apiRoutes.js              # URL -> API controller mapping (no authentication)
├── middleware/
│   └── auth.js                   # isLoggedIn / isGuest guards
├── utils/
│   └── helpers.js                # Regex escaping, form parsing, aggregation pipeline
├── views/
│   ├── partials/header.ejs       # Shared page head + top navigation
│   ├── partials/footer.ejs       # Shared footer
│   ├── partials/todoForm.ejs     # Shared create/edit form
│   ├── login.ejs                 # Login page
│   ├── register.ejs              # Sign-up page
│   ├── list.ejs                  # Dashboard: statistics + filters + task list
│   ├── create.ejs                # Create page
│   ├── edit.ejs                  # Update page
│   ├── details.ejs               # Single-task detail page
│   └── error.ejs                 # 404 / 500 page
└── public/
    └── css/style.css             # All styling 
```

**File-by-file summary**

- **`server.js`** — creates the Express app, sets EJS as the view engine, mounts `public/`,
  registers `express.urlencoded` / `express.json` body parsers, configures `cookie-session`,
  installs a request-logging middleware, mounts the web and API routers, defines the 404 and
  error handlers, connects to MongoDB and starts listening on `PORT` (default `8099`).
- **`package.json`** — project metadata, `start` / `dev` scripts, and four dependencies:
  `express`, `mongoose`, `ejs`, `cookie-session`.
- **`models/`** — Mongoose schemas. `todo.js` contains validation (`required`, `enum`,
  `maxlength`) and two derived fields (`isOverdue`); `user.js` contains the scrypt password
  hashing helpers.
- **`controllers/`** — the "C" of MVC. They read `req`, talk to Mongoose, and decide what to
  render or which JSON/status code to return.
- **`routes/`** — pure routing tables. Keeping routes separate from controllers makes the request
  flow easy to follow and easy to divide among group members.
- **`middleware/auth.js`** — the login guard. `isLoggedIn` protects every CRUD page.
- **`utils/helpers.js`** — shared logic: escaping user input before building a `RegExp`, reading
  and normalising form fields, and the aggregation pipeline used by the statistics panel.
- **`views/`** — EJS templates. `header.ejs` / `footer.ejs` / `todoForm.ejs` are partials reused
  by the other pages.
- **`public/css/style.css`** — the complete design system (layout, cards, badges, forms,
  responsive breakpoints). No external CSS framework or image is needed.

---

## 4. Operation guides

### 4.1 Install and run

**Requirements:** Node.js 18+ and an Internet connection.

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Open **http://localhost:8099** in a browser.

> If the app is deployed to a cloud platform, replace `localhost:8099` with the deployed URL in
> all commands below.



### 4.2 Login / Logout pages

**Demo login information :**

* Username: demo
* Password: demo123


**Sign-in steps**

1. Open `http://localhost:8099/`. Because you are not logged in, the server redirects you to `/login`.
2. Enter `demo` / `demo123` and click **Sign in**.
3. On success you are redirected to the dashboard (`/`). The top-right corner shows the display
   name and a **Logout** button.
4. Click **Logout** at any time; the cookie session is destroyed and you are sent back to `/login`.

**Creating another account (optional)**

1. Open `http://localhost:8099/register`.
2. Username: 3-20 letters, digits or underscore. Display name and password are also required.
3. Submit; you are logged in automatically.

**Authorisation behaviour**

- Every CRUD page (`/`, `/todos/new`, `/todos/:id`, `/todos/:id/edit`) is protected by the
  `isLoggedIn` middleware. Typing the URL directly without logging in still redirects to `/login`.
- After logging in, the app returns you to the page you originally requested.
- All **web-page** queries and updates include `userid = current user`, so one account can never
  see or modify another account's tasks. (The RESTful APIs are public and are not
  tied to the login session, as required by the project specification.)

### 4.3 Use of the CRUD web pages

|        Operation         |                              Where in the UI                                         |     HTTP route behind it      |
|--------------------------|--------------------------------------------------------------------------------------|-------------------------------|
| **Create**               | Top-right **New Task** button, or `/todos/new`                                       | `POST /todos`                 |
| **Read (list + search)** | Dashboard `/`: the filter bar has a keyword box, status, priority and sort selectors | `GET /`                       |
| **Read (single task)**   | Click any task title in the list                                                     | `GET /todos/:id`              |
| **Update**               | **Edit** button on a task card, or the **Edit** button on the detail page            | `POST /todos/:id`             |
| **Delete**               | **Delete** button on a task card or on the detail page (a confirm dialog appears)    | `POST /todos/:id/delete`      |
| **Toggle complete**      | The square checkbox on the left of every task card                                   | `POST /todos/:id/toggle`      |
| **Bulk delete completed**| **Clear completed** button below the list                                            | `POST /todos/clear-completed` |
| **Logout**               | **Logout** button in the top navigation                                              | `GET /logout`                 |


### 4.4 Use of the RESTful CRUD services

Base URL: `http://localhost:8099/api/todos` — **no login is required for these APIs** 
-All responses are JSON.

| # |     Operation    | HTTP method |              URI                |                                          Description                                                 |
|---|------------------|-------------|---------------------------------|------------------------------------------------------------------------------------------------------|
| 1 | Read all         | `GET`       | `/api/todos`                    | Returns every todo; supports optional `?userid=`, `?status=`, `?priority=`, `?q=`                    |
| 2 | Read one         | `GET`       | `/api/todos/:id`                | Returns one todo by its MongoDB `_id`                                                                |
| 3 | Read by status   | `GET`       | `/api/todos/status/:status`     | `status` = `active` or `completed`                                                                   |
| 4 | Read by priority | `GET`       | `/api/todos/priority/:priority` | `priority` = `high`, `medium` or `low`                                                               |
| 5 | Read by keyword  | `GET`       | `/api/todos/search/:keyword`    | Case-insensitive search in title and description                                                     |
| 6 | Statistics       | `GET`       | `/api/todos/stats`              | Total / active / completed / overdue / per-priority counts                                           |
| 7 | **Create**       | `POST`      | `/api/todos`                    | Body: `title` (required), `description`, `priority`, `deadline`, `userid`                            |
| 8 | **Update**       | `PUT`       | `/api/todos/:id`                | Body may contain any subset of `title`, `description`, `priority`, `completed`, `deadline`, `userid` |
| 9 | **Delete**       | `DELETE`    | `/api/todos/:id`                | Removes the todo and returns the deleted document                                                    |


**CURL testing commands** (Ubuntu / macOS terminal, or Windows PowerShell with `curl.exe`):

```bash
# ---------- READ ----------
# 1. Read all todos
curl -X GET http://localhost:8099/api/todos

# 2. Read one todo (replace <ID> with a real _id returned above)
curl -X GET http://localhost:8099/api/todos/<ID>

# 3. Read by status (active | completed)
curl -X GET http://localhost:8099/api/todos/status/completed

# 4. Read by priority (high | medium | low)
curl -X GET http://localhost:8099/api/todos/priority/high

# 5. Read by keyword (replace "project" with a word that exists in your tasks)
curl -X GET http://localhost:8099/api/todos/search/project

# 6. Statistics
curl -X GET http://localhost:8099/api/todos/stats

# ---------- CREATE (POST) ----------
# 7a. JSON body
curl -X POST http://localhost:8099/api/todos \
  -H "Content-Type: application/json" \
  --data '{"title":"Buy milk","description":"2 litres","priority":"high","deadline":"2026-12-01","userid":"demo"}'

# ---------- UPDATE (PUT) ----------
# 8. Change only the fields you send
curl -X PUT http://localhost:8099/api/todos/<ID> \
  -H "Content-Type: application/json" \
  --data '{"completed":true,"priority":"low"}'

curl -X PUT http://localhost:8099/api/todos/<ID> \
  -H "Content-Type: application/json" \
  --data '{"title":"Buy milk and bread","deadline":"2026-12-05"}'

# ---------- DELETE ----------
# 9. Delete a todo
curl -X DELETE http://localhost:8099/api/todos/<ID>
```




**Expected status codes**

|               Situation              |                              Status                                      |
|--------------------------------------|--------------------------------------------------------------------------|
| Successful read / update / delete    | `200 OK`                                                                 |
| Successful create                    | `201 Created`                                                            |
| Missing or invalid field, invalid id | `400 Bad Request`                                                        |
| Todo id does not exist               | `404 Not Found`                                                          |
| Unknown web page                     | `404` (EJS error page) when logged in; guests are redirected to `/login` |
| Unexpected server error              | `500` (JSON for `/api/*`, EJS page otherwise)                            |

---



## 5. Design notes (useful for the demo Q&A)

**Request flow (MVC)**

```
Browser / curl
   -> server.js middleware (static, body parser, cookie-session, logger)
   -> routes/webRoutes.js or routes/apiRoutes.js
   -> controllers/*.js (the Controller)
   -> models/*.js (the Model, via Mongoose)
   -> MongoDB
   -> res.render(EJS) (the View) or res.json()
```

**Why `cookie-session` instead of OAuth?**

The course allows cookie-session, OAuth or any other authentication method. `cookie-session` is
chosen because it is self-contained: no third-party app ID/secret, no external callback URL, and it
works reliably on a local machine or a cloud server during the demo. The session object stores only
`{ username, name }`, never the password.

**Password handling**

Passwords are never stored in plain text. `models/user.js` generates a random 16-byte salt and
derives a 64-byte hash with `crypto.scryptSync`; login uses `crypto.timingSafeEqual` to compare.

**Per-user data isolation**

Every web query and every web update/delete filters on
`{ _id: ..., userid: req.session.user.username }`. Guessing another user's task id therefore still
returns 404 instead of exposing or modifying the data.

**Input safety**

- EJS `<%= %>` HTML-escapes all user content, preventing stored XSS.
- Keyword search escapes regular-expression metacharacters, so a search for `a.b` is treated
  literally instead of as a wildcard pattern.
- Mongoose schema validation (`required`, `maxlength`, `enum`) rejects malformed documents.

**Statistics with aggregation**

The dashboard numbers come from one `Todo.aggregate()` call using `$match`, `$group` and `$cond`
(see `utils/helpers.js`). This avoids five separate `countDocuments()` round trips.


---

