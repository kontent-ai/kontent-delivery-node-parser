import {
    IContentItem,
    Elements,
    ElementType,
    ILink,
    IParserElement,
    IParserElementAttribute,
    IRichTextImage
} from '@kontent-ai/delivery-sdk';
import { parseFragment, serialize } from 'parse5';
import { Element, DocumentFragment, ChildNode, ParentNode } from 'parse5/dist/cjs/tree-adapters/default';
import * as striptags from 'striptags';

export interface IPreparedData {
    itemsByCodename: ILinkedItemsByCodename;
    linksById: ILinksById;
    imagesById: IImagesById;
}

export interface ILinkedItemsByCodename {
    [codename: string]: IContentItem | undefined;
}

export interface ILinksById {
    [id: string]: ILink | undefined;
}

export interface IImagesById {
    [id: string]: IRichTextImage | undefined;
}

export function getChildNodes(documentFragment: DocumentFragment): ChildNode[] {
    return documentFragment.childNodes;
}

export function getLinkedItem(linkedItems: IContentItem[], itemCodename: string): IContentItem | undefined {
    if (!linkedItems) {
        return undefined;
    }
    return linkedItems.find((m) => m.system.codename === itemCodename);
}

export function prepareData(mainRichTextElement: Elements.RichTextElement, linkedItems: IContentItem[]): IPreparedData {
    const preparedData: IPreparedData = {
        imagesById: {},
        itemsByCodename: {},
        linksById: {}
    };

    for (const image of mainRichTextElement.images) {
        preparedData.imagesById[image.imageId] = image;
    }

    for (const link of mainRichTextElement.links) {
        preparedData.linksById[link.linkId] = link;
    }

    for (const linkedItem of linkedItems) {
        preparedData.itemsByCodename[linkedItem.system.codename] = linkedItem;

        for (const elementKey of Object.keys(linkedItem.elements)) {
            const element = linkedItem.elements[elementKey];
            if (element && element.type === ElementType.RichText) {
                const richTextElement = element as Elements.RichTextElement;

                const images = richTextElement.images;
                const links = richTextElement.links;

                for (const image of images) {
                    preparedData.imagesById[image.imageId] = image;
                }

                for (const link of links) {
                    preparedData.linksById[link.linkId] = link;
                }
            }
        }
    }

    return preparedData;
}

export function convertToParserElement(node: ParentNode): IParserElement {
    const attributes: IParserElementAttribute[] = [];

    let tagName: string = node.nodeName;

    if ((node as Element).attrs) {
        const element = node as Element;

        tagName = element.tagName;

        for (let i = 0; i < element.attrs.length; i++) {
            const attribute = element.attrs[i];

            attributes.push({
                name: attribute.name,
                value: attribute.value
            });
        }
    }

    return {
        tag: tagName,
        setAttribute: (attributeName, attributeValue) => {
            if ((node as Element).attrs) {
                const element = node as Element;
                const attribute = element.attrs.find((m) => m.name.toLowerCase() === attributeName.toLowerCase());
                if (attribute) {
                    attribute.value = attributeValue ?? '';
                } else {
                    element.attrs.push({
                        name: attributeName,
                        value: attributeValue ?? ''
                    });
                }
            }
        },
        setInnerHtml: (newHtml) => {
            if (!newHtml) {
                return;
            }
            if ((node as Element).attrs) {
                const element = node as Element;
                // get serialized set of nodes from HTML
                const serializedChildNodes = parseFragment(newHtml);

                // add child nodes
                element.childNodes = serializedChildNodes.childNodes;
            }
        },
        setOuterHtml: (newHtml) => {
            if (!newHtml) {
                return;
            }
            if ((node as Element).attrs) {
                const element = node as Element;
                const rootNodes = parseFragment(newHtml).childNodes as Element[];

                if (rootNodes.length !== 1) {
                    throw Error(`Invalid number of root nodes.`);
                }

                const rootNode = rootNodes[0];

                if (element.tagName.toLowerCase() === 'img') {
                    // img element has to be set on parent node because replacing child nodes works
                    // differently in self closing tags
                    if (element.parentNode) {
                        element.parentNode.childNodes = rootNodes;
                    } else {
                        throw Error(`Could not set html because of invalid parent node`);
                    }
                } else {
                    element.childNodes = [rootNode];
                }
            }
        },
        html: serialize(node),
        text: striptags(serialize(node)),
        attributes: attributes,
        parentElement: (node as Element).parentNode
            ? convertToParserElement((node as Element).parentNode as ParentNode)
            : undefined,
        sourceElement: node
    };
}
