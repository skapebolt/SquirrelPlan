# Project Overview

This is a client-side "Wealth Planner Tool" designed for personal financial planning and simulation. It allows users to model their financial future by inputting assets, liabilities, income, and expenses.

The application is a single-page web application built with vanilla HTML, CSS, and JavaScript. It uses Bootstrap for styling, Chart.js for data visualization, and Sortable.js for list reordering. The application is self-contained and does not require a backend server.

## Key Features

*   **Financial Modeling:** Users can define their financial situation, including:
    *   **Assets:** Savings, investments, property, etc., with expected returns and taxes.
    *   **Liabilities:** Loans, mortgages, etc., with interest rates.
    *   **Income:** Salaries and other income sources, with options for indexation.
    *   **Expenses:** Living costs and other regular expenses.
*   **Simulation:**
    *   **Standard Simulation:** A deterministic projection of wealth over time based on the provided data.
    *   **Monte Carlo Simulation:** A probabilistic simulation that runs hundreds of scenarios with randomized asset returns to assess the likelihood of achieving financial goals.
*   **Retirement Planning:** Includes settings for current age, retirement age, and estimated pension to model retirement scenarios.
*   **Data Management:** Users can import and export their financial data as a JSON file for persistence and reuse.
*   **Internationalization:** The application supports multiple languages.

# Building and Running

This is a static web project with no build process. To run the application, simply open the `index.html` file in a modern web browser.
The main branch is live at [skapebolt.github.io/wealth-planner-tool](https://skapebolt.github.io/wealth-planner-tool/)

## Dependencies

The project relies on the following third-party libraries, which are included in the `assets/` directory:

*   Bootstrap v5
*   Chart.js
*   Sortable.js

# Development Conventions

*   **Code Style:** The project uses plain JavaScript (ES6 features are present), standard HTML5, and CSS. Code is organized into separate files for structure (`index.html`), styling (`style.css`), and logic (`script.js`, `simulation.js`, `translator.js`).
*   **DOM Manipulation:** The application directly manipulates the DOM using standard browser APIs.
*   **State Management:** Application state is managed in memory and can be saved/loaded via JSON import/export. There is no centralized state management library.
*   **Testing:** There are no apparent unit or end-to-end tests in the project.