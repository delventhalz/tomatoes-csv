/**
 * Goes through a CSV file of movies and adds a rotten tomatoes score to each
 * row, modifying the original file.
 *
 * Usage:
 *   node tomatoes-csv.js ../path/to/movies.csv
 *   node tomatoes-csv.js ~/path/to/movies.csv
 *
 * In order to fetch Rotten Tomatoes scores, you need to correctly populate
 * various aspects of query. There are default values but they become invalid.
 * To set new query values:
 *
 *   1. Go to rottentomatoes.com
 *   2. Open the Network tab in the Developer Tools of your browser
 *   3. Type a movie name into the search bar
 *   4. Look for a POST request that starts with "query"
 *   5. Set one or more of these env variables with values from the request:
 *      - RT_QUERY_URL:    Complete request URL including params after the ?
 *      - RT_QUERY_TOKEN:  Found in the request headers as "x-algolia-usertoken"
 *      - RT_QUERY_AGENT:  Found in the request headers as "user-agent"
 *      - RT_QUERY_PARAMS: Found in the request body/payload as the "params"
 *                         property on the requests object named "content_rt"
 *                         (the "hitsPerPage" param will always be set to 100)
 */

import fs from 'fs';
import { csv2json, json2csv } from 'json-2-csv';
import path from 'path';
import number2Words from 'number-to-words';

const {
  RT_QUERY_URL = 'https://79frdp12pn-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.24.0)%3B%20Browser%20(lite)&x-algolia-api-key=175588f6e5f8319b27702e4cc4013561&x-algolia-application-id=79FRDP12PN',
  RT_QUERY_TOKEN = 'fc8f5176bad5bc08171bbf6f69cdb3d906e8fa6b526b909ae177c9e32f163921',
  RT_QUERY_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  RT_QUERY_PARAMS = 'analyticsTags=%5B%22header_search%22%5D&clickAnalytics=true&filters=isEmsSearchable%20%3D%201&hitsPerPage=5',
} = process.env;


const ALT_KEYS = {
  title: ['name', 'title'],
  year: ['year']
};

/*
 * HELPERS
 */
const getField = (obj, standardKey) => {
  const possibleKeys = ALT_KEYS[standardKey];

  if (!Array.isArray(possibleKeys)) {
    throw new Error(`Must add an array to ALT_KEYS for "${standardKey}"`);
  }

  for (const key of possibleKeys) {
    const titleKey = key[0].toUpperCase() + key.slice(1).toLowerCase();
    if (titleKey in obj) {
      return obj[titleKey];
    }

    if (key in obj) {
      return obj[key];
    }

    const capsKey = key.toUpperCase();
    if (capsKey in obj) {
      return obj[capsKey];
    }
  }

  return undefined;
};

const sleep = (duration) => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
};

const toMatchString = (str) => {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/(\b)i(\b)/g, '$11$2')
    .replace(/(\b)ii(\b)/g, '$12$2')
    .replace(/(\b)iii(\b)/g, '$13$2')
    .replace(/(\b)iv(\b)/g, '$14$2')
    .replace(/(\b)v(\b)/g, '$15$2')
    .replace(/(\b)vi(\b)/g, '$16$2')
    .replace(/(\b)vii(\b)/g, '$17$2')
    .replace(/(\b)viii(\b)/g, '$18$2')
    .replace(/(\b)ix(\b)/g, '$19$2')
    .replace(/(\b)x(\b)/g, '$110$2')
    .replace(/½/g, ' and a half ')
    .replace(/1\/2/g, ' and a half ')
    .replace(/\d+(?:st|nd|rd|th)/g, ord => number2Words.toWordsOrdinal(ord))
    .replace(/\d+/g, num => number2Words.toWords(num))
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent ')
    .replace(/@/g, ' at ')
    .replace(/°/g, ' degrees ')
    .replace(/[-_,/\\|]/g, ' ')
    .replace(/the /g, '')
    .normalize('NFD')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ');
};

const fetchRottenTomatoesScores = async (title, year) => {
  // This is silly, but RT queries are fundamentally broken for this movie.
  // Can't even find it from their website. Gotta google "9 Rotten Tomatoes".
  if (String(title) === '9' && year === 2009) {
    return { criticsScore: 57, audienceScore: 56 };
  }

  // Overriding the page size in the original copied and pasted params
  const params = RT_QUERY_PARAMS.replace(/hitsPerPage=\d+/, 'hitsPerPage=100');

  const response = await fetch(RT_QUERY_URL, {
    method: 'POST',
    headers: {
      Origin: 'https://www.rottentomatoes.com',
      Referer: 'https://www.rottentomatoes.com/',
      'User-Agent': RT_QUERY_AGENT,
      'x-algolia-usertoken': RT_QUERY_TOKEN,
    },
    body: JSON.stringify({
      requests:[
        {
          indexName: 'content_rt',
          params,
          query: title
        }
      ]
    })
  });

  if (response.status > 299) {
    const failure = await response.json().catch(() => response.text());
    throw new Error(`RT Query Failed [${response.status}]: ${failure.message ?? failure}`);
  }

  const parsed = await response.json();
  const { hits } = parsed.results[0];

  const looseMatches = hits.filter((hit) => {
    const hitTitles = [hit.title, ...(hit.titles ?? []), ...(hit.aka ?? [])];
    return Math.abs(Number(year) - Number(hit.releaseYear)) < 10 // RT years can't be trusted
      && hitTitles.some(t => toMatchString(t) === toMatchString(title));
  });

  const match = looseMatches.find(hit => Number(hit.releaseYear) === Number(year))
    ?? looseMatches.find(hit => Math.abs(Number(hit.releaseYear) - Number(year)) < 2)
    ?? looseMatches.find(hit => toMatchString(hit.title) === toMatchString(title))
    ?? looseMatches[0];

  return {
    criticsScore: match?.rottenTomatoes?.criticsScore ?? '',
    audienceScore: match?.rottenTomatoes?.audienceScore ?? '',
  };
};

/*
 * RUN
 */
const inputPath = process.argv[2];
const absolutePath = path.isAbsolute(inputPath)
  ? inputPath
  : path.resolve(process.cwd(), inputPath);

console.log('Reading CSV...');
const csv = fs.readFileSync(absolutePath, { encoding: 'utf8' });

// Letterboxed lists sometimes include two CSV tables separated by a blank line.
// We only want the second.
const table = csv.replace(/\r\n|\n\r|\r/g, '\n').split('\n\n').at(-1);

const movies = csv2json(table);
const moviesWithScores = [];

for (const [index, movie] of movies.entries()) {
  // Avoid hammering Rotten Tomatoes and making them grumpy
  await sleep(1000);

  const marker = `${index + 1}/${movies.length}`;
  const title = getField(movie, 'title');
  const year = getField(movie, 'year');

  if (!title) {
    throw new Error(`[${marker}]: No title found for movie!`);
  }
  if (!year) {
    throw new Error(`[${marker}]: No year found for ${title}!`);
  }

  console.log(`[${marker}]: Fetching scores for ${title} (${year})...`);
  const scores = await fetchRottenTomatoesScores(title, year);

  moviesWithScores.push({
    ...movie,
    RT: scores.criticsScore,
    'Audience Score': scores.audienceScore,
  });
}

console.log('Updating CSV...');
fs.writeFileSync(absolutePath, json2csv(moviesWithScores));

console.log('Done.');
