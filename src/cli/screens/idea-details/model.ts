import { EpicData, IdeaData } from '../../types/index.js'
import { ScreenModel } from '../base/screen-model.js'

/**
 * Model for Idea Details screen
 * Handles loading and managing idea details with associated epics
 */
export class IdeaDetailsScreenModel extends ScreenModel {
    private epics: EpicData[] = []
    private selectedIdea: IdeaData | null = null

    /**
     * Load epics data for the selected idea
     */
    async loadData(): Promise<void> {
        this.setLoading(true)
        this.clearError()

        try {
            const database = this.databaseManager.getCurrentDatabase()
            if (!database || !this.navigationState.selectedIdea) {
                this.epics = []
                return
            }

            this.selectedIdea = this.navigationState.selectedIdea

            // Load epics for the selected idea
            const epics = await database.getEpics(this.selectedIdea.id)

            // Load task counts for each epic
            for (const epic of epics) {
                try {
                    const taskCount = await database.getTaskCountForEpic(
                        epic.id
                    )
                    // Create a fake tasks array with the correct length for count purposes
                    epic.tasks = new Array(taskCount).fill(null)
                } catch (error) {
                    console.error(
                        `Error loading task count for epic ${epic.id}:`,
                        error
                    )
                    epic.tasks = []
                }
            }

            this.epics = epics
        } catch (error) {
            console.error('Error loading epics:', error)
            this.setError(
                error instanceof Error
                    ? error
                    : new Error('Failed to load epics')
            )
            this.epics = []
        } finally {
            this.setLoading(false)
        }
    }

    /**
     * Get current epics data
     */
    getEpics(): EpicData[] {
        return this.epics
    }

    /**
     * Get epic by index
     */
    getEpicByIndex(index: number): EpicData | null {
        if (index < 0 || index >= this.epics.length) {
            return null
        }
        return this.epics[index]
    }

    /**
     * Get selected idea
     */
    getSelectedIdea(): IdeaData | null {
        return this.selectedIdea || this.navigationState.selectedIdea || null
    }

    /**
     * Get total number of epics
     */
    getEpicCount(): number {
        return this.epics.length
    }

    /**
     * Check if epics list is empty
     */
    isEmpty(): boolean {
        return this.epics.length === 0
    }

    /**
     * Get epics grouped by status for display
     */
    getEpicsGroupedByStatus(): {
        pending: EpicData[]
        inProgress: EpicData[]
        blocked: EpicData[]
        completed: EpicData[]
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

        const sortByPriority = (a: EpicData, b: EpicData): number => {
            return getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
        }

        return {
            pending: this.epics
                .filter((epic) => epic.status === 'pending')
                .sort(sortByPriority),
            inProgress: this.epics
                .filter((epic) => epic.status === 'in_progress')
                .sort(sortByPriority),
            blocked: this.epics
                .filter((epic) => epic.status === 'blocked')
                .sort(sortByPriority),
            completed: this.epics
                .filter(
                    (epic) =>
                        epic.status === 'completed' || epic.status === 'done'
                )
                .sort(sortByPriority),
        }
    }

    /**
     * Calculate epic statistics for the idea
     */
    getEpicStatistics(): {
        total: number
        completed: number
        inProgress: number
        pending: number
        blocked: number
        completionPercentage: number
    } {
        const total = this.epics.length
        const completed = this.epics.filter(
            (epic) => epic.status === 'completed' || epic.status === 'done'
        ).length
        const inProgress = this.epics.filter(
            (epic) => epic.status === 'in_progress'
        ).length
        const pending = this.epics.filter(
            (epic) => epic.status === 'pending'
        ).length
        const blocked = this.epics.filter(
            (epic) => epic.status === 'blocked'
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
     * Refresh epics data
     */
    async refresh(): Promise<void> {
        await this.loadData()
    }
}
