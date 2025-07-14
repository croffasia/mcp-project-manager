import { BaseTool, ToolResult } from './base.js'

/**
 * Tool for listing all ideas in the project with comprehensive statistics and progress tracking
 */
export class ListAllIdeasTool extends BaseTool {
    /**
     * Creates a new instance of ListAllIdeasTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'list_all_ideas'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'List all ideas in the project with epic counts, task progress statistics, priority distribution, and status breakdown'
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
     * Executes the idea listing with comprehensive statistics
     * @returns The listing result with idea details and statistics
     */
    async execute(): Promise<ToolResult> {
        const storage = await this.getStorage()

        const allIdeas = await storage.loadAllIdeas()

        if (allIdeas.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[TIP] **All Ideas Overview**

[ERROR] **No ideas found**

[NOTE] **Get started:**
- **Create your first idea**: \`pm create idea "My First Idea"\`
- **Initialize project**: \`pm init\` (if not done)

[TIP] **Pro tip**: Ideas are high-level features or concepts that contain epics and tasks!`,
                    },
                ],
                metadata: {
                    entityType: 'idea',
                    operation: 'list',
                    operationSuccess: true,
                    totalCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    blockedCount: 0,
                    totalEpics: 0,
                    totalTasks: 0,
                    suggestedCommands: [
                        'pm create idea "My First Idea"',
                        'pm init',
                    ],
                },
            }
        }

        const allEpics = await storage.loadAllEpics()
        const allTasks = await storage.loadAllTasks()

        const ideasWithStats = []
        for (const idea of allIdeas) {
            const ideaEpics = allEpics.filter((epic) => epic.ideaId === idea.id)
            const ideaTasks = allTasks.filter((task) =>
                ideaEpics.some((epic) => epic.id === task.epicId)
            )

            const completedTasks = ideaTasks.filter(
                (t) => t.status === 'done'
            ).length
            const inProgressTasks = ideaTasks.filter(
                (t) => t.status === 'in-progress'
            ).length
            const blockedTasks = ideaTasks.filter(
                (t) => t.status === 'blocked'
            ).length
            const completedEpics = ideaEpics.filter(
                (e) => e.status === 'done'
            ).length

            ideasWithStats.push({
                ...idea,
                epicCount: ideaEpics.length,
                taskCount: ideaTasks.length,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                completedEpics,
                taskProgressPercent:
                    ideaTasks.length > 0
                        ? Math.round((completedTasks / ideaTasks.length) * 100)
                        : 0,
                epicProgressPercent:
                    ideaEpics.length > 0
                        ? Math.round((completedEpics / ideaEpics.length) * 100)
                        : 0,
            })
        }

        ideasWithStats.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.createdAt.getTime() - a.createdAt.getTime()
        })

        const totalEpics = allEpics.length
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

        const statusCounts = this.getStatusCounts(allIdeas)
        const priorityCounts = this.getPriorityCounts(allIdeas)

        const responseText = `[TIP] **All Ideas Overview** (${allIdeas.length} total)

**Summary Statistics:**
- **Total Epics**: ${totalEpics}
- **Total Tasks**: ${totalTasks}
- **Completed Tasks**: ${completedTasksTotal} (${totalTasks > 0 ? Math.round((completedTasksTotal / totalTasks) * 100) : 0}%)
- **In Progress**: ${inProgressTasksTotal}
- **Blocked**: ${blockedTasksTotal}

**Idea Status Distribution:**
${Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `- **${status}**: ${count}`)
    .join('\n')}

**Priority Distribution:**
${Object.entries(priorityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([priority, count]) => `- **${priority}**: ${count}`)
    .join('\n')}

**Idea Details:**
${ideasWithStats
    .map(
        (idea) =>
            `${this.getStatusIcon(idea.status)} **${idea.title}** (${idea.id})
  - **Status**: ${idea.status} | **Priority**: ${idea.priority}
  - **Epics**: ${idea.completedEpics}/${idea.epicCount} completed (${idea.epicProgressPercent}%)
  - **Tasks**: ${idea.completedTasks}/${idea.taskCount} completed (${idea.taskProgressPercent}%)
  - **Created**: ${idea.createdAt.toLocaleDateString()}
  ${idea.blockedTasks > 0 ? `  - [BLOCK] **${idea.blockedTasks} blocked tasks**` : ''}
  ${idea.inProgressTasks > 0 ? `  - [WAIT] **${idea.inProgressTasks} in progress**` : ''}`
    )
    .join('\n\n')}

**Quick Actions:**
- **Create new idea**: \`pm create idea "Idea Title"\`
- **View specific idea**: \`pm get_idea IDEA-ID\`
- **View all epics**: \`pm list epics\`
- **View all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`

[TIP] **Pro tip**: Focus on high-priority ideas with blocked tasks to unblock development!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'idea',
                operation: 'list',
                operationSuccess: true,
                totalCount: allIdeas.length,
                completedCount: allIdeas.filter((i) => i.status === 'done')
                    .length,
                inProgressCount: allIdeas.filter(
                    (i) => i.status === 'in-progress'
                ).length,
                blockedCount: allIdeas.filter((i) => i.status === 'blocked')
                    .length,
                totalEpics: totalEpics,
                totalTasks: totalTasks,
                completedTasks: completedTasksTotal,
                taskProgressPercent:
                    totalTasks > 0
                        ? Math.round((completedTasksTotal / totalTasks) * 100)
                        : 0,
                suggestedCommands: [
                    'pm create idea "Idea Title"',
                    'pm get_idea IDEA-ID',
                    'pm list epics',
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
     * Calculates status distribution counts for ideas
     * @param ideas - Array of ideas
     * @returns Object with status counts
     */
    private getStatusCounts(ideas: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        ideas.forEach((idea) => {
            counts[idea.status] = (counts[idea.status] || 0) + 1
        })
        return counts
    }

    /**
     * Calculates priority distribution counts for ideas
     * @param ideas - Array of ideas
     * @returns Object with priority counts
     */
    private getPriorityCounts(ideas: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        ideas.forEach((idea) => {
            counts[idea.priority] = (counts[idea.priority] || 0) + 1
        })
        return counts
    }
}
