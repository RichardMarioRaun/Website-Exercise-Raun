# Lolo v5

## Description

Lolo v5 is a website designed to fetch and display articles from RSS feeds, allowing users to manage their custom RSS feeds and view articles in a clutter-free format. The website initially loads content from [this Flipboard feed](https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss) and provides various features for a seamless user experience.

## Features

- **Custom RSS Feeds Management**: Users can add, edit, and remove custom RSS feeds. These changes are persistent across page reloads.
- **Category Filtering**: Users can filter articles based on their categories.
- **Date Ordering**: All articles are ordered by their publication date, with the newest articles appearing first.
- **Distinct Feeds**: Articles from different feeds are easily distinguishable. The maximum number of distinguishable feeds is 10.
- **Article Modal**: Users can open an article by clicking on its title, description, or image. The article is displayed in a clutter-free format using the Mercury API web parser.
- **Fully Responsive Design**: The website is fully responsive with custom CSS written without using any front-end component libraries like Bootstrap.

## Technology Stack

- **HTML**: For structuring the website.
- **CSS**: For responsive design and styling.
- **JavaScript**: For dynamic content loading and user interaction.
- **Mercury API**: For fetching and displaying clutter-free article content.
- **Local Storage**: For persisting user data (custom RSS feeds).
- **Render**: For hosting the website.

## Installation

To set up the project locally, follow these steps:

1. **Clone the repository**:
    ```sh
    git clone <https://github.com/RichardMarioRaun/Website-Exercise-Raun>
    cd <repository-directory>
    ```

2. **Install dependencies**:
    ```sh
    npm install
    ```

3. **Start the development server**:
    ```sh
    npm start
    ```

## Usage

1. **Add a New RSS Feed**:
    - Click on the "Edit RSS Feeds" button.
    - Enter the RSS feed URL in the input field.
    - Click the "Add Feed" button. The feed will be added and the list updated.
    - Click "Save Changes" to persist the new feed.

2. **Edit an Existing RSS Feed**:
    - Click on the "Edit" button next to the feed URL.
    - Enter the new URL and click "OK".

3. **Remove an RSS Feed**:
    - Click on the "Delete" button next to the feed URL.

4. **Filter Articles by Category**:
    - Select a category from the dropdown menu to filter articles.

5. **View an Article**:
    - Click on the article’s title, description, or image to open it in a modal.

## API

### Mercury API

- **Endpoint**: `https://uptime-mercury-api.azurewebsites.net/webparser`
- **Method**: POST
- **Request Body**:
    ```json
    {
        "url": "<article-url>"
    }
    ```
- **Response**: JSON object containing the cleaned article content.

## Deployment

The website is hosted on Render. To deploy the project:

1. **Connect your repository to Render**.
2. **Deploy the project**.

## Project Structure
├── public \
│ ├── index.html \
│ ├── style.css \
│ ├── app.js \
├── server.js \
├── package.json \
├── package-lock.json \
└── README.md \

## Author

Created by Richard Mario Raun.

For any questions or feedback, please feel free to reach out.

