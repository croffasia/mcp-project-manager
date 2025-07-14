import { IdeaData } from '../../types/index.js'
import { ScreenModel } from '../base/screen-model.js'

/**
 * Model for Ideas screen
 * Handles loading and managing ideas data from current project
 */
export class IdeasScreenModel extends ScreenModel {
    private ideas: IdeaData[] = []

    /**
     * Load ideas data from current project database
     */
    async loadData(): Promise<void> {
        this.setLoading(true)
        this.clearError()

        try {
            const database = this.databaseManager.getCurrentDatabase()
            if (!database) {
                this.ideas = []
                return
            }

            this.ideas = await database.getIdeas()
        } catch (error) {
            console.error('Error loading ideas:', error)
            this.setError(
                error instanceof Error
                    ? error
                    : new Error('Failed to load ideas')
            )
            this.ideas = []
        } finally {
            this.setLoading(false)
        }
    }

    /**
     * Get current ideas data
     */
    getIdeas(): IdeaData[] {
        return this.ideas
    }

    /**
     * Get idea by index
     */
    getIdeaByIndex(index: number): IdeaData | null {
        if (index < 0 || index >= this.ideas.length) {
            return null
        }
        return this.ideas[index]
    }

    /**
     * Get total number of ideas
     */
    getIdeaCount(): number {
        return this.ideas.length
    }

    /**
     * Check if ideas list is empty
     */
    isEmpty(): boolean {
        return this.ideas.length === 0
    }

    /**
     * Refresh ideas data
     */
    async refresh(): Promise<void> {
        await this.loadData()
    }

    /**
     * Get current project name for display
     */
    getCurrentProjectName(): string {
        const selectedProject = this.navigationState.selectedProject
        return selectedProject ? selectedProject.name : 'Unknown Project'
    }
}
