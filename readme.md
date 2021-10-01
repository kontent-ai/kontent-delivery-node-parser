# Node.js parser for Rich text elements

This library is an optional addon for the [javascript delivery SDK](https://github.com/Kentico/kontent-delivery-sdk-js)
that can be used to resolve rich text elements in `node.js` environment.

This is an alternative to built-in `browserRichTextResolver` that comes native with the SDK and works in browsers.

#### Usage

Use `nodeRichTextResolver` when you need to resolve rich text elements in `node.js` environment

```typescript
import { createDeliveryClient, linkedItemsHelper } from '@kentico/kontent-delivery';
import { nodeRichTextResolver } from '@kentico/kontent-delivery-node-js-parser';

export type Movie = IContentItem<{
    plot: Elements.RichTextElement;
}>;

export type Actor = IContentItem<{
    firstName: Elements.RichTextElement;
}>;

// get content item with rich text element
const response = (await createDeliveryClient({ projectId: 'projectId' }).item<Movie>('itemCodename').toPromise()).data;

// get rich text element
const richtElement = response.item.plot;

// resolve HTML
const resolvedRichText = nodeRichTextResolver.resolveRichText({
    element: richtElement,
    linkedItems: linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
    imageResolver: (image) => {
        return {
            imageHtml: `<img class="xImage" src="${image?.url}">`,
            // alternatively you may return just url
            url: 'customUrl'
        };
    },
    urlResolver: (link) => {
        return {
            linkHtml: `<a class="xLink">${link?.link?.urlSlug}</a>`,
            // alternatively you may return just url
            url: 'customUrl'
        };
    },
    contentItemResolver: (contentItem) => {
        if (contentItem && contentItem.system.type === 'actor') {
            const actor = contentItem as Actor;
            return {
                contentItemHtml: `<div class="xClass">${actor.elements.firstName.value}</div>`
            };
        }

        return {
            contentItemHtml: ''
        };
    }
});

const resolvedHtml = resolvedRichText.html;
```

If you need to use `async functions` within resolvers, use the `resolveRichTextAsync`:

```typescript
const resolvedRichText = await nodeRichTextResolver.resolveRichTextAsync({
    element: response.item.elements.plot,
    linkedItems: linkedItemsHelper.convertLinkedItemsToArray(response.linkedItems),
    imageResolver: async (image) => {
        // async function
        return {
            imageHtml: await customAsyncfunc()
        };
    },
    urlResolver: async (link) => {
        // async function
        return {
            imageHtml: await customAsyncfunc()
        };
    },
    contentItemResolver: async (contentItem) => {
        // async function
        return {
            contentItemHtml: await customAsyncfunc()
        };
    }
});
```
