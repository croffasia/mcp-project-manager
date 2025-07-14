# MCP Task Manager - User Guide

Complete guide to using the MCP Task Manager for project management with AI
assistance.

## 📋 Core Concepts

### What is MCP Task Manager?

MCP Task Manager is a hierarchical project management system that works with AI
assistants (like Claude) to help you organize, track, and execute work through
structured tasks.

### Hierarchy Structure

```
💡 Ideas (IDEA-1, IDEA-2...)
├── 🎯 Epics (EPIC-1, EPIC-2...)
│   ├── ✅ Tasks (TSK-1, TSK-2...)
│   ├── 🐛 Bugs (BUG-1, BUG-2...)
│   └── 🔬 Research (RND-1, RND-2...)
```

### Entity Definitions

**💡 Ideas** - High-level features or concepts

- Example: "User Authentication System", "Mobile App Support"
- Duration: Weeks to months
- Contains: Multiple epics

**🎯 Epics** - Major implementation phases within an idea

- Example: "Login API", "Password Reset Flow"
- Duration: 1-4 weeks
- Contains: Multiple tasks

**✅ Tasks** - Specific development work

- Example: "Create JWT middleware", "Add login form validation"
- Duration: 2-5 days
- Contains: Actual implementation work

**🐛 Bugs** - Bug fixes and issues

- Example: "Fix login redirect bug", "Memory leak in user service"
- Duration: 1-3 days
- Contains: Problem investigation and fix

**🔬 Research** - Research and spikes

- Example: "Evaluate authentication libraries", "Performance testing"
- Duration: 1-5 days
- Contains: Investigation and documentation

## 🚀 Getting Started

### 1. Initialize Project

```
"Initialize project management"
```

This creates the `.product-task/` directory structure in your project.

### 2. Create Your First Idea

```
"Create idea 'User Authentication System'"
```

Add a detailed description with:

- Clear vision and business value
- High-level scope and requirements
- Success criteria

### 3. Break Down into Epics

```
"Create epic 'Login API' for idea IDEA-1"
```

Each epic should have:

- Detailed requirements
- Acceptance criteria
- Implementation approach

### 4. Decompose into Tasks

```
/pm:decompose EPIC-1
```

This uses AI to break down the epic into manageable tasks based on the epic's
description.

## 🔄 Status System

All entities use the same status system:

| Status           | Description               | When to Use           |
| ---------------- | ------------------------- | --------------------- |
| ⏳ `pending`     | Not started yet           | Default for new items |
| 🔄 `in-progress` | Currently being worked on | Active development    |
| ✅ `done`        | Completed successfully    | Finished work         |
| 🔒 `blocked`     | Blocked by dependencies   | Cannot proceed        |
| 📅 `deferred`    | Postponed to later        | Delayed work          |

### Status Workflows

**Normal flow:** `pending` → `in-progress` → `done`

**With blocking:** `pending` → `in-progress` → `blocked` → `in-progress` →
`done`

## 🎯 Common Workflows

### Starting Work on a Task

```
"Give me the next high priority task"
/pm:start-task TSK-5
```

The AI will:

1. Load task details and dependencies
2. Confirm understanding of requirements
3. Check that dependencies are completed
4. Guide you through implementation

### Tracking Progress

```
"Update task TSK-1 status to in-progress"
"Add progress note to task TSK-1: completed API design"
```

Always add progress notes when updating status to maintain context.

### Managing Dependencies

```
"Show dependencies of task TSK-3"
"Update task TSK-1 dependencies to TSK-2 and BUG-1"
```

Tasks with incomplete dependencies are automatically blocked.

### Getting Project Overview

```
"Show all tasks"
"List all ideas"
"Get task TSK-5 details"
```

## 🛠️ AI-Powered Features

### Decomposition Assistant

```
/pm:decompose EPIC-12
```

AI analyzes the epic description and creates well-sized tasks (2-5 days each)
with:

- Clear deliverables
- Realistic estimates
- Proper dependencies
- Acceptance criteria

**💡 Pro Tip:** The quality of generated tasks depends directly on your epic
descriptions. Detailed epics with requirements, acceptance criteria, and
technical approach will result in much better task breakdowns.

### Task Execution Guide

```
/pm:start-task TSK-5
```

AI helps you start tasks by:

- Confirming understanding
- Checking dependencies
- Providing implementation guidance
- Ensuring quality standards

**💡 Pro Tip:** Tasks with clear descriptions, acceptance criteria, and
Definition of Done will get much better AI guidance and implementation support.

## 📊 Real-World Example

### E-commerce Authentication System

```
# 1. Create the main idea
"Create idea 'E-commerce User Authentication'"

# 2. Add epics for different areas
"Create epic 'User Registration' for idea IDEA-1"
"Create epic 'Login System' for idea IDEA-1"
"Create epic 'Password Management' for idea IDEA-1"

# 3. Decompose epics into tasks
/pm:decompose EPIC-1  # Registration epic
/pm:decompose EPIC-2  # Login epic
/pm:decompose EPIC-3  # Password epic

# 4. Start working on tasks
"Give me the next high priority task"
/pm:start-task TSK-1

# 5. Track progress
"Update task TSK-1 status to in-progress"
"Add progress note to task TSK-1: completed user model design"
"Update task TSK-1 status to done"
```

## 💡 Best Practices

### Before Creating Tasks

**Write detailed descriptions** for ideas and epics:

- Ideas: Include vision, business value, high-level scope
- Epics: Include requirements, acceptance criteria, approach
- Tasks: Include deliverables, acceptance criteria, Definition of Done

**📝 Quality Descriptions Help AI Create Better Tasks**

The AI uses your descriptions as the primary source for task creation. The more
detailed your descriptions, the better quality tasks you'll get:

**✅ Good Epic Description:**

```
Epic: "User Registration API"

Create a robust user registration system with email verification.

Requirements:
- RESTful API endpoints for user registration
- Email validation and uniqueness checking
- Password hashing with bcrypt
- Email verification workflow
- Rate limiting for registration attempts
- Input validation and error handling

Acceptance Criteria:
- Users can register with email/password
- Email verification required before login
- Duplicate emails are rejected
- Passwords meet security requirements
- API returns proper HTTP status codes
- Rate limiting prevents spam registrations

Technical Approach:
- Use Express.js for API routes
- SQLite for user storage
- Nodemailer for email sending
- JWT for verification tokens
```

**❌ Poor Epic Description:**

```
Epic: "User Registration"
Make users able to register
```

**Impact on AI Task Creation:**

- **Detailed descriptions** → AI creates specific, actionable tasks with clear
  deliverables
- **Vague descriptions** → AI creates generic, unclear tasks that need
  refinement

### During Development

**Update status frequently:**

- Mark tasks `in-progress` when starting
- Add progress notes at key milestones
- Use `blocked` status when stuck
- Mark `done` only when fully complete

### Task Sizing

**Keep tasks manageable:**

- 2-5 days of work per task
- Focus on meaningful deliverables
- Avoid micro-tasks or overly granular work
- One person should be able to complete a task

### Dependencies

**Manage dependencies carefully:**

- Tasks can't start until dependencies are `done`
- Use dependencies to sequence work logically
- Don't create unnecessary dependencies
- Update dependent tasks when priorities change

## 🔗 Additional Resources

- **[Tools Reference](tools.md)** - Complete list of all available MCP tools
- **[Prompts Reference](prompts.md)** - AI-powered guidance prompts
- **[Approval Workflow](approval-workflow.md)** - User control system for AI
  actions

## 🎯 Quick Commands Reference

```
# Project setup
"Initialize project management"

# Creating work items
"Create idea 'Feature Name'"
"Create epic 'Epic Name' for idea IDEA-1"
"Create task 'Task Name' for epic EPIC-1"

# AI assistance
/pm:decompose EPIC-1
/pm:start-task TSK-1

# Working with documentation
"Create detailed idea description based on @docs/requirements.md"
"Update idea IDEA-1 description using @specs/authentication.md"
"Help me write a detailed idea description for user authentication system"
"Analyze @docs/project-spec.pdf and create idea description"
"Create epic EPIC-1 description based on @docs/api-requirements.md"

# Status updates
"Update task TSK-1 status to in-progress"
"Mark task TSK-1 as done"

# Getting information
"Show all tasks"
"Get next high priority task"
"Show dependencies of task TSK-1"

# Progress tracking
"Add progress note to task TSK-1: completed implementation"
```

---

_This system works best when you provide detailed descriptions and maintain
regular status updates. The AI assistant uses these details to provide better
guidance and task breakdowns._
