import { IdeaData, NavigationState } from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'
import { ScreenController } from '../base/screen-controller.js'
import { IdeasScreenModel } from './model.js'
import { IdeasScreenView } from './view.js'

/**
 * Controller for Ideas screen
 * Handles user input and coordinates between model and view
 */
export class IdeasScreenController extends ScreenController {
    private ideasModel: IdeasScreenModel
    private ideasView: IdeasScreenView

    constructor(
        databaseManager: DatabaseManager,
        navigationState: NavigationState,
        isLive: boolean,
        refreshInterval: number
    ) {
        const model = new IdeasScreenModel(databaseManager, navigationState)
        const view = new IdeasScreenView()

        super(model, view, isLive, refreshInterval)

        this.ideasModel = model
        this.ideasView = view
    }

    /**
     * Handle keyboard input for ideas screen
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
                return await this.handleSelectIdea()

            case 'BACKSPACE':
                return await this.handleGoBack()

            default:
                return false // Key not handled
        }
    }

    /**
     * Handle idea selection
     */
    async handleSelectIdea(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()
        const selectedIdea = this.ideasModel.getIdeaByIndex(
            navigationState.selectedIndex
        )

        if (!selectedIdea) {
            return true // No valid selection
        }

        // Update navigation state with selected idea
        navigationState.selectedIdea = selectedIdea
        navigationState.level = 'idea_details'
        navigationState.selectedIndex = -1

        return false // Signal that navigation should switch to idea details screen
    }

    /**
     * Handle going back to projects
     */
    async handleGoBack(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()

        // Clear idea selection and go back to projects
        navigationState.selectedProject = undefined
        navigationState.level = 'projects'
        navigationState.selectedIndex = -1

        return false // Signal that navigation should switch to projects screen
    }

    /**
     * Get current ideas data
     */
    protected getData(): IdeaData[] {
        return this.ideasModel.getIdeas()
    }

    /**
     * Get current items for navigation
     */
    protected getCurrentItems(): IdeaData[] {
        return this.ideasModel.getIdeas()
    }

    /**
     * Update selection after data load
     */
    protected updateSelection(): void {
        super.updateSelection()

        // Ensure we don't exceed bounds
        const ideaCount = this.ideasModel.getIdeaCount()
        const navigationState = this.model.getNavigationState()

        if (navigationState.selectedIndex >= ideaCount) {
            navigationState.selectedIndex = Math.max(0, ideaCount - 1)
        }
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(key: string): boolean {
        return key === 'CTRL_C' || key === 'q' || key === 'ESCAPE'
    }

    /**
     * Get selected idea
     */
    getSelectedIdea(): IdeaData | null {
        const navigationState = this.model.getNavigationState()
        return this.ideasModel.getIdeaByIndex(navigationState.selectedIndex)
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        const navigationState = this.model.getNavigationState()
        navigationState.selectedIndex = -1
        navigationState.selectedIdea = undefined
        this.updateSelection()
    }

    /**
     * Update navigation state
     */
    updateNavigationState(navigationState: NavigationState): void {
        this.model.updateNavigationState(navigationState)
    }
}
