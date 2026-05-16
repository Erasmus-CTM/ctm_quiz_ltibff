// ---------------------------------------------------------------------------
// Seed data — edit this to match your test scenario
// ---------------------------------------------------------------------------

export interface User {
    id: number;
    name: string;
    email: string;
    role: "student" | "teacher";
}

export interface Course {
    id: number;
    name: string;
    course_code: string;
    enrollment_term_id: number;
}

export interface Assignment {
    id: number;
    course_id: number;
    name: string;
    points_possible: number;
    submission_types: string[];
    lti_context_id: string;
}

export interface Submission {
    id: number;
    assignment_id: number;
    user_id: number;
    score: number | null;
    grade: string | null;
    submitted_at: string | null;
    workflow_state: "unsubmitted" | "submitted" | "graded";
}

export const users: User[] = [
    { id: 1, name: "Alice Student", email: "alice@example.com", role: "student" },
    { id: 2, name: "Bob Student", email: "bob@example.com", role: "student" },
    { id: 3, name: "Carol Teacher", email: "carol@example.com", role: "teacher" },
];

export const courses: Course[] = [
    { id: 101, name: "Introduction to Biology", course_code: "BIO101", enrollment_term_id: 1 },
    { id: 102, name: "Advanced Mathematics", course_code: "MAT201", enrollment_term_id: 1 },
];

export const assignments: Assignment[] = [
    {
        id: 1001,
        course_id: 101,
        name: "Quiz 1 – Cell Theory",
        points_possible: 100,
        submission_types: ["external_tool"],
        lti_context_id: "ctx-bio101-quiz1",
    },
    {
        id: 1002,
        course_id: 101,
        name: "Quiz 2 – Genetics",
        points_possible: 100,
        submission_types: ["external_tool"],
        lti_context_id: "ctx-bio101-quiz2",
    },
    {
        id: 2001,
        course_id: 102,
        name: "Quiz 1 – Calculus Basics",
        points_possible: 50,
        submission_types: ["external_tool"],
        lti_context_id: "ctx-mat201-quiz1",
    },
];

// Submissions are mutable — posted grades end up here at runtime
export const submissions: Submission[] = [
    {
        id: 9001,
        assignment_id: 1001,
        user_id: 1,
        score: null,
        grade: null,
        submitted_at: null,
        workflow_state: "unsubmitted",
    },
    {
        id: 9002,
        assignment_id: 1001,
        user_id: 2,
        score: null,
        grade: null,
        submitted_at: null,
        workflow_state: "unsubmitted",
    },
];