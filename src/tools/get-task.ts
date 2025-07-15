import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getTaskSchema = z.object({
    taskId: z.string(),
})

export class GetTaskTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'get_task'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Retrieve detailed information about a specific task including dependencies, progress notes, parent epic, and full context.
        
        WHEN TO USE:
        - Before starting work on a specific task
        - Need to understand task dependencies and blockers
        - Checking task progress and current status
        - Understanding task context within epic and idea
        
        PARAMETERS:
        - taskId: String identifier of the task (format: TSK-N)
        
        USAGE CONTEXT:
        - Essential before executing any task work
        - Provides dependency analysis and readiness assessment
        - Shows historical progress and notes
        
        EXPECTED OUTCOMES:
        - Complete task information with dependency status
        - Readiness assessment for task execution
        - Progress history and current context
        - Actionable next steps for task completion`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'ID of the task' },
            },
            required: ['taskId'],
        }
    }

    /**
     * Executes the task retrieval process
     * @param args - The tool arguments containing taskId
     * @returns The task details with dependency analysis and guidance
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getTaskSchema, args)
        const storage = await this.getStorage()

        // Load task
        const task = await storage.loadTask(validatedArgs.taskId)
        if (!task) {
            throw new Error(`Task ${validatedArgs.taskId} not found`)
        }

        // Load parent epic
        const parentEpic = await storage.loadEpic(task.epicId)
        const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

        // Load parent idea
        let ideaTitle = 'Unknown Idea'
        if (parentEpic) {
            const parentIdea = await storage.loadIdea(parentEpic.ideaId)
            ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'
        }

        // Get dependencies
        const dependencies = await this.getDependencies(task, storage)

        // Get progress notes
        const progressNotes = task.progressNotes || []

        const canStart =
            dependencies.length === 0 ||
            dependencies.every((dep) => dep.status === 'done')
        const blockedDeps = dependencies.filter(
            (dep) => dep.status === 'blocked'
        ).length
        const pendingDeps = dependencies.filter(
            (dep) => dep.status === 'pending'
        ).length

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
                                    parentEpicId: task.epicId,
                                    parentEpicTitle: epicTitle,
                                    parentIdeaTitle: ideaTitle,
                                },
                                dependencies: dependencies.map((dep) => ({
                                    id: dep.id,
                                    title: dep.title,
                                    status: dep.status,
                                    priority: dep.priority,
                                    isBlocking: dep.status !== 'done',
                                })),
                                progressNotes: progressNotes
                                    .slice(0, 5)
                                    .map((note) => ({
                                        timestamp: note.timestamp,
                                        content: note.content,
                                    })),
                                readiness: {
                                    canStart,
                                    blockedDependencies: blockedDeps,
                                    pendingDependencies: pendingDeps,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    task,
                                    dependencies,
                                    canStart
                                ),
                                context: `Task "${task.title}" is ${task.status} with ${dependencies.length} dependencies`,
                                recommendations: this.getRecommendations(
                                    task,
                                    dependencies,
                                    canStart
                                ),
                                readiness_assessment: canStart
                                    ? 'Ready to start'
                                    : 'Blocked by dependencies',
                            },
                        },
                        null,
                        2
                    ),
                },
            ],
            metadata: {
                entityType: 'task',
                entityId: task.id,
                operation: 'get',
                operationSuccess: true,
                canStart,
                blockedDeps,
                pendingDeps,
            },
        }
    }

    private async getDependencies(task: any, storage: any): Promise<any[]> {
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
                    })
                }
            }
        }
        return dependencies
    }

    private getNextSteps(
        task: any,
        dependencies: any[],
        canStart: boolean
    ): string[] {
        const nextSteps = []

        if (!canStart) {
            const blockedDeps = dependencies.filter(
                (dep) => dep.status === 'blocked'
            )
            const pendingDeps = dependencies.filter(
                (dep) => dep.status === 'pending'
            )

            if (blockedDeps.length > 0) {
                nextSteps.push(
                    `Unblock ${blockedDeps.length} blocked dependencies`
                )
            }
            if (pendingDeps.length > 0) {
                nextSteps.push(
                    `Complete ${pendingDeps.length} pending dependencies`
                )
            }
        } else {
            if (task.status === 'pending') {
                nextSteps.push('Start working on this task')
            } else if (task.status === 'in-progress') {
                nextSteps.push('Continue working on this task')
            } else if (task.status === 'blocked') {
                nextSteps.push('Resolve blocking issues')
            }
        }

        nextSteps.push('Add progress notes to track work')
        return nextSteps
    }

    private getRecommendations(
        task: any,
        _dependencies: any[],
        canStart: boolean
    ): string[] {
        const recommendations = []

        if (!canStart) {
            recommendations.push('Focus on completing dependencies first')
        } else {
            if (task.status === 'pending') {
                recommendations.push(
                    'This task is ready to start - no blockers'
                )
            }
            if (task.priority === 'high') {
                recommendations.push(
                    'High priority task - consider prioritizing'
                )
            }
        }

        if (task.description.length < 50) {
            recommendations.push('Consider adding more detailed description')
        }

        return recommendations
    }
}
