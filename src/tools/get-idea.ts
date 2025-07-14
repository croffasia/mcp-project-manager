import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getIdeaSchema = z.object({
    ideaId: z.string(),
})

export class GetIdeaTool extends BaseTool {
    constructor() {
        super()
    }

    getName(): string {
        return 'get_idea'
    }

    getDescription(): string {
        return 'Retrieve detailed information about a specific idea including all epics, task counts, progress statistics, and current status'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                ideaId: { type: 'string', description: 'ID of the idea' },
            },
            required: ['ideaId'],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getIdeaSchema, args)
        const storage = await this.getStorage()

        // Load idea
        const idea = await storage.loadIdea(validatedArgs.ideaId)
        if (!idea) {
            throw new Error(`Idea ${validatedArgs.ideaId} not found`)
        }

        // Get epics statistics
        const epics = idea.epics || []
        const epicStats = this.getEpicStats(epics)

        // Get all tasks for this idea
        const allTasks = await storage.loadAllTasks()
        const ideaTasks = allTasks.filter((task) =>
            epics.some((epic) => epic.id === task.epicId)
        )
        const taskStats = this.getTaskStats(ideaTasks)

        const responseText = `[TIP] **Idea: "${idea.title}"**

**Basic Information:**
- **ID**: ${idea.id}
- **Status**: ${idea.status}
- **Priority**: ${idea.priority}
- **Created**: ${idea.createdAt.toLocaleDateString()}
- **Updated**: ${idea.updatedAt.toLocaleDateString()}

**Description:**
${idea.description}

**Epic Progress (${epics.length} epics):**
${epicStats}

**Task Summary (${ideaTasks.length} tasks):**
${taskStats}

**Progress Overview:**
${this.getProgressOverview(epics, ideaTasks)}

**Next Steps:**
- **Create new epic**: \`pm create epic "New Epic for ${idea.title}"\`
- **View all epics**: \`pm list epics\`
- **View all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`

**🤖 FOR AI SYSTEMS - CRITICAL:**
**If user asks you to EXECUTE or WORK ON any task from this idea, you MUST:**
1. **Use the task-execution-guide prompt first**: \`Use prompt task-execution-guide with task data\`
2. **Get full task details**: \`pm get_task [TASK-ID]\` before starting work  
3. **Follow the execution protocol strictly** - check dependencies, confirm understanding, follow DoD
4. **DO NOT start implementation without using the guide**

[TIP] **Pro tip**: Well-structured ideas have 2-4 epics with clear phases or components!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'idea',
                entityId: idea.id,
                operation: 'get',
                operationSuccess: true,
                epicsCount: epics.length,
                tasksCount: ideaTasks.length,
                completedTasks: ideaTasks.filter((t) => t.status === 'done')
                    .length,
                inProgressTasks: ideaTasks.filter(
                    (t) => t.status === 'in-progress'
                ).length,
                blockedTasks: ideaTasks.filter((t) => t.status === 'blocked')
                    .length,
                ideaStatus: idea.status,
                ideaPriority: idea.priority,
                progressPercent:
                    ideaTasks.length > 0
                        ? Math.round(
                              (ideaTasks.filter((t) => t.status === 'done')
                                  .length /
                                  ideaTasks.length) *
                                  100
                          )
                        : 0,
                suggestedCommands: [
                    `pm create epic "New Epic for ${idea.title}"`,
                    `pm list epics`,
                    `pm next`,
                ],
            },
        }
    }

    private getEpicStats(epics: any[]): string {
        if (epics.length === 0) {
            return '- No epics created yet\n- [NOTE] **Action needed**: Create epics to structure this idea'
        }

        const statusCounts: { [key: string]: number } = {}
        const priorityCounts: { [key: string]: number } = {}

        epics.forEach((epic) => {
            statusCounts[epic.status] = (statusCounts[epic.status] || 0) + 1
            priorityCounts[epic.priority] =
                (priorityCounts[epic.priority] || 0) + 1
        })

        const statusLines = Object.entries(statusCounts)
            .map(([status, count]) => `- **${status}**: ${count}`)
            .join('\n')

        const priorityLines = Object.entries(priorityCounts)
            .map(([priority, count]) => `- **${priority}**: ${count}`)
            .join('\n')

        return `**By Status:**
${statusLines}

**By Priority:**
${priorityLines}`
    }

    private getTaskStats(tasks: any[]): string {
        if (tasks.length === 0) {
            return '- No tasks created yet\n- [NOTE] **Action needed**: Create tasks within epics'
        }

        const statusCounts: { [key: string]: number } = {}
        const typeCounts: { [key: string]: number } = {}

        tasks.forEach((task) => {
            statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
            typeCounts[task.type] = (typeCounts[task.type] || 0) + 1
        })

        const statusLines = Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => `- **${status}**: ${count}`)
            .join('\n')

        const typeLines = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `- **${type}**: ${count}`)
            .join('\n')

        return `**By Status:**
${statusLines}

**By Type:**
${typeLines}`
    }

    private getProgressOverview(epics: any[], tasks: any[]): string {
        const overview = []

        if (epics.length === 0) {
            overview.push('[WIP] **Planning Phase**: No epics created yet')
        } else {
            const completedEpics = epics.filter(
                (e) => e.status === 'done'
            ).length
            const progressPercent = Math.round(
                (completedEpics / epics.length) * 100
            )
            overview.push(
                `[STATS] **Epic Progress**: ${completedEpics}/${epics.length} completed (${progressPercent}%)`
            )
        }

        if (tasks.length === 0) {
            overview.push('[NOTE] **Development Phase**: No tasks created yet')
        } else {
            const completedTasks = tasks.filter(
                (t) => t.status === 'done'
            ).length
            const inProgressTasks = tasks.filter(
                (t) => t.status === 'in-progress'
            ).length
            const progressPercent = Math.round(
                (completedTasks / tasks.length) * 100
            )

            overview.push(
                `[STATS] **Task Progress**: ${completedTasks}/${tasks.length} completed (${progressPercent}%)`
            )

            if (inProgressTasks > 0) {
                overview.push(
                    `[WAIT] **Active Work**: ${inProgressTasks} tasks in progress`
                )
            }
        }

        return overview.join('\n')
    }
}
