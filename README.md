## Project Overview

This project is an interactive wealth planner tool. It is a single-page web application built with HTML, CSS, and JavaScript. It uses the Bootstrap framework for styling and Chart.js for data visualization.

The tool allows users to input their financial data, including assets, liabilities, income, and expenses. It then runs a simulation to project the user's wealth over time, taking into account factors like inflation, investment returns, and retirement.

The application is entirely client-side, with all calculations performed in the user's browser. Data can be imported and exported as a JSON file.

## Building and Running

This is a static web project with no build process. To run the application, simply open the `index.html` file in a modern web browser.
The main branch is live at [skapebolt.github.io/wealth-planner-tool](https://skapebolt.github.io/wealth-planner-tool/)

## Development Conventions

*   **Language:** The user interface and the code comments are in English.
*   **Styling:** The project uses [Bootstrap 5](https://getbootstrap.com/) for its UI components and layout. Custom styles, including a dark mode, are defined in `style.css`.
*   **Charts:** The application uses [Chart.js](https://www.chartjs.org/) to render charts of the wealth evolution.
*   **Code Structure:**
    *   `index.html`: The main application page.
    *   `style.css`: Custom styles.
    *   `script.js`: Handles UI logic, data input/output, and rendering of results.
    *   `simulation.js`: Contains the core financial simulation logic.
*   **Data:** The application state is managed in the browser. Users can import and export their data as a JSON file.
