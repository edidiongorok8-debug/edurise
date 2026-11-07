# EduRise — School Community Platform

*Every school in the zone. One shared community.*

## 1. What EduRise is

EduRise is a multi-school community platform for secondary schools and universities in a zone. It gives students and teachers free study tools, and gives schools one shared, supervised space to see each other: verified profiles, achievements, published results trends, inter-school competitions, a community wall and school-to-school chat rooms.

It is not a school management system. Student records stay in the school. EduRise publishes a school's public face and a zone-level community layer.

## 2. Who uses it

1. *Students* — no account, no personal data. They study, practise, compete and talk in the zone rooms using only their school and role.
2. *Teachers and school admins* — sign in with the Google account their school invites them with. They manage the school profile, publish metrics and events, and moderate.
3. *School owners* — register their school free, get verified, then invite staff.
4. *The zone* — government or association sees one shared picture of schools, achievements and results trends.

## 3. The entry flow

1. Opening the app lands on the sign-in page, which is the front door. It shows the interactive book scene: the page starts dimmed, the visitor taps the book, the cover opens, warm light spills across the sign-in card, and the three doors appear.
2. The three doors: "I'm a student", "I want to compete", "I want to register my school". Only the fourth option, staff sign-in, needs a Google account.
3. After entering, a daily Bible verse greets the user for five seconds, with a Skip button. It shows once per browser session.
4. Staff who are already signed in skip the front door and go straight to their dashboard.

## 4. Features, module by module

*AI Tutor* — three streams (Science, Commercial, Art) with subject mini-tutors. Answers use plain maths text, never LaTeX symbols, and the tutor never asks for a student's name or personal details.

*Study Tracker* — timetable (manual or file upload), daily class list with reminders, goals, streaks and a focus timer. Everything is stored on the student's own device, so nothing leaves the phone.

*Past Questions and Practice* — WAEC and JAMB style questions with marking and explanations.

*School Finder* — JAMB-score based suggestions of schools that fit a student's result.

*Competitions* — virtual zonal tournaments: schools enter, quizzes run on the platform, live leaderboards and brackets. An anonymous student entry flow lets a student pick a school and compete without an account.

*Community wall* — a public feed where schools and students share achievements, ideas and questions, filtered by topic.

*Zone rooms* — WhatsApp-style chat rooms where students and teachers from different schools talk in real time: the zone, study, exams, sports, careers, ideas. Messages carry only your role and school, never your name.

*School registration and verification* — a school registers free, an admin verifies it, then the school appears on the wall with its profile, events and metrics.

*Staff dashboard* — school profile editing, staff invitations, registration queue review and metric publishing.

## 5. Safety and moderation, by design

1. Students never create accounts and never share personal data. Messages and posts show "Student · School name", nothing more.
2. Links, phone numbers and raw HTML are stripped from every message and post.
3. A banned-word list sends a message to a moderator instead of publishing it.
4. Rate limits: five posts an hour on the wall, twenty-five messages an hour in rooms, per device.
5. Three reports on a message or post removes it automatically.
6. Only school-level data is shared between schools. No individual student results, no staff records.
7. This design is deliberate alignment with the Nigeria Data Protection Act 2023: the safest personal data is the personal data you never collect.

## 6. How it is built

1. Front end: plain HTML, CSS and JavaScript. No framework, so pages load fast on cheap phones and work over weak networks.
2. Back end: FastAPI (Python) providing the JSON API under /api/v1.
3. Database: PostgreSQL through SQLAlchemy models.
4. Hosting: Vercel, with the API served as a serverless function and the site as static files.
5. Authentication: Google OAuth for staff only.
6. Installable: a service worker and manifest make EduRise installable like an app, with an offline shell.

## 7. Main API endpoints

1. POST /api/v1/auth/google — staff sign-in
2. GET /api/v1/auth/me — current staff profile
3. GET /api/v1/community/schools — verified schools
4. GET /api/v1/community/schools/{slug}/metrics — published results metrics
5. GET /api/v1/community/events — upcoming zone events
6. GET, POST /api/v1/community/posts — the community wall
7. GET, POST /api/v1/community/messages — zone room chat
8. GET /api/v1/community/rooms — available chat rooms
9. POST /api/v1/community/posts/{id}/report — report a post
10. GET /api/v1/competitions/tournaments — tournaments and live leaderboards
11. POST /api/v1/competitions/student/session — anonymous student entry
12. POST /api/v1/tutor/chat — AI tutor
13. POST /api/v1/registrations — school registration

## 8. Brand system

1. Navy #1B2A52 for headers, buttons, badges and stats.
2. Orange #F2762E for calls to action and accents.
3. Logo: the circular flower, six petals carrying D-U-R-I-S-E around a central E above an open book.
4. The logo blooms once for two seconds when a page loads, then settles. Anyone with reduced-motion settings gets the still version.
5. The background is alive: drifting letters from EDURISE, a network of dots standing for schools in the zone, and a slow aurora.

## 9. What is not built yet

1. Moderation dashboard: held messages and posts currently have no screen to approve or delete them.
2. School join codes, so only real students of a school can post for it.
3. School-only rooms and private school-to-school messaging.
4. Notifications and unread badges.
5. The Debates module with AI judging.
6. Custom domain edurise.ng and trademark registration.

## 10. Meeting questions and answers

*Q: What exactly is EduRise?*
A: One shared community layer for every school in a zone. Students get free study tools, schools get a verified public profile, and the zone sees everyone in one place.

*Q: Do students need accounts?*
A: No. Students never sign up and never share personal data. They use their school and role only, which keeps the platform clear of the personal-data risk that school apps usually carry.

*Q: How do you stop a student pretending to be from another school?*
A: Today a student selects their school and the platform shows it openly. The next release adds school join codes so membership is verified. Either way, no personal data is ever collected.

*Q: How do you stop bullying or abuse?*
A: Four layers: banned words hold the message for review, links and phone numbers are stripped, each device is rate-limited, and three reports removes a message automatically. A moderation dashboard is the next build.

*Q: Is this legal under Nigerian data protection law?*
A: The design is built around the NDPA 2023 principle of collecting as little as possible. No student accounts, no names, no contact details, and only school-level data is shared between schools. A full privacy page is published in the app.

*Q: How do schools get verified?*
A: A school registers free, the request lands in the zone queue, and an administrator verifies it before it appears publicly.

*Q: Why not just use WhatsApp groups?*
A: WhatsApp groups cannot verify schools, cannot separate role from person, have no moderation, no leaderboards, no archives and no zone-level data. EduRise is the same familiar chat feeling inside a governed space.

*Q: What does it cost?*
A: Registration is free for schools. The current build runs on a free hosting tier, so the priority now is proof with the first zone, not billing.

*Q: How will it make money?*
A: Options are a zone licence for government or associations, sponsored competitions, and premium school profiles. Nothing is charged to students, ever.

*Q: Does it work on cheap phones and weak networks?*
A: Yes. Plain HTML and CSS, no heavy framework, installable as an app, and the study tracker works offline because data stays on the device.

*Q: What happens if a school behaves badly?*
A: The school profile can be unpublished, its posts removed, and its ability to post for the zone restricted. Every action is tied to the school, so accountability is clear.

*Q: How does the government benefit?*
A: A live zone dashboard of schools, participation, competitions and results trends, without asking schools to submit reports by hand.

*Q: Can parents see their child's results?*
A: No. EduRise publishes school-level aggregates only. Individual results are never collected, so there is nothing to expose.

*Q: How is the AI tutor different from ChatGPT?*
A: It is scoped to WAEC and JAMB syllabuses, it teaches in steps, it never asks personal questions, and it answers in plain text that renders on any phone.

*Q: Who owns the platform and the data?*
A: The platform belongs to EduRise. Each school owns its profile content and can unpublish it. Student study data never leaves the student's device.

*Q: What has actually been built and tested?*
A: School registration and verification, staff sign-in, community wall, zone rooms with live chat, competitions with leaderboards, the AI tutor interface, study tracker, past questions, school finder, moderation rules, installable app shell, and the full brand and motion system. Every route and asset was checked and returns healthy.

*Q: What is the next milestone?*
A: Moderation dashboard and school join codes, then a pilot with three to five schools in one zone to measure weekly active students.

*Q: What is the biggest risk?*
A: Adoption by schools and keeping moderation consistent at scale. Both are answered by join codes and the moderation dashboard, which are next in line.

*Q: Why should a school trust you with its profile?*
A: Because nothing private is asked for. The school publishes what it chooses, and it can take it down at any time.
