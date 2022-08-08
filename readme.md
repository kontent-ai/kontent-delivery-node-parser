# Node.js parser for Rich text elements

This library is an optional addon for the [javascript delivery SDK](https://github.com/kontent-ai/delivery-sdk-js)
that can be used to resolve rich text elements in `node.js` environment.

This is an alternative to built-in `browserParser` that comes native with the SDK and works in browsers.

#### Usage

```typescript
import { createRichTextHtmlResolver, createAsyncRichTextHtmlResolver } from '@kontent-ai/delivery-sdk';
import { nodeParser, asyncNodeParser } from '@kontent-ai/delivery-node-parser';

// transform rich text html into json
const json = createRichTextHtmlResolver(nodeParser).resolveRichText(data);

// or
const html = await createAsyncRichTextHtmlResolver(asyncNodeParser).resolveRichText(data);
```
