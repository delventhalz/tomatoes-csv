# tomatoes-csv

I have a niche need. [Letterboxd](https://letterboxd.com) is a pleasant to use
list-building app for movies. Unfortunately, it does not have any Rotten
Tomatoes integration (possibly because they seem to have a
[crap exclusive API](https://developer.fandango.com/Rotten_Tomatoes). Rotten
Tomatoes is the main way I consume movie reviews.

So here's the solution. Letterboxd has a great
[data export](https://letterboxd.com/settings/data/) feature which lets you
download CSVs of all of your lists. Just download your list, run this script on
any of the CSVs, and the script will add Rotten Tomatoes scores for your
perusal.

## Requirements

- [Node](https://nodejs.org/) 18 or newer
- Hopefully a computer that runs bash, though you can probably figure it out
  with DOS or whatever god awful terminal language comes included on Windows
  these days

## Setup

Just clone the repo and install the JavaScript dependencies.

```bash
git clone https://github.com/delventhalz/tomatoes-csv.git
cd tomatoes-csv/
npm install
```

### Environment Variables

This script is designed to work as written without you needing to do any
additional setup. However, it uses the same query endpoint Rotten Tomatoes uses
on its website which is totally undocumented. Ultimately, I am just guessing
about how to get it working. If the queries fail, you might need to update some
aspect of the query, much of which is configurable with environment variables.

1. Go to [rottentomatoes.com](https://www.rottentomatoes.com)
2. Open the Network tab in the Developer Tools of your browser
3. Type a movie name into the search bar (do not press enter)
4. Look for a POST request that starts with "query"
5. Set one or more of these environment variables with values from the request:
     - `RT_QUERY_URL`:    Complete request URL including params after the `?`
     - `RT_QUERY_TOKEN`:  Found in the request headers as "x-algolia-usertoken"
     - `RT_QUERY_AGENT`:  Found in the request headers as "user-agent"
     - `RT_QUERY_PARAMS`: Found in the request body/payload as the "params"
                          property on the requests object named "content_rt"
                          (the "hitsPerPage" param will always be set to 100)

## Usage

Just run the script with `node` and pass it the path to your CSV as a command
line argument:

```bash
node tomatoes-csv.js ../path/to/movies.csv
```

Also works with absolute paths:

```bash
node tomatoes-csv.js ~/path/to/movies.csv
```

The CSV file should include movies as rows with at least a title column and a
year column. Letterboxd CSVs call the title column "Name". Either "title" or
"name" will work.

_Note that this script destructively modifies the CSV file! It should just add
two ratings columns without changing anything else, but if that makes you
squeamish, only run the script on a duplicate of the CSV you care about._

## Contributing

I am pushing this and probably never thinking about it again. Frankly, I would
be surprised if anyone other than me ever used it ever. But feel free to submit
an Issue or an MR and I might respond at some point.
