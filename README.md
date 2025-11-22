## Project Overview

SquirrelPlan is a client-side, single-page web application for personal financial planning and wealth simulation. It allows users to model their financial future by inputting assets, liabilities, income, and expenses. The tool generates projections of wealth evolution over time, helping users with retirement planning and financial goal setting.

The application is built entirely with vanilla JavaScript, HTML, and CSS. It leverages the Bootstrap framework for its user interface, Chart.js for data visualization, and Sortable.js for interactive lists. All user data is stored exclusively in the browser's local storage, meaning there is no backend server component and user data remains private.

Key features include:
- Detailed input for financial categories (assets, liabilities, income, expenses).
- Simulation of wealth growth over many years.
- Standard projection based on user-provided rates.
- Monte Carlo simulation for probabilistic forecasting.
- Retirement planning, including early retirement scenarios.
- Multi-language support.
- Data import/export functionality (as JSON).

## Building and Running

This is a static web project with no build process. To run the application, simply open the `index.html` file in a modern web browser.
The main branch is live at [squirrelplan.app](https://squirrelplan.app)
There are no dependencies to install. All required libraries (Bootstrap, Chart.js, Sortable.js) are included in the `assets/` directory.

## Key Files and Directory Structure

-   `index.html`: The main HTML file that serves as the application's entry point. It defines the structure of the UI.
-   `script.js`: The core application logic. It handles UI events, user input, data storage in `localStorage`, and coordinates calls to the simulation and rendering functions.
-   `simulation.js`: Contains the financial simulation engine. It includes the logic for both the standard deterministic projection and the stochastic Monte Carlo simulation.
-   `translator.js`: Manages internationalization (i18n). It contains the translation strings and the logic to switch between languages.
-   `sample-data.js`: Provides preset financial data for different user profiles (e.g., "Recent Graduate", "Mid Career"), allowing new users to quickly see the tool's capabilities.
-   `style.css`: Contains all custom CSS rules for the application, supplementing the Bootstrap styles.
-   `assets/`: A directory containing all third-party libraries, CSS frameworks, and fonts.

## Development Conventions

-   **Frameworks/Libraries:** The project is intentionally kept simple with vanilla JavaScript.
    -   **UI:** [Bootstrap 5](https://getbootstrap.com/) is used for layout and components.
    -   **Charts:** [Chart.js](https://www.chartjs.org/) is used for rendering the wealth evolution charts.
    -   **Interactivity:** [Sortable.js](https://github.com/SortableJS/Sortable) is used for drag-and-drop reordering of financial items.
-   **Code Style:** The JavaScript code follows modern ES6+ standards. It is organized into modules implicitly by file separation.
-   **Data Handling:** All application state and user data are managed in the browser.
    -   The global `window.SquirrelPlanApp` object acts as a namespace for the application.
    -   User's financial plans are stored in the browser's `localStorage` under the `squirrelPlanData` key. This allows for data persistence across sessions on the same device.
-   **Internationalization (i18n):** The UI is translated using a simple key-value system in `translator.js`. Text in `index.html` is dynamically updated by the `setLanguage` function based on user selection.
