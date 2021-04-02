# AppleSearchAds

## Installation

`$ npm install @andrewstoliarov/apple-search-ads`

## Example usage

The usual boilerplate:

```js
const asa = require('@andrewstoliarov/apple-search-ads');

var username = 'UNAME';
var password = 'PASS';
var appId = 1448103572;

    const instance = new AppleSearchAds(username, password, {
        errorCallback: function(e) {
            console.log('Error logging in: ' + e);
        },
        successCallback: function(d) {
            console.log('Logged in');

            const query = asa.AppleSearchAdsQuery(asa.queryTypes.keywordsRecommendation)
                .keywordText("lightroom")
                .appId(appId)
                .storefronts(["US"])
                .build()

            instance.request(query, function(error, result) {
                if (error) {
                    console.log(error)
                } else {
                    console.log(result.data)
                }
            });
        },
    })
```
