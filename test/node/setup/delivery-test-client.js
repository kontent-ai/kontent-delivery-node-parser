const KontentCore = require('@kentico/kontent-core');
const KontentDelivery = require('@kentico/kontent-delivery');
const testProjectId = 'delivery-project-id';

const defaultPropertyNameResolver = (type, element) => {
    if (type === 'actor') {
        if (element === 'first_name') {
            return 'firstName';
        }
        if (element === 'last_name') {
            return 'lastName';
        }
    }

    if (type === 'movie') {
        if (element === 'releasecategory') {
            return 'releaseCategory';
        }
    }

    return element;
};


module.exports.toPromise = function (data) {
    return new Promise((resolve, reject) => {
        resolve(data);
    });
}

module.exports.getTestDeliveryClient = function (config) {
    return createDeliveryClient(
        config
            ? config
            : {
                projectId: testProjectId
            }
    );
}

module.exports.getDeliveryClientWithError = function (errorJson) {
    return createDeliveryClient({
        projectId: testProjectId,
        propertyNameResolver: defaultPropertyNameResolver,
        httpService: new KontentCore.TestHttpService({
            response: undefined,
            error: errorJson
        })
    });
}

module.exports.getDeliveryClientWithJson = function (
    json,
    config,
    responseHeaders = []
) {
    return this.getDeliveryClientWithJsonAndHeaders(json, config, responseHeaders);
}

module.exports.getDeliveryClientWithJsonAndHeaders = function (
    json,
    config,
    responseHeaders = []
) {
    if (!config) {
        return KontentDelivery.createDeliveryClient({
            projectId: testProjectId,
            propertyNameResolver: defaultPropertyNameResolver,
            httpService: new KontentCore.TestHttpService({
                response: getResponseFromJson(json, responseHeaders),
                error: undefined
            })
        });
    }

    // always set http service
    config.httpService = new KontentCore.TestHttpService({
        response: getResponseFromJson(json, responseHeaders),
        error: undefined
    });

    return createDeliveryClient(config);
}

function getResponseFromJson(json, responseHeaders = []) {
    return {
        data: json,
        headers: responseHeaders,
        rawResponse: json,
        status: 999,
        retryStrategy: {
            retryAttempts: 1,
            options: {}
        }
    };
}
