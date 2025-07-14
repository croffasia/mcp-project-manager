import { NavigationState, ProjectData } from '../../types/index.js'
import { ScreenView } from '../base/screen-view.js'

/**
 * View for rendering projects screen
 * Handles all UI rendering logic for projects table
 */
export class ProjectsScreenView extends ScreenView {
    /**
     * Render projects screen with current data
     */
    render(
        projects: ProjectData[],
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
        this.drawCenteredHeader('MCP Project Manager', isLive, refreshInterval)

        // Draw navigation breadcrumb
        this.drawNavigationBreadcrumb(navigationState)

        if (projects.length === 0) {
            const centerY = Math.floor(this.getTerminalHeight() / 2)
            this.terminal.moveTo(1, centerY)
            const width = this.getTerminalWidth()
            this.terminal.gray(
                this.centerText('No projects found in global registry', width)
            )
            return
        }

        this.renderProjectsTable(projects, selectedIndex)

        // Bottom info line
        const width = this.getTerminalWidth()
        this.terminal.moveTo(1, this.getTerminalHeight())
        this.terminal.cyan.bold(`Items: ${projects.length}`)
        this.terminal(
            ' '.repeat(
                width -
                    `Items: ${projects.length}`.length -
                    '↑↓:Navigate Enter:Select R:Refresh Q:Quit'.length -
                    2
            )
        )
        this.terminal.cyan.bold('↑↓:Navigate Enter:Select R:Refresh Q:Quit')
    }

    /**
     * Render projects table with proper formatting and selection highlighting
     */
    private renderProjectsTable(
        projects: ProjectData[],
        selectedIndex: number
    ): void {
        // Calculate table dimensions based on terminal width
        const termWidth = this.getTerminalWidth()
        const nameWidth = Math.max(
            25,
            Math.min(40, Math.floor(termWidth * 0.25))
        )
        const pathWidth = Math.max(
            45,
            Math.min(70, Math.floor(termWidth * 0.45))
        )
        const dateWidth = 16
        const usageWidth = 12
        const createdWidth = 16

        // Calculate total table width and padding for centering with side margins
        const sideMargin = 4 // 4 characters margin on each side
        const usableWidth = termWidth - sideMargin * 2
        const totalWidth =
            nameWidth + pathWidth + dateWidth + usageWidth + createdWidth + 4
        const tablePadding =
            sideMargin + Math.max(0, Math.floor((usableWidth - totalWidth) / 2))

        // Render table header
        this.renderTableHeader(
            tablePadding,
            nameWidth,
            pathWidth,
            dateWidth,
            usageWidth,
            createdWidth
        )

        // Render table separator
        this.renderTableSeparator(tablePadding, totalWidth)

        // Render table rows
        this.renderTableRows(
            projects,
            selectedIndex,
            tablePadding,
            nameWidth,
            pathWidth,
            dateWidth,
            usageWidth,
            createdWidth
        )

        this.terminal('\n')
    }

    /**
     * Render table header with column titles
     */
    private renderTableHeader(
        tablePadding: number,
        nameWidth: number,
        pathWidth: number,
        dateWidth: number,
        usageWidth: number,
        createdWidth: number
    ): void {
        this.terminal('\n')
        this.terminal(' '.repeat(tablePadding))
        this.terminal.cyan.bold('Name'.padEnd(nameWidth) + ' ')
        this.terminal.cyan.bold('Path'.padEnd(pathWidth) + ' ')
        this.terminal.cyan.bold('Last Used'.padEnd(dateWidth) + ' ')
        this.terminal.cyan.bold('Usage'.padEnd(usageWidth) + ' ')
        this.terminal.cyan.bold('Created'.padEnd(createdWidth))
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
     * Render all table rows with project data
     */
    private renderTableRows(
        projects: ProjectData[],
        selectedIndex: number,
        tablePadding: number,
        nameWidth: number,
        pathWidth: number,
        dateWidth: number,
        usageWidth: number,
        createdWidth: number
    ): void {
        projects.forEach((project, index) => {
            this.renderTableRow(
                project,
                index,
                selectedIndex,
                tablePadding,
                nameWidth,
                pathWidth,
                dateWidth,
                usageWidth,
                createdWidth
            )
        })
    }

    /**
     * Render a single table row for a project
     */
    private renderTableRow(
        project: ProjectData,
        index: number,
        selectedIndex: number,
        tablePadding: number,
        nameWidth: number,
        pathWidth: number,
        dateWidth: number,
        usageWidth: number,
        createdWidth: number
    ): void {
        const lastUsed = new Date(project.last_used).toLocaleDateString()
        const created = new Date(project.created_at).toLocaleDateString()
        const shortPath = project.path.replace(process.env.HOME || '', '~')

        const usageColor = this.getUsageColor(project.usage_count)
        const isSelected = selectedIndex === index

        this.terminal(' '.repeat(tablePadding))

        if (isSelected) {
            this.renderSelectedRow(
                project,
                shortPath,
                lastUsed,
                created,
                nameWidth,
                pathWidth,
                dateWidth,
                usageWidth,
                createdWidth
            )
        } else {
            this.renderNormalRow(
                project,
                shortPath,
                lastUsed,
                created,
                usageColor,
                nameWidth,
                pathWidth,
                dateWidth,
                usageWidth,
                createdWidth
            )
        }

        this.terminal('\n')
    }

    /**
     * Render selected row with highlighted background
     */
    private renderSelectedRow(
        project: ProjectData,
        shortPath: string,
        lastUsed: string,
        created: string,
        nameWidth: number,
        pathWidth: number,
        dateWidth: number,
        usageWidth: number,
        createdWidth: number
    ): void {
        this.terminal.bgYellow.black.bold(
            project.name.padEnd(nameWidth).substring(0, nameWidth) + ' '
        )
        this.terminal.bgYellow.black(
            shortPath.padEnd(pathWidth).substring(0, pathWidth) + ' '
        )
        this.terminal.bgYellow.black(lastUsed.padEnd(dateWidth) + ' ')
        this.terminal.bgYellow.black(
            project.usage_count.toString().padEnd(usageWidth) + ' '
        )
        this.terminal.bgYellow.black(created.padEnd(createdWidth))
    }

    /**
     * Render normal row with standard colors
     */
    private renderNormalRow(
        project: ProjectData,
        shortPath: string,
        lastUsed: string,
        created: string,
        usageColor: string,
        nameWidth: number,
        pathWidth: number,
        dateWidth: number,
        usageWidth: number,
        createdWidth: number
    ): void {
        this.terminal.white.bold(
            project.name.padEnd(nameWidth).substring(0, nameWidth) + ' '
        )
        this.terminal.gray(
            shortPath.padEnd(pathWidth).substring(0, pathWidth) + ' '
        )
        this.terminal.blue(lastUsed.padEnd(dateWidth) + ' ')
        ;(this.terminal as any)[usageColor](
            project.usage_count.toString().padEnd(usageWidth) + ' '
        )
        this.terminal.gray(created.padEnd(createdWidth))
    }

    /**
     * Get color for usage count based on value
     */
    private getUsageColor(usageCount: number): string {
        if (usageCount > 5) {
            return 'green'
        } else if (usageCount > 1) {
            return 'yellow'
        } else {
            return 'gray'
        }
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
        let breadcrumb = '📍 Projects'

        const padding = Math.max(
            0,
            Math.floor((usableWidth - breadcrumb.length) / 2)
        )
        this.terminal(' '.repeat(sideMargin + padding))
        this.terminal.gray(breadcrumb)
        this.terminal('\n\n')
    }
}
