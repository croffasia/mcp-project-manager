import { NavigationState } from '../../types/index.js'
import { ScreenModel } from './screen-model.js'
import { ScreenView } from './screen-view.js'

/**
 * Base class for all screen controllers
 * Coordinates between model and view, handles user input
 */
export abstract class ScreenController {
    protected model: ScreenModel
    protected view: ScreenView
    protected isLive: boolean
    protected refreshInterval: number

    constructor(
        model: ScreenModel,
        view: ScreenView,
        isLive: boolean,
        refreshInterval: number
    ) {
        this.model = model
        this.view = view
        this.isLive = isLive
        this.refreshInterval = refreshInterval
    }

    /**
     * Initialize the screen - load data and render initial view
     */
    async initialize(): Promise<void> {
        await this.model.loadData()
        this.render()
    }

    /**
     * Render the current state
     */
    render(): void {
        const navigationState = this.model.getNavigationState()
        const selectedIndex = navigationState.selectedIndex
        const data = this.getData()

        this.view.render(
            data,
            navigationState,
            selectedIndex,
            this.isLive,
            this.refreshInterval
        )
    }

    /**
     * Handle keyboard input
     */
    abstract handleKeyPress(key: string): Promise<boolean>

    /**
     * Handle navigation up
     */
    handleNavigateUp(): void {
        const currentItems = this.getCurrentItems()
        const navigationState = this.model.getNavigationState()

        if (currentItems.length > 0) {
            navigationState.selectedIndex =
                navigationState.selectedIndex <= 0
                    ? currentItems.length - 1
                    : navigationState.selectedIndex - 1
        }
    }

    /**
     * Handle navigation down
     */
    handleNavigateDown(): void {
        const currentItems = this.getCurrentItems()
        const navigationState = this.model.getNavigationState()

        if (currentItems.length > 0) {
            navigationState.selectedIndex =
                navigationState.selectedIndex >= currentItems.length - 1
                    ? 0
                    : navigationState.selectedIndex + 1
        }
    }

    /**
     * Handle refresh request
     */
    async handleRefresh(): Promise<void> {
        await this.model.loadData()
        this.render()
    }

    /**
     * Get current data from model
     */
    protected abstract getData(): any

    /**
     * Get current items list for navigation
     */
    protected abstract getCurrentItems(): any[]

    /**
     * Update selection to keep it within bounds
     */
    protected updateSelection(): void {
        const currentItems = this.getCurrentItems()
        const navigationState = this.model.getNavigationState()

        // Auto-select first item if none selected
        if (navigationState.selectedIndex === -1 && currentItems.length > 0) {
            navigationState.selectedIndex = 0
        }

        // Keep selection within bounds
        if (navigationState.selectedIndex >= currentItems.length) {
            navigationState.selectedIndex = Math.max(0, currentItems.length - 1)
        }
    }

    /**
     * Get the model instance
     */
    getModel(): ScreenModel {
        return this.model
    }

    /**
     * Get the view instance
     */
    getView(): ScreenView {
        return this.view
    }

    /**
     * Update live status
     */
    updateLiveStatus(isLive: boolean, refreshInterval: number): void {
        this.isLive = isLive
        this.refreshInterval = refreshInterval
    }
}
