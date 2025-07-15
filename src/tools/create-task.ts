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

export class CreateTaskTool extends BaseTool {
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
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Create a new task within a specific epic - tasks are individual work items that can be assigned and tracked.
        
        WHEN TO USE:
        - Breaking down epics into actionable work items
        - Creating specific development tasks
        - Adding bug fixes or research tasks
        - Defining work that can be completed in 1-3 days
        
        PARAMETERS:
        - epicId: ID of the parent epic (format: EPIC-N)
        - title: Clear, actionable task name
        - description: Detailed requirements and acceptance criteria
        - type: Task type (task, bug, rnd)
        - priority: Priority level (low, medium, high)
        - dependencies: Optional array of task IDs this depends on
        
        USAGE CONTEXT:
        - Use after creating epics
        - Tasks should be specific and actionable
        - Consider dependencies between tasks
        - Include clear success criteria
        
        EXPECTED OUTCOMES:
        - New task created within specified epic
        - Ready for assignment and execution
        - Integrated into dependency tracking
        - Clear next steps for development work`
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

        const canStart = !task.dependencies || task.dependencies.length === 0

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                task: {
                                    id: task.id,
                                    title: task.title,
                                    description: task.description,
                                    type: task.type,
                                    status: task.status,
                                    priority: task.priority,
                                    epicId: task.epicId,
                                    dependencies: task.dependencies,
                                    createdAt: task.createdAt.toISOString(),
                                },
                                readiness: {
                                    canStart,
                                    dependenciesCount:
                                        task.dependencies?.length || 0,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(task, canStart),
                                context: `Created task "${task.title}" - ${canStart ? 'ready to start' : 'waiting for dependencies'}`,
                                recommendations: this.getRecommendations(
                                    task,
                                    canStart
                                ),
                                workflow_steps: this.getWorkflowSteps(task),
                                suggested_commands: [
                                    `pm get_task ${task.id}`,
                                    `pm update task ${task.id} status in-progress`,
                                    `pm next`,
                                ],
                            },
                        },
                        null,
                        2
                    ),
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
                operation: 'create',
                operationSuccess: true,
                canStart,
                hasDependencies:
                    task.dependencies && task.dependencies.length > 0,
            },
        }
    }

    private getNextSteps(task: any, canStart: boolean): string[] {
        const steps = []

        if (canStart) {
            steps.push('Start working on this task')
            steps.push('Add progress notes as you work')
        } else {
            steps.push('Wait for dependencies to complete')
            steps.push('Monitor dependency progress')
        }

        steps.push('Review task requirements and acceptance criteria')
        steps.push('Use "pm next" to get optimal next task')

        return steps
    }

    private getRecommendations(task: any, canStart: boolean): string[] {
        const recommendations = []

        if (task.priority === 'high') {
            recommendations.push('High priority task - prioritize accordingly')
        }

        if (!canStart) {
            recommendations.push(
                'Cannot start until dependencies are completed'
            )
        }

        if (task.description.length < 100) {
            recommendations.push(
                'Consider adding more detailed description with acceptance criteria'
            )
        }

        if (task.type === 'bug') {
            recommendations.push(
                'Include steps to reproduce and expected behavior'
            )
        }

        return recommendations
    }

    private getWorkflowSteps(task: any): string[] {
        return [
            'Analyze requirements and acceptance criteria',
            'Plan implementation approach',
            'Track progress with regular updates',
            'Test and validate completion',
            'Mark as done when all criteria met',
        ]
    }
}
