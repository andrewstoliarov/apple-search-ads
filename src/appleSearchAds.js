'use strict';

const _ = require('underscore');
const request = require('request-promise-native');
const async = require('async');
const url = require('url');
const query = require('./query.js');
const {GSASRPAuthenticator} = require('./GSASRPAuthenticator.js');

var AppleSearchAds = function(options) {
    this.options = {
        baseURL: 'https://app-ads.apple.com/cm/api/v1/startup',
        signUrl: 'https://idmsa.apple.com/IDMSWebAuth/signin',
        authURL: 'https://idmsa.apple.com/appleauth/auth',
        startupURL: 'https://app-ads.apple.com/cm/api/v1/startup',
        cmAppUrl: 'https://app-ads.apple.com/cm/app',
        checkUrl: 'https://app-ads.apple.com/cm/api/v1/userprefs',
        appleWidgetKey: 'a01459d797984726ee0914a7097e53fad42b70e1f08d09294d14523a1d4f61e1',
        concurrentRequests: 2,
        cookies: [],
        twoFAHandler: function(successCallback) { console.log('2FA handler'); },
        errorExternalCookies: async function () {console.log('External headers error');},
        successAuthCookies: async function (cookies) {}
    };

    _.extend(this.options, options);

    // Private
    this._cookies = this.options.cookies;
    this._queue = async.queue(
        this.executeRequest.bind(this),
        this.options.concurrentRequests
    );
    this._queue.pause();
};

AppleSearchAds.prototype.tryExternalCookies = async function(retryCount = 3) {
    if (typeof this.options['cookies'] === undefined) {
        return Promise.resolve(false);
    }
    this._cookies = this.options.cookies;

    try {
        const config = {
            uri: this.options.checkUrl,
            headers: this.getHeaders(),
            timeout: 300000, //5 minutes
            resolveWithFullResponse: true
        };
        await request.get(config)
        return Promise.resolve(true);
    } catch (e) {
        if(e.toString().includes('Not authorized') && retryCount === 0) {
            console.log(`Retry tryExternalCookies: ${retryCount}`)
            return this.tryExternalCookies(--retryCount);
        } else {
            return Promise.resolve(false);
        }
    }
}

AppleSearchAds.prototype.signin = function(path, body) {
    return request.post(`${this.options.authURL}/signin/${path}`, {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            'Cookie': this.getCookies(),
            'X-Apple-Widget-Key': this.options.appleWidgetKey,
        },
        resolveWithFullResponse: true,
        json: body
    })
}

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

AppleSearchAds.prototype.invokeCmAppUrl = async function() {
    const processCookies = (res) => {
        const cookies = res.headers['set-cookie'];
        this._cookies = this._cookies.filter(cookie => !cookie.includes('sa_user') && !cookie.includes('searchads.userId') && !cookie.includes('XSRF-TOKEN-CM'));
        const saUser = /sa_user=.+?;/.exec(cookies);
        const searchadsUserId = /searchads.userId=.+?;/.exec(cookies);
        if(searchadsUserId && searchadsUserId.length !== 0) {
            this._cookies.push(searchadsUserId[0])
        }
        if(saUser && saUser.length !== 0) {
            this._cookies.push(saUser[0])
        }

        const xsrfToken = /XSRF-TOKEN-CM=.+?;/.exec(cookies);

        if(xsrfToken && xsrfToken.length !== 0) {
            this._cookies.push(xsrfToken[0])
        }
        let cookiesString = '';
        this._cookies.forEach(cookie => {
            cookiesString = cookiesString + cookie;
        })
        this._cookies = cookiesString;

        return Promise.resolve();
    }
    return request.get({
        url: this.options.cmAppUrl,
        followRedirect: false,
        headers: {
            'Cookie': this._cookies,
        },
        resolveWithFullResponse: true
    }).then((res) => {
        return processCookies(res);
    }).catch((err) => {
        if(err.statusCode === 307) {
            return processCookies(err.response);
        } else {
            throw new Error(err);
        }
    })
}

AppleSearchAds.prototype.TwoFAHandler = function(res, headers) {
    return new Promise((resolve, reject) => {
        this.options.twoFAHandler((code) => {
            resolve(code);
        });
    }).then((code) => {
        return request.post({
            url: `${this.options.authURL}/verify/trusteddevice/securitycode`,
            headers: headers,
            json: {securityCode: {code: code}},
            resolveWithFullResponse: true
        }).then((res) => {
            return request.get({
                url: `${this.options.authURL}/2sv/trust`,
                headers: headers,
                resolveWithFullResponse: true
            });
        }).catch((res) => {
            return Promise.reject(res);
        });
    });
}

AppleSearchAds.prototype.HSA2Handler = function(res, headers) {
    return new Promise((resolve, reject) => {
        return request.get({
            url: this.options.authURL,
            headers: headers,
            resolveWithFullResponse: true
        }).then((res) => {
            this.options.twoFAHandler((code) => {
                resolve(code);
            });
        })
    }).then((code) => {
        return request.post({
            url: `${this.options.authURL}/verify/trusteddevice/securitycode`,
            headers: headers,
            json: {securityCode: {code: code}},
            resolveWithFullResponse: true
        }).then((res) => {
            return request.get({
                url: `${this.options.authURL}/2sv/trust`,
                headers: headers,
                resolveWithFullResponse: true
            });
        }).catch((res) => {
            return Promise.reject(res);
        });
    });
}

AppleSearchAds.prototype.login = async function(username, password) {
    if (await this.tryExternalCookies()) {
        this._queue.resume();
        return Promise.resolve();
    }

    const authenticator = new GSASRPAuthenticator(username);
    let initData = await authenticator.getInit();

    return new Promise((resolve, reject) => {
        request.get({
            url: `${this.options.signUrl}?appIdKey=${this.options.appleWidgetKey}&rv=1&path=`,
            headers: {...{
                    'Content-Type': 'application/json',
            }, ...this.getHeaders()},
            resolveWithFullResponse: true
        }).then((response) => {
            this.signin('init', initData)
                .then(async (initResp) => {
                    let proof = await authenticator.getComplete(password, initResp.toJSON().body);
                    let completeResp = await this.signin("complete?isRememberMeEnabled=true", {
                        ...proof,
                        rememberMe: true,
                    })
                    return Promise.resolve(completeResp.toJSON());
                }).catch((resRaw) => {
                const res = resRaw.response.toJSON();
                if (res.statusCode === 412) {
                    return this.catch412Login(res);
                }

                if (res.statusCode !== 409) {
                    return Promise.reject(res);
                }
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'scnt': res.headers['scnt'],
                    'X-Apple-ID-Session-Id': res.headers['x-apple-id-session-id'],
                    'X-Apple-Widget-Key': this.options.appleWidgetKey,
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Apple-Domain-Id': '3',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-Mode': 'cors'
                };

                const body = res.body;
                if (body && body.authType === 'hsa2') {
                    console.log('hsa2')
                    return this.HSA2Handler(res, headers);
                }

                //We need to get the 2fa code
                return this.TwoFAHandler(res, headers);
            }).then((response) => {
                const cookies = response.headers['set-cookie'];
                if (!(cookies && cookies.length)) {
                    throw new Error('There was a problem with loading the login page cookies. Check login credentials.');
                }
                const des = /(DES.+?)=(.+?;)/.exec(cookies);
                const myAccount = /myacinfo=.+?;/.exec(cookies);
                this._cookies = this._cookies.filter(cookie => !cookie.includes('myacinfo'))
                this._cookies.push(myAccount[0]);
                if(des && des.length !== 0) {
                    this._cookies = this._cookies.filter(cookie => !cookie.includes('DES'))
                    this._cookies.push(des[0]);
                }

                return this.invokeCmAppUrl()
            }).then(async () => {
                this._queue.resume();
                await this.options.successAuthCookies(this._cookies)
                resolve();
            }).catch((err) => {
                reject(err);
            });
        }).catch(async (err) => {
            await this.options.errorExternalCookies();
            return Promise.reject(err);
        })
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
        'Cookie': this._cookies,
    };
};

module.exports.AppleSearchAds = AppleSearchAds;
module.exports.AppleSearchAdsQuery = query.AppleSearchAdsQuery;
module.exports.measures = query.measures;
module.exports.queryTypes = query.queryTypes;
module.exports.groupKey = query.groupKey;
