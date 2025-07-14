import { NavigationState, TaskData } from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'
import { ScreenController } from '../base/screen-controller.js'
import { EpicDetailsScreenModel } from './model.js'
import { EpicDetailsScreenView } from './view.js'

/**
 * Controller for Epic Details screen
 * Handles user input and coordinates between model and view
 */
export class EpicDetailsScreenController extends ScreenController {
    private epicDetailsModel: EpicDetailsScreenModel
    private epicDetailsView: EpicDetailsScreenView

    constructor(
        databaseManager: DatabaseManager,
        navigationState: NavigationState,
        isLive: boolean,
        refreshInterval: number
    ) {
        const model = new EpicDetailsScreenModel(
            databaseManager,
            navigationState
        )
        const view = new EpicDetailsScreenView()

        super(model, view, isLive, refreshInterval)

        this.epicDetailsModel = model
        this.epicDetailsView = view
    }

    /**
     * Handle keyboard input for epic details screen
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

        // Handle epic sidebar scrolling
        if (key === 'w' || key === 'W') {
            this.handleScrollEpicSidebar(-1)
            this.render()
            return true
        }

        if (key === 's' || key === 'S') {
            this.handleScrollEpicSidebar(1)
            this.render()
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
                return await this.handleSelectTask()

            case 'BACKSPACE':
                return await this.handleGoBack()

            default:
                return false // Key not handled
        }
    }

    /**
     * Handle task selection
     */
    async handleSelectTask(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()
        const selectedTask = this.epicDetailsModel.getTaskByIndex(
            navigationState.selectedIndex
        )

        if (!selectedTask) {
            return true // No valid selection
        }

        // Load full task information with hierarchy using the model's method
        try {
            const fullTask = await this.epicDetailsModel.loadTaskWithHierarchy(
                selectedTask.id
            )
            if (!fullTask) return true

            // Update navigation state with selected task
            navigationState.selectedTask = fullTask
            navigationState.level = 'task_details'

            // Initialize scroll offsets for task details
            navigationState.descriptionScrollOffset = 0
            navigationState.progressNotesScrollOffset = 0

            return false // Signal that navigation should switch to task details screen
        } catch (error) {
            console.error('Error loading task with hierarchy:', error)
            return true
        }
    }

    /**
     * Handle going back to idea details
     */
    async handleGoBack(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()

        // Clear epic selection and go back to idea details
        navigationState.selectedEpic = undefined
        navigationState.level = 'idea_details'
        navigationState.selectedIndex = -1
        navigationState.epicSidebarScrollOffset = 0

        return false // Signal that navigation should switch to idea details screen
    }

    /**
     * Handle epic sidebar scrolling
     */
    handleScrollEpicSidebar(direction: number): void {
        const navigationState = this.model.getNavigationState()
        const currentOffset = navigationState.epicSidebarScrollOffset || 0
        const newOffset = Math.max(0, currentOffset + direction)

        navigationState.epicSidebarScrollOffset = newOffset
    }

    /**
     * Get current data for rendering
     */
    protected getData(): any {
        const epic = this.epicDetailsModel.getSelectedEpic()
        const tasks = this.epicDetailsModel.getTasks()
        const statistics = this.epicDetailsModel.getTaskStatistics()
        const idea = this.epicDetailsModel.getCurrentIdea()

        return {
            epic,
            tasks,
            statistics,
            idea,
        }
    }

    /**
     * Get current items for navigation
     */
    protected getCurrentItems(): TaskData[] {
        return this.epicDetailsModel.getTasks()
    }

    /**
     * Update selection after data load
     */
    protected updateSelection(): void {
        super.updateSelection()

        // Ensure we don't exceed bounds
        const taskCount = this.epicDetailsModel.getTaskCount()
        const navigationState = this.model.getNavigationState()

        if (navigationState.selectedIndex >= taskCount) {
            navigationState.selectedIndex = Math.max(0, taskCount - 1)
        }
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(key: string): boolean {
        return key === 'CTRL_C' || key === 'q' || key === 'ESCAPE'
    }

    /**
     * Get selected task
     */
    getSelectedTask(): TaskData | null {
        const navigationState = this.model.getNavigationState()
        return this.epicDetailsModel.getTaskByIndex(
            navigationState.selectedIndex
        )
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        const navigationState = this.model.getNavigationState()
        navigationState.selectedIndex = -1
        navigationState.selectedTask = undefined
        navigationState.epicSidebarScrollOffset = 0
        navigationState.descriptionScrollOffset = 0
        navigationState.progressNotesScrollOffset = 0
        this.updateSelection()
    }

    /**
     * Update navigation state
     */
    updateNavigationState(navigationState: NavigationState): void {
        this.model.updateNavigationState(navigationState)
    }

    /**
     * Get current epic
     */
    getCurrentEpic() {
        return this.epicDetailsModel.getSelectedEpic()
    }

    /**
     * Get task statistics
     */
    getTaskStatistics() {
        return this.epicDetailsModel.getTaskStatistics()
    }

    /**
     * Get current idea context
     */
    getCurrentIdea() {
        return this.epicDetailsModel.getCurrentIdea()
    }
}
