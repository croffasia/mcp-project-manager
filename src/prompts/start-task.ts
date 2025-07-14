import { BasePrompt } from './base.js'

/**
 * Guide for AI systems on how to properly start working on tasks from MCP Task Manager
 */
export class StartTask extends BasePrompt {
    getName(): string {
        return 'start-task'
    }

    getDescription(): string {
        return 'Guide for AI systems to start working on tasks with dependency checking and clear understanding'
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

First, load the task data using the MCP tool:
- Use get_task tool with taskId="${taskId}"

**IMPORTANT**: Carefully analyze the task description that you loaded - it contains key information about requirements, scope, and implementation details. Use this description as your primary source for implementation.

**Think hard** about what this task requires.

**Before starting:**
1. **Check dependencies** - All dependencies must be completed (status: 'done')
2. **Confirm understanding** - State what you understand this task requires
3. **Update status** - Mark task as in-progress when you start working

**When working:**
- Follow the task description carefully
- Use existing project patterns and conventions
- Add progress notes at key milestones
- Address any Definition of Done requirements

**When completing:**
- Verify all requirements are met
- Test your implementation
- Ask for confirmation before marking as done

Start by loading the task data and confirming your understanding.`
    }
}
