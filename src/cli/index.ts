#!/usr/bin/env node
import { MVCNavigationController } from './mvc-navigation-controller.js'

/**
 * MCP Project Manager CLI Dashboard
 * This module is imported when --dashboard flag is used
 */

// Extract refresh interval from args if provided
const refreshArg = process.argv.find((arg) => arg.startsWith('--refresh='))
const refreshInterval = refreshArg ? parseInt(refreshArg.split('=')[1], 10) : 30

try {
    const controller = new MVCNavigationController(
        true, // Always live mode
        refreshInterval
    )
    await controller.initialize()
} catch (error) {
    console.error('Error starting dashboard:', error)
    process.exit(1)
}
