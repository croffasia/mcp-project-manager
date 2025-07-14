import terminalKit from 'terminal-kit'

import {
    EpicDetailsScreenController,
    IdeaDetailsScreenController,
    IdeasScreenController,
    ProjectsScreenController,
    TaskDetailsScreenController,
} from './screens/index.js'
import { AppState } from './types/index.js'
import { DatabaseManager } from './utils/database-manager.js'

const terminal = terminalKit.terminal

/**
 * Main navigation controller using MVC architecture
 * Coordinates between different screen controllers and manages shared state
 */
export class MVCNavigationController {
    private appState: AppState
    private databaseManager: DatabaseManager

    // Screen controllers
    private projectsController: ProjectsScreenController | null = null
    private ideasController: IdeasScreenController | null = null
    private ideaDetailsController: IdeaDetailsScreenController | null = null
    private epicDetailsController: EpicDetailsScreenController | null = null
    private taskDetailsController: TaskDetailsScreenController | null = null

    // Current active controller
    private currentController: any = null

    constructor(isLive: boolean, refreshInterval: number) {
        // Initialize app state
        this.appState = {
            navigation: {
                level: 'projects',
                selectedIndex: -1,
            },
            isLive,
            refreshInterval,
        }

        // Initialize database manager
        this.databaseManager = new DatabaseManager()
    }

    /**
     * Initialize the navigation controller
     */
    async initialize(): Promise<void> {
        // Set up keyboard event handlers
        this.setupKeyboardHandlers()

        // Start with projects screen
        await this.switchToProjectsScreen()

        // Start auto-refresh if in live mode
        if (this.appState.isLive) {
            this.startAutoRefresh()
        }
    }

    /**
     * Setup keyboard event handlers
     */
    private setupKeyboardHandlers(): void {
        terminal.grabInput(true)
        terminal.on('key', async (name: string) => {
            try {
                await this.handleKeyPress(name)
            } catch (error) {
                console.error('Error handling key press:', error)
            }
        })
    }

    /**
     * Handle keyboard input
     */
    private async handleKeyPress(keyName: string): Promise<void> {
        // Exit keys - handled globally
        if (this.isExitKey(keyName)) {
            await this.cleanup()
            process.exit(0)
        }

        // Let current controller handle the key first
        if (this.currentController) {
            const handled = await this.currentController.handleKeyPress(keyName)
            if (handled) {
                return // Controller handled the key
            }

            // If controller returned false, it means we need to navigate to a different screen
            // Update shared navigation state from controller
            const controllerNav = this.currentController
                .getModel()
                .getNavigationState()
            this.appState.navigation = controllerNav

            await this.handleScreenTransition()
        }
    }

    /**
     * Handle transitions between different screens
     */
    private async handleScreenTransition(): Promise<void> {
        const navigationState = this.appState.navigation

        switch (navigationState.level) {
            case 'projects':
                await this.switchToProjectsScreen()
                break
            case 'ideas':
                await this.switchToIdeasScreen()
                break
            case 'idea_details':
                await this.switchToIdeaDetailsScreen()
                break
            case 'epic_details':
                await this.switchToEpicDetailsScreen()
                break
            case 'task_details':
                await this.switchToTaskDetailsScreen()
                break
        }
    }

    /**
     * Switch to projects screen
     */
    private async switchToProjectsScreen(): Promise<void> {
        // Always recreate to ensure fresh state
        this.projectsController = new ProjectsScreenController(
            this.databaseManager,
            this.appState.isLive,
            this.appState.refreshInterval
        )

        // Update navigation state
        this.projectsController
            .getModel()
            .updateNavigationState(this.appState.navigation)

        this.currentController = this.projectsController
        await this.currentController.initialize()
    }

    /**
     * Switch to ideas screen
     */
    private async switchToIdeasScreen(): Promise<void> {
        // Connect to project database if needed
        if (this.appState.navigation.selectedProject) {
            const connected = await this.databaseManager.connectToProject(
                this.appState.navigation.selectedProject
            )
            if (!connected) {
                // Error was already shown by DatabaseManager, go back to projects
                this.appState.navigation.level = 'projects'
                this.appState.navigation.selectedProject = undefined
                await this.switchToProjectsScreen()
                return
            }
        }

        this.ideasController = new IdeasScreenController(
            this.databaseManager,
            this.appState.navigation,
            this.appState.isLive,
            this.appState.refreshInterval
        )

        this.currentController = this.ideasController
        await this.currentController.initialize()
    }

    /**
     * Switch to idea details screen
     */
    private async switchToIdeaDetailsScreen(): Promise<void> {
        this.ideaDetailsController = new IdeaDetailsScreenController(
            this.databaseManager,
            this.appState.navigation,
            this.appState.isLive,
            this.appState.refreshInterval
        )

        this.currentController = this.ideaDetailsController
        await this.currentController.initialize()
    }

    /**
     * Switch to epic details screen
     */
    private async switchToEpicDetailsScreen(): Promise<void> {
        this.epicDetailsController = new EpicDetailsScreenController(
            this.databaseManager,
            this.appState.navigation,
            this.appState.isLive,
            this.appState.refreshInterval
        )

        this.currentController = this.epicDetailsController
        await this.currentController.initialize()
    }

    /**
     * Switch to task details screen
     */
    private async switchToTaskDetailsScreen(): Promise<void> {
        this.taskDetailsController = new TaskDetailsScreenController(
            this.databaseManager,
            this.appState.navigation,
            this.appState.isLive,
            this.appState.refreshInterval
        )

        this.currentController = this.taskDetailsController
        await this.currentController.initialize()
    }

    /**
     * Refresh current data
     */
    private async refresh(): Promise<void> {
        if (this.currentController) {
            await this.currentController.handleRefresh()
        }
    }

    /**
     * Check if key is an exit key
     */
    private isExitKey(keyName: string): boolean {
        return keyName === 'CTRL_C' || keyName === 'q' || keyName === 'ESCAPE'
    }

    /**
     * Start auto-refresh interval
     */
    private startAutoRefresh(): void {
        if (this.appState.refreshIntervalId) {
            clearInterval(this.appState.refreshIntervalId)
        }

        this.appState.refreshIntervalId = setInterval(async () => {
            await this.refresh()
        }, this.appState.refreshInterval * 1000)
    }

    /**
     * Stop auto-refresh interval
     */
    private stopAutoRefresh(): void {
        if (this.appState.refreshIntervalId) {
            clearInterval(this.appState.refreshIntervalId)
            this.appState.refreshIntervalId = undefined
        }
    }

    /**
     * Cleanup resources
     */
    private async cleanup(): Promise<void> {
        // Exit fullscreen mode
        terminal.fullscreen(false)
        terminal.clear()

        // Cleanup keyboard handlers
        terminal.grabInput(false)

        // Stop auto-refresh
        this.stopAutoRefresh()

        // Cleanup database manager
        await this.databaseManager.cleanup()
    }
}
