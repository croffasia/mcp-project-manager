import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getTaskSchema = z.object({
    taskId: z.string(),
})

export class GetTaskTool extends BaseTool {
    constructor() {
        super()
    }

    getName(): string {
        return 'get_task'
    }

    getDescription(): string {
        return 'Retrieve detailed information about a specific task including dependencies, progress notes, parent epic, and full context'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'ID of the task' },
            },
            required: ['taskId'],
        }
    }

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

        const responseText = `[TASK] "${task.title}"

**Basic Information:**
- **ID**: ${task.id}
- **Parent Epic**: ${epicTitle}
- **Parent Idea**: ${ideaTitle}
- **Type**: ${task.type}
- **Status**: ${task.status}
- **Priority**: ${task.priority}
- **Created**: ${task.createdAt.toLocaleDateString()}
- **Updated**: ${task.updatedAt.toLocaleDateString()}

**Description:**
${task.description}

**Dependencies (${dependencies.length}):**
${this.formatDependencies(dependencies)}

**Progress Notes (${progressNotes.length}):**
${this.formatProgressNotes(progressNotes)}

**Task Analysis:**
${this.analyzeTask(task)}

**Next Steps:**
- **Update status**: \`pm update task ${task.id} status in-progress\`
- **Add progress**: \`pm update task ${task.id} progress "Current progress update"\`
- **View dependencies**: \`pm get_dependencies ${task.id}\`
- **View parent epic**: \`pm get_epic ${task.epicId}\`

**🤖 FOR AI SYSTEMS - CRITICAL:**
**If user asks you to EXECUTE or WORK ON this task, you MUST:**
1. **Use the task-execution-guide prompt first**: \`Use prompt task-execution-guide with task data\`
2. **Follow the execution protocol strictly** - check dependencies, confirm understanding, follow DoD
3. **DO NOT start implementation without using the guide**

[TIP] Pro tip: Update progress regularly to track your work effectively!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'task',
                entityId: task.id,
                operation: 'get',
                operationSuccess: true,
                taskStatus: task.status,
                taskPriority: task.priority,
                taskType: task.type,
                dependenciesCount: dependencies.length,
                progressNotesCount: progressNotes.length,
                parentEpicId: task.epicId,
                suggestedCommands: [
                    `pm update task ${task.id} status in-progress`,
                    `pm update task ${task.id} progress "Current progress update"`,
                    `pm get_dependencies ${task.id}`,
                ],
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

    private formatDependencies(dependencies: any[]): string {
        if (dependencies.length === 0) {
            return '[FREE] No dependencies - ready to start immediately'
        }

        const depLines = dependencies
            .map((dep) => {
                const statusIcon = this.getStatusIcon(dep.status)
                const blockingIndicator =
                    dep.status !== 'done' ? ' ⚠️ **BLOCKING**' : ''
                return `- ${statusIcon} **${dep.title}** (${dep.id}) - ${dep.status} - ${dep.priority} priority${blockingIndicator}`
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
        const pendingDeps = dependencies.filter(
            (d) => d.status === 'pending'
        ).length

        let statusSummary = ''
        if (completedDeps === dependencies.length) {
            statusSummary =
                '\n\n[OK] **All dependencies completed** - task is ready to start!'
        } else if (blockedDeps > 0) {
            statusSummary = `\n\n[BLOCK] **CRITICAL: ${blockedDeps} dependencies are blocked** - cannot proceed until resolved`
            statusSummary += `\n💡 **Action needed**: Focus on unblocking dependencies first`
        } else if (inProgressDeps > 0) {
            statusSummary = `\n\n[WAIT] **${inProgressDeps} dependencies in progress** - wait for completion before starting`
            statusSummary += `\n💡 **Suggestion**: Monitor progress of active dependencies`
        } else if (pendingDeps > 0) {
            statusSummary = `\n\n[DEPS] **${pendingDeps} dependencies pending** - start dependent tasks first`
            statusSummary += `\n💡 **Action needed**: Work on pending dependencies before this task`
        }

        statusSummary += `\n\n**Dependency Status Overview:**`
        statusSummary += `\n- ✅ **Completed**: ${completedDeps}/${dependencies.length}`
        if (inProgressDeps > 0)
            statusSummary += `\n- 🔄 **In Progress**: ${inProgressDeps}`
        if (pendingDeps > 0)
            statusSummary += `\n- ⏸️ **Pending**: ${pendingDeps}`
        if (blockedDeps > 0)
            statusSummary += `\n- ❌ **Blocked**: ${blockedDeps}`

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

    private formatProgressNotes(notes: any[]): string {
        if (notes.length === 0) {
            return '- No progress notes yet\n- [NOTE] Suggestion: Add notes to track your work'
        }

        if (notes.length <= 3) {
            return notes
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
                .map(
                    (note) =>
                        `- **${new Date(note.timestamp).toLocaleDateString()}**: ${note.content}`
                )
                .join('\n')
        } else {
            const recentNotes = notes
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
                .slice(0, 3)

            const recentLines = recentNotes
                .map(
                    (note) =>
                        `- **${new Date(note.timestamp).toLocaleDateString()}**: ${note.content}`
                )
                .join('\n')

            return `**Recent progress:**
${recentLines}

*${notes.length - 3} older notes - view full history in task details*`
        }
    }

    private analyzeTask(task: any): string {
        const analysis = []

        // Status analysis
        switch (task.status) {
            case 'pending':
                analysis.push(
                    '[READY] Ready to start - consider beginning work'
                )
                break
            case 'in-progress':
                analysis.push(
                    '[ACTIVE] Active work - add regular progress updates'
                )
                break
            case 'blocked':
                analysis.push('[BLOCK] Blocked - resolve blockers to continue')
                break
            case 'done':
                analysis.push('[OK] Completed - task finished successfully')
                break
            case 'deferred':
                analysis.push('[DEFER] Deferred - scheduled for later work')
                break
        }

        // Priority analysis
        if (task.priority === 'high') {
            analysis.push('[HIGH] High priority - focus on this task')
        } else if (task.priority === 'low') {
            analysis.push('[LOW] Low priority - work on when time permits')
        }

        // Dependencies analysis
        if (task.dependencies && task.dependencies.length > 0) {
            analysis.push(
                `[DEPS] Has ${task.dependencies.length} dependencies - check completion status above`
            )
        }

        return analysis.join('\n')
    }
}
