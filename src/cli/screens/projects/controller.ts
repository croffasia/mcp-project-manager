import { ProjectData } from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'
import { ScreenController } from '../base/screen-controller.js'
import { ProjectsScreenModel } from './model.js'
import { ProjectsScreenView } from './view.js'

/**
 * Controller for Projects screen
 * Handles user input and coordinates between model and view
 */
export class ProjectsScreenController extends ScreenController {
    private projectsModel: ProjectsScreenModel
    private projectsView: ProjectsScreenView

    constructor(
        databaseManager: DatabaseManager,
        isLive: boolean,
        refreshInterval: number
    ) {
        const navigationState = {
            level: 'projects' as const,
            selectedIndex: -1,
        }

        const model = new ProjectsScreenModel(databaseManager, navigationState)
        const view = new ProjectsScreenView()

        super(model, view, isLive, refreshInterval)

        this.projectsModel = model
        this.projectsView = view
    }

    /**
     * Handle keyboard input for projects screen
     */
    async handleKeyPress(key: string): Promise<boolean> {
        // Handle exit keys
        if (this.isExitKey(key)) {
            return false // Let parent handle exit
        }

        // Handle refresh
        if (key === 'r' || key === 'F5') {
            await this.handleRefresh()
            return true
        }

        // Handle navigation
        switch (key) {
            case 'UP':
            case 'k':
                this.handleNavigateUp()
                this.render()
                return true

            case 'DOWN':
            case 'j':
                this.handleNavigateDown()
                this.render()
                return true

            case 'ENTER':
            case 'SPACE':
                return await this.handleSelectProject()

            case 'BACKSPACE':
                // Already at top level, cannot go back
                return true

            default:
                return false // Key not handled
        }
    }

    /**
     * Handle project selection
     */
    async handleSelectProject(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()
        const selectedProject = this.projectsModel.getProjectByIndex(
            navigationState.selectedIndex
        )

        if (!selectedProject) {
            return true // No valid selection
        }

        // Update navigation state with selected project
        navigationState.selectedProject = selectedProject
        navigationState.level = 'ideas'
        navigationState.selectedIndex = -1

        return false // Signal that navigation should switch to ideas screen
    }

    /**
     * Get current projects data
     */
    protected getData(): ProjectData[] {
        return this.projectsModel.getProjects()
    }

    /**
     * Get current items for navigation
     */
    protected getCurrentItems(): ProjectData[] {
        return this.projectsModel.getProjects()
    }

    /**
     * Update selection after data load
     */
    protected updateSelection(): void {
        super.updateSelection()

        // Ensure we don't exceed bounds
        const projectCount = this.projectsModel.getProjectCount()
        const navigationState = this.model.getNavigationState()

        if (navigationState.selectedIndex >= projectCount) {
            navigationState.selectedIndex = Math.max(0, projectCount - 1)
        }
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(key: string): boolean {
        return key === 'CTRL_C' || key === 'q' || key === 'ESCAPE'
    }

    /**
     * Get selected project
     */
    getSelectedProject(): ProjectData | null {
        const navigationState = this.model.getNavigationState()
        return this.projectsModel.getProjectByIndex(
            navigationState.selectedIndex
        )
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        const navigationState = this.model.getNavigationState()
        navigationState.selectedIndex = -1
        navigationState.selectedProject = undefined
        this.updateSelection()
    }
}
