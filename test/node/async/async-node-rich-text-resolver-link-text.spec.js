const KontentDelivery = require('@kontent-ai/delivery-sdk');
const assert = require('assert');
const formattedJson = require('../data/fake-formatted-link-response.json');
const simpleJson = require('../data/fake-warrior-response.json');
const nodeParserLib = require('../../../dist/cjs/index');
const setup = require('../setup/delivery-test-client');

describe('Async Rich text resolver link text (formatted)', () => {
    let response;
    let resolvedRichText;
    let extractedLinkText;

    const expectedTextContent = 'unlocks mysteries of the Force';

    before(async () => {
        response = (await setup.getDeliveryClientWithJson(formattedJson).item('x').toPromise()).data;
        resolvedRichText = await KontentDelivery.createAsyncRichTextHtmlResolver(nodeParserLib.asyncNodeParser).resolveRichTextAsync({
            element: response.item.elements.text,
            linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
            urlResolverAsync: async (linkId, linkText, link) => {
                extractedLinkText = linkText;

                return await setup.toPromise({
                    linkUrl: `xLinkUrl-${link?.urlSlug}`
                });
            }
        });
    });

    it('link text content should be extracted as plain text', () => {
        assert.equal(extractedLinkText, expectedTextContent);
    });
});

describe('Async Rich text resolver link text (simple text)', () => {
    let response;
    let resolvedRichText;

    const fetchedLinkTexts = [];
    const expectedLinkTexts = ['Tom Hardy', 'Joel Edgerton'];

    before(async () => {
        response = (await setup.getDeliveryClientWithJson(simpleJson).item('x').toPromise()).data;
        resolvedRichText = await KontentDelivery.createAsyncRichTextHtmlResolver(nodeParserLib.asyncNodeParser).resolveRichTextAsync({
            element: response.item.elements.plot,
            linkedItems: KontentDelivery.linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
            urlResolverAsync: async (linkId, linkText, link) => {
                fetchedLinkTexts.push(linkText);

                return await setup.toPromise({
                    linkUrl: `xLinkUrl-${link?.urlSlug}`
                });
            }
        });
    });

    it(`text from links should be extracted`, () => {
        for (const expectedLinkText of expectedLinkTexts) {
            assert.ok(fetchedLinkTexts.includes(expectedLinkText));
        }
    });
});
