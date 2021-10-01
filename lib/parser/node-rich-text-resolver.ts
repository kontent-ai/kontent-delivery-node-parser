import {
    IResolvedRichTextHtmlResult,
    IRichTextAsyncResolver,
    IRichTextHtmlResolverAsyncInput,
    IRichTextHtmlResolverInput,
    IRichTextResolver,
    RichTextItemIndexReferenceWrapper
} from '@kentico/kontent-delivery';
import { resolveRichTextInternalAsync } from './implementation/async-resolver';
import { resolveRichTextInternal } from './implementation/sync-resolver';

export class NodeRichTextResolver
    implements
        IRichTextResolver<IRichTextHtmlResolverInput, IResolvedRichTextHtmlResult>,
        IRichTextAsyncResolver<IRichTextHtmlResolverAsyncInput, IResolvedRichTextHtmlResult>
{
    resolveRichText(input: IRichTextHtmlResolverInput): IResolvedRichTextHtmlResult {
        return resolveRichTextInternal(input, input.element.value, new RichTextItemIndexReferenceWrapper(0));
    }

    async resolveRichTextAsync(input: IRichTextHtmlResolverAsyncInput): Promise<IResolvedRichTextHtmlResult> {
        return await resolveRichTextInternalAsync(input, input.element.value, new RichTextItemIndexReferenceWrapper(0));
    }
}

export const nodeRichTextResolver = new NodeRichTextResolver();
