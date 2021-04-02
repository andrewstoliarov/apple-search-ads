var asa = require('./../src/appleSearchAds.js');
var AppleSearchAds = asa.AppleSearchAds;

const password = '';
const username = '';

const testGetPopularity = function() {
    const instance = new AppleSearchAds(username, password, {
        errorCallback: function(e) {
            console.log('Error logging in: ' + e);
        },
        successCallback: function(d) {
            console.log('Logged in');

            const query = asa.AppleSearchAdsQuery(asa.queryTypes.keywordsRecommendation)
                .keywordText("lightroom")
                .appId(1448103572)
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
};

testGetPopularity()
