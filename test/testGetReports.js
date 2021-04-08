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
        },
    })
};

testGetPopularity()
