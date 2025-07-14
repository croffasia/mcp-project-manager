import { NavigationState } from '../../types/index.js'
import { DatabaseManager } from '../../utils/database-manager.js'

/**
 * Base class for all screen models
 * Handles data loading and state management
 */
export abstract class ScreenModel {
    protected databaseManager: DatabaseManager
    protected navigationState: NavigationState
    protected isLoading: boolean = false
    protected error: Error | null = null

    constructor(
        databaseManager: DatabaseManager,
        navigationState: NavigationState
    ) {
        this.databaseManager = databaseManager
        this.navigationState = navigationState
    }

    /**
     * Load data for this screen
     */
    abstract loadData(): Promise<void>

    /**
     * Get current loading state
     */
    getLoadingState(): boolean {
        return this.isLoading
    }

    /**
     * Get current error state
     */
    getError(): Error | null {
        return this.error
    }

    /**
     * Set loading state
     */
    protected setLoading(loading: boolean): void {
        this.isLoading = loading
    }

    /**
     * Set error state
     */
    protected setError(error: Error | null): void {
        this.error = error
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.error = null
    }

    /**
     * Get current navigation state
     */
    getNavigationState(): NavigationState {
        return this.navigationState
    }

    /**
     * Update navigation state
     */
    updateNavigationState(navigationState: NavigationState): void {
        this.navigationState = navigationState
    }
}
