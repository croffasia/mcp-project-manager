import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getEpicSchema = z.object({
    epicId: z.string(),
})

export class GetEpicTool extends BaseTool {
    constructor() {
        super()
    }

    getName(): string {
        return 'get_epic'
    }

    getDescription(): string {
        return 'Retrieve detailed information about a specific epic including all tasks, progress statistics, parent idea, and completion status'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                epicId: { type: 'string', description: 'ID of the epic' },
            },
            required: ['epicId'],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getEpicSchema, args)
        const storage = await this.getStorage()

        // Load epic
        const epic = await storage.loadEpic(validatedArgs.epicId)
        if (!epic) {
            throw new Error(`Epic ${validatedArgs.epicId} not found`)
        }

        // Load parent idea
        const parentIdea = await storage.loadIdea(epic.ideaId)
        const ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'

        // Get tasks for this epic
        const allTasks = await storage.loadAllTasks()
        const epicTasks = allTasks.filter((task) => task.epicId === epic.id)

        // Load dependencies for each task
        const tasksWithDependencies = await Promise.all(
            epicTasks.map(async (task) => {
                if (!task.dependencies || task.dependencies.length === 0) {
                    return { ...task, dependencyTasks: [] }
                }

                const dependencyTasks = []
                for (const depId of task.dependencies) {
                    try {
                        const depTask = allTasks.find((t) => t.id === depId)
                        if (depTask) {
                            dependencyTasks.push(depTask)
                        }
                    } catch (error) {
                        console.warn(
                            `Failed to load dependency task ${depId}:`,
                            error
                        )
                    }
                }

                return { ...task, dependencyTasks }
            })
        )

        const taskStats = this.getTaskStats(epicTasks)

        const responseText = `[STATS] **Epic: "${epic.title}"**

**Basic Information:**
- **ID**: ${epic.id}
- **Parent Idea**: ${ideaTitle}
- **Status**: ${epic.status}
- **Priority**: ${epic.priority}
- **Created**: ${epic.createdAt.toLocaleDateString()}
- **Updated**: ${epic.updatedAt.toLocaleDateString()}

**Description:**
${epic.description}

**Task Progress (${epicTasks.length} tasks):**
${taskStats}

**Progress Overview:**
${this.getProgressOverview(epicTasks)}

**Task Details:**
${this.getTaskDetails(tasksWithDependencies)}

**Next Steps:**
- **Create new task**: \`pm create task "New Task for ${epic.title}"\`
- **View parent idea**: \`pm get_idea ${epic.ideaId}\`
- **View all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`

**🤖 FOR AI SYSTEMS - CRITICAL:**
**If user asks you to EXECUTE or WORK ON any task from this epic, you MUST:**
1. **Use the task-execution-guide prompt first**: \`Use prompt task-execution-guide with task data\`
2. **Get full task details**: \`pm get_task [TASK-ID]\` before starting work
3. **Follow the execution protocol strictly** - check dependencies, confirm understanding, follow DoD
4. **DO NOT start implementation without using the guide**

[TIP] **Pro tip**: Well-structured epics have 3-8 specific, actionable tasks!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'epic',
                entityId: epic.id,
                operation: 'get',
                operationSuccess: true,
                tasksCount: epicTasks.length,
                completedTasks: epicTasks.filter((t) => t.status === 'done')
                    .length,
                inProgressTasks: epicTasks.filter(
                    (t) => t.status === 'in-progress'
                ).length,
                blockedTasks: epicTasks.filter((t) => t.status === 'blocked')
                    .length,
                progressPercent:
                    epicTasks.length > 0
                        ? Math.round(
                              (epicTasks.filter((t) => t.status === 'done')
                                  .length /
                                  epicTasks.length) *
                                  100
                          )
                        : 0,
                epicStatus: epic.status,
                epicPriority: epic.priority,
                parentIdeaId: epic.ideaId,
                suggestedCommands: [
                    `pm create task "New Task for ${epic.title}"`,
                    `pm get_idea ${epic.ideaId}`,
                    `pm next`,
                ],
            },
        }
    }

    private getTaskStats(tasks: any[]): string {
        if (tasks.length === 0) {
            return '- No tasks created yet\n- [NOTE] **Action needed**: Create tasks to implement this epic'
        }

        const statusCounts: { [key: string]: number } = {}
        const typeCounts: { [key: string]: number } = {}
        const priorityCounts: { [key: string]: number } = {}

        tasks.forEach((task) => {
            statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
            typeCounts[task.type] = (typeCounts[task.type] || 0) + 1
            priorityCounts[task.priority] =
                (priorityCounts[task.priority] || 0) + 1
        })

        const statusLines = Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => `- **${status}**: ${count}`)
            .join('\n')

        const typeLines = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `- **${type}**: ${count}`)
            .join('\n')

        const priorityLines = Object.entries(priorityCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([priority, count]) => `- **${priority}**: ${count}`)
            .join('\n')

        return `**By Status:**
${statusLines}

**By Type:**
${typeLines}

**By Priority:**
${priorityLines}`
    }

    private getProgressOverview(tasks: any[]): string {
        if (tasks.length === 0) {
            return '[WIP] **Planning Phase**: No tasks created yet'
        }

        const completedTasks = tasks.filter((t) => t.status === 'done').length
        const inProgressTasks = tasks.filter(
            (t) => t.status === 'in-progress'
        ).length
        const blockedTasks = tasks.filter((t) => t.status === 'blocked').length
        const pendingTasks = tasks.filter((t) => t.status === 'pending').length

        const progressPercent = Math.round(
            (completedTasks / tasks.length) * 100
        )

        const overview = []
        overview.push(
            `[STATS] **Overall Progress**: ${completedTasks}/${tasks.length} completed (${progressPercent}%)`
        )

        if (inProgressTasks > 0) {
            overview.push(
                `[WAIT] **Active Work**: ${inProgressTasks} tasks in progress`
            )
        }

        if (blockedTasks > 0) {
            overview.push(
                `[BLOCK] **Blocked Tasks**: ${blockedTasks} tasks need attention`
            )
        }

        if (pendingTasks > 0) {
            overview.push(
                `⏸️ **Pending Tasks**: ${pendingTasks} tasks ready to start`
            )
        }

        // Add recommendations
        if (progressPercent === 100) {
            overview.push('[OK] **Epic Complete**: All tasks finished!')
        } else if (progressPercent >= 75) {
            overview.push(
                '[FOCUS] **Near Completion**: Focus on remaining tasks'
            )
        } else if (progressPercent >= 50) {
            overview.push('[STRONG] **Good Progress**: Keep up the momentum')
        } else if (progressPercent >= 25) {
            overview.push(
                '[START] **Getting Started**: More tasks need attention'
            )
        } else {
            overview.push(
                '[NOTE] **Early Stage**: Consider breaking down complex tasks'
            )
        }

        return overview.join('\n')
    }

    private getTaskDetails(tasks: any[]): string {
        if (tasks.length === 0) {
            return '- No tasks to display'
        }

        if (tasks.length <= 5) {
            // Show all tasks if there are few
            return tasks
                .map((task) => this.formatTaskWithDependencies(task))
                .join('\n')
        } else {
            // Show only active tasks
            const activeTasks = tasks.filter(
                (t) => t.status === 'in-progress' || t.status === 'blocked'
            )

            if (activeTasks.length === 0) {
                return `- ${tasks.length} tasks total - use \`pm list tasks\` to see all`
            }

            const activeLines = activeTasks
                .map((task) => this.formatTaskWithDependencies(task))
                .join('\n')

            return `**Active Tasks:**
${activeLines}

*Use \`pm list tasks\` to see all ${tasks.length} tasks*`
        }
    }

    private formatTaskWithDependencies(task: any): string {
        const statusIcon = this.getStatusIcon(task.status)
        let result = `- ${statusIcon} **${task.title}** (${task.id}) - ${task.status} - ${task.priority} priority`

        if (task.dependencyTasks && task.dependencyTasks.length > 0) {
            const blockedDeps = task.dependencyTasks.filter(
                (dep: any) => dep.status !== 'done'
            )
            const completedDeps = task.dependencyTasks.filter(
                (dep: any) => dep.status === 'done'
            )

            const depInfo = task.dependencyTasks
                .map((dep: any) => {
                    const depIcon = this.getStatusIcon(dep.status)
                    const blocking = dep.status !== 'done' ? ' ⚠️' : ''
                    return `${depIcon} ${dep.id}(${dep.status})${blocking}`
                })
                .join(', ')

            result += `\n  └── Depends on: ${depInfo}`

            if (blockedDeps.length > 0) {
                result += `\n      ⚠️ **${blockedDeps.length}/${task.dependencyTasks.length} dependencies blocking this task**`
            } else {
                result += `\n      ✅ **All dependencies completed - ready to start**`
            }
        }

        return result
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
}
