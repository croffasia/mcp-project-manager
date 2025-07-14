import { BaseTool, ToolResult } from './base.js'

/**
 * Tool for listing all epics in the project with detailed statistics and parent idea context
 */
export class ListAllEpicsTool extends BaseTool {
    /**
     * Creates a new instance of ListAllEpicsTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'list_all_epics'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'List all epics in the project with parent idea context, task progress, completion rates, and status distribution'
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
     * Executes the epic listing with detailed statistics
     * @param args - The tool arguments (empty for this tool)
     * @returns The listing result with epic details and statistics
     */
    async execute(args: any): Promise<ToolResult> {
        const storage = await this.getStorage()

        const allEpics = await storage.loadAllEpics()

        if (allEpics.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[STATS] **All Epics Overview**

[ERROR] **No epics found**

[NOTE] **Get started:**
- **Create your first epic**: \`pm create epic "My First Epic"\`
- **View ideas**: \`pm list ideas\`
- **Initialize project**: \`pm init\` (if not done)

[TIP] **Pro tip**: Epics organize related tasks into logical implementation phases!`,
                    },
                ],
                metadata: {
                    entityType: 'epic',
                    operation: 'list',
                    operationSuccess: true,
                    totalCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    blockedCount: 0,
                    suggestedCommands: [
                        'pm create epic "My First Epic"',
                        'pm list ideas',
                        'pm init',
                    ],
                },
            }
        }

        const allTasks = await storage.loadAllTasks()

        const epicsWithStats = []
        for (const epic of allEpics) {
            const epicTasks = allTasks.filter((task) => task.epicId === epic.id)
            const completedTasks = epicTasks.filter(
                (t) => t.status === 'done'
            ).length
            const inProgressTasks = epicTasks.filter(
                (t) => t.status === 'in-progress'
            ).length
            const blockedTasks = epicTasks.filter(
                (t) => t.status === 'blocked'
            ).length

            const parentIdea = await storage.loadIdea(epic.ideaId)
            const ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'

            epicsWithStats.push({
                ...epic,
                ideaTitle,
                taskCount: epicTasks.length,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                progressPercent:
                    epicTasks.length > 0
                        ? Math.round((completedTasks / epicTasks.length) * 100)
                        : 0,
            })
        }

        epicsWithStats.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.createdAt.getTime() - a.createdAt.getTime()
        })

        const totalTasks = allTasks.length
        const completedTasksTotal = allTasks.filter(
            (t) => t.status === 'done'
        ).length
        const inProgressTasksTotal = allTasks.filter(
            (t) => t.status === 'in-progress'
        ).length
        const blockedTasksTotal = allTasks.filter(
            (t) => t.status === 'blocked'
        ).length

        const statusCounts = this.getStatusCounts(allEpics)
        const priorityCounts = this.getPriorityCounts(allEpics)

        const responseText = `[STATS] **All Epics Overview** (${allEpics.length} total)

**Summary Statistics:**
- **Total Tasks**: ${totalTasks}
- **Completed**: ${completedTasksTotal} (${totalTasks > 0 ? Math.round((completedTasksTotal / totalTasks) * 100) : 0}%)
- **In Progress**: ${inProgressTasksTotal}
- **Blocked**: ${blockedTasksTotal}

**Epic Status Distribution:**
${Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `- **${status}**: ${count}`)
    .join('\n')}

**Priority Distribution:**
${Object.entries(priorityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([priority, count]) => `- **${priority}**: ${count}`)
    .join('\n')}

**Epic Details:**
${epicsWithStats
    .map(
        (epic) =>
            `${this.getStatusIcon(epic.status)} **${epic.title}** (${epic.id})
  - **Idea**: ${epic.ideaTitle}
  - **Status**: ${epic.status} | **Priority**: ${epic.priority}
  - **Progress**: ${epic.completedTasks}/${epic.taskCount} tasks (${epic.progressPercent}%)
  - **Created**: ${epic.createdAt.toLocaleDateString()}
  ${epic.blockedTasks > 0 ? `  - [BLOCK] **${epic.blockedTasks} blocked tasks**` : ''}
  ${epic.inProgressTasks > 0 ? `  - [WAIT] **${epic.inProgressTasks} in progress**` : ''}`
    )
    .join('\n\n')}

**Quick Actions:**
- **Create new epic**: \`pm create epic "Epic Title"\`
- **View specific epic**: \`pm get_epic EPIC-ID\`
- **View all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`
- **View ideas**: \`pm list ideas\`

[TIP] **Pro tip**: Focus on epics with high priority and blocked tasks first!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'epic',
                operation: 'list',
                operationSuccess: true,
                totalCount: allEpics.length,
                completedCount: allEpics.filter((e) => e.status === 'done')
                    .length,
                inProgressCount: allEpics.filter(
                    (e) => e.status === 'in-progress'
                ).length,
                blockedCount: allEpics.filter((e) => e.status === 'blocked')
                    .length,
                totalTasks: totalTasks,
                completedTasks: completedTasksTotal,
                taskProgressPercent:
                    totalTasks > 0
                        ? Math.round((completedTasksTotal / totalTasks) * 100)
                        : 0,
                suggestedCommands: [
                    'pm create epic "Epic Title"',
                    'pm get_epic EPIC-ID',
                    'pm list tasks',
                    'pm next',
                ],
            },
        }
    }

    /**
     * Returns an appropriate status icon for the given status
     * @param status - The status string
     * @returns The status icon
     */
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

    /**
     * Calculates status distribution counts for epics
     * @param epics - Array of epics
     * @returns Object with status counts
     */
    private getStatusCounts(epics: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        epics.forEach((epic) => {
            counts[epic.status] = (counts[epic.status] || 0) + 1
        })
        return counts
    }

    /**
     * Calculates priority distribution counts for epics
     * @param epics - Array of epics
     * @returns Object with priority counts
     */
    private getPriorityCounts(epics: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        epics.forEach((epic) => {
            counts[epic.priority] = (counts[epic.priority] || 0) + 1
        })
        return counts
    }
}
