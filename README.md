# Employee Hub

MASTER PROMPT — REQUEST, FEEDBACK & EMPLOYEE MANAGEMENT PORTAL



Build a complete, production-ready web application called Request & Feedback Portal.



This is a private organization website where authorized employees can submit requests, submit feedback, read official updates/notifications, track request statuses, and view their own salary deductions.



The application must be fully functional and connected to Firebase.



Do NOT build a static mockup.



Do NOT build a prototype with fake data.



Do NOT use fake/sample users, requests, feedback, deductions, notifications, statistics, messages, or submissions.



Every application record displayed in the UI must come from real Firebase data.



If the database has no records, show an appropriate empty state.



---



1. REQUIRED TECHNOLOGY



Use:



- Lovable

- Firebase Authentication

- Firebase Firestore

- Firebase Storage

- Firebase Cloud Functions where server-side logic, notifications, scheduled tasks, or privileged operations are needed



Authentication must use:



Google Sign-In ONLY



Do NOT create:



- Email/password login

- Password registration

- Password reset

- Username/password accounts

- Alternative login providers



---



2. APPLICATION ROLES



There are exactly four roles:



1. Developer

2. Admin

3. Moderator

4. User



The role must be stored and enforced securely.



Never allow a user to choose their own role.



Never trust a role supplied by the frontend.



Never rely only on hiding navigation buttons.



Firebase security rules and backend authorization must enforce permissions.



---



3. INITIAL DEVELOPER ACCOUNT — CRITICAL



The following exact Google account is the initial Developer:



j.thunder0008@gmail.com



When this authenticated Google account signs in:



- Recognize it as the Developer account.

- Ensure its role is "developer".

- Give it complete access to the application.

- Allow it to access all Developer, Admin, Moderator, and User functionality.

- Allow it to assign Admins.

- Allow it to assign Moderators.

- Allow it to manage salary deductions.

- Allow it to access Moderation.

- Allow it to access all chat rooms.

- Allow it to manage forms.

- Allow it to manage requests.

- Allow it to manage feedback.

- Allow it to manage users.

- Allow it to manage updates/notifications.

- Allow access to system/developer management functionality.

- Allow access to audit logs.



Use the authenticated Firebase user's verified email for the initial Developer identification.



The email comparison may be normalized for case-insensitive matching, but do not trust a client-provided email.



Do NOT allow:



- Frontend role editing

- localStorage role manipulation

- URL role manipulation

- Session storage role manipulation

- A "Become Developer" button

- Any public mechanism for obtaining Developer privileges



No other Google account should automatically become Developer.



The Developer account must not be demotable by Admins, Moderators, or Users.



---



4. LANDING PAGE



Visitors who are not authenticated must see a professional landing page.



Include:



- Website logo/name

- Short description

- "Continue with Google" button

- What the website is for

- How it works

- Privacy Policy link

- Clear explanation that only authorized Google accounts can access the portal



Explain that the portal allows authorized users to:



- Submit Requests

- Submit Feedback

- Read Notifications/Updates

- Track Requests

- View their own Salary Deductions



Do NOT display fake statistics.



Do NOT display fake users.



Do NOT display fake testimonials.



Do NOT display fake activity.



---



5. PRIVACY POLICY



Create a dedicated Privacy Policy page.



Explain that the application may process:



- Google account name

- Google account email

- Google profile photo where available

- Firebase UID

- User role

- Requests

- Feedback

- Form responses

- Attachments

- Notifications

- Notification acknowledgements

- Request statuses

- Salary deduction records

- Timestamps

- Audit/security information



Explain why information is collected and how it is used to operate the portal.



Do not claim legal compliance that has not been verified.



Make the policy easy to read.



---



6. GOOGLE AUTHENTICATION



Authentication flow:



Landing Page

→ Continue with Google

→ Firebase Google Authentication

→ Check authenticated account

→ Load authorized user profile

→ Determine role

→ Redirect to appropriate dashboard



If a Google account authenticates successfully but is not authorized:



Display:



Access Not Authorized



Explain that the account needs to be authorized by an administrator.



Do NOT automatically give new accounts Admin, Moderator, or Developer privileges.



---



7. ROLE PERMISSIONS



DEVELOPER



Developer has complete access.



Developer can:



- Access everything Admin can access

- Access everything Moderator can access

- Access everything User can access

- Manage salary deductions

- Access Moderation

- Assign Admins

- Assign Moderators

- Manage users

- Manage forms

- Manage requests

- Manage feedback

- Manage notifications

- Access all chat rooms

- Access audit logs

- Manage system-level functionality



---



8. ADMIN



Admin can access:



- Request Inquiry Dashboard

- Create Forms

- User Dashboard

- Deduction Management

- Feedback Dashboard

- Moderation

- Chat Rooms

- Update Board

- Logout



Admin can assign Moderators by their Google email address.



Admin cannot assign Developers.



Admin cannot promote themselves to Developer.



Admin cannot modify the protected initial Developer account.



---



9. MODERATOR



Moderator can access:



- Request Inquiry Dashboard

- Create Forms

- User Dashboard

- Feedback Dashboard

- Chat Rooms

- Update Board

- Logout



Moderator CANNOT access:



- Deduction Management

- Moderation

- Role assignment



---



10. USER



User can access ONLY:



- Notifications / Updates

- User Request Dashboard

- Deduction Tab

- Request Forms

- Feedback Forms

- Logout



Users cannot access:



- Admin Dashboard

- Moderator Dashboard

- Developer Dashboard

- Deduction Management

- Moderation

- User Management

- Form Creation

- Chat Rooms

- Other users' requests

- Other users' feedback

- Other users' deductions

- Administrative information



---



11. USER DASHBOARD



Create a clean responsive dashboard.



User navigation:



- Dashboard

- Notifications

- My Requests

- Request Forms

- Feedback Forms

- Deductions

- Logout



Display:



- Google profile picture where available

- Name

- Email

- Role



Only display the authenticated user's own private information.



---



12. NOTIFICATIONS / UPDATES



Users can:



- Read notifications

- Open notification details

- Acknowledge notifications



Notifications can contain:



- Title

- Message

- Created timestamp

- Publish timestamp

- Expiration timestamp

- Repeat schedule

- Acknowledgement requirement



Store acknowledgements per user.



Example:



"notificationAcknowledgements"



Fields:



- notificationId

- userId

- acknowledgedAt



Opening a notification must NOT automatically acknowledge it when explicit acknowledgement is required.



---



13. ADMIN UPDATE BOARD



Admins and Developers can create official updates.



Moderators can also access the Update Board.



Update creation must support:



- Title

- Message

- Publish immediately

- Schedule publication

- Start date/time

- End date/time

- Repeat schedule

- Require acknowledgement

- Draft

- Published

- Expired

- Archived



Scheduled notifications must not become visible before their scheduled publication time.



Repeating notifications must be handled through reliable server-side scheduling.



---



14. USER REQUEST DASHBOARD



Users can see ONLY their own requests.



Filters:



- All

- Pending

- Approved

- Declined



Each request displays:



- Request ID

- Form title

- Submitted date/time

- Status

- Response if available



Users can open a request to see their submitted answers and permitted attachments.



Users cannot modify a submitted request unless an explicit editing system is later implemented.



---



15. REQUEST FORMS



Admins, Moderators, and Developers can create forms.



Users can open published forms and submit responses.



Every submission must automatically contain:



- Unique submission ID

- Firebase UID

- User email

- User display name

- Form ID

- Form title

- Form version

- Answers

- Attachments

- Server-generated submission timestamp

- Status



The user's email must come from Firebase Authentication.



The timestamp must be generated server-side.



Do NOT trust manually entered email addresses or client-provided timestamps.



---



16. FORM BUILDER



Create a dynamic form builder.



Flow:



Create Form

→ Title

→ Add Field

→ Configure Field

→ Add Optional Additional Lines

→ Add Attachment/Link functionality

→ Preview

→ Save Draft / Publish



Supported fields:



- Short Text

- Long Text

- Number

- Dropdown

- Multiple Choice

- Checkbox

- Date

- Time

- File Upload

- Link



Each field supports:



- Label

- Description

- Required/Optional



For Dropdown and Multiple Choice, allow creators to define options.



Creators can:



- Add fields

- Edit fields

- Delete fields

- Reorder fields

- Duplicate fields

- Preview

- Save draft

- Publish

- Archive



Do not destroy historical submissions when a form is edited or archived.



---



17. REQUEST INQUIRY DASHBOARD



Admins, Moderators, and Developers can review requests.



Filters:



- All

- Pending

- Approved

- Declined



Display:



- Request ID

- User name

- User email

- Form

- Submission timestamp

- Status



Opening a request displays:



- All submitted answers

- Attachments

- User information

- Submission date/time

- Status history



Authorized staff can:



- Approve

- Decline

- Add response/notes



Record every status change.



Users must see updated statuses on their own dashboards.



---



18. REQUEST EMAIL AND TIME STAMPS



Every submitted request must automatically receive:



Email Stamp



The authenticated user's Firebase email.



Date/Time Stamp



Server-generated submission date/time.



Example:



Request #REQ-000124



Submitted by:



employee@gmail.com



Submitted:



August 8, 2026 — 3:42 PM



Status:



Pending



Users must not be able to forge these fields.



---



19. FEEDBACK FORMS



Admins, Moderators, and Developers can create feedback forms.



Users can answer and submit feedback forms.



Every feedback submission must contain:



- Firebase UID

- User name

- User email

- Form ID

- Form title

- Form version

- Answers

- Attachments if enabled

- Server timestamp

- Status



---



20. FEEDBACK DASHBOARD



Admins, Moderators, and Developers can access the Feedback Dashboard.



Show actual Firebase feedback.



Statuses:



- New

- Acknowledged



Authorized staff can:



- Open feedback

- Review answers

- Review attachments

- Acknowledge feedback



Record:



- Who acknowledged it

- When it was acknowledged



Users cannot mark their own feedback as acknowledged on behalf of staff.



---



21. USER DASHBOARD / USER MANAGEMENT



Admins, Moderators, and Developers can view actual application users.



Display:



- Name

- Email

- Role

- Online status where reliably available

- Offline status where reliably available

- Account creation information where available



Provide:



- Online Users

- Offline Users

- Overall Users



Do NOT fabricate online/offline status.



Use Firebase presence or a reliable last-active mechanism.



If presence cannot be determined, show an appropriate unavailable state instead of guessing.



---



22. SALARY DEDUCTION MANAGEMENT



ONLY Developer and Admin can access this section.



Moderators MUST NOT access it.



Admins and Developers can:



- View employee deductions

- Add deduction

- Adjust deduction

- Enter deduction amount

- Enter reason

- Select applicable date/week

- Notify the affected employee

- View deduction history



Each deduction stores:



- Deduction ID

- Employee UID

- Employee email

- Amount

- Reason

- Applicable date/week

- Created by UID

- Created by email

- Created timestamp

- Updated timestamp

- Notification status



Every deduction creation or adjustment must create an audit log.



---



23. USER DEDUCTION TAB



Users can view ONLY their own deductions.



Organize deductions by week.



Example:



Week:



August 3 – August 9



Total:



₱500



Records:



₱500 — Late arrival



Display:



- Amount

- Reason

- Date

- Week

- Notification status if appropriate



Users cannot edit or delete deductions.



---



24. DEDUCTION NOTIFICATIONS



When an Admin or Developer creates a deduction, allow them to notify the affected user.



The notification can reference:



- Deduction amount

- Reason

- Applicable week/date



Never expose deduction information to other users.



---



25. MODERATION



ONLY Developer and Admin can access Moderation.



Moderation can show:



- Moderator name

- Moderator email

- Moderator role

- Online/offline status where available

- Account status



Moderators cannot access this page.



Users cannot access this page.



---



26. CHAT ROOMS



Create secure internal chat functionality.



Staff Chat Room



Accessible by:



- Developer

- Admin

- Moderator



Admin / Moderator Room



Accessible by:



- Developer

- Admin

- Moderator



Users have NO chat access.



Chat messages store:



- Room ID

- Sender UID

- Sender name

- Sender email

- Sender role

- Message

- Server timestamp

- Optional attachment



Never trust client-provided sender identity.



Use Firebase Authentication identity.



Secure chat access using Firebase rules.



---



27. ROLE ASSIGNMENT



Developer can assign:



- Admin

- Moderator

- User



using a Google email address.



Admin can assign:



- Moderator

- User



Admin CANNOT assign:



- Developer

- Admin



Moderator cannot assign roles.



User cannot assign roles.



When assigning a role:



1. Search for the authenticated/authorized user by email.

2. Confirm the account exists.

3. Change the user's role securely.

4. Record the role change in the audit log.

5. Do not allow self-promotion.

6. Do not allow anyone to modify the protected Developer account's role.



---



28. AUDIT LOGGING



Create immutable audit logs for important actions.



Record:



- Role assignments

- Role changes

- Request approvals

- Request declines

- Deduction creation

- Deduction modification

- Feedback acknowledgement

- Notification creation

- Notification updates

- Form creation

- Form publication

- Form archival

- Administrative actions



Each audit log should contain:



- Actor UID

- Actor email

- Actor role

- Action

- Target record

- Timestamp

- Relevant metadata



Users cannot modify audit logs.



---



29. FIRESTORE STRUCTURE



Use a scalable Firestore structure.



Recommended collections:



"users"



"forms"



"formSubmissions"



"requests"



"feedback"



"deductions"



"notifications"



"notificationAcknowledgements"



"chatRooms"



"chatMessages"



"auditLogs"



Use subcollections where appropriate.



Do not store unnecessary sensitive information.



---



30. FIREBASE STORAGE



Use Firebase Storage for attachments.



Attachments must be private.



Users can access their own attachments.



Admins/Moderators/Developers can access attachments only when authorized for the corresponding request/feedback.



Do NOT expose sensitive files through public storage URLs.



Validate:



- File type

- File size

- Upload errors



---



31. FIRESTORE SECURITY RULES



Implement real Firebase security rules.



Rules must enforce:



User



Can read/write only appropriate records belonging to themselves.



Moderator



Can access:



- Requests

- Feedback

- Forms

- Users where needed

- Updates

- Authorized chat rooms



Cannot access:



- Deductions

- Moderation



Admin



Can access:



- Requests

- Feedback

- Forms

- Users

- Deductions

- Moderation

- Updates

- Authorized chat rooms



Can assign Moderators.



Developer



Full access.



The Developer role must be protected.



Never trust:



- Frontend role

- localStorage

- sessionStorage

- URL parameters

- Client-provided UID

- Client-provided email

- Client-provided role



---



32. IMPORTANT DATA PRIVACY RULE



A User must NEVER be able to query or read:



- Another user's requests

- Another user's feedback

- Another user's deductions

- Another user's private attachments



unless explicitly authorized by their role.



Do not simply hide records in the UI.



Prevent unauthorized reads at the Firebase security-rule level.



---



33. FORM VERSIONING



When a form changes, historical submissions must remain readable.



Example:



Form v1

→ User submits

→ Admin edits form

→ Form becomes v2



The old v1 submission must still show correctly.



Never break historical request/feedback records when forms are edited.



---



34. REQUEST STATUS HISTORY



Maintain request status history.



Example:



Pending

→ Approved



or:



Pending

→ Declined



Record:



- Previous status

- New status

- Changed by UID

- Changed by email

- Changed at



Users can view appropriate status information about their own requests.



---



35. SEARCH AND FILTERS



Administrative screens should have useful search/filtering.



Requests:



- Search user/email

- Request ID

- Status

- Form

- Date



Feedback:



- Search user/email

- Status

- Form

- Date



Users:



- Name

- Email

- Role

- Online/offline status



Deductions:



- Employee

- Week

- Date



---



36. DASHBOARD STATISTICS



Dashboard counts must always come from Firebase.



Examples:



Pending Requests: 0



New Feedback: 0



Online Users: 0



Never hardcode dashboard statistics.



Never generate fake activity.



---



37. EMPTY STATES



If no records exist, show useful empty states.



Examples:



"No requests have been submitted yet."



"No feedback has been submitted yet."



"No notifications available."



"No deductions recorded."



"No users found."



Do not fill empty dashboards with fake content.



---



38. LOADING AND ERROR STATES



Every Firebase operation should have:



- Loading state

- Success state

- Empty state

- Error state



Examples:



"Loading requests..."



"Request submitted successfully."



"Unable to load requests. Please try again."



"You do not have permission to access this section."



Do not silently fail.



---



39. RESPONSIVE DESIGN



The application must work properly on:



- Android phones

- iPhones

- Tablets

- Desktop

- Large screens



The mobile experience must not be an afterthought.



Users must be able to:



- Sign in

- Submit requests

- Submit feedback

- Read updates

- Acknowledge updates

- View requests

- View deductions

- Upload attachments



from a phone.



---



40. UI DESIGN



Use a modern professional portal design.



Characteristics:



- Clean

- Minimal

- Professional

- Responsive

- Accessible

- Consistent

- Easy to navigate



Use:



- Cards

- Tables

- Status badges

- Dialogs

- Form controls

- Notification cards

- Search bars

- Filters

- Icons

- Responsive navigation



Use clear status labels:



- Pending

- Approved

- Declined

- New

- Acknowledged

- Draft

- Scheduled

- Published

- Expired

- Archived



---



41. ROLE-SPECIFIC NAVIGATION



USER



- Dashboard

- Notifications

- My Requests

- Request Forms

- Feedback Forms

- Deductions

- Logout



MODERATOR



- Dashboard

- Requests

- Create Forms

- Users

- Feedback

- Chat Rooms

- Updates

- Logout



Do NOT display:



- Deductions Management

- Moderation

- Role Assignment



ADMIN



- Dashboard

- Requests

- Create Forms

- Users

- Deductions

- Feedback

- Moderation

- Chat Rooms

- Updates

- Logout



DEVELOPER



Display all applicable features:



- Dashboard

- Requests

- Forms

- Users

- Deductions

- Feedback

- Moderation

- Chat Rooms

- Updates

- Role Assignment

- Audit Logs

- Developer/System Management

- Logout



---



42. LOGOUT



Use Firebase Authentication signOut.



After logout:



- Clear authenticated state

- Return to landing page

- Prevent access to protected pages

- Require Google authentication again



---



43. PROTECTED ROUTES



Protect all application routes.



Examples:



"/dashboard"



"/notifications"



"/requests"



"/forms"



"/feedback"



"/deductions"



"/users"



"/moderation"



"/chat"



"/updates"



"/admin"



"/developer"



Unauthorized users must receive an access-denied page or be redirected appropriately.



Frontend route protection must be backed by Firebase security rules.



---



44. NEW GOOGLE ACCOUNT FLOW



When a new Google account authenticates:



1. Verify Firebase Authentication.

2. Check Firebase UID.

3. Check whether the account has an authorized user document.

4. If authorized, load the assigned role.

5. If not authorized, den

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cm-rfc-web.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/560cde3f-475b-49b2-8df4-9d0f10224ace).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
