'use strict';

var _ = require('underscore');
var moment = require('moment-timezone');

const measures = {
    reports: {
        campaigns: 'campaigns'
    }
};

const groupKey = {
    countryOrRegion: 'countryOrRegion'
};

module.exports.measures = measures;
module.exports.groupKey = groupKey;

module.exports.queryTypes = {
    keywordsRecommendation: 'keywordsRecommendation',
    reports: 'reports',
};

function AppleSearchAdsQuery(type) {
    var fn = Query.prototype[type];
    if (typeof fn !== 'function') {
        throw new Error('Unknown query type: ' + type);
    }

    return new Query(type);
}

AppleSearchAdsQuery.keywordsRecommendation = function(config) {
    return new Query(config).keywordsRecommendation();
}

AppleSearchAdsQuery.sources = function(config) {
    return new Query(config).sources();
}

var Query = function(type) {
    this.config = {};
    this.queryType = type;
    this.apiURL = ' https://app-ads.apple.com';

    return this;
};

Query.prototype.build = function() {
    if (!this.queryType) {
        throw new Error('Not found query type');
    }
    this[this.queryType]();

    return this;
}

Query.prototype.keywordsRecommendation = function() {
    this.endpoint = '/cm/api/v2/keywords/recommendation';
    this.config.params = {
        adamId: this.config.appId,
        text: this.config.keywordText
    }
    this.config.body = {
        storefronts: this.config.storefronts
    }

    return this;
}

Query.prototype.reports = function() {
    this.endpoint = '/cm/api/v4/reports';
    this.config.params = {}
    const timeZone = this.config.timeZone ? this.config.timeZone : 'UTC';
    const selector = {
        orderBy: [{
            field: "localSpend",
            sortOrder: "DESCENDING"
        }],
        pagination: {
            offset: this.config.offset ? this.config.offset : 0,
            limit: this.config.limit ? this.config.limit : 50
        },
    };

    this.config.body = {
        type: this.config.measure,
        filter: {
            startTime: (this.config.start ? this.config.start.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')),
            endTime: (this.config.end ? this.config.end.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')),
            timeZone,
            returnRowTotals: true,
            returnGrandTotals: true,
            groupBy: this.config.groupBy,
            selector,
            returnRecordsWithNoMetrics: true
        }
    }

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

    return encodeURI(paramsString);
};

Query.prototype.appId = function(appId) {
    if (!appId) {
        throw new Error('App id does not exists: ' + appId);
    }
    this.config.appId = appId;

    return this;
}

Query.prototype.keywordText = function(text) {
    if (!text) {
        throw new Error('Keyword text does not exists: ' + text);
    }

    if (typeof text !== 'string') {
        throw new Error('Keyword text is not string');
    }
    this.config.keywordText = text;

    return this;
}

Query.prototype.storefronts = function(storefronts) {
    if (!Array.isArray(storefronts)) {
        throw new Error('Storefronts is not array: ' + storefronts);
    }
    this.config.storefronts = storefronts;

    return this;
}

Query.prototype.measure = function(measure) {
    if (!measure) {
        throw new Error('Measure does not exists: ' + measure);
    }

    if(!measures[this.queryType][measure]) {
        throw new Error('Not found measure type: ' + measure);
    }

    this.config.measure = measure;

    return this;
}

Query.prototype.limit = function(limit) {
    if (!limit) {
        throw new Error('Limit not exists: ' + limit);
    }

    if(isNaN(limit)) {
        throw new Error('Limit is NaN: ' + limit);
    }

    if(limit < 0) {
        throw new Error('Limit is not positive: ' + limit);
    }

    this.config.limit = limit;

    return this;
}

Query.prototype.offset = function(offset) {
    if (offset === null || offset === undefined) {
        throw new Error('Offset not exists: ' + offset);
    }

    if(isNaN(offset)) {
        throw new Error('Offset is NaN: ' + offset);
    }

    if(offset < 0) {
        throw new Error('Offset is not positive: ' + offset);
    }

    this.config.offset = offset;

    return this;
}


Query.prototype.timezone = function(timezone) {
    if (!timezone) {
        throw new Error('Timezone not exists: ' + timezone);
    }

    if(moment.tz.zone(timezone) === null) {
        throw new Error('Is not valid timezone: ' + timezone);
    }

    this.config.timezone = timezone;

    return this;
}

Query.prototype.groupBy = function(key) {
    if (!key) {
        throw new Error('Group key not exists: ' + key);
    }

    if(Object.values(groupKey).indexOf(key) === -1) {
        throw new Error('Is not valid group key: ' + key);
    }
    if(!this.config.groupBy) {
        this.config.groupBy = [];
    }
    this.config.groupBy.push(key);

    return this;
}

Query.prototype.date = function(start, end) {
    this.config.start = toMomentObject(start);
    end = (typeof end == 'undefined') ? start : end;
    this.config.end = toMomentObject(end);

    return this;
}

function toMomentObject(date) {
    if (moment.isMoment(date))
        return date;

    if (date instanceof Date)
        return moment(date);

    var regex = new RegExp(/([0-9]{4})-([0-9]{2})-([0-9]{2})/);
    if(_.isString(date) && !!(date.match(regex)))
        return moment(date, "YYYY-MM-DD");

    throw new Error('Unknown date format. Please use Date() object or String() with format YYYY-MM-DD.');
}

module.exports.AppleSearchAdsQuery = AppleSearchAdsQuery;
