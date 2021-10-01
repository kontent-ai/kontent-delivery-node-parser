const KontentDelivery = require('@kentico/kontent-delivery');
const assert = require('assert');
const warriorJson = require('../data/fake-warrior-response.json');
const nodeParserLib = require('../../../dist/cjs/index');
const setup = require('../setup/delivery-test-client');

describe('Async rich text resolver (URL priority)', () => {

  let response;
  let resolvedRichText;

  before(async () => {
    response = (await setup.getDeliveryClientWithJson(warriorJson).item('x').toPromise()).data;
    resolvedRichText = await nodeParserLib.nodeRichTextResolver.resolveRichTextAsync({
      element: response.item.elements.plot,
      linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
      imageResolver: async (image) => {
        return await setup.toPromise({
          imageUrl: `xImageUrl-${image?.imageId}`
        });
      },
      urlResolver: async (link) => {
        return await setup.toPromise({
          linkUrl: `xLinkUrl-${link?.link?.urlSlug}`
        });
      },
      contentItemResolver: async (contentItem) => {
        if (contentItem && contentItem.system.type === 'actor') {
          const actor = contentItem;
          return await setup.toPromise({
            contentItemHtml: `<div class="xClass">${actor.elements.firstName.value}</div>`
          });
        }

        return await setup.toPromise({
          contentItemHtml: ''
        });
      }
    });
  });

  it(`linked items should be resolved`, () => {
    assert.ok(resolvedRichText.html.includes('<div class="xClass">Joel</div>'));
    assert.ok(resolvedRichText.html.includes('<div class="xClass">Tom</div>'));
  });

  it('images should be resolved', () => {
    assert.ok(resolvedRichText.html.includes('img src="xImageUrl-22504ba8-2075-48fa-9d4f-8fce3de1754a" data-asset-id="22504ba8-2075-48fa-9d4f-8fce3de1754a" data-image-id="22504ba8-2075-48fa-9d4f-8fce3de1754a" alt="">'));
    assert.ok(resolvedRichText.html.includes('<img src="xImageUrl-bb0899cf-2c3a-4e3f-8962-60e5a54fcca5" data-asset-id="bb0899cf-2c3a-4e3f-8962-60e5a54fcca5" data-image-id="bb0899cf-2c3a-4e3f-8962-60e5a54fcca5" alt="">'));
  });

  it('links should be resolved', () => {
    assert.ok(resolvedRichText.html.includes('<a data-item-id="3294e4b0-e58b-49d7-85fa-5bc9a86556ec" href="xLinkUrl-joel-edgerton">Joel Edgerton</a>'));
    assert.ok(resolvedRichText.html.includes('<a data-item-id="d1557cb1-d7ec-4d04-9742-f86b52bc34fc" href="xLinkUrl-tom-hardy">Tom Hardy</a>'));
  });

  it(`component codenames should be set`, () => {
    assert.ok(resolvedRichText.componentCodenames, ['ec9813f6_194d_018f_e20c_36855fb6e600']);
  });

  it(`linked item codenames should be set`, () => {
    assert.ok(resolvedRichText.linkedItemCodenames, ['tom_hardy', 'joel_edgerton']);
  });
});




