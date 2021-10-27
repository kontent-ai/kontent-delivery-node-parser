# Node.js parser for Rich text elements

This library is an optional addon for the [javascript delivery SDK](https://github.com/Kentico/kontent-delivery-sdk-js)
that can be used to resolve rich text elements in `node.js` environment.

This is an alternative to built-in `browserParser` that comes native with the SDK and works in browsers.

#### Usage

```typescript
import { createRichTextHtmlResolver, createAsyncRichTextHtmlResolver } from '@kentico/kontent-delivery';
import { nodeParser, asyncNodeParser } from '@kentico/kontent-delivery-node-parser';

// transform rich text html into json
const json = createRichTextHtmlResolver(nodeParser).resolveRichText(data);

// or
const html = await createAsyncRichTextHtmlResolver(asyncNodeParser).resolveRichText(data);
```
