import { EpicData, IdeaData, TaskData } from '../../types/index.js'
import { ScreenModel } from '../base/screen-model.js'

/**
 * Model for Epic Details screen
 * Handles loading and managing epic details with associated tasks
 */
export class EpicDetailsScreenModel extends ScreenModel {
    private tasks: TaskData[] = []
    private selectedEpic: EpicData | null = null

    /**
     * Load tasks data for the selected epic
     */
    async loadData(): Promise<void> {
        this.setLoading(true)
        this.clearError()

        try {
            const database = this.databaseManager.getCurrentDatabase()
            if (!database || !this.navigationState.selectedEpic) {
                this.tasks = []
                return
            }

            this.selectedEpic = this.navigationState.selectedEpic

            // Load tasks for the selected epic
            const tasks = await database.getTasks(this.selectedEpic.id)
            // Sort tasks by status and priority to match display order
            this.tasks = this.sortTasks(tasks)
        } catch (error) {
            console.error('Error loading tasks:', error)
            this.setError(
                error instanceof Error
                    ? error
                    : new Error('Failed to load tasks')
            )
            this.tasks = []
        } finally {
            this.setLoading(false)
        }
    }

    /**
     * Get current tasks data
     */
    getTasks(): TaskData[] {
        return this.tasks
    }

    /**
     * Get task by index
     */
    getTaskByIndex(index: number): TaskData | null {
        if (index < 0 || index >= this.tasks.length) {
            return null
        }
        return this.tasks[index]
    }

    /**
     * Get selected epic
     */
    getSelectedEpic(): EpicData | null {
        return this.selectedEpic || this.navigationState.selectedEpic || null
    }

    /**
     * Get total number of tasks
     */
    getTaskCount(): number {
        return this.tasks.length
    }

    /**
     * Check if tasks list is empty
     */
    isEmpty(): boolean {
        return this.tasks.length === 0
    }

    /**
     * Get tasks grouped by status for display
     */
    getTasksGroupedByStatus(): {
        pending: TaskData[]
        inProgress: TaskData[]
        blocked: TaskData[]
        completed: TaskData[]
    } {
        const getPriorityOrder = (priority: string): number => {
            switch (priority) {
                case 'high':
                    return 3
                case 'medium':
                    return 2
                case 'low':
                    return 1
                default:
                    return 0
            }
        }

        const sortByPriority = (a: TaskData, b: TaskData): number => {
            return getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
        }

        return {
            pending: this.tasks
                .filter((task) => task.status === 'pending')
                .sort(sortByPriority),
            inProgress: this.tasks
                .filter((task) => task.status === 'in_progress')
                .sort(sortByPriority),
            blocked: this.tasks
                .filter((task) => task.status === 'blocked')
                .sort(sortByPriority),
            completed: this.tasks
                .filter(
                    (task) =>
                        task.status === 'completed' || task.status === 'done'
                )
                .sort(sortByPriority),
        }
    }

    /**
     * Calculate task statistics for the epic
     */
    getTaskStatistics(): {
        total: number
        completed: number
        inProgress: number
        pending: number
        blocked: number
        completionPercentage: number
    } {
        const total = this.tasks.length
        const completed = this.tasks.filter(
            (task) => task.status === 'completed' || task.status === 'done'
        ).length
        const inProgress = this.tasks.filter(
            (task) => task.status === 'in_progress'
        ).length
        const pending = this.tasks.filter(
            (task) => task.status === 'pending'
        ).length
        const blocked = this.tasks.filter(
            (task) => task.status === 'blocked'
        ).length

        const completionPercentage =
            total > 0 ? Math.round((completed / total) * 100) : 0

        return {
            total,
            completed,
            inProgress,
            pending,
            blocked,
            completionPercentage,
        }
    }

    /**
     * Sort tasks by status and priority (same logic as original EpicDetailsView)
     */
    private sortTasks(tasks: TaskData[]): TaskData[] {
        const getPriorityOrder = (priority: string): number => {
            switch (priority) {
                case 'high':
                    return 3
                case 'medium':
                    return 2
                case 'low':
                    return 1
                default:
                    return 0
            }
        }

        // Group and sort tasks by status and priority
        const pendingTasks = tasks
            .filter((task) => task.status === 'pending')
            .sort(
                (a, b) =>
                    getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
            )

        const inProgressTasks = tasks
            .filter((task) => task.status === 'in_progress')
            .sort(
                (a, b) =>
                    getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
            )

        const blockedTasks = tasks
            .filter((task) => task.status === 'blocked')
            .sort(
                (a, b) =>
                    getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
            )

        const completedTasks = tasks
            .filter(
                (task) => task.status === 'completed' || task.status === 'done'
            )
            .sort(
                (a, b) =>
                    getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
            )

        return [
            ...pendingTasks,
            ...inProgressTasks,
            ...blockedTasks,
            ...completedTasks,
        ]
    }

    /**
     * Get current idea context
     */
    getCurrentIdea() {
        return this.navigationState.selectedIdea
    }

    /**
     * Load task with full hierarchy information
     */
    async loadTaskWithHierarchy(
        taskId: string
    ): Promise<(TaskData & { epic?: EpicData; idea?: IdeaData }) | null> {
        const database = this.databaseManager.getCurrentDatabase()
        if (!database) return null

        try {
            return await database.getTaskWithHierarchy(taskId)
        } catch (error) {
            console.error('Error loading task with hierarchy:', error)
            return null
        }
    }

    /**
     * Refresh tasks data
     */
    async refresh(): Promise<void> {
        await this.loadData()
    }
}
