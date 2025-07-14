import { z } from 'zod'

import { Priority, Task, TaskStatus, TaskType } from '../types.js'
import { BaseTool, ToolResult } from './base.js'

const createTaskSchema = z.object({
    epicId: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(['task', 'bug', 'rnd']),
    priority: z.enum(['low', 'medium', 'high']),
    dependencies: z.array(z.string()).optional(),
})

/**
 * Tool for creating individual work items (tasks) within epics that can be assigned and tracked
 */
export class CreateTaskTool extends BaseTool {
    /**
     * Creates a new instance of CreateTaskTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'create_task'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Create a new task within a specific epic - tasks are individual work items that can be assigned and tracked'
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                epicId: {
                    type: 'string',
                    description: 'ID of the parent epic',
                },
                title: { type: 'string', description: 'Title of the task' },
                description: {
                    type: 'string',
                    description: 'Description of the task',
                },
                type: {
                    type: 'string',
                    enum: ['task', 'bug', 'rnd'],
                    description: 'Type of the task',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority of the task',
                },
                dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Optional array of task IDs that this task depends on (e.g., ["TSK-1", "BUG-2"]). Dependencies must exist before creating this task.',
                },
            },
            required: ['epicId', 'title', 'description', 'type', 'priority'],
        }
    }

    /**
     * Executes the task creation process
     * @param args - The tool arguments containing epicId, title, description, type, priority, and optional dependencies
     * @returns The creation result with task details and next steps
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(createTaskSchema, args)
        const storage = await this.getStorage()

        const epic = await storage.loadEpic(validatedArgs.epicId)
        if (!epic) {
            throw new Error(`Epic with ID ${validatedArgs.epicId} not found`)
        }

        if (validatedArgs.dependencies) {
            for (const depId of validatedArgs.dependencies) {
                const depTask = await storage.loadTask(depId)
                if (!depTask) {
                    throw new Error(
                        `Dependency task with ID ${depId} not found`
                    )
                }
            }
        }

        // Use description as provided - DoD should be included by AI if needed
        const enhancedDescription = validatedArgs.description

        const task: Task = {
            id: await storage.getNextTaskId(validatedArgs.type as TaskType),
            epicId: validatedArgs.epicId,
            title: validatedArgs.title,
            description: enhancedDescription,
            type: validatedArgs.type as TaskType,
            status: 'pending' as TaskStatus,
            dependencies: validatedArgs.dependencies || [],
            priority: validatedArgs.priority as Priority,
            createdAt: new Date(),
            updatedAt: new Date(),
            progressNotes: [],
        }

        await storage.saveTask(task)

        epic.tasks.push(task)
        await storage.saveEpic(epic)

        const responseText = `[OK] **Task created successfully!**

[LIST] **${task.title}**
├─ ID: \`${task.id}\`
├─ Status: [WAIT] ${task.status}
├─ Created: ${task.createdAt.toLocaleDateString()}
└─ Description: ${task.description}

`
        const nextSteps = `

**🎯 AI WORKFLOW RECOMMENDATIONS:**

**IMMEDIATE ACTIONS:**
1. **Start working**: \`pm update task ${task.id} status in-progress progressNote "Beginning task analysis and planning" progressType update\`
2. **Analyze requirements**: Review task description for requirements and acceptance criteria
3. **Plan implementation**: Break down the task into specific steps

**DURING DEVELOPMENT:**
- **Track progress**: \`pm update task ${task.id} progressNote "Completed [milestone]" progressType update\`
- **Report blockers**: \`pm update task ${task.id} progressNote "Blocked by: [reason]" progressType blocker\`
- **Document decisions**: \`pm update task ${task.id} progressNote "Decision made: [context]" progressType comment\`

**COMPLETION:**
- **Verify requirements**: Ensure all requirements from task description are met
- **Mark done**: \`pm update task ${task.id} status done progressNote "Task completed successfully" progressType completion\`

**Other Actions:**
- **Create related tasks**: \`pm create task "Follow-up Task"\`
- **View all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`

[TIP] **For AI agents**: Use progress notes throughout development to maintain visibility. Each progress note should include meaningful context about what was accomplished or what blockers were encountered.`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
                },
            ],
            metadata: {
                entityType:
                    task.type === 'bug'
                        ? 'bug'
                        : task.type === 'rnd'
                          ? 'research'
                          : 'task',
                entityId: task.id,
                entityStatus: task.status,
                entityPriority: task.priority,
                operation: 'create',
                operationSuccess: true,
                suggestedCommands: [
                    `pm update task ${task.id} status in-progress`,
                    `pm update task ${task.id} progress "Started implementation"`,
                    `pm list tasks`,
                    `pm next`,
                ],
            },
        }
    }
}
