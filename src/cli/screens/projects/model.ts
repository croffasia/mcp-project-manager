import { GlobalProjectRegistry } from '../../../global-registry.js'
import { ProjectData } from '../../types/index.js'
import { ScreenModel } from '../base/screen-model.js'

/**
 * Model for Projects screen
 * Handles loading and managing projects data
 */
export class ProjectsScreenModel extends ScreenModel {
    private projects: ProjectData[] = []

    /**
     * Load projects data from global registry
     */
    async loadData(): Promise<void> {
        this.setLoading(true)
        this.clearError()

        try {
            const registry = GlobalProjectRegistry.getInstance()
            this.projects = await registry.getAllProjects()
        } catch (error) {
            console.error('Error loading projects:', error)
            this.setError(
                error instanceof Error
                    ? error
                    : new Error('Failed to load projects')
            )
            this.projects = []
        } finally {
            this.setLoading(false)
        }
    }

    /**
     * Get current projects data
     */
    getProjects(): ProjectData[] {
        return this.projects
    }

    /**
     * Get project by index
     */
    getProjectByIndex(index: number): ProjectData | null {
        if (index < 0 || index >= this.projects.length) {
            return null
        }
        return this.projects[index]
    }

    /**
     * Get total number of projects
     */
    getProjectCount(): number {
        return this.projects.length
    }

    /**
     * Check if projects list is empty
     */
    isEmpty(): boolean {
        return this.projects.length === 0
    }

    /**
     * Refresh projects data
     */
    async refresh(): Promise<void> {
        await this.loadData()
    }
}
