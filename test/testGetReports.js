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

    const query = asa.AppleSearchAdsQuery(asa.queryTypes.reports)
        .measure(asa.measures.reports.campaigns)
        .timezone('UTC')
        .date('2021-02-01', '2021-02-02')
        .groupBy(asa.groupKey.countryOrRegion)
        .limit(50)
        .offset(0)
        .build();

    instance.request(query, function(error, result) {
        if (error) {
            console.log(error)
        } else {
            console.log(JSON.stringify(result.data))
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
