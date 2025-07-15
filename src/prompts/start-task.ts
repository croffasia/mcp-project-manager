import { BasePrompt } from './base.js'

/**
 * Guide for AI systems on how to properly start working on tasks from MCP Task Manager
 */
export class StartTask extends BasePrompt {
    getName(): string {
        return 'start-task'
    }

    getDescription(): string {
        return 'AI-first guide for starting task work with comprehensive validation, dependency checking, progressive workflow, and recovery patterns'
    }

    getArguments(): Array<{
        name: string
        description: string
        required: boolean
    }> {
        return [
            {
                name: 'taskId',
                description: 'ID of the task to start working on (e.g., TSK-5)',
                required: true,
            },
        ]
    }

    async generatePrompt(args: any): Promise<{
        description: string
        messages: Array<{
            role: 'user' | 'assistant'
            content: {
                type: 'text'
                text: string
            }
        }>
    }> {
        return this.generateTaskStartPrompt(args)
    }

    async generateTaskStartPrompt(args: { taskId: string }): Promise<{
        description: string
        messages: Array<{
            role: 'user' | 'assistant'
            content: {
                type: 'text'
                text: string
            }
        }>
    }> {
        const { taskId } = args

        return {
            description: `Start working on task ${taskId}`,
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: this.buildStartTaskPrompt(taskId),
                    },
                },
            ],
        }
    }

    private buildStartTaskPrompt(taskId: string): string {
        return `You are starting work on task ${taskId} from the MCP Task Manager.

## 🔄 Initial Task Loading & Validation

First, load and validate the task:
- Use get_task tool with taskId="${taskId}"
- **CRITICAL**: If task loading fails, STOP and report the issue immediately

## 📋 Pre-Flight Checks (MANDATORY)

After loading task data, perform these checks in order:

1. **Task Status Validation**
   - Check current status - if already 'in-progress' or 'done', clarify with user
   - If status is 'blocked', identify blockers and report them
   - Only proceed with 'pending' tasks

2. **Dependency Analysis**
   - Load ALL dependencies using get_task for each dependency ID
   - Verify ALL dependencies have status: 'done'
   - If ANY dependency is not 'done': STOP, report incomplete dependencies
   - List dependency chain for user verification

3. **Requirements Understanding**
   - Analyze task description thoroughly
   - Identify all Definition of Done criteria
   - Confirm technical requirements and constraints
   - State your understanding clearly for user confirmation

## 🚀 Task Execution Workflow

**ONLY after all pre-flight checks pass:**

1. **Status Update & Initial Planning**
   - Mark task as 'in-progress' using update_task_status
   - Add progress note: "Starting implementation after dependency validation"
   - Create implementation plan with estimated checkpoints

2. **Implementation Approach**
   - Follow existing codebase patterns (analyze similar implementations)
   - Reference actual files and components in your work
   - Use project's established conventions and standards
   - Implement incrementally with validation checkpoints

3. **Progress Tracking & Validation**
   - **25% Checkpoint**: Basic structure implemented, add progress note
   - **50% Checkpoint**: Core functionality working, validate against requirements
   - **75% Checkpoint**: Implementation complete, testing phase begins
   - **90% Checkpoint**: All tests passing, ready for review
   - Update immediately if you encounter blockers or need clarification
   - Document any architectural decisions or trade-offs

4. **Continuous Validation**
   - Test functionality at each checkpoint
   - Validate against Definition of Done criteria
   - Ensure code quality standards are met
   - Check integration with existing systems

## ✅ Completion Criteria

Before marking task as 'done':

1. **Quality Validation**
   - Verify all Definition of Done criteria are met
   - Test implementation thoroughly
   - Check code follows project standards
   - Validate integration with existing systems

2. **User Confirmation**
   - Present completed work for review
   - Explain implementation decisions
   - Ask for explicit approval before marking as 'done'

## 🚨 Error Handling & Recovery

**If dependencies are incomplete:**
- List specific incomplete dependencies with their current status
- Provide dependency completion timeline if available
- Suggest alternative approaches or workarounds
- Recommend asking user for dependency prioritization
- **Recovery actions**: "Use list_all_tasks to find alternative ready tasks"

**If task is blocked:**
- Identify specific blockers with detailed context
- Suggest immediate actions to resolve blockers
- Provide alternative tasks that can be worked on instead
- **Recovery actions**: "Update task status to 'blocked' with blocker description"
- **Escalation**: "Ask user for help if blocker requires external assistance"

**If requirements are unclear:**
- Request clarification on specific unclear points
- Suggest breaking down complex requirements into smaller tasks
- Recommend creating research tasks for unknown areas
- **Recovery actions**: "Create research task RND-X to clarify requirements"
- **Alternatives**: "Use task_breakdown tool to decompose complex task"

**If implementation fails:**
- Document specific failure points and error messages
- Suggest debugging steps and diagnostic tools
- Provide rollback procedures to previous working state
- **Recovery actions**: "Add progress note with failure details and restart approach"
- **Escalation**: "Mark task as 'blocked' if fundamental blocker identified"

**If testing fails:**
- List specific test failures with context
- Provide debugging guidance for each failure type
- Suggest incremental fix approach
- **Recovery actions**: "Roll back to last working checkpoint and retry"
- **Validation**: "Use project testing patterns to verify fixes"

## 📊 Next Steps Guidance

After each major action, provide:
- What was accomplished
- What comes next in the workflow
- Any decisions that need user input
- Estimated time to completion

Start by loading the task data and performing all pre-flight checks before proceeding.`
    }
}
