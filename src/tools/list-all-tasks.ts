import { BaseTool, ToolResult } from './base.js'

export class ListAllTasksTool extends BaseTool {
    constructor() {
        super()
    }

    getName(): string {
        return 'list_all_tasks'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'List all tasks in the project with epic context, dependencies, progress status, and priority breakdown'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {},
        }
    }

    async execute(): Promise<ToolResult> {
        const storage = await this.getStorage()

        // Load all tasks
        const allTasks = await storage.loadAllTasks()

        if (allTasks.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[NOTE] **All Tasks Overview**

[ERROR] **No tasks found**

[NOTE] **Get started:**
- **Create your first task**: \`pm create task "My First Task"\`
- **View epics**: \`pm list epics\`
- **Initialize project**: \`pm init\` (if not done)

[TIP] **Pro tip**: Tasks are specific work items that belong to epics within ideas!`,
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
                    suggestedCommands: [
                        'pm create task "My First Task"',
                        'pm list epics',
                        'pm init',
                    ],
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

        const responseText = `[NOTE] **All Tasks Overview** (${allTasks.length} total)

**Summary Statistics:**
- **Completed**: ${completedTasks.length} (${Math.round((completedTasks.length / allTasks.length) * 100)}%)
- **In Progress**: ${inProgressTasks.length}
- **Pending**: ${pendingTasks.length}
- **Blocked**: ${blockedTasks.length}

**Status Distribution:**
${Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `- **${status}**: ${count}`)
    .join('\n')}

**Priority Distribution:**
${Object.entries(priorityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([priority, count]) => `- **${priority}**: ${count}`)
    .join('\n')}

**Type Distribution:**
${Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `- **${type}**: ${count}`)
    .join('\n')}

**Task Details:**
${tasksWithContext
    .map((task) => {
        let result = `${this.getStatusIcon(task.status)} **${task.title}** (${task.id})
  - **Idea**: ${task.ideaTitle}
  - **Epic**: ${task.epicTitle}
  - **Status**: ${task.status} | **Priority**: ${task.priority} | **Type**: ${task.type}
  - **Created**: ${task.daysSinceCreated} days ago | **Updated**: ${task.daysSinceUpdated} days ago`

        if (task.hasDependencies) {
            if (task.dependencyInfo.hasBlocked) {
                result += `\n  - ⚠️ **BLOCKED: ${task.dependencyInfo.blockedCount}/${task.dependencyInfo.totalDeps} dependencies incomplete**`
            } else {
                result += `\n  - ✅ **All ${task.dependencyInfo.totalDeps} dependencies completed**`
            }
        }

        if (task.hasProgressNotes) {
            result += `\n  - [NOTE] **Has progress notes**`
        }

        return result
    })
    .join('\n\n')}

**🎯 AI WORKFLOW RECOMMENDATIONS:**

**For Tasks in Progress (${inProgressTasks.length} tasks):**
${
    inProgressTasks.length > 0
        ? `- **Add progress notes**: \`pm update task [TASK-ID] progressNote "Current progress update" progressType update\`
- **Report blockers**: \`pm update task [TASK-ID] progressNote "Blocked by: [reason]" progressType blocker\`
- **Mark completed**: \`pm update task [TASK-ID] status done progressNote "Task completed - all DoD items checked" progressType completion\``
        : '- No tasks currently in progress'
}

**For Pending Tasks (${pendingTasks.length} tasks):**
${
    pendingTasks.length > 0
        ? `- **Start next task**: \`pm next\` (gets optimal task to work on)
- **Begin work**: \`pm update task [TASK-ID] status in-progress progressNote "Starting task implementation" progressType update\`
- **Track progress**: Use progress notes throughout development`
        : '- No pending tasks - consider creating new tasks'
}

**For Blocked Tasks (${blockedTasks.length} tasks):**
${
    blockedTasks.length > 0
        ? `- **Identify blockers**: \`pm get_task [TASK-ID]\` to see blocking issues
- **Resolve blockers**: Focus on unblocking dependencies
- **Update status**: \`pm update task [TASK-ID] status pending\` when unblocked`
        : '- No blocked tasks - good project health!'
}

**Quick Actions:**
- **Create new task**: \`pm create task "Task Title"\`
- **View specific task**: \`pm get_task TSK-ID\`
- **Get next task**: \`pm next\`
- **View blocked tasks**: \`pm list tasks --status blocked\`
- **View epics**: \`pm list epics\`
- **View ideas**: \`pm list ideas\`

[TIP] **For AI agents**: Always update task status and add progress notes when working on tasks. Each task includes Definition of Done checklist items to guide completion. Use progress notes to maintain visibility into development progress!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
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
                suggestedCommands: [
                    'pm create task "Task Title"',
                    'pm get_task TSK-ID',
                    'pm next',
                    'pm list epics',
                ],
            },
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'done':
                return '[OK]'
            case 'in-progress':
                return '[WAIT]'
            case 'blocked':
                return '[BLOCK]'
            case 'deferred':
                return '[DATE]'
            default:
                return '⏸️'
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
