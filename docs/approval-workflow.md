# Approval Workflow

This document describes the approval workflow system implemented in MCP Task
Manager to ensure user control over all creation and modification operations.

## Overview

The approval workflow is a security feature that prevents AI from making
unauthorized changes to your project structure. It requires explicit user
confirmation before any creation, modification, or deletion operations.

## How It Works

### 1. Request Analysis

When you make a request involving creation/modification:

```
User: "Create tasks for user authentication based on this PRD"
```

### 2. AI Proposal

AI analyzes the request and provides a detailed proposal:

```
📋 Analysis: You want to create authentication tasks based on the PRD.

🎯 Proposal: I will create these 4 tasks:
- Task 1: JWT authentication middleware (3 days, high priority)
- Task 2: User registration API (2 days, medium priority)
- Task 3: Login form component (2 days, medium priority)
- Task 4: Password reset flow (1 day, low priority)

✅ Approval Required: Do you approve creating these 4 tasks?
Please respond with "Yes, create these tasks" to proceed.
```

### 3. User Approval

You must provide explicit approval using approved phrases:

**Accepted Phrases:**

- "Yes, create these tasks"
- "Yes, create this epic"
- "Yes, create this idea"
- "Approved, proceed"
- "Go ahead and implement"
- "Yes, do it"
- "Confirmed, proceed"
- "Create these now"

### 4. Implementation

Only after receiving approved phrase, AI calls tools with approval parameter:

```javascript
create_task({
    epicId: 'EPIC-33',
    title: 'JWT authentication middleware',
    description: '...',
    type: 'task',
    priority: 'high',
    _approval_confirmed: true, // ← Required parameter
})
```

## Operations

### Requires Approval

- `create_task` - Creating new tasks
- `create_epic` - Creating new epics
- `create_idea` - Creating new ideas
- `update_task` - Updating task properties _(except status change to
  'in-progress')_
- `update_epic` - Updating epic properties _(except status change to
  'in-progress')_
- `update_idea` - Updating idea properties _(except status change to
  'in-progress')_
- `delete_entity` - Deleting any entities

### No Approval Needed

- `list_all_tasks` - Reading task lists
- `list_all_epics` - Reading epic lists
- `list_all_ideas` - Reading idea lists
- `get_task` - Reading task details
- `get_epic` - Reading epic details
- `get_idea` - Reading idea details
- `next_task` - Getting next recommended task
- `get_dependencies` - Reading dependency information

**Special Exception:** No approval is required when changing status to
`in-progress` - this allows AI to seamlessly begin work on tasks.

## Examples

### Creating Multiple Tasks

```
User: "Break down the user profile epic into tasks"

AI: 📋 Analysis: Breaking down EPIC-15 "User Profile Management"

    🎯 Proposal: I will create these 5 tasks:
    - TSK-45: Profile editing form (2 days, high)
    - TSK-46: Avatar upload component (1 day, medium)
    - TSK-47: Profile privacy settings (2 days, medium)
    - TSK-48: Profile data validation (1 day, high)
    - TSK-49: Profile update API (2 days, high)

    ✅ Approval Required: Do you approve creating these 5 tasks?

User: "Yes, create these tasks"

AI: ✅ Creating 5 tasks for EPIC-15...
    [Calls create_task 5 times with _approval_confirmed: true]
```

### Starting Work (No Approval)

```
User: "Start working on task TSK-15"

AI: 🎯 Starting work on TSK-15 "User authentication middleware"

    ✅ No approval needed - setting status to 'in-progress'
    [Calls update_task with status: 'in-progress' - no approval required]

    📋 Task is now active. I'll follow the task execution protocol:
    1. Verify dependencies are complete
    2. Confirm task requirements
    3. Begin implementation with progress tracking
```
