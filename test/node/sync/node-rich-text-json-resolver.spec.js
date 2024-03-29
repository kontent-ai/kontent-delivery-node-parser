const KontentDelivery = require('@kontent-ai/delivery-sdk');
const assert = require('assert');
const warriorJson = require('../data/fake-warrior-response.json');
const nodeParserLib = require('../../../dist/cjs/index');
const setup = require('../setup/delivery-test-client');

describe('Node rich text json resolver', () => {
    let response;
    let resolvedData;

    const expectedRootChildrenNodes = 23;

    before(async () => {
        response = (await setup.getDeliveryClientWithJson(warriorJson).item('x').toPromise()).data;
        resolvedData = KontentDelivery.createRichTextJsonResolver(nodeParserLib.nodeParser).resolveRichText({
            element: response.item.elements.plot,
            linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
            cleanSdkIds: true
        });
    });

    it(`Expect correct number of root children nodes`, () => {
        const parsedJson = JSON.parse(resolvedData.json);
        assert.ok(parsedJson.children.length === expectedRootChildrenNodes);
    });
});
