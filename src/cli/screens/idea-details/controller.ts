import { EpicData, NavigationState } from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'
import { ScreenController } from '../base/screen-controller.js'
import { IdeaDetailsScreenModel } from './model.js'
import { IdeaDetailsScreenView } from './view.js'

/**
 * Controller for Idea Details screen
 * Handles user input and coordinates between model and view
 */
export class IdeaDetailsScreenController extends ScreenController {
    private ideaDetailsModel: IdeaDetailsScreenModel
    private ideaDetailsView: IdeaDetailsScreenView

    constructor(
        databaseManager: DatabaseManager,
        navigationState: NavigationState,
        isLive: boolean,
        refreshInterval: number
    ) {
        const model = new IdeaDetailsScreenModel(
            databaseManager,
            navigationState
        )
        const view = new IdeaDetailsScreenView()

        super(model, view, isLive, refreshInterval)

        this.ideaDetailsModel = model
        this.ideaDetailsView = view
    }

    /**
     * Handle keyboard input for idea details screen
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
                return await this.handleSelectEpic()

            case 'BACKSPACE':
                return await this.handleGoBack()

            default:
                return false // Key not handled
        }
    }

    /**
     * Handle epic selection
     */
    async handleSelectEpic(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()
        const selectedEpic = this.ideaDetailsModel.getEpicByIndex(
            navigationState.selectedIndex
        )

        if (!selectedEpic) {
            return true // No valid selection
        }

        // Update navigation state with selected epic
        navigationState.selectedEpic = selectedEpic
        navigationState.level = 'epic_details'
        navigationState.selectedIndex = -1
        navigationState.epicSidebarScrollOffset = 0

        return false // Signal that navigation should switch to epic details screen
    }

    /**
     * Handle going back to ideas
     */
    async handleGoBack(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()

        // Clear epic selection and go back to ideas
        navigationState.selectedIdea = undefined
        navigationState.level = 'ideas'
        navigationState.selectedIndex = -1

        return false // Signal that navigation should switch to ideas screen
    }

    /**
     * Get current data for rendering
     */
    protected getData(): any {
        const idea = this.ideaDetailsModel.getSelectedIdea()
        const epics = this.ideaDetailsModel.getEpics()
        const statistics = this.ideaDetailsModel.getEpicStatistics()

        return {
            idea,
            epics,
            statistics,
        }
    }

    /**
     * Get current items for navigation
     */
    protected getCurrentItems(): EpicData[] {
        return this.ideaDetailsModel.getEpics()
    }

    /**
     * Update selection after data load
     */
    protected updateSelection(): void {
        super.updateSelection()

        // Ensure we don't exceed bounds
        const epicCount = this.ideaDetailsModel.getEpicCount()
        const navigationState = this.model.getNavigationState()

        if (navigationState.selectedIndex >= epicCount) {
            navigationState.selectedIndex = Math.max(0, epicCount - 1)
        }
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(key: string): boolean {
        return key === 'CTRL_C' || key === 'q' || key === 'ESCAPE'
    }

    /**
     * Get selected epic
     */
    getSelectedEpic(): EpicData | null {
        const navigationState = this.model.getNavigationState()
        return this.ideaDetailsModel.getEpicByIndex(
            navigationState.selectedIndex
        )
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        const navigationState = this.model.getNavigationState()
        navigationState.selectedIndex = -1
        navigationState.selectedEpic = undefined
        navigationState.epicSidebarScrollOffset = 0
        this.updateSelection()
    }

    /**
     * Update navigation state
     */
    updateNavigationState(navigationState: NavigationState): void {
        this.model.updateNavigationState(navigationState)
    }

    /**
     * Get current idea
     */
    getCurrentIdea() {
        return this.ideaDetailsModel.getSelectedIdea()
    }

    /**
     * Get epic statistics
     */
    getEpicStatistics() {
        return this.ideaDetailsModel.getEpicStatistics()
    }
}
