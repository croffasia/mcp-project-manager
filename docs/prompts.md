# Prompts Reference

AI-powered guidance prompts for task management activities.

## Available Prompts

### `decompose`

Decompose epics and ideas into manageable tasks.

**Arguments:**

- `entityId` (string, required) - Entity ID to decompose (e.g., IDEA-5, EPIC-12)

**Features:**

- Automatically loads entity data from existing ideas/epics
- Uses entity description as primary source for decomposition
- Focuses on meaningful deliverables (2-5 days per task)
- Avoids overly granular micro-tasks
- Encourages thoughtful analysis with "think hard" approach
- Looks for natural boundaries in functionality

**Use Cases:**

- Breaking down large epics or ideas into actionable tasks
- Sprint planning and task estimation
- Creating work breakdown structures

**Example Usage:**

```
/pm:decompose IDEA-5
/pm:decompose EPIC-12
```

### `start-task`

Guide for AI systems to start working on tasks with proper preparation.

**Arguments:**

- `taskId` (string, required) - ID of the task to start working on (e.g., TSK-5)

**Features:**

- Automatically loads task data using get_task tool
- Uses task description as primary source for implementation
- Dependency verification before starting
- Task understanding confirmation
- Progress tracking guidance
- Clear completion criteria
- Simplified workflow with "think hard" approach

**Use Cases:**

- Starting implementation work on tasks from MCP Task Manager
- Ensuring proper dependency checking
- Providing structure for task execution

**Example Usage:**

```
/pm:start-task TSK-5
```

## Best Practices

### Before Using Prompts

**Ensure Adequate Descriptions**: Before decomposing or starting work, make sure
your entities have sufficient detail:

- **Ideas**: Should include clear vision, business value, and high-level scope
- **Epics**: Must have detailed requirements, acceptance criteria, and
  implementation approach
- **Tasks**: Need specific deliverables, acceptance criteria, and Definition of
  Done

**Quality Check**: Review entity descriptions to ensure they contain:

- Clear objectives and scope
- Business context and reasoning
- Technical requirements or constraints
- Success criteria and expected outcomes

### Prompt Usage

- **Decompose**: Use when breaking down existing epics or ideas into tasks
    - ✅ **Good**: Epic has detailed requirements and clear scope
    - ❌ **Poor**: Epic description is vague or lacks implementation details

- **Start Task**: Use when beginning work on a specific task
    - ✅ **Good**: Task has clear deliverables and acceptance criteria
    - ❌ **Poor**: Task description is unclear or missing Definition of Done

### Recommendation

If entity descriptions are insufficient, **update them first** before using
decompose or start-task prompts. Well-described entities lead to better
decomposition and more focused implementation.
