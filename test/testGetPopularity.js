var asa = require('./../src/appleSearchAds.js');
const readline = require('readline');
var AppleSearchAds = asa.AppleSearchAds;

const password = '';
const username = '';

const testGetPopularity = async function() {
    const instance = new AppleSearchAds({
        twoFAHandler: function (successCallback) {
            const rl = readline.createInterface({input: process.stdin, output: process.stdout});
            rl.question('Enter the 2FA code: ', (code) => {
                successCallback(code);
            });
        },
        successAuthCookies: async function (cookies, xsrfToken) {
            console.log(cookies);
            console.log(xsrfToken);
        },
        xsrfToken: '',
        cookies: []
    });
    await instance.login(username, password);

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
};

testGetPopularity()
    .then((res) => {
        console.log(res)
    })
    .catch((err) => {
        console.log(err);
    })
