import { EpicData, IdeaData, TaskData } from '../../types/index.js'
import { ScreenModel } from '../base/screen-model.js'

/**
 * Model for Task Details screen
 * Handles loading and managing task details with progress notes
 */
export class TaskDetailsScreenModel extends ScreenModel {
    private selectedTask:
        | (TaskData & { epic?: EpicData; idea?: IdeaData })
        | null = null
    private dependencyTasks: TaskData[] = []

    /**
     * Load task data with hierarchy information
     */
    async loadData(): Promise<void> {
        this.setLoading(true)
        this.clearError()

        try {
            const database = this.databaseManager.getCurrentDatabase()
            if (!database || !this.navigationState.selectedTask) {
                this.selectedTask = null
                return
            }

            // Get the selected task from navigation state
            this.selectedTask = this.navigationState.selectedTask

            // Load progress notes for the task if not already loaded
            if (!this.selectedTask.progress_notes) {
                await this.loadTaskProgressNotes()
            }

            // Load dependency tasks
            await this.loadDependencyTasks()
        } catch (error) {
            console.error('Error loading task details:', error)
            this.setError(
                error instanceof Error
                    ? error
                    : new Error('Failed to load task details')
            )
            this.selectedTask = null
        } finally {
            this.setLoading(false)
        }
    }

    /**
     * Load progress notes for the current task
     */
    private async loadTaskProgressNotes(): Promise<void> {
        if (!this.selectedTask) return

        const database = this.databaseManager.getCurrentDatabase()
        if (!database) return

        try {
            // Extract numeric ID from task ID (TSK-X, BUG-X, RND-X)
            const numericId = parseInt(this.selectedTask.id.split('-')[1])
            const progressNotes = await database.getProgressNotes(numericId)
            this.selectedTask.progress_notes = progressNotes
        } catch (error) {
            console.error('Error loading progress notes:', error)
            this.selectedTask.progress_notes = []
        }
    }

    /**
     * Get selected task with hierarchy
     */
    getSelectedTask():
        | (TaskData & { epic?: EpicData; idea?: IdeaData })
        | null {
        return this.selectedTask
    }

    /**
     * Check if task is loaded
     */
    hasTask(): boolean {
        return this.selectedTask !== null
    }

    /**
     * Get task type (Task, Bug, Research)
     */
    getTaskType(): string {
        if (!this.selectedTask) return 'Unknown'

        const taskId = this.selectedTask.id
        if (taskId.startsWith('TSK-')) return 'Task'
        if (taskId.startsWith('BUG-')) return 'Bug'
        if (taskId.startsWith('RND-')) return 'Research'
        return 'Task'
    }

    /**
     * Get task type icon
     */
    getTaskTypeIcon(): string {
        const type = this.getTaskType()
        switch (type) {
            case 'Task':
                return '📋'
            case 'Bug':
                return '🐛'
            case 'Research':
                return '🔬'
            default:
                return '📄'
        }
    }

    /**
     * Get progress notes
     */
    getProgressNotes(): any[] {
        return this.selectedTask?.progress_notes || []
    }

    /**
     * Get current epic context
     */
    getCurrentEpic(): EpicData | undefined {
        return this.selectedTask?.epic
    }

    /**
     * Get current idea context
     */
    getCurrentIdea(): IdeaData | undefined {
        return this.selectedTask?.idea
    }

    /**
     * Get scroll offsets from navigation state
     */
    getScrollOffsets(): {
        descriptionScrollOffset: number
        progressNotesScrollOffset: number
    } {
        return {
            descriptionScrollOffset:
                this.navigationState.descriptionScrollOffset || 0,
            progressNotesScrollOffset:
                this.navigationState.progressNotesScrollOffset || 0,
        }
    }

    /**
     * Update scroll offsets in navigation state
     */
    updateScrollOffsets(
        descriptionOffset?: number,
        progressNotesOffset?: number
    ): void {
        if (descriptionOffset !== undefined) {
            this.navigationState.descriptionScrollOffset = descriptionOffset
        }
        if (progressNotesOffset !== undefined) {
            this.navigationState.progressNotesScrollOffset = progressNotesOffset
        }
    }

    /**
     * Refresh task data
     */
    async refresh(): Promise<void> {
        await this.loadData()
    }

    /**
     * Check if task has progress notes
     */
    hasProgressNotes(): boolean {
        const notes = this.getProgressNotes()
        return notes && notes.length > 0
    }

    /**
     * Load dependency tasks for the current task
     */
    private async loadDependencyTasks(): Promise<void> {
        if (
            !this.selectedTask ||
            !this.selectedTask.dependencies ||
            this.selectedTask.dependencies.length === 0
        ) {
            this.dependencyTasks = []
            return
        }

        const database = this.databaseManager.getCurrentDatabase()
        if (!database) {
            this.dependencyTasks = []
            return
        }

        try {
            this.dependencyTasks = []
            for (const depId of this.selectedTask.dependencies) {
                try {
                    const task = await database.getTaskById(depId)
                    if (task) {
                        this.dependencyTasks.push(task)
                    }
                } catch (error) {
                    console.warn(
                        `Failed to load dependency task ${depId}:`,
                        error
                    )
                }
            }
        } catch (error) {
            console.error('Error loading dependency tasks:', error)
            this.dependencyTasks = []
        }
    }

    /**
     * Get dependency tasks
     */
    getDependencyTasks(): TaskData[] {
        return this.dependencyTasks
    }

    /**
     * Check if task has dependencies
     */
    hasDependencies(): boolean {
        return !!(
            this.selectedTask?.dependencies &&
            this.selectedTask.dependencies.length > 0
        )
    }
}
