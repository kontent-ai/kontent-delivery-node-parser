import {
    IContentItem,
    Elements,
    IRichTextImage,
    ElementType,
    ILink,
    IParserElement,
    IParserElementAttribute
} from '@kontent-ai/delivery-sdk';
import { parseFragment, serialize } from 'parse5';
import { Element, DocumentFragment, ChildNode, ParentNode, TextNode } from 'parse5/dist/cjs/tree-adapters/default';
import * as striptags from 'striptags';

export function getChildNodes(documentFragment: DocumentFragment): ChildNode[] {
    return documentFragment.childNodes;
}

export function getLinkedItem(linkedItems: IContentItem[], itemCodename: string): IContentItem | undefined {
    if (!linkedItems) {
        return undefined;
    }
    return linkedItems.find((m) => m.system.codename === itemCodename);
}

export function tryGetImage(
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
                if (element && element.type === ElementType.RichText) {
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

export function tryGetLink(
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
                if (element && element.type === ElementType.RichText) {
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
        text: tagName === '#text' ? (node as unknown as TextNode).value : striptags(serialize(node)),
        attributes: attributes,
        parentElement: (node as Element).parentNode
            ? convertToParserElement((node as Element).parentNode as ParentNode)
            : undefined,
        sourceElement: node
    };
}
