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

    getName(): string {
        return 'next_task'
    }

    getDescription(): string {
        return 'Get the next optimal task to work on based on priority, dependencies, and project workflow'
    }

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
                        text: `[BLOCK] **No tasks found**

[NOTE] **Get started:**
- **Create your first task**: \`pm create task "My First Task"\`
- **View all tasks**: \`pm list tasks\`
- **Initialize project**: \`pm init\` (if not done)

[TIP] **Pro tip**: Create tasks within epics to organize your work!`,
                    },
                ],
                metadata: {
                    entityType: 'task',
                    operation: 'get',
                    operationSuccess: false,
                    reason: 'no_tasks_found',
                    totalTasks: 0,
                    availableTasks: 0,
                    suggestedCommands: [
                        'pm create task "My First Task"',
                        'pm list tasks',
                        'pm init',
                    ],
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

            noTasksMessage += `

**Current task status:**
- **Pending**: ${pendingTasks.length} tasks
- **In Progress**: ${inProgressTasks.length} tasks
- **Blocked**: ${blockedTasks.length} tasks

**Suggestions:**
- **View all tasks**: \`pm list tasks\`
- **Create new task**: \`pm create task "New Task"\`
- **Remove filters**: \`pm next\` (without filters)`

            return {
                content: [
                    {
                        type: 'text',
                        text: noTasksMessage,
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
                    suggestedCommands: [
                        'pm list tasks',
                        'pm create task "New Task"',
                        'pm next',
                    ],
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
                        text: `[BLOCK] **No tasks available - all have blocked dependencies**

**Recommendations:**
- **View dependencies**: Check which tasks are blocking others
- **Work on dependencies**: Focus on unblocking dependent tasks
- **View all tasks**: \`pm list tasks\`
- **Create independent task**: \`pm create task "Independent Task"\`

[TIP] **Pro tip**: Resolve blocked dependencies to unlock more work!`,
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
                    suggestedCommands: [
                        'pm list tasks',
                        'pm create task "Independent Task"',
                    ],
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

        // Analyze task
        const taskAnalysis = this.analyzeTask(
            nextTask,
            availableTasks.length,
            taskDependencies
        )

        const responseText = `[FOCUS] **Next Task Recommendation**

**[NOTE] Task: "${nextTask.title}"**
- **ID**: ${nextTask.id}
- **Idea**: ${ideaTitle}
- **Epic**: ${epicTitle}
- **Priority**: ${nextTask.priority} | **Type**: ${nextTask.type}
- **Status**: ${nextTask.status}
- **Created**: ${nextTask.createdAt.toLocaleDateString()}

**Description:**
${nextTask.description}

**Dependencies (${taskDependencies.length}):**
${this.formatTaskDependencies(taskDependencies)}

**Task Analysis:**
${taskAnalysis}

**🎯 RECOMMENDED AI WORKFLOW:**
1. **BEFORE STARTING**: Update task status to "in-progress" and add progress note
   - \`pm update task ${nextTask.id} status in-progress progressNote "Starting task analysis and implementation planning" progressType update\`

2. **DURING WORK**: Add progress notes at key milestones
   - \`pm update task ${nextTask.id} progressNote "Completed initial analysis" progressType update\`
   - \`pm update task ${nextTask.id} progressNote "Implementation 50% complete" progressType update\`
   - \`pm update task ${nextTask.id} progressNote "Encountered blocker: XYZ" progressType blocker\`

3. **WHEN COMPLETE**: Mark task as done with completion note
   - \`pm update task ${nextTask.id} status done progressNote "Task completed successfully - all Definition of Done items checked" progressType completion\`

**Quick Actions:**
- **Start working**: \`pm update task ${nextTask.id} status in-progress\`
- **Add progress**: \`pm update task ${nextTask.id} progress "Started working on task"\`
- **View full details**: \`pm get_task ${nextTask.id}\`
- **Check dependencies**: \`pm get_dependencies ${nextTask.id}\`
- **View epic context**: \`pm get_epic ${nextTask.epicId}\`

**Available Tasks**: ${availableTasks.length} tasks ready to work on

[TIP] **For AI agents**: Always update task status and add progress notes to maintain visibility into development progress. The task description includes Definition of Done checklist items to guide completion.`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
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
                hasDependencies: !!(
                    nextTask.dependencies && nextTask.dependencies.length > 0
                ),
                filterPriority: validatedArgs.priority,
                suggestedCommands: [
                    `pm update task ${nextTask.id} status in-progress`,
                    `pm update task ${nextTask.id} progress "Started working on task"`,
                    `pm get_task ${nextTask.id}`,
                    `pm get_dependencies ${nextTask.id}`,
                ],
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

    private analyzeTask(
        task: any,
        totalAvailable: number,
        dependencies: any[]
    ): string {
        const analysis = []

        // Priority analysis
        switch (task.priority) {
            case 'high':
                analysis.push(
                    '[HIGH] **High priority** - should be tackled first'
                )
                break
            case 'medium':
                analysis.push(
                    '[FAST] **Medium priority** - good balance of importance and effort'
                )
                break
            case 'low':
                analysis.push(
                    '[LIST] **Low priority** - work on when time permits'
                )
                break
        }

        // Dependencies analysis
        if (dependencies.length > 0) {
            const completedDeps = dependencies.filter(
                (d) => d.status === 'done'
            ).length
            const blockedDeps = dependencies.filter(
                (d) => d.status === 'blocked'
            ).length
            const inProgressDeps = dependencies.filter(
                (d) => d.status === 'in-progress'
            ).length

            if (completedDeps === dependencies.length) {
                analysis.push(
                    '[OK] **All dependencies completed** - ready to start'
                )
            } else if (blockedDeps > 0) {
                analysis.push(
                    `[BLOCK] **${blockedDeps} dependencies are blocked** - cannot proceed`
                )
            } else if (inProgressDeps > 0) {
                analysis.push(
                    `[WAIT] **${inProgressDeps} dependencies in progress** - wait for completion`
                )
            } else {
                analysis.push(
                    `[DEPS] **${completedDeps}/${dependencies.length} dependencies done** - check status`
                )
            }
        } else {
            analysis.push('[FREE] **No dependencies** - can start immediately')
        }

        // Context of available tasks
        if (totalAvailable > 1) {
            analysis.push(
                `[FOCUS] **Selected from ${totalAvailable} available tasks** - optimally prioritized`
            )
        }

        return analysis.join('\n')
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

    private formatTaskDependencies(dependencies: any[]): string {
        if (dependencies.length === 0) {
            return '[FREE] No dependencies - ready to start immediately'
        }

        const depLines = dependencies
            .map((dep) => {
                const statusIcon = this.getStatusIcon(dep.status)
                return `- ${statusIcon} **${dep.title}** (${dep.id}) - ${dep.status} - ${dep.priority} priority`
            })
            .join('\n')

        const completedDeps = dependencies.filter(
            (d) => d.status === 'done'
        ).length
        const blockedDeps = dependencies.filter(
            (d) => d.status === 'blocked'
        ).length
        const inProgressDeps = dependencies.filter(
            (d) => d.status === 'in-progress'
        ).length

        let statusSummary = ''
        if (completedDeps === dependencies.length) {
            statusSummary =
                '\n[OK] **All dependencies completed** - task is ready to start!'
        } else if (blockedDeps > 0) {
            statusSummary = `\n[BLOCK] **WARNING: ${blockedDeps} dependencies are blocked** - cannot proceed until resolved`
        } else if (inProgressDeps > 0) {
            statusSummary = `\n[WAIT] **${inProgressDeps} dependencies in progress** - wait for completion before starting`
        } else {
            statusSummary = `\n[DEPS] **Progress: ${completedDeps}/${dependencies.length} completed** - check remaining dependencies`
        }

        return depLines + statusSummary
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
