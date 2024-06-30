document.addEventListener('DOMContentLoaded', () => {
    // Article class to represent an article and handle modal display
    class Article {
        constructor(title, link, pubDate, description, categories, source, image, rawXML) {
            this.title = title;
            this.link = link;
            this.pubDate = new Date(pubDate);
            this.description = description;
            this.categories = categories;
            this.source = source;
            this.image = image;
            this.rawXML = rawXML;
        }

        // Method to open the article in a modal
        async openInModal() {
            const url = `/api/clean-article`; // Proxy endpoint for fetching cleaned article content
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: this.link })
                });
                if (!response.ok) throw new Error(`Failed to fetch cleaned article, status: ${response.status}`);
                const data = await response.json();
                const modal = document.getElementById('article-modal');
                const articleContent = document.getElementById('article-content');

                if (data.content && !data.content.includes('<p id="ajax-error-message" class="ajax-error-message">')) {
                    articleContent.innerHTML = data.content;
                } else {
                    articleContent.innerHTML = `Article content not found, <a href="${this.link}" target="_blank">read the full article here</a>.`;
                }

                // Resize images in the modal content
                const images = articleContent.querySelectorAll('img');
                images.forEach(img => {
                    img.style.maxWidth = '50%';
                    img.style.height = 'auto';
                });

                modal.style.display = 'flex';
                document.title = this.title;
            } catch (error) {
                console.error('Error fetching or displaying cleaned article:', error);
                console.error('URL:', url);
                console.error('Payload:', { url: this.link });
            }
        }
    }

    // Category class to represent a category of articles
    class Category {
        constructor(name) {
            this.name = name;
            this.articles = [];
        }

        // Method to add an article to the category
        addArticle(article) {
            this.articles.push(article);
        }
    }

    // Feed class to represent a feed and manage its categories and articles
    class Feed {
        constructor(title) {
            this.title = title;
            this.categories = new Map();
            this.allArticles = [];
        }

        // Method to add an article to a specific category
        addArticleToCategory(article, categoryName) {
            if (!this.categories.has(categoryName)) {
                this.categories.set(categoryName, new Category(categoryName));
            }
            this.categories.get(categoryName).addArticle(article);
        }

        // Method to add an article to the feed and categorize it
        addArticle(article) {
            this.allArticles.push(article);
            if (article.categories.length === 0) {
                this.addArticleToCategory(article, 'Uncategorized');
            } else {
                article.categories.forEach(category => {
                    if (typeof category === 'string' && category.trim() !== '') {
                        this.addArticleToCategory(article, category);
                    } else if (category._) {
                        this.addArticleToCategory(article, category._);
                    } else {
                        this.addArticleToCategory(article, 'Uncategorized');
                    }
                });
            }
        }

        // Method to get all categories in the feed
        getCategories() {
            return Array.from(this.categories.values());
        }

        // Method to get articles by category name
        getArticlesByCategory(categoryName) {
            if (categoryName === 'All') {
                return this.allArticles;
            }
            return this.categories.has(categoryName) ? this.categories.get(categoryName).articles : [];
        }
    }

    // Load saved RSS feeds from localStorage or initialize an empty array
    const feeds = JSON.parse(localStorage.getItem('rssFeeds')) || [];
    let currentFeed = new Feed();

    // Map to store colors for feed sources
    const feedColors = new Map();

    // Function to fetch a feed from a URL
    async function fetchFeed(url) {
        try {
            const response = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Failed to fetch feed');
            const feed = await response.json();
            console.log('Fetched JSON feed:', feed);
            return feed;
        } catch (error) {
            console.error('Error fetching or parsing feed:', error);
            return null;
        }
    }

    // Function to extract image URL from a feed item
    function extractImageUrl(item) {
        if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/') && item.enclosure.url) {
            return item.enclosure.url;
        }

        if (item['media:content']) {
            const mediaContent = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
            for (const media of mediaContent) {
                if (media.url) {
                    return media.url;
                }
                if (media['@'] && media['@'].url) {
                    return media['@'].url;
                }
            }
        }

        if (item['media:thumbnail']) {
            const mediaThumbnail = Array.isArray(item['media:thumbnail']) ? item['media:thumbnail'] : [item['media:thumbnail']];
            for (const media of mediaThumbnail) {
                if (media.url) {
                    return media.url;
                }
                if (media['@'] && media['@'].url) {
                    return media['@'].url;
                }
            }
        }

        const description = item.description || item.content;
        if (description) {
            const imgTagMatch = description.match(/<img[^>]+src="([^">]+)"/);
            if (imgTagMatch && imgTagMatch[1]) {
                return imgTagMatch[1];
            }
        }

        const rawXML = item.rawXML;
        if (rawXML) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawXML, 'application/xml');
            const mediaContent = xmlDoc.querySelector('media\\:content, content');
            if (mediaContent && mediaContent.getAttribute('url')) {
                return mediaContent.getAttribute('url');
            }
        }

        console.log('No image found for item.');
        return "";
    }

    // Function to parse feed data into Feed and Article objects
    function parseFeed(feedData) {
        const feedTitle = feedData.title || feedData.channel?.title || 'Unknown Source';
        console.log('Parsing feed:', feedTitle, feedData);
        const feed = new Feed(feedTitle);
        if (feedData && feedData.items) {
            feedData.items.forEach(item => {
                console.log('Processing item:', item);
                const title = item.title;
                const link = item.link;
                const pubDate = item.pubDate;
                const description = item.description || item.contentSnippet || item.content;
                console.log('Parsed description:', description); // Log description for debugging
                const categories = item.categories && item.categories.length ? item.categories.map(cat => cat._ || cat) : [];
                const image = extractImageUrl(item);

                const article = new Article(title, link, pubDate, description, categories, feedTitle, image, item.rawXML);
                feed.addArticle(article);
            });
        }
        return feed;
    }

    // Function to display categories in the category dropdown
    function displayCategories(feed) {
        const categoryDropdown = document.getElementById('category-dropdown');
        categoryDropdown.innerHTML = '<option value="All">All</option>';

        feed.getCategories().forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categoryDropdown.appendChild(option);
        });

        categoryDropdown.onchange = () => filterByCategory(categoryDropdown.value, feed);
    }

    // Function to filter articles by category and display them
    function filterByCategory(categoryName, feed) {
        const articles = feed.getArticlesByCategory(categoryName);
        displayFeed(articles);
    }

    // Function to display articles in the feed container
    function displayFeed(articles) {
        const feedContainer = document.getElementById('feeds');
        feedContainer.innerHTML = '';

        // Sort articles by publication date (newest first)
        articles.sort((a, b) => b.pubDate - a.pubDate);

        articles.forEach(article => {
            // Check if the article has a title and either an image or a description
            if (!article.title || (!article.image && !article.description)) {
                return; // Skip rendering this article
            }

            const articleDiv = document.createElement('div');
            articleDiv.classList.add('article');

            const overlay = document.createElement('div');
            overlay.classList.add('overlay');
            overlay.textContent = article.source || 'Unknown Source';

            let colorClass;
            if (feedColors.has(article.source)) {
                colorClass = feedColors.get(article.source);
            } else {
                colorClass = `feed-color-${(feedColors.size % 10)}`;
                feedColors.set(article.source, colorClass);
            }
            overlay.classList.add(colorClass);

            articleDiv.appendChild(overlay);

            const articleContent = document.createElement('div');
            articleContent.classList.add('article-content');

            if (article.image) {
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('image-container');
                const img = document.createElement('img');
                img.src = article.image;
                img.onerror = () => {
                    img.style.display = 'none';
                    console.error(`Image failed to load: ${article.image}`);
                };
                imageContainer.appendChild(img);

                articleContent.appendChild(imageContainer);
            } else {
                articleDiv.classList.add('no-image');
            }

            const title = document.createElement('h2');
            title.textContent = article.title;

            const description = document.createElement('p');
            description.textContent = article.description;

            articleContent.appendChild(title);
            articleContent.appendChild(description);

            articleDiv.appendChild(articleContent);

            const pubDateOverlay = document.createElement('div');
            pubDateOverlay.classList.add('publish-date-overlay');
            pubDateOverlay.textContent = `Published on: ${article.pubDate.toDateString()}`;
            articleDiv.appendChild(pubDateOverlay);

            articleDiv.onclick = () => article.openInModal(); // Add click event listener

            feedContainer.appendChild(articleDiv);
        });
    }

    // Function to update the RSS feed list in the modal
    function updateRSSFeedList() {
        const rssFeedList = document.getElementById('rss-feed-list');
        rssFeedList.innerHTML = '';
        feeds.forEach((feed, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = feed.url;

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => editRSSFeed(index);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteRSSFeed(index);

            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);
            rssFeedList.appendChild(listItem);
        });
    }

    // Function to edit an RSS feed URL
    function editRSSFeed(index) {
        const newUrl = prompt('Enter new RSS Feed URL:', feeds[index].url);
        if (newUrl) {
            feeds[index].url = newUrl;
            updateRSSFeedList();
            saveFeeds();
            loadAllFeeds();
        }
    }

    // Function to delete an RSS feed
    function deleteRSSFeed(index) {
        feeds.splice(index, 1);
        updateRSSFeedList();
        saveFeeds();
        loadAllFeeds();
    }

    // Function to save feeds to localStorage
    function saveFeeds() {
        localStorage.setItem('rssFeeds', JSON.stringify(feeds));
    }

    // Event listener for opening the edit feeds modal
    document.getElementById('edit-feeds-button').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'block';
        updateRSSFeedList();
    };

    // Event listener for closing the edit feeds modal
    document.getElementById('close-modal').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'none';
    };

    // Event listener for saving feeds and closing the modal
    document.getElementById('save-feeds').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'none';
        saveFeeds();
        loadAllFeeds();
    };

    // Event listener for adding a new feed
    document.getElementById('add-feed-button').onclick = () => {
        const newFeedUrl = document.getElementById('feed-url-input').value;
        if (newFeedUrl) {
            feeds.push({ url: newFeedUrl });
            updateRSSFeedList();
            document.getElementById('feed-url-input').value = ''; // Clear the input field
        }
    };

    // Function to load all feeds and display them
    async function loadAllFeeds() {
        const feedObjects = [];
        for (const feed of feeds) {
            const feedData = await fetchFeed(feed.url);
            if (feedData) {
                const parsedFeed = parseFeed(feedData);
                feedObjects.push(parsedFeed);
            }
        }
        currentFeed = mergeFeeds(feedObjects);
        displayCategories(currentFeed);
        displayFeed(currentFeed.allArticles);
    }

    // Function to update the grid layout based on screen size
    function updateGridLayout() {
        const feedContainer = document.getElementById('feeds');
        if (window.innerWidth <= 768) {
            feedContainer.classList.remove('grid-three-columns', 'grid-two-columns');
            feedContainer.classList.add('grid-one-column');
        } else if (window.innerWidth <= 1024) {
            feedContainer.classList.remove('grid-three-columns', 'grid-one-column');
            feedContainer.classList.add('grid-two-columns');
        } else {
            feedContainer.classList.remove('grid-two-columns', 'grid-one-column');
            feedContainer.classList.add('grid-three-columns');
        }
    }

    // Update the grid layout on page load and window resize
    window.addEventListener('resize', updateGridLayout);
    updateGridLayout();

    // Function to merge multiple feeds into one
    function mergeFeeds(feeds) {
        const mergedFeed = new Feed();
        feeds.forEach(feed => {
            feed.allArticles.forEach(article => {
                mergedFeed.addArticle(article);
            });
        });
        return mergedFeed;
    }

    // Initial load of feeds on page load
    (async () => {
        if (feeds.length === 0) {
            const defaultUrl = 'https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss';
            const feedData = await fetchFeed(defaultUrl);
            if (feedData) {
                const feedTitle = feedData.title || feedData.channel?.title || 'Unknown Source';
                console.log('Initial feed:', feedTitle);
                feeds.push({ url: defaultUrl, title: feedTitle });
                saveFeeds();
            }
        }
        await loadAllFeeds();
    })();

    // Event listener for closing the article modal
    document.getElementById('close-article-modal').onclick = () => {
        document.getElementById('article-modal').style.display = 'none';
    };

    // Event listener for clicking outside the modal to close it
    window.onclick = (event) => {
        const modal = document.getElementById('article-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});
