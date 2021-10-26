const KontentDelivery = require('@kentico/kontent-delivery');
const assert = require('assert');
const warriorJson = require('../data/fake-warrior-response.json');
const nodeParserLib = require('../../../dist/cjs/index');
const setup = require('../setup/delivery-test-client');

describe('Async rich text resolver (HTML priority)', () => {

  let response;
  let resolvedRichText;

  before(async () => {
    response = (await setup.getDeliveryClientWithJson(warriorJson).item('x').toPromise()).data;
    resolvedRichText = await KontentDelivery.richTextHtmlResolver.resolveRichTextAsync({
      parser: nodeParserLib.nodeParserAsync,
      element: response.item.elements.plot,
      linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
      imageResolverAsync: async (imageId, image) => {
        return await setup.toPromise({
          imageHtml: `<img class="xImage" src="${image?.imageId}"></img>`
        });
      },
      urlResolverAsync: async (linkId, linktext, link) => {
        return await setup.toPromise({
          linkHtml: `<a class="xLink">${link?.urlSlug}</a>`
        });
      },
      contentItemResolverAsync: async (contentItemCodename, contentItem) => {
        if (contentItem && contentItem.system.type === 'actor') {
          const actor = contentItem;
          return await setup.toPromise({
            contentItemHtml: `<div class="xClass">${actor.elements.firstName.value}</div>`
          });
        }

        return {
          contentItemHtml: ''
        };
      }
    });
  });

  it(`linked items should be resolved`, () => {
    assert.ok(resolvedRichText.html.includes('<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="tom_hardy" data-sdk-resolved="1"><div class="xClass">Tom</div></object>'));
    assert.ok(resolvedRichText.html.includes('<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="joel_edgerton" data-sdk-resolved="1"><div class="xClass">Joel</div></object>'));
    assert.ok(resolvedRichText.html.includes('<object type="application/kenticocloud" data-type="item" data-rel="component" data-codename="ec9813f6_194d_018f_e20c_36855fb6e600" data-sdk-resolved="1"><div class="xClass">Jennifer </div></object>'));
  });

  it('images should be resolved', () => {
    assert.ok(resolvedRichText.html.includes('<figure data-asset-id="22504ba8-2075-48fa-9d4f-8fce3de1754a" data-image-id="22504ba8-2075-48fa-9d4f-8fce3de1754a"><img class="xImage" src="22504ba8-2075-48fa-9d4f-8fce3de1754a"></figure>'));
    assert.ok(resolvedRichText.html.includes('<figure data-asset-id="bb0899cf-2c3a-4e3f-8962-60e5a54fcca5" data-image-id="bb0899cf-2c3a-4e3f-8962-60e5a54fcca5"><img class="xImage" src="bb0899cf-2c3a-4e3f-8962-60e5a54fcca5"></figure>'));
  });

  it('links should be resolved', () => {
    assert.ok(resolvedRichText.html.includes('<a class="xLink">tom-hardy</a>'));
    assert.ok(resolvedRichText.html.includes('<a class="xLink">joel-edgerton</a>'));
  });

  it(`component codenames should be set`, () => {
    assert.ok(resolvedRichText.componentCodenames, ['ec9813f6_194d_018f_e20c_36855fb6e600']);
  });

  it(`linked item codenames should be set`, () => {
    assert.ok(resolvedRichText.linkedItemCodenames, ['tom_hardy', 'joel_edgerton']);
  });
});




