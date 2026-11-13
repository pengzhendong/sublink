/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL } from '../constants.js';

export const Navbar = () => {
    return (
        <header class="sublink-navbar sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-16">
                    <a href="#" class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                        <img src="/favicon.ico" alt={`${APP_NAME} logo`} class="w-6 h-6" />
                        <h1>{APP_NAME}</h1>
                    </a>
                    <div class="flex shrink-0 items-center gap-1 sm:gap-3">
                        <a
                            href={DOCS_URL} aria-label="Documentation"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                            <i class="fas fa-book"></i>
                            <span class="hidden sm:inline">Docs</span>
                        </a>
                        <a
                            href={GITHUB_REPO} aria-label="GitHub"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
                        >
                            <i class="fab fa-github"></i>
                            <span class="hidden sm:inline">GitHub</span>
                        </a>
                        <button
                            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                            x-on:click="toggleDarkMode()"
                            aria-label="Toggle dark mode"
                        >
                            <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
