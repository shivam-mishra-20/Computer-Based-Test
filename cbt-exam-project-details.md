# CBT Exam Software - Project Documentation

## 1. Project Overview
The **CBT (Computer-Based Test) Exam Software** is a comprehensive, scalable web-based platform designed to facilitate online education, assessment, and institute management. It streamlines the entire examination process, from curriculum creation and AI-driven question generation to test execution and advanced performance analytics. 

The software operates on a multi-role system, providing dedicated interfaces and functionalities for **Admins**, **Teachers**, and **Students**.

---

## 2. Architecture & Technology Stack

The application follows a modern decoupled architecture, separating the client-side interface (Frontend) from the server-side business logic and database (Backend).

### 2.1 Frontend (Web Client)
- **Framework:** Next.js (React-based, using the App Router for robust routing and rendering).
- **Styling:** Tailwind CSS for a highly responsive, utility-first design approach.
- **Language:** TypeScript for type safety and maintaining a robust codebase.
- **Key Libraries:** 
  - `recharts` for data visualization and analytics charts.
  - `framer-motion` for smooth UI animations.
  - Math processing tools (`katex`, `react-katex`) for rendering complex mathematical equations in exams.
  - Document & PDF processing libraries (`pdf.js`, `html2pdf.js`) for generating and handling test papers.

### 2.2 Backend (API Server)
- **Framework:** Node.js with Express.js.
- **Language:** TypeScript.
- **Database:** MongoDB with Mongoose ODM for flexible schema and scalable data storage.
- **Authentication:** JWT (JSON Web Tokens) combined with bcrypt for secure password hashing and role-based access control.
- **AI & Processing Integration:** 
  - `@google/generative-ai` / `@google-cloud/vertexai` for AI-based question generation and document analysis.
  - `@google-cloud/vision` and `tesseract.js` for robust OCR (Optical Character Recognition) to extract text and diagrams from uploaded question papers.
- **Real-time Engine:** Socket.io (with Redis adapter) for real-time notifications, chat, and status updates.

---

## 3. Role-Based Access Control (RBAC)

The system is built on a strict RBAC model to ensure data security and operational hierarchy:
1. **Admin:** Full control over the platform. Manages users (adding teachers/students), oversees institute settings, monitors global analytics, and handles administrative tasks like leaves and holidays.
2. **Teacher:** Primarily responsible for academic content. Can create courses, manage syllabus, upload study materials, create exams/practice tests, review student doubts, and analyze class performance.
3. **Student:** The end-user of the learning platform. Can access study materials, take exams, view personalized analytics, ask doubts, and track overall progress.

---

## 4. Key Modules & Features

### 4.1 Examination & Assessment Engine
- **Test Creation Workflow:** Teachers can create subjective and objective exams, defining blueprints, marking schemes, and time limits.
- **CBT Interface:** A robust, timed environment for students to attempt exams without distractions. It supports multiple choice questions, math equations, and diagram-based questions.
- **Practice Tests & Mock Exams:** Dynamic generation of practice tests based on difficulty levels and specific topics to help students prepare.
- **Offline Result Processing:** Capability to manage and upload results for tests conducted offline, ensuring a unified leaderboard and performance record.

### 4.2 Intelligent Question Bank & AI Capabilities
A highly sophisticated pipeline for managing and generating academic content:
- **Smart Import & Document Analysis:** The platform can parse uploaded PDFs/documents using Vision APIs and Tesseract OCR to automatically extract text, mathematical formulas, and diagrams.
- **AI Question Generation:** Integration with Google Vertex AI / Generative AI to automatically generate questions and answers from uploaded study material or syllabus topics.
- **Question Repository:** A centralized database where questions are categorized by class, subject, topic, and difficulty level for easy retrieval.

### 4.3 Course & Curriculum Management
- **Structured Hierarchy:** Data is organized meticulously by Class -> Course -> Subject -> Topic.
- **Syllabus & Batch Tracking:** Teachers can manage batch schedules, track syllabus coverage, and mark topics as completed.
- **Study Material Distribution:** A centralized hub to upload PDF notes, lectures, and resources that students can consume directly within the platform.

### 4.4 Student Support & Engagement
- **Doubt Resolution System:** An interactive portal where students can raise academic doubts. Teachers can review, answer, and manage these doubts effectively.
- **Bookmarks & Favorites:** Students can bookmark important questions or specific study materials for quick revision.
- **Announcements & Notifications:** Real-time push notifications and a dedicated announcement board to keep users updated on upcoming exams or institute news.

### 4.5 Administrative & Operations Management
- **Attendance Tracking:** Automated and manual attendance logging for students and staff. Includes background workers (CRON jobs) for attendance calculation.
- **Leave & Holiday Management:** Staff and students can apply for leaves, which admins/teachers can approve or reject based on the academic calendar.
- **Scheduling/Timetable:** A visual calendar/schedule builder for mapping out classes and exams.

### 4.6 Analytics & Reporting
- **Personalized Dashboards:** Every role has a distinct dashboard summarizing their relevant metrics (e.g., pending exams for students, class averages for teachers).
- **Leaderboards:** Competitive ranking boards generated after every major test based on scores and time taken.
- **Student Progress Tracking:** Comprehensive visual reports detailing a student's performance trajectory over time across various subjects.

---

## 5. Security & Scalability Features
- **Rate Limiting & Helmet:** Backend protection against DDoS attacks and standard web vulnerabilities.
- **Containerization & Clustering:** Support for Docker (via `docker-compose.yml`) and Node.js clustering (`server.cluster.ts`) to handle high loads during simultaneous cross-institute exams.
- **Job Queues:** Offloading heavy tasks (like processing large PDF question papers or bulk sending notifications) to asynchronous background workers.

---

## Conclusion
The CBT Exam Software is a complete EdTech ecosystem. It bridges the gap between traditional teaching and modern technology by leveraging AI to reduce manual workload, providing a highly reliable testing engine, and offering unparalleled insights into student performance.
