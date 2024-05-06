const KontentDelivery = require('@kontent-ai/delivery-sdk');
const assert = require('assert');
const warriorJson = require('../data/fake-warrior-response.json');
const nodeParserLib = require('../../../dist/cjs/index');
const setup = require('../setup/delivery-test-client');

describe('Node rich text object resolver', () => {

  let response;
  let resolvedData;

  const expectedRootChildrenNodes = 23;

  before(async () => {
    response = (await setup.getDeliveryClientWithJson(warriorJson).item('x').toPromise()).data;
    resolvedData = KontentDelivery.createRichTextObjectResolver(nodeParserLib.nodeParser).resolveRichText({
      element: response.item.elements.plot,
      linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
      cleanSdkIds: true
    });
  });


  it(`Expect correct number of root children nodes`, () => {
    assert.ok(resolvedData.data.children.length === expectedRootChildrenNodes);
  });

  it(`Expect text nodes should be extracted`, () => {
    const textChildren = Object.values(resolvedData.data.children).filter(({ tag }) => tag === '#text');
    const filledTextChildren = textChildren.filter(({ data: { text } }) => !!text);

    assert.ok(textChildren.length === filledTextChildren.length);
  });
});
