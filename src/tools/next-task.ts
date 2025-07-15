import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const nextTaskSchema = z.object({
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * Tool for intelligently recommending the next optimal task to work on based on priority, dependencies, and context
 */
export class NextTaskTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'next_task'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Get the next optimal task to work on based on priority, dependencies, and project workflow.
        
        WHEN TO USE:
        - Need optimal task recommendation for current work session
        - Looking for highest priority unblocked task
        - Want intelligent task selection based on dependencies
        - Starting work session and need focus direction
        
        PARAMETERS:
        - priority: Optional filter by priority level (low, medium, high)
        
        USAGE CONTEXT:
        - Essential for AI agents to get optimal work recommendations
        - Considers task dependencies and blocking relationships
        - Prioritizes by urgency, dependency readiness, and project context
        - Provides comprehensive task context for informed decision making
        
        EXPECTED OUTCOMES:
        - Single optimal task recommendation with full context
        - Readiness assessment with dependency analysis
        - Workflow guidance for AI agents and developers
        - Clear next steps for task execution and progress tracking`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Filter by priority',
                },
            },
        }
    }

    /**
     * Executes the next task selection process
     * @param args - The tool arguments containing optional priority filter
     * @returns The optimal task recommendation with context and guidance
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(nextTaskSchema, args)
        const storage = await this.getStorage()

        // Load all tasks
        const allTasks = await storage.loadAllTasks()

        if (allTasks.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    status: 'no_tasks',
                                    message: 'No tasks found in the project',
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Create your first task to get started',
                                        'Initialize project structure if needed',
                                        'Set up ideas and epics for better organization',
                                    ],
                                    context: 'No tasks available for selection',
                                    recommendations: [
                                        'Create tasks within epics to organize work',
                                        'Use hierarchical structure: Ideas → Epics → Tasks',
                                        'Start with high-priority tasks for immediate impact',
                                    ],
                                    suggested_commands: [
                                        'pm create_task "My First Task"',
                                        'pm list_all_tasks',
                                        'pm init_project',
                                    ],
                                },
                            },
                            null,
                            2
                        ),
                    },
                ],
                metadata: {
                    entityType: 'task',
                    operation: 'get',
                    operationSuccess: false,
                    reason: 'no_tasks_found',
                    totalTasks: 0,
                    availableTasks: 0,
                },
            }
        }

        // Filter tasks by criteria
        let candidateTasks = allTasks.filter((task) => {
            // Only tasks that can be executed
            if (task.status !== 'pending') return false

            // Filter by priority
            if (
                validatedArgs.priority &&
                task.priority !== validatedArgs.priority
            ) {
                return false
            }

            return true
        })

        if (candidateTasks.length === 0) {
            let noTasksMessage = `[BLOCK] **No available tasks found**`

            if (validatedArgs.priority) {
                noTasksMessage += ` with priority "${validatedArgs.priority}"`
            }

            const pendingTasks = allTasks.filter((t) => t.status === 'pending')
            const inProgressTasks = allTasks.filter(
                (t) => t.status === 'in-progress'
            )
            const blockedTasks = allTasks.filter((t) => t.status === 'blocked')

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    status: 'no_matching_tasks',
                                    message: noTasksMessage,
                                    taskCounts: {
                                        pending: pendingTasks.length,
                                        inProgress: inProgressTasks.length,
                                        blocked: blockedTasks.length,
                                        total: allTasks.length,
                                    },
                                    appliedFilter: validatedArgs.priority,
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Remove priority filter to see all available tasks',
                                        'Create new tasks if needed',
                                        'Review existing task statuses',
                                    ],
                                    context: `No tasks found matching criteria${validatedArgs.priority ? ` with priority "${validatedArgs.priority}"` : ''}`,
                                    recommendations: [
                                        'Try removing filters to see all available tasks',
                                        'Create tasks with different priorities',
                                        'Review and update existing task statuses',
                                    ],
                                    suggested_commands: [
                                        'pm list_all_tasks',
                                        'pm create_task "New Task"',
                                        'pm next_task',
                                    ],
                                },
                            },
                            null,
                            2
                        ),
                    },
                ],
                metadata: {
                    entityType: 'task',
                    operation: 'get',
                    operationSuccess: false,
                    reason: 'no_matching_tasks',
                    totalTasks: allTasks.length,
                    pendingTasks: pendingTasks.length,
                    inProgressTasks: inProgressTasks.length,
                    blockedTasks: blockedTasks.length,
                    filterPriority: validatedArgs.priority,
                },
            }
        }

        // Filter tasks without blocked dependencies
        const availableTasks = []
        for (const task of candidateTasks) {
            const hasBlockedDependencies = await this.hasBlockedDependencies(
                task,
                storage
            )
            if (!hasBlockedDependencies) {
                availableTasks.push(task)
            }
        }

        if (availableTasks.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    status: 'all_tasks_blocked',
                                    message:
                                        'No tasks available - all have blocked dependencies',
                                    candidateTasks: candidateTasks.length,
                                    blockedByDependencies:
                                        candidateTasks.length,
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Check which tasks are blocking others',
                                        'Focus on unblocking dependent tasks',
                                        'Create independent tasks without dependencies',
                                    ],
                                    context: `${candidateTasks.length} candidate tasks found but all are blocked by dependencies`,
                                    recommendations: [
                                        'Resolve blocked dependencies to unlock more work',
                                        'Create tasks without dependencies for immediate work',
                                        'Review dependency chains for optimization',
                                    ],
                                    suggested_commands: [
                                        'pm list_all_tasks',
                                        'pm create_task "Independent Task"',
                                        'pm get_dependencies [TASK_ID]',
                                    ],
                                },
                            },
                            null,
                            2
                        ),
                    },
                ],
                metadata: {
                    entityType: 'task',
                    operation: 'get',
                    operationSuccess: false,
                    reason: 'all_tasks_blocked',
                    totalTasks: allTasks.length,
                    candidateTasks: candidateTasks.length,
                    blockedByDependencies: candidateTasks.length,
                },
            }
        }

        // Smart task prioritization
        const nextTask = this.selectNextTask(availableTasks)

        // Load context for task
        const parentEpic = await storage.loadEpic(nextTask.epicId)
        const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

        let ideaTitle = 'Unknown Idea'
        if (parentEpic) {
            const parentIdea = await storage.loadIdea(parentEpic.ideaId)
            ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'
        }

        // Load dependencies for task
        const taskDependencies = await this.getTaskDependencies(
            nextTask,
            storage
        )

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                recommendedTask: {
                                    id: nextTask.id,
                                    title: nextTask.title,
                                    description: nextTask.description,
                                    type: nextTask.type,
                                    status: nextTask.status,
                                    priority: nextTask.priority,
                                    createdAt: nextTask.createdAt.toISOString(),
                                    parentEpicTitle: epicTitle,
                                    parentIdeaTitle: ideaTitle,
                                },
                                dependencies: taskDependencies.map((dep) => ({
                                    id: dep.id,
                                    title: dep.title,
                                    status: dep.status,
                                    priority: dep.priority,
                                    type: dep.type,
                                    isBlocking: dep.status !== 'done',
                                })),
                                analysis: {
                                    totalAvailableTasks: availableTasks.length,
                                    dependenciesCount: taskDependencies.length,
                                    selectionReason: this.getSelectionReason(
                                        nextTask,
                                        availableTasks.length
                                    ),
                                    readinessStatus: 'ready',
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    nextTask,
                                    taskDependencies
                                ),
                                context: `Selected optimal task "${nextTask.title}" from ${availableTasks.length} available tasks`,
                                recommendations: this.getRecommendations(
                                    nextTask,
                                    taskDependencies
                                ),
                                workflow_steps: [
                                    'Update task status to in-progress before starting',
                                    'Add progress notes at key milestones',
                                    'Check dependencies if blocked',
                                    'Mark as done with completion note when finished',
                                ],
                                suggested_commands: [
                                    `pm update_task ${nextTask.id} status in-progress`,
                                    `pm get_task ${nextTask.id}`,
                                    `pm get_dependencies ${nextTask.id}`,
                                    `pm get_epic ${nextTask.epicId}`,
                                ],
                            },
                        },
                        null,
                        2
                    ),
                },
            ],
            metadata: {
                entityType: 'task',
                entityId: nextTask.id,
                operation: 'get',
                operationSuccess: true,
                reason: 'next_task_found',
                totalTasks: allTasks.length,
                availableTasks: availableTasks.length,
                selectedTaskPriority: nextTask.priority,
                selectedTaskType: nextTask.type,
                selectedTaskStatus: nextTask.status,
                hasDependencies:
                    nextTask.dependencies && nextTask.dependencies.length > 0,
                filterPriority: validatedArgs.priority,
            },
        }
    }

    private async hasBlockedDependencies(
        task: any,
        storage: any
    ): Promise<boolean> {
        if (!task.dependencies || task.dependencies.length === 0) {
            return false
        }

        for (const depId of task.dependencies) {
            const depTask = await storage.loadTask(depId)
            if (depTask && depTask.status !== 'done') {
                return true
            }
        }

        return false
    }

    private selectNextTask(tasks: any[]): any {
        // Smart prioritization
        const priorityOrder: { [key: string]: number } = {
            high: 3,
            medium: 2,
            low: 1,
        }

        // Sort by priority, then by creation date
        tasks.sort((a, b) => {
            const priorityDiff =
                (priorityOrder[b.priority] || 0) -
                (priorityOrder[a.priority] || 0)
            if (priorityDiff !== 0) return priorityDiff

            // If priorities are equal, choose the older task
            return a.createdAt.getTime() - b.createdAt.getTime()
        })

        return tasks[0]
    }

    private getSelectionReason(task: any, totalAvailable: number): string {
        const reasons = []

        // Priority reasoning
        switch (task.priority) {
            case 'high':
                reasons.push('High priority task')
                break
            case 'medium':
                reasons.push('Medium priority task')
                break
            case 'low':
                reasons.push('Low priority task')
                break
        }

        // Selection context
        if (totalAvailable > 1) {
            reasons.push(`Selected from ${totalAvailable} available tasks`)
        } else {
            reasons.push('Only available task')
        }

        return reasons.join(', ')
    }

    private getNextSteps(_task: any, dependencies: any[]): string[] {
        const nextSteps = []

        nextSteps.push('Update task status to in-progress before starting work')
        nextSteps.push('Review task description and requirements carefully')

        if (dependencies.length > 0) {
            nextSteps.push('Verify all dependencies are completed')
        }

        nextSteps.push('Add progress notes at key milestones')
        nextSteps.push('Mark task as done when all requirements are met')

        return nextSteps
    }

    private getRecommendations(task: any, dependencies: any[]): string[] {
        const recommendations = []

        if (task.priority === 'high') {
            recommendations.push('High priority task - focus on completion')
        }

        if (dependencies.length === 0) {
            recommendations.push('No dependencies - can start immediately')
        } else {
            recommendations.push(
                'All dependencies completed - ready to proceed'
            )
        }

        recommendations.push('Track progress regularly with progress notes')
        recommendations.push('Update task status to reflect current state')
        recommendations.push(
            'Review Definition of Done before marking complete'
        )

        return recommendations
    }

    private async getTaskDependencies(task: any, storage: any): Promise<any[]> {
        const dependencies = []
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depId of task.dependencies) {
                const depTask = await storage.loadTask(depId)
                if (depTask) {
                    dependencies.push({
                        id: depTask.id,
                        title: depTask.title,
                        status: depTask.status,
                        priority: depTask.priority,
                        type: depTask.type,
                    })
                }
            }
        }
        return dependencies
    }
}
