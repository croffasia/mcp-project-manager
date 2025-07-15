import { BaseTool, ToolResult } from './base.js'

export class ListAllTasksTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'list_all_tasks'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `List all tasks in the project with epic context, dependencies, progress status, and priority breakdown.
        
        WHEN TO USE:
        - Need comprehensive view of all tasks across the project
        - Planning work prioritization and resource allocation
        - Tracking detailed progress at the task level
        - Identifying blocked or problematic tasks
        
        PARAMETERS:
        - No parameters required - returns all tasks
        
        USAGE CONTEXT:
        - Essential for developers and AI agents managing task execution
        - Provides detailed view of task dependencies and blocking relationships
        - Critical for daily stand-ups and sprint planning
        - Used for identifying bottlenecks and progress tracking
        
        EXPECTED OUTCOMES:
        - Complete list of all tasks with comprehensive context
        - Dependency analysis and blocking status
        - Progress tracking with status distribution
        - Actionable insights for task management and workflow optimization`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {},
        }
    }

    /**
     * Executes the task listing with comprehensive statistics
     * @param _args - The tool arguments (empty for this tool)
     * @returns The listing result with task details and statistics
     */
    async execute(_args?: any): Promise<ToolResult> {
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
                                    tasks: [],
                                    summary: {
                                        totalCount: 0,
                                        completedCount: 0,
                                        inProgressCount: 0,
                                        blockedCount: 0,
                                        pendingCount: 0,
                                        progressPercent: 0,
                                    },
                                    distributions: {
                                        status: {},
                                        priority: {},
                                        type: {},
                                    },
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Create your first task to start working',
                                        'View existing epics to understand project structure',
                                        'Initialize project if not done yet',
                                    ],
                                    context: 'No tasks found in the project',
                                    recommendations: [
                                        'Tasks are specific work items that belong to epics within ideas',
                                        'Create tasks with clear Definition of Done criteria',
                                        'Use hierarchical structure: Ideas → Epics → Tasks',
                                    ],
                                    suggested_commands: [
                                        'pm create_task "My First Task"',
                                        'pm list_all_epics',
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
                    operation: 'list',
                    operationSuccess: true,
                    totalCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    blockedCount: 0,
                    pendingCount: 0,
                    statusBreakdown: {},
                    priorityBreakdown: {},
                    typeBreakdown: {},
                },
            }
        }

        // Get additional information for each task
        const allEpics = await storage.loadAllEpics()
        const allIdeas = await storage.loadAllIdeas()

        const tasksWithContext = []
        for (const task of allTasks) {
            const parentEpic = allEpics.find((epic) => epic.id === task.epicId)
            const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

            let ideaTitle = 'Unknown Idea'
            if (parentEpic) {
                const parentIdea = allIdeas.find(
                    (idea) => idea.id === parentEpic.ideaId
                )
                ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'
            }

            // Check dependency status
            let dependencyInfo = {
                hasBlocked: false,
                blockedCount: 0,
                totalDeps: 0,
            }
            if (task.dependencies && task.dependencies.length > 0) {
                dependencyInfo.totalDeps = task.dependencies.length
                const dependencyTasks = task.dependencies
                    .map((depId: string) =>
                        allTasks.find((t) => t.id === depId)
                    )
                    .filter(Boolean)

                dependencyInfo.blockedCount = dependencyTasks.filter(
                    (dep) => dep && dep.status !== 'done'
                ).length
                dependencyInfo.hasBlocked = dependencyInfo.blockedCount > 0
            }

            tasksWithContext.push({
                ...task,
                epicTitle,
                ideaTitle,
                hasProgressNotes:
                    task.progressNotes && task.progressNotes.length > 0,
                hasDependencies:
                    task.dependencies && task.dependencies.length > 0,
                dependencyInfo,
                daysSinceCreated: Math.floor(
                    (Date.now() - task.createdAt.getTime()) /
                        (1000 * 60 * 60 * 24)
                ),
                daysSinceUpdated: Math.floor(
                    (Date.now() - task.updatedAt.getTime()) /
                        (1000 * 60 * 60 * 24)
                ),
            })
        }

        // Sort by priority, status, and update date
        tasksWithContext.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const statusOrder = {
                blocked: 4,
                'in-progress': 3,
                pending: 2,
                done: 1,
                deferred: 0,
            }

            const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff

            const statusDiff = statusOrder[b.status] - statusOrder[a.status]
            if (statusDiff !== 0) return statusDiff

            return b.updatedAt.getTime() - a.updatedAt.getTime()
        })

        const statusCounts = this.getStatusCounts(allTasks)
        const priorityCounts = this.getPriorityCounts(allTasks)
        const typeCounts = this.getTypeCounts(allTasks)

        const blockedTasks = allTasks.filter((t) => t.status === 'blocked')
        const inProgressTasks = allTasks.filter(
            (t) => t.status === 'in-progress'
        )
        const pendingTasks = allTasks.filter((t) => t.status === 'pending')
        const completedTasks = allTasks.filter((t) => t.status === 'done')

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                tasks: tasksWithContext.map((task) => ({
                                    id: task.id,
                                    title: task.title,
                                    description: task.description,
                                    status: task.status,
                                    priority: task.priority,
                                    type: task.type,
                                    createdAt: task.createdAt.toISOString(),
                                    updatedAt: task.updatedAt.toISOString(),
                                    daysSinceCreated: task.daysSinceCreated,
                                    daysSinceUpdated: task.daysSinceUpdated,
                                    parentEpicTitle: task.epicTitle,
                                    parentIdeaTitle: task.ideaTitle,
                                    hasDependencies: task.hasDependencies,
                                    hasProgressNotes: task.hasProgressNotes,
                                    dependencyInfo: task.dependencyInfo,
                                })),
                                summary: {
                                    totalCount: allTasks.length,
                                    completedCount: completedTasks.length,
                                    inProgressCount: inProgressTasks.length,
                                    blockedCount: blockedTasks.length,
                                    pendingCount: pendingTasks.length,
                                    progressPercent: Math.round(
                                        (completedTasks.length /
                                            allTasks.length) *
                                            100
                                    ),
                                },
                                distributions: {
                                    status: statusCounts,
                                    priority: priorityCounts,
                                    type: typeCounts,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    inProgressTasks,
                                    pendingTasks,
                                    blockedTasks
                                ),
                                context: `Found ${allTasks.length} tasks with ${completedTasks.length} completed (${Math.round((completedTasks.length / allTasks.length) * 100)}%)`,
                                recommendations: this.getRecommendations(
                                    inProgressTasks,
                                    pendingTasks,
                                    blockedTasks
                                ),
                                workflow_recommendations:
                                    this.getWorkflowRecommendations(
                                        inProgressTasks,
                                        pendingTasks,
                                        blockedTasks
                                    ),
                                suggested_commands: [
                                    'pm create_task "Task Title"',
                                    'pm get_task [TSK-ID]',
                                    'pm next_task',
                                    'pm list_all_epics',
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
                operation: 'list',
                operationSuccess: true,
                totalCount: allTasks.length,
                completedCount: completedTasks.length,
                inProgressCount: inProgressTasks.length,
                blockedCount: blockedTasks.length,
                pendingCount: pendingTasks.length,
                statusBreakdown: statusCounts,
                priorityBreakdown: priorityCounts,
                typeBreakdown: typeCounts,
                progressPercent: Math.round(
                    (completedTasks.length / allTasks.length) * 100
                ),
            },
        }
    }

    private getNextSteps(
        inProgressTasks: any[],
        pendingTasks: any[],
        blockedTasks: any[]
    ): string[] {
        const nextSteps = []

        if (inProgressTasks.length > 0) {
            nextSteps.push(
                `Continue work on ${inProgressTasks.length} in-progress tasks`
            )
        }

        if (pendingTasks.length > 0) {
            nextSteps.push(`Start work on ${pendingTasks.length} pending tasks`)
        }

        if (blockedTasks.length > 0) {
            nextSteps.push(`Unblock ${blockedTasks.length} blocked tasks`)
        }

        nextSteps.push('Use next_task to get optimal work recommendations')
        nextSteps.push('Update task status and add progress notes regularly')

        return nextSteps
    }

    private getRecommendations(
        inProgressTasks: any[],
        pendingTasks: any[],
        blockedTasks: any[]
    ): string[] {
        const recommendations = []

        if (inProgressTasks.length > 0) {
            recommendations.push(
                'Add progress notes to in-progress tasks for visibility'
            )
        }

        if (blockedTasks.length > 0) {
            recommendations.push(
                'Focus on unblocking dependencies to improve workflow'
            )
        }

        if (pendingTasks.length > 0) {
            recommendations.push(
                'Prioritize pending tasks based on dependencies and urgency'
            )
        }

        recommendations.push(
            'Track progress regularly with task status updates'
        )
        recommendations.push(
            'Use Definition of Done criteria to guide completion'
        )

        return recommendations
    }

    private getWorkflowRecommendations(
        inProgressTasks: any[],
        pendingTasks: any[],
        blockedTasks: any[]
    ): any {
        return {
            inProgress: {
                count: inProgressTasks.length,
                actions:
                    inProgressTasks.length > 0
                        ? [
                              'Add progress notes with current status',
                              'Report blockers immediately when encountered',
                              'Mark as done when all DoD items are complete',
                          ]
                        : ['No tasks currently in progress'],
            },
            pending: {
                count: pendingTasks.length,
                actions:
                    pendingTasks.length > 0
                        ? [
                              'Use next_task to get optimal task recommendation',
                              'Update status to in-progress when starting work',
                              'Track progress with regular updates',
                          ]
                        : ['No pending tasks - consider creating new tasks'],
            },
            blocked: {
                count: blockedTasks.length,
                actions:
                    blockedTasks.length > 0
                        ? [
                              'Identify and resolve blocking issues',
                              'Focus on unblocking dependencies',
                              'Update status to pending when unblocked',
                          ]
                        : ['No blocked tasks - good project health!'],
            },
        }
    }

    private getStatusCounts(tasks: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        tasks.forEach((task) => {
            counts[task.status] = (counts[task.status] || 0) + 1
        })
        return counts
    }

    private getPriorityCounts(tasks: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        tasks.forEach((task) => {
            counts[task.priority] = (counts[task.priority] || 0) + 1
        })
        return counts
    }

    private getTypeCounts(tasks: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        tasks.forEach((task) => {
            counts[task.type] = (counts[task.type] || 0) + 1
        })
        return counts
    }
}
