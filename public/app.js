document.addEventListener('DOMContentLoaded', () => {
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
    }

    class Category {
        constructor(name) {
            this.name = name;
            this.articles = [];
        }

        addArticle(article) {
            this.articles.push(article);
        }
    }

    class Feed {
        constructor(title) {
            this.title = title;
            this.categories = new Map();
            this.allArticles = [];
        }

        addArticleToCategory(article, categoryName) {
            if (!this.categories.has(categoryName)) {
                this.categories.set(categoryName, new Category(categoryName));
            }
            this.categories.get(categoryName).addArticle(article);
        }

        addArticle(article) {
            this.allArticles.push(article);
            if (article.categories.length === 0) {
                this.addArticleToCategory(article, 'Uncategorized');
            } else {
                article.categories.forEach(category => {
                    if (typeof category === 'string' && category.trim() !== '') {
                        this.addArticleToCategory(article, category);
                    } else {
                        this.addArticleToCategory(article, 'Uncategorized');
                    }
                });
            }
        }

        getCategories() {
            return Array.from(this.categories.values());
        }

        getArticlesByCategory(categoryName) {
            if (categoryName === 'All') {
                return this.allArticles;
            }
            return this.categories.has(categoryName) ? this.categories.get(categoryName).articles : [];
        }
    }

    const feeds = JSON.parse(localStorage.getItem('rssFeeds')) || [];
    let currentFeed = new Feed();

    const feedColors = new Map();

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
                const categories = item.categories && item.categories.length ? item.categories : [];
                const image = extractImageUrl(item);

                const article = new Article(title, link, pubDate, description, categories, feedTitle, image, item.rawXML);
                feed.addArticle(article);
            });
        }
        return feed;
    }

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

    function filterByCategory(categoryName, feed) {
        const articles = feed.getArticlesByCategory(categoryName);
        displayFeed(articles);
    }

    function displayFeed(articles) {
        const feedContainer = document.getElementById('feeds');
        feedContainer.innerHTML = '';
    
        articles.sort((a, b) => b.pubDate - a.pubDate);
    
        articles.forEach(article => {
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
            console.log('Displaying description:', article.description); // Log description for debugging
    
            articleContent.appendChild(title);
            articleContent.appendChild(description);
    
            articleDiv.appendChild(articleContent);
    
            const pubDateOverlay = document.createElement('div');
            pubDateOverlay.classList.add('publish-date-overlay');
            pubDateOverlay.textContent = `Published on: ${article.pubDate.toDateString()}`;
            articleDiv.appendChild(pubDateOverlay);
    
            feedContainer.appendChild(articleDiv);
        });
    }

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

    function editRSSFeed(index) {
        const newUrl = prompt('Enter new RSS Feed URL:', feeds[index].url);
        if (newUrl) {
            feeds[index].url = newUrl;
            updateRSSFeedList();
            saveFeeds();
            loadAllFeeds();
        }
    }

    function deleteRSSFeed(index) {
        feeds.splice(index, 1);
        updateRSSFeedList();
        saveFeeds();
        loadAllFeeds();
    }

    function saveFeeds() {
        localStorage.setItem('rssFeeds', JSON.stringify(feeds));
    }

    document.getElementById('edit-feeds-button').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'block';
        updateRSSFeedList();
    };

    document.getElementById('close-modal').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'none';
    };

    document.getElementById('save-feeds').onclick = () => {
        const modal = document.getElementById('rss-feed-modal');
        modal.style.display = 'none';
        saveFeeds();
        loadAllFeeds();
    };

    document.getElementById('add-feed-button').onclick = () => {
        const newFeedUrl = document.getElementById('feed-url-input').value;
        if (newFeedUrl) {
            feeds.push({ url: newFeedUrl });
            updateRSSFeedList();
        }
    };

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

    function mergeFeeds(feeds) {
        const mergedFeed = new Feed();
        feeds.forEach(feed => {
            feed.allArticles.forEach(article => {
                mergedFeed.addArticle(article);
            });
        });
        return mergedFeed;
    }

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
});
