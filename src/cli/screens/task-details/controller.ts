import {
    EpicData,
    IdeaData,
    NavigationState,
    TaskData,
} from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'
import { ScreenController } from '../base/screen-controller.js'
import { TaskDetailsScreenModel } from './model.js'
import { TaskDetailsScreenView } from './view.js'

/**
 * Controller for Task Details screen
 * Handles user input and coordinates between model and view
 */
export class TaskDetailsScreenController extends ScreenController {
    private taskDetailsModel: TaskDetailsScreenModel
    private taskDetailsView: TaskDetailsScreenView

    constructor(
        databaseManager: DatabaseManager,
        navigationState: NavigationState,
        isLive: boolean,
        refreshInterval: number
    ) {
        const model = new TaskDetailsScreenModel(
            databaseManager,
            navigationState
        )
        const view = new TaskDetailsScreenView()

        super(model, view, isLive, refreshInterval)

        this.taskDetailsModel = model
        this.taskDetailsView = view
    }

    /**
     * Handle keyboard input for task details screen
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

        // Handle scrolling
        switch (key) {
            case 'UP':
            case 'k':
                this.handleScrollDescription(-1)
                this.render()
                return true

            case 'DOWN':
            case 'j':
                this.handleScrollDescription(1)
                this.render()
                return true

            case 'LEFT':
            case 'h':
                this.handleScrollProgressNotes(-1)
                this.render()
                return true

            case 'RIGHT':
            case 'l':
                this.handleScrollProgressNotes(1)
                this.render()
                return true

            case 'BACKSPACE':
                return await this.handleGoBack()

            default:
                return false // Key not handled
        }
    }

    /**
     * Handle description scrolling (left column)
     */
    handleScrollDescription(direction: number): void {
        const scrollOffsets = this.taskDetailsModel.getScrollOffsets()
        const newOffset = Math.max(
            0,
            scrollOffsets.descriptionScrollOffset + direction
        )

        this.taskDetailsModel.updateScrollOffsets(newOffset, undefined)
    }

    /**
     * Handle progress notes scrolling (right column)
     */
    handleScrollProgressNotes(direction: number): void {
        const scrollOffsets = this.taskDetailsModel.getScrollOffsets()
        const progressNotes = this.taskDetailsModel.getProgressNotes()
        const maxOffset = Math.max(0, progressNotes.length - 1)

        const newOffset = Math.max(
            0,
            Math.min(
                maxOffset,
                scrollOffsets.progressNotesScrollOffset + direction
            )
        )

        this.taskDetailsModel.updateScrollOffsets(undefined, newOffset)
    }

    /**
     * Handle going back to epic details
     */
    async handleGoBack(): Promise<boolean> {
        const navigationState = this.model.getNavigationState()

        // Clear task selection and go back to epic details
        navigationState.selectedTask = undefined
        navigationState.level = 'epic_details'
        // Keep the same selectedIndex to return to the same task in the list
        navigationState.descriptionScrollOffset = 0
        navigationState.progressNotesScrollOffset = 0

        return false // Signal that navigation should switch to epic details screen
    }

    /**
     * Get current data for rendering
     */
    protected getData(): any {
        const task = this.taskDetailsModel.getSelectedTask()
        const scrollOffsets = this.taskDetailsModel.getScrollOffsets()
        const dependencies = this.taskDetailsModel.getDependencyTasks()

        return {
            task,
            scrollOffsets,
            dependencies,
        }
    }

    /**
     * Get current items for navigation (not applicable for task details)
     */
    protected getCurrentItems(): any[] {
        return [] // Task details doesn't have a list to navigate
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(key: string): boolean {
        return key === 'CTRL_C' || key === 'q' || key === 'ESCAPE'
    }

    /**
     * Get current task
     */
    getCurrentTask(): (TaskData & { epic?: EpicData; idea?: IdeaData }) | null {
        return this.taskDetailsModel.getSelectedTask()
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        const navigationState = this.model.getNavigationState()
        navigationState.selectedTask = undefined
        navigationState.descriptionScrollOffset = 0
        navigationState.progressNotesScrollOffset = 0
    }

    /**
     * Update navigation state
     */
    updateNavigationState(navigationState: NavigationState): void {
        this.model.updateNavigationState(navigationState)
    }

    /**
     * Get current epic context
     */
    getCurrentEpic(): EpicData | undefined {
        return this.taskDetailsModel.getCurrentEpic()
    }

    /**
     * Get current idea context
     */
    getCurrentIdea(): IdeaData | undefined {
        return this.taskDetailsModel.getCurrentIdea()
    }

    /**
     * Get task type information
     */
    getTaskType(): string {
        return this.taskDetailsModel.getTaskType()
    }

    /**
     * Get task type icon
     */
    getTaskTypeIcon(): string {
        return this.taskDetailsModel.getTaskTypeIcon()
    }

    /**
     * Check if task has progress notes
     */
    hasProgressNotes(): boolean {
        return this.taskDetailsModel.hasProgressNotes()
    }

    /**
     * Get progress notes
     */
    getProgressNotes(): any[] {
        return this.taskDetailsModel.getProgressNotes()
    }

    /**
     * Check if task has dependencies
     */
    hasDependencies(): boolean {
        return this.taskDetailsModel.hasDependencies()
    }

    /**
     * Get dependency tasks
     */
    getDependencyTasks(): TaskData[] {
        return this.taskDetailsModel.getDependencyTasks()
    }

    /**
     * Get scroll offsets
     */
    getScrollOffsets(): {
        descriptionScrollOffset: number
        progressNotesScrollOffset: number
    } {
        return this.taskDetailsModel.getScrollOffsets()
    }
}
