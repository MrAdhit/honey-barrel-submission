const body = $("body");
const betterDealButton = $("#find-better-deal");

const State = {
    Init: Symbol("init"),
    Found: Symbol("found"),
};

let state = State.Init;
let activeDealUrl = "";

/**
 * Ask the user to pick relevant element to grab its `innerText`
 * @returns {Promise<string>}
 */
async function grabWebText() {
    const [ tab ] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [ "page/lib/jquery-3.7.1.min.js" ],
    });

    const [ { result } ] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
            const outlineBefore = { };

            return await new Promise((res) => {
                $("body").on("mouseover.finder", (e) => {
                    outlineBefore[e.target] = $(e.target).css("outline");
    
                    $(e.target).css("outline", "solid red");
    
                    $(e.target).on("click.tempDisable", (click_e) => {
                        $("body").off("mouseover.finder");
                        $("body").off("mouseout.finder");
                        $(e.target).off("click.tempDisable");

                        $(e.target).css("outline", outlineBefore[e.target]);
    
                        click_e.preventDefault();
                        click_e.stopPropagation();
                        
                        res(click_e.target.innerText);
    
                        return false;
                    });
                });
                
                $("body").on("mouseout.finder", (e) => {
                    $(e.target).css("outline", outlineBefore[e.target]);
                    $(e.target).off("click.tempDisable");
                });
            });
        },
    });
    
    return result;
}

/**
 * Shows deal
 * @param {string} imageUrl 
 * @param {string} name 
 * @param {string} priceBefore 
 * @param {string} priceAfter 
 */
function showDeal(imageUrl, name, priceBefore, priceAfter) {
    $("#image").attr("src", imageUrl);
    $("#name").text(name);
    $("#before").text(priceBefore);
    $("#after").text(priceAfter);

    $("#deal").css("height", "350px");
}

/**
 * Hides deal
 */
function hideDeal() {
    $("#deal").css("height", "0");
}

/**
 * Find relevant product
 * @param {string} searchTerm  
 * @param {number} maxPrice 
 */
async function findRelevantProduct(searchTerm, maxPrice) {
    const request = await fetch(`https://services.baxus.co/api/search/listings?from=0&size=20&listed=true&query=${encodeURIComponent(searchTerm)}`);
    const response = await request.json();
    
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    const threshold = 0.8;
    const minWordsToMatch = Math.ceil(searchWords.length * threshold);

    return response
        .map(listing => {
            const source = listing._source;
            const price = source.price;
            const name = source.name?.toLowerCase() || "";

            const matchedWords = searchWords.filter(word => name.includes(word)).length;

            return {
                listing,
                matchScore: matchedWords / searchWords.length,
                isValid: price <= maxPrice && matchedWords >= minWordsToMatch
            };
        })
        .filter(item => item.isValid)
        .sort((a, b) => b.matchScore - a.matchScore)
        .map(item => item.listing)[0];
}

/**
 * Parses input price, automatically convert other currencies to USD
 *
 * Currently only supports EUR, GBP, and JPY
 * @param {string} rawPrice 
 */
async function parsePrice(rawPrice) {
    if (!rawPrice || typeof rawPrice !== "string")
        return null;

    rawPrice = rawPrice.trim().toLowerCase();

    const priceRegex = /([€$£¥])?\s*(\d+(?:\.\d{1,2})?)\s*(usd|eur|gbp|jpy)?/gi;
    const matches = [...rawPrice.matchAll(priceRegex)].pop();
    
    const [, symbol, amount, code] = matches;
    
    let currency = "USD";
    if (symbol) {
      currency = {
        "$": "USD",
        "€": "EUR", 
        "£": "GBP",
        "¥": "JPY"
      }[symbol] || currency;
    } else if (code) {
      currency = code.toUpperCase();
    } 
    
    const amountFl = parseFloat(amount);
    
    if (currency !== "USD") {
        const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api/v1/currencies/usd.json');
        const data = await response.json();
        const rates = data.usd;
        const rate = rates[currency.toLowerCase()];
        
        return amountFl / rate;
    }
    
    return amountFl;
}

betterDealButton.on("click", async (e) => {
    if (state === State.Init) {
        $(e.target).text("Click on the drink name");
        const name = await grabWebText();

        $(e.target).text("Click on the drink price");
        let price = await grabWebText();
        
        price = await parsePrice(price);

        $(e.target).attr("disabled", "");
        $(e.target).text("Searching...");

        state = State.Searching;
        const product = await findRelevantProduct(name, price);
        
        $(e.target).removeAttr("disabled");

        if (product === undefined) {
            $(e.target).text("We can't find better deal :(");
            state = State.Init;
            
            return;
        }
        
        showDeal(product._source.imageUrl, product._source.name, `$${price}`, `$${product._source.price}`);

        state = State.Found;

        activeDealUrl = `https://www.baxus.co/asset/${product._source.id}`
        $(e.target).text("Click here to purchase!");

        return;
    }
    
    if (state === State.Found) {
        window.open(activeDealUrl, "_blank");
        window.close();
        return;
    }
});
