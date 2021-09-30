import {
    ContentItemType,
    Elements,
    ElementType,
    IContentItem,
    IFeaturedObjects,
    IImageObject,
    ILink,
    ILinkedItemContentObject,
    ILinkObject,
    IResolvedRichTextElement,
    IRichTextImage,
    IRichTextResolver,
    IRichTextResolverInput,
    parserConfiguration,
    RichTextItemIndexReferenceWrapper
} from '@kentico/kontent-delivery';
import { Attribute, DocumentFragment, Element, parseFragment, serialize, TextNode } from 'parse5';

export class NodeRichTextResolver implements IRichTextResolver {
    resolveRichText(input: IRichTextResolverInput): IResolvedRichTextElement {
        return this.resolveRichTextInternal(input, input.element.value, new RichTextItemIndexReferenceWrapper(0));
    }

    private resolveRichTextInternal(
        input: IRichTextResolverInput,
        html: string,
        linkedItemIndex: RichTextItemIndexReferenceWrapper = new RichTextItemIndexReferenceWrapper(0)
    ): IResolvedRichTextElement {
        // create document
        const documentFragment = parseFragment(html);

        // get all linked items
        const result = this.processRichTextElement(
            input,
            this.getChildNodes(documentFragment),
            {
                links: [],
                linkedItems: [],
                images: []
            },
            linkedItemIndex
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

    private processRichTextElement(
        input: IRichTextResolverInput,
        elements: Element[],
        result: IFeaturedObjects,
        linkedItemIndex: RichTextItemIndexReferenceWrapper
    ): IFeaturedObjects {
        if (!elements || elements.length === 0) {
            // there are no more elements
        } else {
            elements.forEach((element) => {
                if (element.attrs) {
                    this.processModularContentItem(input, element, result, linkedItemIndex);
                    this.processImage(input, element, result, linkedItemIndex);
                    this.processLink(input, element, result, linkedItemIndex);
                }

                if (element.childNodes) {
                    // recursively process all childs
                    this.processRichTextElement(input, this.getChildNodes(element), result, linkedItemIndex);
                }
            });
        }

        return result;
    }

    private processImage(
        input: IRichTextResolverInput,
        element: Element,
        result: IFeaturedObjects,
        linkedItemIndex: RichTextItemIndexReferenceWrapper
    ): void {
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
        result.images.push(imageObject);

        // get image result
        const imageResult = input.imageResolver
            ? input.imageResolver(this.tryGetImage(input.element, input.linkedItems ?? [], imageObject.imageId))
            : undefined;

        if (imageResult?.imageHtml) {
            const imageRootNodes = parseFragment(imageResult.imageHtml).childNodes as Element[];

            if (imageRootNodes.length !== 1) {
                throw Error(`Invalid number of root nodes.`);
            }

            const imageRootNode = imageRootNodes[0];
            const imageNodes = imageRootNode.childNodes;

            if (imageRootNodes.length !== 1) {
                throw Error(`When specifying 'html' output in resolver be sure to use single wrapper element.
                Valid syntax: '<p>data</p>'
                Invalid syntax: '<p><data></p><p>another data</p>' ${imageRootNodes.length}`);
            }
            element.attrs = imageRootNode.attrs; //  preserve attributes from top node
            element.tagName = imageRootNodes[0].tagName; // use first node as a tag wrapper
            element.childNodes = imageNodes;
        } else if (imageResult?.imageUrl) {
            // set url of image
            const srcAttribute = attributes.find((m) => m.name === parserConfiguration.imageElementData.srcAttribute);
            if (srcAttribute) {
                srcAttribute.value = imageResult.imageUrl;
            }
        }
    }

    private processLink(
        input: IRichTextResolverInput,
        element: Element,
        result: IFeaturedObjects,
        linkedItemIndex: RichTextItemIndexReferenceWrapper
    ): void {
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
        result.links.push(linkObject);

        // get original link text (the one inside <a> tag from response)
        let originalLinkText: string | undefined = undefined;

        const linkTextNode = element.childNodes[0] as TextNode;
        if (linkTextNode) {
            originalLinkText = linkTextNode.value;
        }

        const urlSlugResult = input.urlResolver
            ? input.urlResolver({
                  link: this.tryGetLink(input.element, input.linkedItems ?? [], linkObject.dataItemId),
                  linkText: originalLinkText
              })
            : undefined;

        // html has priority over url
        if (urlSlugResult?.linkHtml) {
            // replace entire link html
            const linkHtml = urlSlugResult.linkHtml;
            if (linkHtml) {
                const linkRootNodes = parseFragment(linkHtml).childNodes as Element[];

                if (linkRootNodes.length !== 1) {
                    throw Error(`Invalid number of root nodes.`);
                }

                const linkRootNode = linkRootNodes[0];
                const linkNodes = linkRootNode.childNodes;

                if (linkNodes.length !== 1) {
                    throw Error(`When specifying 'html' output in resolver be sure to use single wrapper element.
                    Valid syntax: '<p>data</p>'
                    Invalid syntax: '<p><data></p><p>another data</p>'`);
                }
                element.attrs = linkRootNode.attrs; //  preserve attributes from top node
                element.tagName = linkRootNodes[0].tagName; // use first node as a tag wrapper
                element.childNodes = linkNodes;
            }
        } else if (urlSlugResult?.linkUrl) {
            // replace just link href
            const hrefAttribute = attributes.find((m) => m.name === 'href');
            if (hrefAttribute) {
                hrefAttribute.value = urlSlugResult.linkUrl;
            }
        }
    }

    private processModularContentItem(
        input: IRichTextResolverInput,
        element: Element,
        result: IFeaturedObjects,
        linkedItemIndex: RichTextItemIndexReferenceWrapper
    ): void {
        const attributes = element.attrs;

        const dataTypeAttribute = attributes.find(
            (m) => m.name === parserConfiguration.modularContentElementData.dataType
        );
        const resolvedDataAttribute = attributes.find(
            (m) => m.name === parserConfiguration.resolvedLinkedItemAttribute
        );

        // process linked itmes
        if (dataTypeAttribute && !resolvedDataAttribute && input.contentItemResolver) {
            if (dataTypeAttribute.value === 'item') {
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
                result.linkedItems.push(linkedItemObject);

                // flag element as resolved to avoid duplicate resolving
                element.attrs.push({
                    name: parserConfiguration.resolvedLinkedItemAttribute,
                    value: '1'
                });

                // add index to resolved item (can be useful for identifying linked item and may be used in WebSpotlight)
                element.attrs.push({
                    name: parserConfiguration.resolvedLinkedItemIndexAttribute,
                    value: linkedItemIndex.index.toString()
                });

                // increment index
                linkedItemIndex.increment();

                // get html of linked item
                const linkedItemHtml = input.contentItemResolver
                    ? input.contentItemResolver(
                          this.getLinkedItem(input.linkedItems ?? [], linkedItemObject.dataCodename)
                      ).contentItemHtml
                    : undefined;

                // get serialized set of nodes from HTML
                const serializedChildNodes = parseFragment(linkedItemHtml ?? '');

                // add child nodes
                element.childNodes = serializedChildNodes.childNodes;
            }
        }
    }

    private getChildNodes(documentFragment: DocumentFragment | Element): Element[] {
        return documentFragment.childNodes as Element[];
    }

    private getLinkedItem(linkedItems: IContentItem[], itemCodename: string): IContentItem | undefined {
        if (!linkedItems) {
            return undefined;
        }
        return linkedItems.find((m) => m.system.codename === itemCodename);
    }

    private tryGetImage(
        inputElement: Elements.RichTextElement,
        linkedItems: IContentItem[],
        imageId: string
    ): IRichTextImage | undefined {
        const elementImage = inputElement.images.find((m) => m.imageId === imageId);
        if (elementImage) {
            return elementImage;
        }

        // try to find image in all linked items
        if (linkedItems) {
            for (const linkedItem of linkedItems) {
                for (const elementKey of Object.keys(linkedItem.elements)) {
                    const element = linkedItem.elements[elementKey];
                    if (element.type === ElementType.RichText) {
                        const richTextElement = element as Elements.RichTextElement;
                        const richTextElementImage = richTextElement.images.find((m) => m.imageId === imageId);
                        if (richTextElementImage) {
                            return richTextElementImage;
                        }
                    }
                }
            }
        }

        return undefined;
    }

    private tryGetLink(
        inputElement: Elements.RichTextElement,
        linkedItems: IContentItem[],
        linkId: string
    ): ILink | undefined {
        const elementLink = inputElement.links.find((m) => m.linkId === linkId);
        if (elementLink) {
            return elementLink;
        }

        // try to find image in all linked items
        if (linkedItems) {
            for (const linkedItem of linkedItems) {
                for (const elementKey of Object.keys(linkedItem.elements)) {
                    const element = linkedItem.elements[elementKey];
                    if (element.type === ElementType.RichText) {
                        const richTextElement = element as Elements.RichTextElement;
                        const richTextElementLink = richTextElement.links.find((m) => m.linkId === linkId);
                        if (richTextElementLink) {
                            return richTextElementLink;
                        }
                    }
                }
            }
        }

        return undefined;
    }
}

export const nodeRichTextResolver = new NodeRichTextResolver();
