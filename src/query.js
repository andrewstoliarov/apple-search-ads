'use strict';

var _ = require('underscore');

function AppleSearchAdsQuery(type, appId, config) {
    var fn = Query.prototype[type];
    if (typeof fn !== 'function') {
        throw new Error('Unknown query type: ' + type);
    }

    return new Query(appId, config)[type]();
}

AppleSearchAdsQuery.keywordsRecommendation = function(appId, config) {
    return new Query(appId, config).keywordsRecommendation();
}

AppleSearchAdsQuery.sources = function(appId, config) {
    return new Query(appId, config).sources();
}

var Query = function(appId, config) {
    this.config = {};

    this.adamId = appId;
    this.apiURL = ' https://app.searchads.apple.com/cm/api/v2';

    _.extend(this.config, config);

    return this;
};

Query.prototype.keywordsRecommendation = function() {
    this.endpoint = '/keywords/recommendation';
    return this;
}

Query.prototype.assembleBody = function() {
    var body = {};

    var cfg = {};
    _.extend(cfg, this.config.body);


    for (var prop in cfg) {
        body[prop] = cfg[prop];
    }

    return body;
};

Query.prototype.assembleParams = function() {
    let paramsString = '';

    Object.keys(this.config.params).forEach((paramName, index) => {
        paramsString = paramsString + (index === 0 ? `?${paramName}=${this.config.params[paramName]}` : `&${paramName}=${this.config.params[paramName]}`);
    })

    paramsString = paramsString + `&adamId=${this.adamId}`;

    return paramsString;
};

module.exports.AppleSearchAdsQuery = AppleSearchAdsQuery;
