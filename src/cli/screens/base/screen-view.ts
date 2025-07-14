import terminalKit from 'terminal-kit'

import { NavigationState } from '../../types/index.js'

const terminal = terminalKit.terminal

/**
 * Base class for all screen views
 * Provides common terminal operations and rendering utilities
 */
export abstract class ScreenView {
    protected terminal = terminal

    /**
     * Render the screen with current data
     */
    abstract render(
        data: any,
        navigationState: NavigationState,
        selectedIndex: number,
        isLive: boolean,
        refreshInterval: number
    ): void

    /**
     * Get terminal width
     */
    protected getTerminalWidth(): number {
        return this.terminal.width || 80
    }

    /**
     * Get terminal height
     */
    protected getTerminalHeight(): number {
        return this.terminal.height || 24
    }

    /**
     * Center text within given width
     */
    protected centerText(text: string, width: number): string {
        if (text.length >= width) return text.slice(0, width)
        const padding = Math.floor((width - text.length) / 2)
        return (
            ' '.repeat(padding) +
            text +
            ' '.repeat(width - text.length - padding)
        )
    }

    /**
     * Wrap text to fit within specified width while preserving line breaks
     */
    protected wrapText(text: string, width: number): string[] {
        if (!text) return []

        const lines = text.split('\n')
        const wrappedLines: string[] = []

        for (const line of lines) {
            if (line.length <= width) {
                wrappedLines.push(line)
            } else {
                // Split long lines at word boundaries
                const words = line.split(' ')
                let currentLine = ''

                for (const word of words) {
                    if (currentLine.length + word.length + 1 <= width) {
                        currentLine += (currentLine ? ' ' : '') + word
                    } else {
                        if (currentLine) {
                            wrappedLines.push(currentLine)
                            currentLine = word
                        } else {
                            // Word is longer than width, split it
                            wrappedLines.push(word.slice(0, width))
                            currentLine = word.slice(width)
                        }
                    }
                }

                if (currentLine) {
                    wrappedLines.push(currentLine)
                }
            }
        }

        return wrappedLines
    }

    /**
     * Draw header with title and live status
     */
    protected drawHeader(
        title: string,
        isLive: boolean,
        refreshInterval: number
    ): void {
        const width = this.getTerminalWidth()
        const liveText = isLive ? `LIVE (${refreshInterval}s)` : 'STATIC'
        const liveColor = isLive ? 'green' : 'yellow'

        // Clear screen and move to top
        this.terminal.clear()
        this.terminal.moveTo(1, 1)

        // Draw top border
        this.terminal.color256(8)('╔' + '═'.repeat(width - 2) + '╗\n')

        // Draw title line
        this.terminal.color256(8)('║')
        this.terminal.bold.color256(15)(` ${title} `)
        this.terminal.color256(8)(' '.repeat(width - title.length - 4))
        this.terminal[liveColor](`${liveText} `)
        this.terminal.color256(8)('║\n')

        // Draw separator
        this.terminal.color256(8)('╠' + '═'.repeat(width - 2) + '╣\n')
    }

    /**
     * Draw navigation breadcrumb
     */
    protected drawNavigationBreadcrumb(navigationState: NavigationState): void {
        const breadcrumbs: string[] = []

        if (navigationState.selectedProject) {
            breadcrumbs.push(navigationState.selectedProject.name)
        }

        if (navigationState.selectedIdea) {
            breadcrumbs.push(navigationState.selectedIdea.title)
        }

        if (navigationState.selectedEpic) {
            breadcrumbs.push(navigationState.selectedEpic.title)
        }

        if (navigationState.selectedTask) {
            breadcrumbs.push(navigationState.selectedTask.title)
        }

        if (breadcrumbs.length > 0) {
            const breadcrumbText = breadcrumbs.join(' > ')
            this.terminal.color256(8)('║ ')
            this.terminal.color256(7)(breadcrumbText)
            this.terminal.color256(8)(
                ' '.repeat(
                    this.getTerminalWidth() - breadcrumbText.length - 4
                ) + '║\n'
            )
            this.terminal.color256(8)(
                '╠' + '═'.repeat(this.getTerminalWidth() - 2) + '╣\n'
            )
        }
    }

    /**
     * Draw bottom info line with navigation help and item count
     */
    protected drawBottomInfo(itemCount: number, navigationHelp: string): void {
        const width = this.getTerminalWidth()
        const countText = `Items: ${itemCount}`
        const helpText = navigationHelp
        const totalContentLength = countText.length + helpText.length + 4 // 4 for separators and spaces

        this.terminal.color256(8)('╠' + '═'.repeat(width - 2) + '╣\n')
        this.terminal.color256(8)('║ ')
        this.terminal.color256(7)(countText)

        if (totalContentLength <= width - 2) {
            // Both texts fit
            const padding = width - totalContentLength
            this.terminal.color256(8)(' '.repeat(padding))
            this.terminal.color256(7)(helpText)
        } else {
            // Truncate help text
            const availableSpace = width - countText.length - 6
            const truncatedHelp =
                helpText.length > availableSpace
                    ? helpText.slice(0, availableSpace - 3) + '...'
                    : helpText
            this.terminal.color256(8)(
                ' '.repeat(width - countText.length - truncatedHelp.length - 4)
            )
            this.terminal.color256(7)(truncatedHelp)
        }

        this.terminal.color256(8)(' ║\n')
        this.terminal.color256(8)('╚' + '═'.repeat(width - 2) + '╝\n')
    }

    /**
     * Render empty state message
     */
    protected renderEmptyState(message: string): void {
        const width = this.getTerminalWidth()
        const height = this.getTerminalHeight()
        const centerY = Math.floor(height / 2)

        this.terminal.moveTo(1, centerY)
        this.terminal.color256(8)('║')
        this.terminal.color256(7)(this.centerText(message, width - 2))
        this.terminal.color256(8)('║\n')
    }

    /**
     * Get color for status
     */
    protected getStatusColor(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'done':
                return 'green'
            case 'in_progress':
            case 'in-progress':
                return 'yellow'
            case 'blocked':
                return 'red'
            case 'pending':
            default:
                return 'gray'
        }
    }

    /**
     * Get color for priority
     */
    protected getPriorityColor(priority: string): string {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'red'
            case 'medium':
                return 'yellow'
            case 'low':
                return 'green'
            default:
                return 'gray'
        }
    }

    /**
     * Get icon for type
     */
    protected getTypeIcon(type: string): string {
        switch (type?.toLowerCase()) {
            case 'idea':
                return '💡'
            case 'epic':
                return '🎯'
            case 'task':
            case 'tsk':
                return '📋'
            case 'bug':
                return '🐛'
            case 'research':
            case 'rnd':
                return '🔬'
            default:
                return '📄'
        }
    }

    /**
     * Get icon for status
     */
    protected getStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'done':
                return '✅'
            case 'in_progress':
            case 'in-progress':
                return '⚡'
            case 'blocked':
                return '🚫'
            case 'pending':
            default:
                return '⏳'
        }
    }
}
