import {
    IResolvedRichTextElement,
    IRichTextAsyncResolver,
    IRichTextResolver,
    IRichTextResolverAsyncInput,
    IRichTextResolverInput,
    RichTextItemIndexReferenceWrapper
} from '@kentico/kontent-delivery';
import { resolveRichTextInternalAsync } from './implementation/async-resolver';
import { resolveRichTextInternal } from './implementation/sync-resolver';

export class NodeRichTextResolver implements IRichTextResolver, IRichTextAsyncResolver {
    resolveRichText(input: IRichTextResolverInput): IResolvedRichTextElement {
        return resolveRichTextInternal(input, input.element.value, new RichTextItemIndexReferenceWrapper(0));
    }

    async resolveRichTextAsync(input: IRichTextResolverAsyncInput): Promise<IResolvedRichTextElement> {
        return await resolveRichTextInternalAsync(input, input.element.value, new RichTextItemIndexReferenceWrapper(0));
    }
}

export const nodeRichTextResolver = new NodeRichTextResolver();
