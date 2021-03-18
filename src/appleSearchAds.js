'use strict';

const _ = require('underscore');
const request = require('request-promise-native');
const async = require('async');
const url = require('url');
const query = require('./query.js');

var AppleSearchAds = function(username, password, options) {
    this.options = {
        baseURL: 'https://app.searchads.apple.com/cm/api/v1/startup',
        signUrl: 'https://idmsa.apple.com/IDMSWebAuth/signin',
        loginURL: 'https://idmsa.apple.com/appleauth/auth',
        startupURL: 'https://app.searchads.apple.com/cm/api/v1/startup',
        cmAppUrl: 'https://app.searchads.apple.com/cm/app?tab=0',
        appleWidgetKey: 'a01459d797984726ee0914a7097e53fad42b70e1f08d09294d14523a1d4f61e1',
        concurrentRequests: 2,
        errorCallback: function(e) { console.log('Login failure: ' + e); },
        successCallback: function(d) { console.log('Login success.'); }
    };

    _.extend(this.options, options);

    // Private
    this._cookies = [];
    this._xsrfToken = '';
    this._queue = async.queue(
        this.executeRequest.bind(this),
        this.options.concurrentRequests
    );
    this._queue.pause();

    if (typeof this.options['cookies'] !== 'undefined') {
        this._cookies = this.options.cookies;
        this._queue.resume();
    } else {
        this.login(username, password);
    }
};

AppleSearchAds.prototype.executeRequest = function(task, callback) {
    const query = task.query;
    const completed = task.completed;

    const requestBody = query.assembleBody();
    const params = query.assembleParams();

    const uri = url.parse(query.apiURL + query.endpoint + params);
    request.post({
        uri: uri,
        headers: this.getHeaders(),
        timeout: 200000,
        json: requestBody,
        resolveWithFullResponse: true
    }).then(response => {
        completed(null, response.body)
        callback();
    }).catch(error => {
        completed(error, null);
        callback();
    });
}

AppleSearchAds.prototype.catch412Login = function(response) {
        const cookies = response.response.headers['set-cookie'];
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            scnt: response.response.headers['scnt'],
            'X-Apple-ID-Session-Id': response.response.headers['x-apple-id-session-id'],
            'X-Apple-Widget-Key': this.options.appleWidgetKey,
            'X-Requested-With': 'XMLHttpRequest',
            Cookie: cookies
                .map((cookie) => cookie.split(';')[0])
                .join('; '),
        };
        return request
            .post({
                url: `https://idmsa.apple.com/appleauth/auth/repair/complete`,
                headers: headers,
                resolveWithFullResponse: true,
            });
}

AppleSearchAds.prototype.sign = function(response) {
    const cookies = response.headers['set-cookie'];
    if (!(cookies && cookies.length)) {
        throw new Error('There was a problem with loading the login page cookies. Check login credentials.');
    }
    const myAccount = /myacinfo=.+?;/.exec(cookies);
    this._cookies.push(myAccount[0])

    return request.get({
        url: this.options.cmAppUrl,
        followRedirect: false,
        headers: {
            'Cookie': this._cookies,
        },
        resolveWithFullResponse: true
    }).then((res) => {
        const cookies = res.headers['set-cookie'];
        const saUser = /sa_user=.+?;/.exec(cookies);
        this._cookies.push(saUser[0])

        return request.get({
            url: this.options.startupURL,
            followRedirect: false,
            headers: {
                'Cookie': this._cookies,
            },
            resolveWithFullResponse: true
        })
    })
}

AppleSearchAds.prototype.login = function(username, password) {
    request.get({
        url: `${this.options.signUrl}?appIdKey=${this.options.appleWidgetKey}&rv=1&path=`,
        headers: {
            'Content-Type': 'application/json',
        },
        resolveWithFullResponse: true
    }).then((response) => {
        this._cookies.push((/JSESSIONID=.+?;/.exec(response.headers["set-cookie"]))[0])
        request.post({
            url: `${this.options.loginURL}/signin`,
            headers: {
                'Content-Type': 'application/json',
                'X-Apple-Widget-Key': this.options.appleWidgetKey
            },
            json: {'accountName': username, 'password': password, 'rememberMe': false},
            resolveWithFullResponse: true
        }).catch((response) => {
            if (response.statusCode === 412) {
                return this.catch412Login(response);
            }
        }).then((response) => {
            return this.sign(response)
        }).then((response) => {
            const cookies = response.headers['set-cookie'];
            if (!(cookies && cookies.length)) {
                throw new Error('There was a problem with loading the login page cookies. Check login credentials.');
            }
            const xsrfToken = /XSRF-TOKEN-CM=.+?;/.exec(cookies);
            this._xsrfToken = xsrfToken[0].replace('XSRF-TOKEN-CM=', '').replace(';', '');
            let cookiesString = '';
            this._cookies.forEach(cookie => {
                cookiesString = cookiesString + cookie;
            })
            this._cookies = cookiesString;
            this._queue.resume();
            this.options.successCallback(this._cookies);
        }).catch((err) => {
            console.log(err)
            this.options.errorCallback(err);
        });
    })

};

AppleSearchAds.prototype.request = function(query, callback) {
    this._queue.push({
        query: query,
        completed: callback
    });
};

AppleSearchAds.prototype.getCookies = function() {
    return this._cookies;
};

AppleSearchAds.prototype.getHeaders = function() {
    return {
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://app.searchads.apple.com',
        'X-Requested-By': 'app.searchads.apple.com',
        'Referer': 'https://app.searchads.apple.com/',
        'Cookie': this._cookies,
        'x-xsrf-token-cm': this._xsrfToken,
    };
}

module.exports.AppleSearchAds = AppleSearchAds;
module.exports.AppleSearchAdsQuery = query.AppleSearchAdsQuery;
