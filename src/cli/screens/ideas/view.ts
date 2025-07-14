import { IdeaData, NavigationState } from '../../types/index.js'
import { ScreenView } from '../base/screen-view.js'

/**
 * View for rendering ideas screen
 * Handles all UI rendering logic for ideas table
 */
export class IdeasScreenView extends ScreenView {
    /**
     * Render ideas screen with current data
     */
    render(
        ideas: IdeaData[],
        navigationState: NavigationState,
        selectedIndex: number,
        isLive: boolean,
        refreshInterval: number
    ): void {
        // Enable fullscreen mode and clear
        this.terminal.fullscreen(true)
        this.terminal.moveTo(1, 1)

        // Add top margin
        this.terminal('\n\n')

        // Draw centered header like original
        this.drawCenteredHeader('Project Ideas', isLive, refreshInterval)

        // Draw navigation breadcrumb
        this.drawNavigationBreadcrumb(navigationState)

        if (ideas.length === 0) {
            const centerY = Math.floor(this.getTerminalHeight() / 2)
            this.terminal.moveTo(1, centerY)
            const width = this.getTerminalWidth()
            this.terminal.gray(
                this.centerText('No ideas found in this project', width)
            )
            return
        }

        this.renderIdeasTable(ideas, selectedIndex)

        // Bottom info line
        const width = this.getTerminalWidth()
        this.terminal.moveTo(1, this.getTerminalHeight())
        this.terminal.cyan.bold(`Items: ${ideas.length}`)
        this.terminal(
            ' '.repeat(
                width -
                    `Items: ${ideas.length}`.length -
                    '↑↓:Navigate Enter:Select Backspace:Back R:Refresh Q:Quit'
                        .length -
                    2
            )
        )
        this.terminal.cyan.bold(
            '↑↓:Navigate Enter:Select Backspace:Back R:Refresh Q:Quit'
        )
    }

    /**
     * Render ideas table with responsive width calculation
     */
    private renderIdeasTable(ideas: IdeaData[], selectedIndex: number): void {
        // Calculate table dimensions with responsive width handling
        const termWidth = this.getTerminalWidth()

        // Ensure minimum widths but adapt to terminal size
        const minTypeWidth = 10
        const minTitleWidth = 20
        const minStatusWidth = 8
        const minPriorityWidth = 6
        const minDateWidth = 10

        // Calculate available space for dynamic columns
        const fixedWidth =
            minTypeWidth + minStatusWidth + minPriorityWidth + minDateWidth + 4 // spaces
        const availableForTitle = termWidth - fixedWidth - 20 // reserve 20 chars for padding and safety

        const typeWidth = Math.max(minTypeWidth, 12)
        const titleWidth = Math.max(
            minTitleWidth,
            Math.min(45, Math.floor(availableForTitle * 0.8))
        )
        const statusWidth = Math.max(minStatusWidth, 10)
        const priorityWidth = Math.max(minPriorityWidth, 8)
        const dateWidth = Math.max(minDateWidth, 10)

        // Calculate total table width and padding for centering with side margins
        const sideMargin = 4 // 4 characters margin on each side
        const usableWidth = termWidth - sideMargin * 2
        const totalWidth =
            typeWidth + titleWidth + statusWidth + priorityWidth + dateWidth + 4
        const tablePadding =
            sideMargin + Math.max(0, Math.floor((usableWidth - totalWidth) / 2))

        // Render table components
        this.renderTableHeader(
            tablePadding,
            typeWidth,
            titleWidth,
            statusWidth,
            priorityWidth,
            dateWidth
        )
        this.renderTableSeparator(tablePadding, totalWidth)
        this.renderTableRows(
            ideas,
            selectedIndex,
            tablePadding,
            typeWidth,
            titleWidth,
            statusWidth,
            priorityWidth,
            dateWidth
        )

        this.terminal('\n')
    }

    /**
     * Render table header with column titles
     */
    private renderTableHeader(
        tablePadding: number,
        typeWidth: number,
        titleWidth: number,
        statusWidth: number,
        priorityWidth: number,
        dateWidth: number
    ): void {
        this.terminal('\n')
        this.terminal(' '.repeat(tablePadding))
        this.terminal.cyan.bold('Type'.padEnd(typeWidth) + ' ')
        this.terminal.cyan.bold('Title'.padEnd(titleWidth) + ' ')
        this.terminal.cyan.bold('Status'.padEnd(statusWidth) + ' ')
        this.terminal.cyan.bold('Priority'.padEnd(priorityWidth) + ' ')
        this.terminal.cyan.bold('Created'.padEnd(dateWidth))
        this.terminal('\n')
    }

    /**
     * Render table separator line
     */
    private renderTableSeparator(
        tablePadding: number,
        totalWidth: number
    ): void {
        this.terminal(' '.repeat(tablePadding))
        this.terminal.gray('─'.repeat(totalWidth))
        this.terminal('\n')
    }

    /**
     * Render all table rows with idea data
     */
    private renderTableRows(
        ideas: IdeaData[],
        selectedIndex: number,
        tablePadding: number,
        typeWidth: number,
        titleWidth: number,
        statusWidth: number,
        priorityWidth: number,
        dateWidth: number
    ): void {
        ideas.forEach((idea, index) => {
            this.renderTableRow(
                idea,
                index,
                selectedIndex,
                tablePadding,
                typeWidth,
                titleWidth,
                statusWidth,
                priorityWidth,
                dateWidth
            )
        })
    }

    /**
     * Render a single table row for an idea
     */
    private renderTableRow(
        idea: IdeaData,
        index: number,
        selectedIndex: number,
        tablePadding: number,
        typeWidth: number,
        titleWidth: number,
        statusWidth: number,
        priorityWidth: number,
        dateWidth: number
    ): void {
        const created = new Date(idea.created_at).toLocaleDateString()
        const statusColor = this.getStatusColor(idea.status)
        const priorityColor = this.getPriorityColor(idea.priority)
        const isSelected = selectedIndex === index

        this.terminal(' '.repeat(tablePadding))

        if (isSelected) {
            this.renderSelectedRow(
                idea,
                created,
                typeWidth,
                titleWidth,
                statusWidth,
                priorityWidth,
                dateWidth
            )
        } else {
            this.renderNormalRow(
                idea,
                created,
                statusColor,
                priorityColor,
                typeWidth,
                titleWidth,
                statusWidth,
                priorityWidth,
                dateWidth
            )
        }

        this.terminal('\n')
    }

    /**
     * Render selected row with highlighted background
     */
    private renderSelectedRow(
        idea: IdeaData,
        created: string,
        typeWidth: number,
        titleWidth: number,
        statusWidth: number,
        priorityWidth: number,
        dateWidth: number
    ): void {
        this.terminal.bgYellow.black.bold(
            `💡 ${idea.id}`.padEnd(typeWidth).substring(0, typeWidth) + ' '
        )
        this.terminal.bgYellow.black.bold(
            idea.title.padEnd(titleWidth).substring(0, titleWidth) + ' '
        )
        this.terminal.bgYellow.black(idea.status.padEnd(statusWidth) + ' ')
        this.terminal.bgYellow.black(idea.priority.padEnd(priorityWidth) + ' ')
        this.terminal.bgYellow.black(created.padEnd(dateWidth))
    }

    /**
     * Render normal row with standard colors
     */
    private renderNormalRow(
        idea: IdeaData,
        created: string,
        statusColor: string,
        priorityColor: string,
        typeWidth: number,
        titleWidth: number,
        statusWidth: number,
        priorityWidth: number,
        dateWidth: number
    ): void {
        this.terminal.cyan.bold(
            `💡 ${idea.id}`.padEnd(typeWidth).substring(0, typeWidth) + ' '
        )
        this.terminal.white.bold(
            idea.title.padEnd(titleWidth).substring(0, titleWidth) + ' '
        )
        ;(this.terminal as any)[statusColor](
            idea.status.padEnd(statusWidth) + ' '
        )
        ;(this.terminal as any)[priorityColor](
            idea.priority.padEnd(priorityWidth) + ' '
        )
        this.terminal.gray(created.padEnd(dateWidth))
    }

    /**
     * Draw centered header with title and live status like original
     */
    private drawCenteredHeader(
        title: string,
        isLive: boolean,
        refreshInterval: number
    ): void {
        const termWidth = this.getTerminalWidth()
        const sideMargin = 4 // 4 characters margin on each side
        const usableWidth = termWidth - sideMargin * 2
        const headerText = isLive ? `${title} - Live Registry` : title

        // Center and draw header with side margins
        const headerPadding = Math.max(
            0,
            Math.floor((usableWidth - headerText.length) / 2)
        )
        this.terminal(' '.repeat(sideMargin + headerPadding))
        this.terminal.cyan.bold(headerText)
        this.terminal('\n')

        // Add separator line with same margins
        this.terminal(' '.repeat(sideMargin + headerPadding))
        this.terminal.cyan('═'.repeat(headerText.length))
        this.terminal('\n\n')
    }

    /**
     * Override base class breadcrumb with original style
     */
    protected drawNavigationBreadcrumb(navigationState: NavigationState): void {
        const termWidth = this.getTerminalWidth()
        const sideMargin = 4 // 4 characters margin on each side
        const usableWidth = termWidth - sideMargin * 2
        let breadcrumb = `📍 ${navigationState.selectedProject?.name} › Ideas`

        const padding = Math.max(
            0,
            Math.floor((usableWidth - breadcrumb.length) / 2)
        )
        this.terminal(' '.repeat(sideMargin + padding))
        this.terminal.gray(breadcrumb)
        this.terminal('\n\n')
    }
}
