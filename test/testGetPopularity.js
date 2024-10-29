var asa = require('./../src/appleSearchAds.js');
const readline = require('readline');
var AppleSearchAds = asa.AppleSearchAds;

const username = '';
const password = '';

const cookies = ''.split(';').map((cookie) => cookie + ';')

const testGetPopularity = async function() {
    const instance = new AppleSearchAds({
        twoFAHandler: function (successCallback) {
            const rl = readline.createInterface({input: process.stdin, output: process.stdout});
            rl.question('Enter the 2FA code: ', (code) => {
                successCallback(code);
            });
        },
        successAuthCookies: async function (cookies) {
            console.log(cookies);
        },
        cookies
    });
    await instance.login(username, password);

    const query = asa.AppleSearchAdsQuery(asa.queryTypes.keywordsRecommendation)
        .keywordText("lightroom")
        .appId(1585159557)
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
