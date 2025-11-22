# Project Overview

SquirrelPlan is a client-side, single-page web application for personal financial planning and wealth simulation. It allows users to input detailed financial data—including assets, liabilities, income, and expenses—to project their financial future.

The application is built with vanilla HTML, CSS, and JavaScript. It leverages the following libraries:
- **Bootstrap 5**: For the user interface and responsive layout.
- **Chart.js**: To visualize the wealth evolution and Monte Carlo simulation results.
- **Sortable.js**: To enable drag-and-drop reordering of financial items.

## Key Features

- **Financial Simulation**: Projects wealth growth year-by-year based on user inputs.
- **Monte Carlo Simulation**: Runs hundreds of simulations with randomized variables (like asset returns and inflation) to assess the probability of success for a financial plan.
- **Retirement Planning**: Helps users plan for both standard and early retirement by calculating required capital.
- **Data Management**: Users can import and export their financial data as a JSON file.
- **Internationalization**: The UI is translated into multiple languages (English, German, Spanish, French, Italian, Dutch, Portuguese).
- **Customization**: Includes features like a dark mode theme.

# Building and Running

This is a static web project with no build process. To run the application, simply open the `index.html` file in a modern web browser.
The main branch is live at [squirrelplan.app](https://squirrelplan.app)

# Development Conventions

- **Code Style**: The code is written in plain JavaScript (ES6+), HTML, and CSS. It follows standard formatting.
- **Dependencies**: Third-party libraries are included directly in the `assets/` directory.
- **Modularity**: The JavaScript logic is separated into three main files:
    - `script.js`: Handles UI logic, DOM manipulation, and user interactions.
    - `simulation.js`: Contains the core financial calculation and simulation algorithms.
    - `translator.js`: Manages internationalization and language switching.
- **State Management**: Application state is managed directly within the JavaScript modules. Some user preferences (like theme and language) are persisted in the browser's `localStorage`.