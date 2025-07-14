# Tools Reference

This document describes all available MCP tools for project management.

> For approval workflow details, see
> [approval-workflow.md](approval-workflow.md)

## Project Management

### `init_project`

Initialize a new project with task management structure.

**Parameters:** None

**Natural Language Examples:**

- "Initialize project management"
- "Set up task tracking for this project"
- "Create project structure"
- "pm init"

**JSON Example:**

```json
{
    "tool": "init_project",
    "arguments": {}
}
```

---

## Ideas

### `create_idea`

Create a new high-level feature idea.

**Parameters:**

- `title` (string, required) - Idea title
- `description` (string, required) - Detailed description
- `priority` (string, optional) - Priority level: `low`, `medium`, `high`

**Natural Language Examples:**

- "Create idea 'User Authentication System'"
- "Add new feature idea for payment processing"
- "I want to create an idea called 'Mobile App Support'"
- "Create high priority idea 'Real-time Notifications'"

**JSON Example:**

```json
{
    "tool": "create_idea",
    "arguments": {
        "title": "User Authentication System",
        "description": "Implement JWT-based authentication with refresh tokens",
        "priority": "high"
    }
}
```

### `get_idea`

Retrieve details of a specific idea.

**Parameters:**

- `ideaId` (string, required) - Idea ID (e.g., "IDEA-1")

**Natural Language Examples:**

- "Show me details of idea IDEA-1"
- "Get information about the authentication idea"
- "What's in idea IDEA-2?"
- "Show idea details for IDEA-3"

### `list_all_ideas`

List all ideas in the project.

**Parameters:** None

**Natural Language Examples:**

- "Show all ideas"
- "List all feature ideas"
- "What ideas do we have?"
- "Show me all project ideas"

### `update_idea`

Update an existing idea.

**Parameters:**

- `ideaId` (string, required) - Idea ID
- `title` (string, optional) - New title
- `description` (string, optional) - New description
- `status` (string, optional) - New status
- `priority` (string, optional) - New priority

**Natural Language Examples:**

- "Update idea IDEA-1 status to in-progress"
- "Change idea IDEA-2 priority to high"
- "Update the authentication idea description"

---

## Epics

### `create_epic`

Create a new epic within an idea.

**Parameters:**

- `ideaId` (string, required) - Parent idea ID
- `title` (string, required) - Epic title
- `description` (string, required) - Epic description
- `priority` (string, optional) - Priority level
- `status` (string, optional) - Epic status

**Natural Language Examples:**

- "Create epic 'Authentication API' for idea IDEA-1"
- "Add new epic 'Frontend Integration' to the auth idea"
- "Create high priority epic for user management"
- "Add epic 'Payment Processing' to idea IDEA-2"

**JSON Example:**

```json
{
    "tool": "create_epic",
    "arguments": {
        "ideaId": "IDEA-1",
        "title": "Authentication API",
        "description": "Backend API for user authentication",
        "priority": "high"
    }
}
```

### `get_epic`

Retrieve details of a specific epic.

**Parameters:**

- `epicId` (string, required) - Epic ID (e.g., "EPIC-1")

**Natural Language Examples:**

- "Show me details of epic EPIC-1"
- "Get information about the authentication epic"
- "What's in epic EPIC-2?"

### `list_all_epics`

List all epics in the project.

**Parameters:** None

**Natural Language Examples:**

- "Show all epics"
- "List all project epics"
- "What epics do we have?"

### `update_epic`

Update an existing epic.

**Parameters:**

- `epicId` (string, required) - Epic ID
- `title` (string, optional) - New title
- `description` (string, optional) - New description
- `status` (string, optional) - New status
- `priority` (string, optional) - New priority

**Natural Language Examples:**

- "Update epic EPIC-1 status to in-progress"
- "Change epic EPIC-2 priority to high"
- "Update the authentication epic description"

---

## Tasks

### `create_task`

Create a new task within an epic.

**Parameters:**

- `epicId` (string, required) - Parent epic ID
- `title` (string, required) - Task title
- `description` (string, required) - Task description
- `type` (string, required) - Task type: `task`, `bug`, `rnd`
- `priority` (string, required) - Priority: `low`, `medium`, `high`
- `dependencies` (array, optional) - Array of task IDs this task depends on

**Natural Language Examples:**

- "Create task 'Setup database' with high priority"
- "Add new bug task for login issue in epic EPIC-1"
- "Create research task 'Evaluate payment providers'"
- "Add task 'Implement JWT middleware' to authentication epic"

**JSON Example:**

```json
{
    "tool": "create_task",
    "arguments": {
        "epicId": "EPIC-1",
        "title": "Create JWT middleware",
        "description": "Implement JWT token validation middleware",
        "type": "task",
        "priority": "high",
        "dependencies": ["TSK-1"]
    }
}
```

### `get_task`

Retrieve details of a specific task.

**Parameters:**

- `taskId` (string, required) - Task ID (e.g., "TSK-1")

**Natural Language Examples:**

- "Show me details of task TSK-1"
- "Get information about the JWT task"
- "What's in task TSK-5?"

### `list_all_tasks`

List all tasks in the project.

**Parameters:** None

**Natural Language Examples:**

- "Show all tasks"
- "List all project tasks"
- "What tasks do we have?"
- "Display all tasks"

### `update_task`

Update task status and add progress notes.

**Parameters:**

- `taskId` (string, required) - Task ID
- `status` (string, optional) - New status
- `progressNote` (string, optional) - Progress note content
- `progressType` (string, optional) - Type: `update`, `comment`, `blocker`,
  `completion`
- `priority` (string, optional) - New priority
- `title` (string, optional) - New title
- `description` (string, optional) - New description
- `dependencies` (array, optional) - Array of task IDs this task depends on

**Natural Language Examples:**

- "Update task TSK-1 status to in-progress"
- "Mark task TSK-5 as done"
- "Add progress note to task TSK-3: completed API design"
- "Update task TSK-1 dependencies to TSK-2 and BUG-1"

**JSON Example:**

```json
{
    "tool": "update_task",
    "arguments": {
        "taskId": "TSK-1",
        "status": "in-progress",
        "progressNote": "Started implementing JWT validation logic",
        "progressType": "update"
    }
}
```

### `next_task`

Get the next optimal task to work on.

**Parameters:**

- `priority` (string, optional) - Filter by priority

**Natural Language Examples:**

- "Give me the next task to work on"
- "What should I do next?"
- "Get next high priority task"
- "What's the next available task?"

---

## Analysis

### `get_dependencies`

Get dependency information for a task.

**Parameters:**

- `taskId` (string, required) - Task ID

**Natural Language Examples:**

- "Show dependencies of task TSK-1"
- "What does task TSK-3 depend on?"
- "Get dependencies for the authentication task"
- "Show me what TSK-5 is waiting for"

### `delete_entity`

Delete an existing entity (idea, epic, or task).

**Parameters:**

- `entityId` (string, required) - Entity ID to delete

**Natural Language Examples:**

- "Delete task TSK-8"
- "Remove epic EPIC-3"
- "Delete the outdated idea IDEA-2"
- "Remove task TSK-15 from the project"

**JSON Example:**

```json
{
    "tool": "delete_entity",
    "arguments": {
        "entityId": "TSK-8"
    }
}
```
