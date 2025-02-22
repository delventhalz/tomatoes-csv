/**
 * Goes through a CSV file of movies and adds a rotten tomatoes score to each
 * row, modifying the original file.
 *
 * Usage:
 *   node tomatoes-csv.js ../path/to/movies.csv
 *   node tomatoes-csv.js ~/path/to/movies.csv
 */

import fs from 'fs';
import { csv2json } from 'json-2-csv';
import path from 'path';

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

/*
 * RUN
 */
const inputPath = process.argv[2];
const absolutePath = path.isAbsolute(inputPath)
  ? inputPath
  : path.resolve(process.cwd(), inputPath);

const csv = fs.readFileSync(absolutePath, { encoding: 'utf8' });

// Letterboxed lists sometimes include two CSV tables separated by a blank line.
// We only want the second.
const table = csv.replace(/\r\n|\n\r|\r/g, '\n').split('\n\n').at(-1);

const json = csv2json(table, { trimHeaderFields: true });
const movies = json.map((mov) => ({
  title: getField(mov, 'title'),
  year: getField(mov, 'year'),
}));

console.log(movies);
