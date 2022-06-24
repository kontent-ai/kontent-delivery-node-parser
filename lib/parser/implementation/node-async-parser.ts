import {
    ContentItemType,
    Elements,
    IAsyncParser,
    IContentItem,
    IImageObject,
    ILinkedItemContentObject,
    ILinkObject,
    IParsedObjects,
    IAsyncParseResolvers,
    IParserResult,
    IResolvedRichTextHtmlResult,
    ParsedItemIndexReferenceWrapper,
    parserConfiguration
} from '@kentico/kontent-delivery';

import { getChildNodes, tryGetImage, tryGetLink, getLinkedItem, convertToParserElement } from './shared';

import { parseFragment, serialize } from 'parse5';
import { Element, Node, TextNode, DocumentFragment, ParentNode } from 'parse5/dist/cjs/tree-adapters/default';
import { Attribute } from 'parse5/dist/cjs/common/token';
import * as striptags from 'striptags';

export class AsyncNodeParser implements IAsyncParser<string> {
    async parseAsync(
        html: string,
        mainRichTextElement: Elements.RichTextElement,
        resolvers: IAsyncParseResolvers,
        linkedItems: IContentItem[]
    ): Promise<IParserResult<string>> {
        const result = await this.parseInternalAsync(
            mainRichTextElement,
            html,
            resolvers,
            {
                links: [],
                linkedItems: [],
                images: []
            },
            linkedItems,
            new ParsedItemIndexReferenceWrapper(0),
            null
        );

        return {
            componentCodenames: result.componentCodenames,
            linkedItemCodenames: result.linkedItemCodenames,
            result: result.html
        };
    }

    private async parseInternalAsync(
        mainRichTextElement: Elements.RichTextElement,
        html: string,
        resolvers: IAsyncParseResolvers,
        parsedItems: IParsedObjects,
        linkedItems: IContentItem[],
        linkedItemIndex: ParsedItemIndexReferenceWrapper = new ParsedItemIndexReferenceWrapper(0),
        parentElement: Element | null
    ): Promise<IResolvedRichTextHtmlResult> {
        // create document
        const documentFragment: DocumentFragment = parseFragment(html);

        const result = await this.processNodesAsync(
            mainRichTextElement,
            getChildNodes(documentFragment),
            resolvers,
            parsedItems,
            linkedItems,
            linkedItemIndex,
            parentElement
        );

        const resolvedHtml = serialize(documentFragment);

        return {
            componentCodenames: result.linkedItems.filter((m) => m.itemType === 'component').map((m) => m.dataCodename),
            linkedItemCodenames: result.linkedItems
                .filter((m) => m.itemType === 'linkedItem')
                .map((m) => m.dataCodename),
            html: resolvedHtml
        };
    }

    private async processNodesAsync(
        mainRichTextElement: Elements.RichTextElement,
        nodes: Node[],
        resolvers: IAsyncParseResolvers,
        parsedItems: IParsedObjects,
        linkedItems: IContentItem[],
        linkedItemIndex: ParsedItemIndexReferenceWrapper = new ParsedItemIndexReferenceWrapper(0),
        parentElement: Element | null
    ): Promise<IParsedObjects> {
        if (!nodes || nodes.length === 0) {
            // there are no more elements
        } else {
            for (const node of nodes) {
                const element = node as Element;
                const attributes: Attribute[] = element.attrs ? element.attrs : [];

                await resolvers.elementResolverAsync(convertToParserElement(node as ParentNode));

                const dataTypeAttribute = attributes.find(
                    (m) => m.name === parserConfiguration.modularContentElementData.dataType
                );
                if (dataTypeAttribute && dataTypeAttribute.value === 'item') {
                    await this.processModularContentItemAsync(
                        mainRichTextElement,
                        element,
                        resolvers,
                        parsedItems,
                        linkedItems,
                        linkedItemIndex
                    );
                } else if (node.nodeName.toLowerCase() === parserConfiguration.linkElementData.nodeName.toLowerCase()) {
                    await this.processLinkAsync(
                        mainRichTextElement,
                        element,
                        resolvers,
                        parsedItems,
                        linkedItems,
                        linkedItemIndex
                    );
                } else if (
                    node.nodeName.toLowerCase() === parserConfiguration.imageElementData.nodeName.toLowerCase()
                ) {
                    await this.processImageAsync(
                        mainRichTextElement,
                        element,
                        resolvers,
                        parsedItems,
                        linkedItems,
                        linkedItemIndex
                    );
                } else {
                    // process generic elements
                    if (node) {
                        await resolvers.genericElementResolverAsync(convertToParserElement(node as ParentNode));
                    }
                }

                // recursively process all childs
                if (element.childNodes && element.childNodes.length) {
                    await this.processNodesAsync(
                        mainRichTextElement,
                        getChildNodes(element as DocumentFragment),
                        resolvers,
                        parsedItems,
                        linkedItems,
                        linkedItemIndex,
                        parentElement
                    );
                }
            }
        }

        return parsedItems;
    }

    private async processImageAsync(
        mainRichTextElement: Elements.RichTextElement,
        element: Element,
        resolvers: IAsyncParseResolvers,
        parsedItems: IParsedObjects,
        linkedItems: IContentItem[],
        linkedItemIndex: ParsedItemIndexReferenceWrapper
    ): Promise<void> {
        const attributes = element.attrs;

        if (element.nodeName !== parserConfiguration.imageElementData.nodeName) {
            // node is not an image
            return;
        }

        // get image id attribute
        const dataImageIdAttribute = attributes.find(
            (m) => m.name === parserConfiguration.imageElementData.dataImageId
        );
        if (!dataImageIdAttribute) {
            // image tag does not have image id attribute
            return;
        }

        // prepare link object
        const imageObject: IImageObject = {
            imageId: dataImageIdAttribute.value
        };

        // add link to result
        parsedItems.images.push(imageObject);

        // resolve image
        await resolvers.imageResolverAsync(
            convertToParserElement(element),
            imageObject.imageId,
            tryGetImage(mainRichTextElement, linkedItems, imageObject.imageId)
        );
    }

    private async processLinkAsync(
        mainRichTextElement: Elements.RichTextElement,
        element: Element,
        resolvers: IAsyncParseResolvers,
        parsedItems: IParsedObjects,
        linkedItems: IContentItem[],
        linkedItemIndex: ParsedItemIndexReferenceWrapper
    ): Promise<void> {
        const attributes = element.attrs;

        if (element.nodeName !== parserConfiguration.linkElementData.nodeName) {
            // node is not a link
            return;
        }

        // get all links which have item it attribute, ignore all other links (they can be regular links in rich text)
        const dataItemIdAttribute = attributes.find((m) => m.name === parserConfiguration.linkElementData.dataItemId);
        if (!dataItemIdAttribute) {
            // its either a regular link or the attribute is not defined
            return;
        }

        // prepare link object
        const linkObject: ILinkObject = {
            dataItemId: dataItemIdAttribute ? dataItemIdAttribute.value : ''
        };

        // add link to result
        parsedItems.links.push(linkObject);

        // get original link text (the one inside <a> tag from response)
        let originalLinkText: string | undefined = undefined;

        if (element.childNodes?.length === 1) {
            // link is not formatted, it's a single text node
            const linkTextNode = element.childNodes[0] as TextNode;
            originalLinkText = linkTextNode.value;
        } else {
            // handle cases when link is formatted
            originalLinkText = striptags(serialize(element));
        }

        await resolvers.urlResolverAsync(
            convertToParserElement(element),
            linkObject.dataItemId,
            originalLinkText ?? '',
            tryGetLink(mainRichTextElement, linkedItems, linkObject.dataItemId)
        );
    }

    private async processModularContentItemAsync(
        mainRichTextElement: Elements.RichTextElement,
        element: Element,
        resolvers: IAsyncParseResolvers,
        parsedItems: IParsedObjects,
        linkedItems: IContentItem[],
        linkedItemIndex: ParsedItemIndexReferenceWrapper
    ): Promise<void> {
        const attributes = element.attrs;

        const dataTypeAttribute = attributes.find(
            (m) => m.name === parserConfiguration.modularContentElementData.dataType
        );

        // process linked items
        if (dataTypeAttribute) {
            // get codename of the modular content
            const dataCodenameAttribute: Attribute | undefined = attributes.find(
                (m) => m.name === parserConfiguration.modularContentElementData.dataCodename
            );
            if (dataCodenameAttribute == null) {
                throw Error(
                    `The '${parserConfiguration.modularContentElementData.dataCodename}' attribute is missing and therefore linked item cannot be retrieved`
                );
            }

            let itemType: ContentItemType = 'linkedItem';

            // get rel attribute for components
            const relAttribute: Attribute | undefined = attributes.find(
                (m) => m.name === parserConfiguration.modularContentElementData.relAttribute
            );
            if (relAttribute && relAttribute.value === parserConfiguration.modularContentElementData.componentRel) {
                itemType = 'component';
            }

            const linkedItemObject: ILinkedItemContentObject = {
                dataCodename: dataCodenameAttribute ? dataCodenameAttribute.value : '',
                dataType: dataTypeAttribute ? dataTypeAttribute.value : '',
                itemType: itemType
            };

            // add to result
            parsedItems.linkedItems.push(linkedItemObject);

            // flag element as resolved to avoid duplicate resolving
            element.attrs.push({
                name: parserConfiguration.resolvedAttribute,
                value: '1'
            });

            // prepare link item object
            const linkItemContentObject: ILinkedItemContentObject = {
                dataCodename: dataCodenameAttribute ? dataCodenameAttribute.value : '',
                dataType: dataTypeAttribute ? dataTypeAttribute.value : '',
                itemType: itemType
            };

            // resolve linked item
            await resolvers.contentItemResolverAsync(
                convertToParserElement(element),
                linkItemContentObject.dataCodename,
                linkedItemIndex.index,
                getLinkedItem(linkedItems, linkItemContentObject.dataCodename)
            );

            // increment index
            linkedItemIndex.increment();
        }
    }
}

export const asyncNodeParser = new AsyncNodeParser();
