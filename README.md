# Campus Resource Management - Backend

This is the backend server for the Campus Resource Management system, designed to handle hall bookings, faculty information, and user authentication for a university environment.

## 📖 Overview

The Campus Resource Management Backend is a robust API services layer built to streamline the administrative tasks of a university campus. Its primary goal is to digitize and manage the lifecycle of hall reservations, student/faculty records, and administrative access control.

By providing a centralized database and business logic, it ensures:
-   **Elimination of Overlapping Bookings**: Automated conflict detection for campus halls.
-   **Structured Approval Workflows**: A clear hierarchy where coordinators request and admins validate resources.
-   **Secure Data Management**: Protected access to sensitive campus data through session-based authentication.
-   **Transparency**: Real-time updates for all stakeholders on booking statuses and facility availability.

## 👥 Authors

| :--- |
| Aravind R K |
| Kanishka D |
| Sandheep G S |
| Radha Krishna |
| Sujith Kumar A |

## 🚀 Features

-   **User Authentication**: Secure login/logout and session management using `express-session`.
-   **Role-Based Access Control (RBAC)**: Distinct permissions for Admins and Coordinators.
-   **Booking Management**: Comprehensive workflow for creating, viewing, and approving/rejecting hall bookings.
-   **Availability Checks**: Real-time checking of hall availability for specific time slots.
-   **Faculty Directory**: Management of faculty details and departments.
-   **Automated Notifications**: Email confirmations using `nodemailer`.
-   **Admin Dashboard Stats**: Real-time statistics for administrative oversight.

## 🛠️ Tech Stack

-   **Core**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
-   **Security**: [Bcrypt](https://www.npmjs.com/package/bcrypt) for password hashing
-   **Session**: [express-session](https://www.npmjs.com/package/express-session) & [connect-mongo](https://www.npmjs.com/package/connect-mongo)
-   **Notifications**: [Nodemailer](https://nodemailer.com/)
-   **Development**: [Nodemon](https://nodemon.io/)

## 📋 Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher)
-   [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas)

## ⚙️ Setup & Installation

1.  **Clone the repository and navigate to the backend folder:**
    ```bash
    cd Backend/Backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory (use `.env.example` as a template):
    ```env
    MONGO_URI=mongodb://127.0.0.1:27017/campus-hall-booking
    PORT=8000
    ```

4.  **Seed Data (Optional):**
    Populate the database with initial hall data:
    ```bash
    npm run seed:halls
    ```

5.  **Create First Admin (Optional):**
    ```bash
    npm run create-admin
    ```

6.  **Run the Server:**
    ```bash
    # For development (with hot reload)
    npm run dev

    # For production
    npm run start
    ```

## 🔌 API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :-- | :-- | :-- | :-- |
| POST | `/login` | User login | Public |
| POST | `/admin/request` | Request admin access | Public |
| POST | `/register` | Register new user | Admin |
| POST | `/logout` | User logout | Auth |
| GET | `/me` | Get current user details | Auth |
| GET | `/coordinators` | List all coordinators | Admin |
| GET | `/admin/pending` | List pending admin requests | Admin |

### Bookings (`/api/bookings`)
| Method | Endpoint | Description | Access |
| :-- | :-- | :-- | :-- |
| POST | `/` | Create a new booking | Coordinator |
| GET | `/my` | Get own bookings | Coordinator |
| GET | `/availability` | Check hall availability | Coordinator |
| GET | `/pending` | List pending bookings | Admin |
| GET | `/` | List all bookings | Admin |
| PATCH | `/:id/approve` | Approve a booking | Admin |
| PATCH | `/:id/reject` | Reject a booking | Admin |

### Other Endpoints
-   **Halls**: `GET /api/halls` - Get all halls (Admin/Coordinator)
-   **Faculty**: `GET /api/faculty` - Get faculty list (Admin/Coordinator)
-   **Faculty**: `POST /api/faculty` - Create faculty entry (Admin)
-   **Stats**: `GET /api/admin/stats` - System statistics (Admin)

## 📂 Project Structure

```text
src/
├── controllers/    # Request handlers & business logic
├── middlewares/    # Custom Express middlewares (Auth, RBAC)
├── models/         # Mongoose schemas & database models
├── routes/         # Express API route definitions
├── scripts/        # Database seeding & utility scripts
└── server.js       # Application entry point
```

## 🗄️ Database Schema

### User
- `username` (Unique string)
- `password` (Hashed)
- `role` (enum: coordinator, admin, student, faculty)
- `status` (enum: active, disabled)

### Booking
- `coordinator` (Ref: User)
- `hall` (String/Ref)
- `startTime` & `endTime` (Dates)
- `status` (enum: pending, approved, rejected)
- `eventTitle` & `eventDescription`

### Hall
- `code`, `block`, `floor`, `roomNumber`, `capacity`

## 📄 License

This project is licensed under the ISC License.

