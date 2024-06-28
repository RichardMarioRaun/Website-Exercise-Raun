import express from 'express';
import RSSParser from 'rss-parser';
import fetch from 'node-fetch';
import { DOMParser, XMLSerializer } from 'xmldom';

const app = express();
const port = process.env.PORT || 3001;
const parser = new RSSParser();

app.use(express.json());
app.use(express.static('public'));

app.get('/api/feed', async (req, res) => {
    const feedUrl = req.query.url || 'https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss';
    try {
        const response = await fetch(feedUrl);
        const text = await response.text();

        // Parse feed using RSSParser
        const parsedFeed = await parser.parseString(text);

        // Parse XML using DOMParser
        const dom = new DOMParser().parseFromString(text, 'application/xml');
        const items = dom.getElementsByTagName('item');

        parsedFeed.items = parsedFeed.items.map((item, index) => {
            const serializer = new XMLSerializer();
            const rawXML = serializer.serializeToString(items[index]);
            console.log(`Before attaching raw XML: ${JSON.stringify(item)}`);
            const newItem = { ...item, rawXML };
            console.log(`After attaching raw XML: ${JSON.stringify(newItem)}`);
            return newItem;
        });

        res.status(200).json(parsedFeed);
    } catch (error) {
        console.error('Failed to fetch and parse RSS feed:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
