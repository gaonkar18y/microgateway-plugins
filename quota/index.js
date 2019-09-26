'use strict';

// QUOTA
// module:  microgateway-plugins/quota 


var async = require('async');
var Quota = require('volos-quota-apigee');
var debug = require('debug')('gateway:quota');
var url = require('url');
const util = require('util');


module.exports.init = function(config, logger /*, stats */) {

    const debugImpl = (...data) => {
        const formatedData = util.format(...data);
        logger.debug('quota : '+formatedData);
        debug(formatedData);
    }

    debugImpl('quota plugin init called with config: %j', config)
    
    const { product_to_proxy, proxies } = config;
    const prodsObj = {};
    var quotas = {}; // productName -> connectMiddleware
    var options = {
        key: function(req) {
            return req.token.application_name+'.'+req.productName;
        }
    };

    var quotaManagers = {}

    if (  (product_to_proxy === undefined)  || (proxies === undefined) ) {
        //
        debugImpl("quota plugin did not recieve valid produc-proxy map or list of proxies")
        return(undefined)
    }

    Object.keys(config).forEach(function(productName) {
        var product = config[productName];
        if (!product.uri && !product.key && !product.secret && !product.allow && !product.interval || product.interval === "null") {
            // skip non-quota config
            debugImpl('Quota not configured on the API product: %s, skipping. This message is safe to ignore',productName);
            return;
        }

        if ( product.timeUnit === 'month' ) {
            //product.timeUnit = '30days';  // this is broken - volos does not consider 30days as an option, but tries to process it anyway.
        }

        const prodProxiesArr = product_to_proxy[productName];

        const prodObj = {};
        if (Array.isArray(prodProxiesArr)) {
            prodProxiesArr.reduce((acc, val) => {
                acc[val] = true;
                return acc;
            }, prodObj);
        }

        const basePaths = {};

        if (Array.isArray(proxies)) {
            proxies.reduce((acc, prox) => {
                if (prox.name !== 'edgemicro-auth' && prodObj[prox.name] === true) acc[prox.base_path] = true;
                return acc;
            }, basePaths);
        }

        prodObj.basePaths = basePaths;
        prodsObj[productName] = prodObj;

        config[productName].request = config.request;
        config[productName]['debug'] = debugImpl;
        var quota = Quota.create(config[productName]);
        quotas[productName] = quota.connectMiddleware().apply(options);
        //
        quotaManagers[productName] = quota;
        debugImpl('created quota for', productName);
    });

    var middleware = function(req, res, next) {

        if (!req.token || !req.token.api_product_list || !req.token.api_product_list.length) {
            return next();
        }

        debugImpl('New request, quota checking products', req.token.api_product_list);

        req.originalUrl = req.originalUrl || req.url; // emulate connect
        
        let proxyPath = res.proxy ? res.proxy.base_path : undefined;
        let proxyUrl = req.url ? url.parse(req.url).pathname : undefined;
        let matchedPathProxy = proxyPath || proxyUrl || '';
        debugImpl('matchedPathProxy',matchedPathProxy);

        const prodList = [];
        if (Array.isArray(req.token.api_product_list)) {
            req.token.api_product_list.reduce((acc, prod) => {
                if (prodsObj[prod] && 
                    prodsObj[prod].basePaths && 
                    prodsObj[prod].basePaths[matchedPathProxy] === true) acc.push(prod);
                return acc;
            }, prodList);

            debugImpl('prodList', prodList);
        }

        // this is arbitrary, but not sure there's a better way?
        // async.eachSeries(req.token.api_product_list,
        async.eachSeries(prodList,
            function(productName, cb) {
                var connectMiddleware = quotas[productName];
                debugImpl('applying quota for', productName);
                req['productName'] = productName; // to be used for quota identifier generation
                if ( connectMiddleware ){  connectMiddleware(req, res, cb) } else cb();
            },
            function(err) {
                next(err);
            }
        );
    }

    return {

        testprobe: function() {
            return quotas
        },

        onrequest: function(req, res, next) {
            if ( process.env.EDGEMICRO_LOCAL !== undefined ) {
                debugImpl("MG running in local mode. Skipping Quota");
                next();
            } else {
                middleware(req, res, next);
            }
        },

        shutdown: function() {
            // look for extant timers ... for global graceful shutdown...
            for ( var qmKey in quotaManagers ) {
                var q = quotaManagers[qmKey];
                if ( q.quota ) {
                    q = q.quota;
                }
                if ( q.bucketTimer ) {
                    clearInterval(q.bucketTimer)
                }
                if ( q.flushTimer ) {
                    clearInterval(q.flushTimer)
                }
            }
        }

    }
};
