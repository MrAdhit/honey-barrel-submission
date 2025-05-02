# How it works 
- First it asks the user to grab the product name and price (this way it works on any site, without adding too much complexity)
- Then it cleans up the price format so we can actually parse it
- It automatically converts any non-USD prices to USD
- Then it fetches the Baxus API using the product name as the query 
- It uses an intelligent matching algorithm that:
  - Breaks down search terms into individual words
  - Matches against both product names and descriptions
  - Requires 80% of search terms to match
  - Prioritizes closest matches first
- Finally it filters out anything that costs more (otherwise what's the point right?)

I've had 100% success rate matching bottles so far.

This project aims for simplicity and low cost to run - no complex infrastructure or expensive APIs needed.

# Installation
- Clone this repo
- Go to `chrome://extensions` and enable `Developer Mode`
- Press `Load unpacked` then choose the cloned repo folder
- That's it...
