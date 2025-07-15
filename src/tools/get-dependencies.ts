import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getDependenciesSchema = z.object({
    taskId: z.string(),
})

/**
 * Tool for retrieving and analyzing all dependencies for a task, showing status, blocking relationships, and dependency chain analysis
 */
export class GetDependenciesTool extends BaseTool {
    /**
     * Creates a new instance of GetDependenciesTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'get_dependencies'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Retrieve and analyze all dependencies for a task showing status, blocking relationships, and dependency chain analysis.
        
        WHEN TO USE:
        - Before starting work on a task to understand prerequisites
        - When task appears blocked to identify what needs completion
        - Planning task execution order and dependency resolution
        - Analyzing project bottlenecks and blocked workflows
        
        PARAMETERS:
        - taskId: String identifier of the task (format: TSK-N, BUG-N, RND-N)
        
        USAGE CONTEXT:
        - Essential for understanding task readiness
        - Helps identify dependency chains and blocking relationships
        - Critical for workflow planning and task prioritization
        - Used by task management systems for execution planning
        
        EXPECTED OUTCOMES:
        - Complete dependency analysis with blocking status
        - Readiness assessment for task execution
        - Actionable insights for dependency resolution
        - Clear next steps for unblocking workflow`
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
     * Executes the dependency analysis for a task
     * @param args - The tool arguments containing taskId
     * @returns The analysis result with dependency details and blocking status
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getDependenciesSchema, args)
        const storage = await this.getStorage()

        const task = await storage.loadTask(validatedArgs.taskId)
        if (!task) {
            throw new Error(`Task ${validatedArgs.taskId} not found`)
        }

        const parentEpic = await storage.loadEpic(task.epicId)
        const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

        const dependencies = []
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depId of task.dependencies) {
                const depTask = await storage.loadTask(depId)
                if (depTask) {
                    dependencies.push({
                        id: depTask.id,
                        title: depTask.title,
                        status: depTask.status,
                        type: depTask.type,
                        priority: depTask.priority,
                    })
                }
            }
        }

        const completedDeps = dependencies.filter((d) => d.status === 'done')
        const blockedDeps = dependencies.filter((d) => d.status === 'blocked')
        const inProgressDeps = dependencies.filter(
            (d) => d.status === 'in-progress'
        )
        const pendingDeps = dependencies.filter((d) => d.status === 'pending')

        const canStart =
            dependencies.length === 0 ||
            dependencies.every((d) => d.status === 'done')

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
                                    status: task.status,
                                    type: task.type,
                                    priority: task.priority,
                                    parentEpicTitle: epicTitle,
                                },
                                dependencies: dependencies.map((dep) => ({
                                    id: dep.id,
                                    title: dep.title,
                                    status: dep.status,
                                    type: dep.type,
                                    priority: dep.priority,
                                    isBlocking: dep.status !== 'done',
                                })),
                                analysis: {
                                    totalDependencies: dependencies.length,
                                    completedDependencies: completedDeps.length,
                                    blockedDependencies: blockedDeps.length,
                                    inProgressDependencies:
                                        inProgressDeps.length,
                                    pendingDependencies: pendingDeps.length,
                                    canStart,
                                    readinessStatus: canStart
                                        ? 'ready'
                                        : 'blocked',
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    task,
                                    dependencies,
                                    canStart
                                ),
                                context: `Task "${task.title}" has ${dependencies.length} dependencies with ${completedDeps.length} completed`,
                                recommendations: this.getRecommendations(
                                    dependencies,
                                    canStart
                                ),
                                readiness_assessment: canStart
                                    ? 'Ready to start - no blocking dependencies'
                                    : 'Blocked by dependencies',
                                suggested_commands: [
                                    `pm get_task ${task.id}`,
                                    `pm update task ${task.id} status in-progress`,
                                    `pm list tasks`,
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
                entityId: task.id,
                operation: 'get',
                operationSuccess: true,
                dependenciesCount: dependencies.length,
                canStart,
                hasBlockingDependencies: !canStart,
                completedDependencies: completedDeps.length,
                blockedDependencies: blockedDeps.length,
            },
        }
    }

    private getNextSteps(
        _task: any,
        dependencies: any[],
        canStart: boolean
    ): string[] {
        const nextSteps = []

        if (dependencies.length === 0) {
            nextSteps.push('No dependencies - task is ready to start')
            nextSteps.push('Begin work on this task immediately')
        } else {
            if (!canStart) {
                const blockedDeps = dependencies.filter(
                    (d) => d.status === 'blocked'
                )
                const pendingDeps = dependencies.filter(
                    (d) => d.status === 'pending'
                )
                const inProgressDeps = dependencies.filter(
                    (d) => d.status === 'in-progress'
                )

                if (blockedDeps.length > 0) {
                    nextSteps.push(
                        `Unblock ${blockedDeps.length} blocked dependencies`
                    )
                }
                if (pendingDeps.length > 0) {
                    nextSteps.push(
                        `Start work on ${pendingDeps.length} pending dependencies`
                    )
                }
                if (inProgressDeps.length > 0) {
                    nextSteps.push(
                        `Wait for ${inProgressDeps.length} in-progress dependencies`
                    )
                }
            } else {
                nextSteps.push('All dependencies completed - ready to start')
                nextSteps.push('Begin work on this task')
            }
        }

        nextSteps.push('Monitor dependency progress regularly')
        nextSteps.push('Use "pm next" for optimal task selection')

        return nextSteps
    }

    private getRecommendations(
        dependencies: any[],
        canStart: boolean
    ): string[] {
        const recommendations = []

        if (dependencies.length === 0) {
            recommendations.push(
                'No dependencies - this task can be started immediately'
            )
        } else {
            if (canStart) {
                recommendations.push(
                    'All dependencies are resolved - proceed with task'
                )
            } else {
                recommendations.push(
                    'Focus on completing blocking dependencies first'
                )

                const highPriorityDeps = dependencies.filter(
                    (d) => d.priority === 'high' && d.status !== 'done'
                )
                if (highPriorityDeps.length > 0) {
                    recommendations.push(
                        `${highPriorityDeps.length} high-priority dependencies need attention`
                    )
                }

                const blockedDeps = dependencies.filter(
                    (d) => d.status === 'blocked'
                )
                if (blockedDeps.length > 0) {
                    recommendations.push(
                        'Resolve blocked dependencies to unblock workflow'
                    )
                }
            }
        }

        recommendations.push(
            'Review dependency chain for optimization opportunities'
        )
        recommendations.push('Consider task parallelization where possible')

        return recommendations
    }
}
