# Project: CampusEats
**Description:** A role-based, multi-canteen food preorder and pickup system for university campuses.
**Note to AI Agents:** The MySQL database is already established via XAMPP. Do not modify the core schema without explicit user permission. Always refer to the business rules below for validation and state changes.

## 1. Tech Stack
*   **Frontend:** React.js
*   **Backend:** Node.js with Express.js
*   **Database:** MySQL (Hosted locally on XAMPP, `root` user, no password, port `3306`)
*   **Real-time:** Socket.io (for kitchen order boards)
*   **Authentication:** JWT (JSON Web Tokens)

## 2. User Roles & Authorizations
*   **Super Admin:** Global access. Can create new `canteens` and assign `local_admin` accounts.
*   **Local Admin:** Canteen-specific. Can manage `menu_items` (CRUD), assign `kitchen_staff`, view sales analytics/peak times, and unblock penalized users.
*   **Kitchen Staff:** Canteen-specific. Can view incoming orders, update order statuses, and toggle `is_available` on menu items when stock runs out.
*   **User (Student/Faculty):** Can browse menus, set daily budgets, place orders, earn/redeem points, and cancel pending orders.

## 3. Order Lifecycle & Status State Machine
Orders must strictly follow this status progression:
1.  `pending`: User places the order. 
2.  `accepted`: Kitchen agrees to the requested pickup time.
3.  `preparing`: Kitchen starts cooking. **(CRITICAL: User can no longer cancel once in this state).**
4.  `ready`: Food is done. Triggers notification to the user.
5.  `picked_up`: User takes food and pays cash. Terminal state.
*   **Exception States:**
    *   `cancelled_by_user`: Only allowed if current status is `pending` or `accepted`.
    *   `failed_by_canteen`: Used if kitchen cannot fulfill the order (e.g., ran out of ingredients). Canteen cannot simply "cancel".
    *   `no_show`: Handled automatically by the system cron job.

## 4. Core Business Logic & Guardrails

### Customer: Mobile user (other roles can use desktop)

### A. The Budget Guardrail
*   Users have a `daily_budget_limit` in their profile.
*   **Constraint:** On checkout, the API must query the total spent by the user for `CURDATE()`. If `(Today's Spent + Cart Total) > daily_budget_limit`, the checkout API must return an error and block the transaction.

### B. Loyalty Points System
*   **Earning:** On `picked_up` status, user earns points: `floor(Order_Total / 100)`.
*   **Redeeming:** At checkout, user can apply points. `1 point = 5 Taka discount`.
*   **Compensation:** If an order becomes `failed_by_canteen`, the system automatically awards `3 points` to the user's account.

### C. Penalty & Blockade System (Cron Job)
*   **Trigger:** A Node.js `node-cron` job must run every 5 minutes.
*   **Logic:** Query orders where `status === 'ready'`. If `CURRENT_TIME > (requested_pickup_time + 30 minutes)`, change status to `no_show`.
*   **Penalty:** Increment the user's `penalty_flags` by 1. 
*   **Blockade:** If `penalty_flags === 3`, set user `is_blocked = true`. Blocked users cannot place new orders and must see a UI prompt to contact the Local Admin.

## 5. Real-Time & Notifications
*   **Socket.io:** When a user checks out, emit an event to the specific `canteen_id` room so the Kitchen Staff dashboard updates instantly without refreshing.
*   **User Notifications:** Send alerts to the frontend when order status changes to `accepted`, `ready`, or `failed_by_canteen`.

## 6. Development Directives for AI
*   Use standard RESTful API principles.
*   Ensure all API routes are protected by role-based middleware (e.g., `verifyToken`, `isKitchenStaff`, `isUser`).
*   Keep SQL queries secure against injection (use parameterized queries via `mysql2`).
*   Fail gracefully: If a transaction fails (e.g., budget exceeded), return clear 400-level HTTP status codes with readable error messages for the frontend.